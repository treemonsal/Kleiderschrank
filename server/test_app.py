import base64
import io
import sys
import types
from PIL import Image
from fastapi.testclient import TestClient
import app as server
from schema import decode_photo, parse_prediction
import pytest

CODE = 'test-code-with-more-than-24-characters'
@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv('MYSTYLE_ACCESS_CODE', CODE)
    return TestClient(server.app)


def photo():
    buffer = io.BytesIO()
    Image.new('RGB', (64, 64), 'blue').save(buffer, format='JPEG')
    return 'data:image/jpeg;base64,' + base64.b64encode(buffer.getvalue()).decode()


def test_auth_health_and_no_cache(client):
    assert client.get('/health').status_code == 401
    response = client.get('/health', headers={'Authorization': 'Bearer ' + CODE})
    assert response.json()['service'] == 'mystyle-photo-ai'
    assert response.headers['cache-control'] == 'no-store'
    assert client.post('/v1/garment', json={'photo': photo()}).status_code == 401
    assert client.get('/health', headers={'Authorization': 'Bearer ' + CODE, 'Origin': 'https://evil.example'}).status_code == 403


def test_photo_validation_no_image_url_or_bomb():
    assert decode_photo(photo()).size == (64, 64)
    for invalid in ['https://example.org/photo.jpg', 'data:image/jpeg;base64,xxx', 'data:image/png;base64,AAAA']:
        with pytest.raises(ValueError):
            decode_photo(invalid)


def test_inference_contract_and_busy(client, monkeypatch):
    monkeypatch.setitem(sys.modules, 'inference', types.SimpleNamespace(process=lambda image, task='all': {'attributes': None, 'cutout': 'test-only'}))
    headers = {'Authorization': 'Bearer ' + CODE, 'Origin': 'https://treemonsal.github.io'}
    assert client.post('/v1/garment', json={'photo': 'broken'}, headers=headers).status_code == 422
    assert client.post('/v1/garment', content='x', headers=headers).status_code == 415
    response = client.post('/v1/garment', json={'photo': photo()}, headers=headers)
    assert response.status_code == 200
    assert response.json()['cutout'] == 'test-only'
    assert response.headers['access-control-allow-origin'] == 'https://treemonsal.github.io'
    server.slot.acquire()
    try:
        assert client.post('/v1/garment', json={'photo': photo()}, headers=headers).status_code == 429
    finally:
        server.slot.release()


def test_model_output_must_match_existing_data_types():
    valid = '{"name":"Blaues Hemd","category":"Oberteile","color":"Blau","brand":"","seasons":["Sommer"],"styles":["Casual"],"notes":"Lange Ärmel."}'
    assert parse_prediction('```json\n' + valid + '\n```')['brand'] == ''
    for invalid in ['null', valid.replace('Oberteile', 'Unknown'), valid.replace('"brand":""', '"brand":false')]:
        with pytest.raises((ValueError, TypeError)):
            parse_prediction(invalid)


def test_partial_failures_do_not_drop_other_result(monkeypatch):
    import inference
    monkeypatch.setattr(inference, 'cutout', lambda image: 'png-result')
    def fail(image):
        raise RuntimeError('synthetic test failure')
    monkeypatch.setattr(inference, 'recognize', fail)
    assert inference.process(Image.new('RGB', (64, 64))) == {'attributes': None, 'cutout': 'png-result'}
    monkeypatch.setattr(inference, 'cutout', fail)
    monkeypatch.setattr(inference, 'recognize', lambda image: {'name': 'Hemd'})
    assert inference.process(Image.new('RGB', (64, 64))) == {'attributes': {'name': 'Hemd'}, 'cutout': None}


def test_individual_tasks_skip_the_other_model(monkeypatch):
    import inference
    calls = []
    monkeypatch.setattr(inference, 'cutout', lambda image: calls.append('cutout') or 'png')
    monkeypatch.setattr(inference, 'recognize', lambda image: calls.append('attributes') or {'name': 'Hemd'})
    assert inference.process(Image.new('RGB', (64, 64)), 'attributes') == {'attributes': {'name': 'Hemd'}, 'cutout': None}
    assert calls == ['attributes']
    calls.clear()
    assert inference.process(Image.new('RGB', (64, 64)), 'cutout') == {'attributes': None, 'cutout': 'png'}
    assert calls == ['cutout']


def test_individual_task_contract_and_validation(client, monkeypatch):
    received = []
    monkeypatch.setitem(sys.modules, 'inference', types.SimpleNamespace(process=lambda image, task='all': received.append(task) or {'attributes': None, 'cutout': 'test-only'}))
    headers = {'Authorization': 'Bearer ' + CODE}
    assert client.get('/health', headers=headers).json()['photo_tasks'] == ['attributes', 'cutout']
    assert client.post('/v1/garment', json={'photo': photo(), 'task': 'attributes'}, headers=headers).status_code == 200
    assert received == ['attributes']
    assert client.post('/v1/garment', json=[], headers=headers).status_code == 422
    assert client.post('/v1/garment', json={'photo': photo(), 'task': 'other'}, headers=headers).status_code == 422
    assert received == ['attributes']

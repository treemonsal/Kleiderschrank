"""Deployment contract only: no Hugging Face account or network writes."""
import importlib.util
from pathlib import Path
import sys
import types
import pytest

@pytest.fixture
def deployment(tmp_path, monkeypatch):
    script = Path(__file__).resolve().parents[1] / 'scripts' / 'deploy_photo_ai.py'
    spec = importlib.util.spec_from_file_location('deploy_test', script)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    monkeypatch.setattr(module, '__file__', str(tmp_path / 'scripts' / 'deploy_photo_ai.py'))
    monkeypatch.setenv('HF_TOKEN', 'dummy-only-for-contract-test')
    monkeypatch.setattr(sys, 'argv', ['deploy_photo_ai.py'])
    calls = []
    class FakeApi:
        exists = False
        hardware = 'cpu-basic'
        def __init__(self, token):
            assert token == 'dummy-only-for-contract-test'
        def whoami(self): return {'name': 'test-user'}
        def repo_exists(self, *args, **kwargs): return self.exists
        def get_space_runtime(self, *args): return types.SimpleNamespace(hardware=self.hardware, requested_hardware=self.hardware)
        def create_repo(self, *args, **kwargs):
            assert kwargs['space_hardware'] == 'cpu-basic'
            calls.append('create')
        def add_space_secret(self, *args): calls.append('secret')
        def add_space_variable(self, *args): calls.append('origin')
        def upload_folder(self, **kwargs): calls.append('upload')
    monkeypatch.setitem(sys.modules, 'huggingface_hub', types.SimpleNamespace(HfApi=FakeApi))
    return module, FakeApi, calls, tmp_path


def test_free_deploy_code_is_local_private_and_not_logged(deployment, capsys):
    import json
    module, api, calls, root = deployment
    module.main()
    assert calls == ['create', 'secret', 'origin', 'upload']
    config = root / '.local' / 'photo-ai-connection.json'
    data = json.loads(config.read_text())
    assert config.stat().st_mode & 0o777 == 0o600
    assert len(data['code']) >= 24
    assert data['code'] not in capsys.readouterr().out
    assert data['url'] == 'https://test-user-mystyle-photo-ai.hf.space'
    api.exists = True
    module.main()
    assert json.loads(config.read_text())['code'] == data['code']


def test_refuses_existing_paid_hardware_and_unknown_pairing(deployment):
    module, api, calls, _ = deployment
    api.exists = True
    api.hardware = 't4-small'
    with pytest.raises(SystemExit, match='nicht CPU Basic'): module.main()
    assert calls == []
    api.hardware = 'cpu-basic'
    with pytest.raises(SystemExit, match='ohne lokalen Verbindungscode'): module.main()
    assert calls == []


def test_missing_credential_never_attempts_deployment(deployment, monkeypatch):
    module, _, calls, _ = deployment
    monkeypatch.delenv('HF_TOKEN')
    with pytest.raises(SystemExit, match='HF_TOKEN fehlt'): module.main()
    assert calls == []

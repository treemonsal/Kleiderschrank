import asyncio
import concurrent.futures
import hmac
import json
import os
import threading
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from schema import MAX_BODY, decode_photo

app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
origins = os.environ.get('ALLOWED_ORIGINS', 'https://treemonsal.github.io').split(',')
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=['GET', 'POST'], allow_headers=['Authorization', 'Content-Type'], expose_headers=[], max_age=600)
executor = concurrent.futures.ThreadPoolExecutor(max_workers=1)
slot = threading.Lock()


def authorize(request):
    expected = os.environ.get('MYSTYLE_ACCESS_CODE', '')
    if len(expected) < 24:
        raise HTTPException(503, 'Server not configured')
    actual = request.headers.get('authorization', '')
    if not hmac.compare_digest(actual.encode(), ('Bearer ' + expected).encode()):
        raise HTTPException(401, 'Unauthorized')
    origin = request.headers.get('origin')
    if origin and origin not in origins:
        raise HTTPException(403, 'Origin not allowed')


@app.middleware('http')
async def no_store(request, call_next):
    response = await call_next(request)
    response.headers['Cache-Control'] = 'no-store'
    response.headers['X-Content-Type-Options'] = 'nosniff'
    return response


@app.get('/')
def index():
    return {'service': 'MyStyle photo AI', 'privacy': 'No photo storage. Authenticated access only.', 'health': '/health'}


@app.get('/health')
def health(request: Request):
    authorize(request)
    return {'service': 'mystyle-photo-ai', 'version': 1, 'hardware': 'cpu', 'models_loaded_lazily': True}


@app.post('/v1/garment')
async def garment(request: Request):
    authorize(request)
    if request.headers.get('content-type', '').split(';')[0] != 'application/json':
        raise HTTPException(415, 'JSON required')
    raw = bytearray()
    async for chunk in request.stream():
        raw.extend(chunk)
        if len(raw) > MAX_BODY:
            raise HTTPException(413, 'Photo too large')
    try:
        value = json.loads(raw)
        image = decode_photo(value['photo'])
    except (ValueError, KeyError, TypeError):
        raise HTTPException(422, 'Invalid photo') from None
    if not slot.acquire(blocking=False):
        image.close()
        raise HTTPException(429, 'Server busy')
    def work():
        try:
            from inference import process
            return process(image)
        finally:
            image.close()
            slot.release()
    future = executor.submit(work)
    async def response():
        # JSON permits leading whitespace: keep the proxy connection alive during
        # cold starts without caching images or queuing unlimited inference jobs.
        while not future.done():
            yield b'\n'
            await asyncio.sleep(5)
        try:
            yield json.dumps(future.result(), ensure_ascii=False).encode('utf-8')
        except Exception:
            yield b'{"attributes":null,"cutout":null}'
    return StreamingResponse(response(), media_type='application/json', headers={'X-Accel-Buffering': 'no'})

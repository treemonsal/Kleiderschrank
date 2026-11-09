"""Publish dist/ to Cloudflare: KV namespace "mystyle-site" plus worker "mystyle".

Usage (after `VITE_BASE_PATH=/ npm run build`):
    CF_ACCOUNT=<account id> python3 server/site-worker/deploy.py dist
The API token is read from CLOUDFLARE_API_TOKEN (or injected by a proxy).
Uses the free Workers plan; each changed file counts as one KV write.
"""
import base64, hashlib, json, mimetypes, os, subprocess, sys

ACCOUNT = os.environ['CF_ACCOUNT']
API = f'https://api.cloudflare.com/client/v4/accounts/{ACCOUNT}'
HERE = os.path.dirname(os.path.abspath(__file__))
TYPES = {'.webmanifest': 'application/manifest+json', '.onnx': 'application/octet-stream',
         '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
         '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8',
         '.svg': 'image/svg+xml', '.json': 'application/json', '.wasm': 'application/wasm'}


def call(method, path, *args):
    token = os.environ.get('CLOUDFLARE_API_TOKEN')
    auth = ['-H', f'Authorization: Bearer {token}'] if token else []
    out = subprocess.run(['curl', '-sS', '-X', method, API + path, *auth, *args],
                         capture_output=True, text=True, check=True).stdout
    data = json.loads(out)
    if not data.get('success'):
        sys.exit(f'{method} {path}: {data.get("errors")}')
    return data


def namespace():
    for ns in call('GET', '/storage/kv/namespaces?per_page=100')['result']:
        if ns['title'] == 'mystyle-site':
            return ns['id']
    return call('POST', '/storage/kv/namespaces', '-H', 'Content-Type: application/json',
                '-d', json.dumps({'title': 'mystyle-site'}))['result']['id']


def existing(ns):
    keys, cursor = {}, ''
    while True:
        res = call('GET', f'/storage/kv/namespaces/{ns}/keys?limit=1000' + (f'&cursor={cursor}' if cursor else ''))
        for k in res['result']:
            keys[k['name']] = (k.get('metadata') or {}).get('hash')
        cursor = res.get('result_info', {}).get('cursor')
        if not cursor:
            return keys


def main(root):
    ns = namespace()
    old = existing(ns)
    files, batch, size = {}, [], 0
    tmp = os.path.join(HERE, '.upload.json')
    def flush():
        nonlocal batch, size
        if batch:
            json.dump(batch, open(tmp, 'w'))
            call('PUT', f'/storage/kv/namespaces/{ns}/bulk', '-H', 'Content-Type: application/json', '--data-binary', f'@{tmp}')
            batch, size = [], 0
    for d, _, names in os.walk(root):
        for name in names:
            path = os.path.join(d, name)
            key = '/' + os.path.relpath(path, root).replace(os.sep, '/')
            data = open(path, 'rb').read()
            digest = hashlib.sha256(data).hexdigest()[:32]
            files[key] = digest
            if old.get(key) == digest:
                continue
            ext = os.path.splitext(name)[1]
            ctype = TYPES.get(ext) or mimetypes.guess_type(name)[0] or 'application/octet-stream'
            if size + len(data) > 40_000_000:
                flush()
            batch.append({'key': key, 'value': base64.b64encode(data).decode(), 'base64': True,
                          'metadata': {'type': ctype, 'hash': digest}})
            size += len(data)
    flush()
    gone = [k for k in old if k not in files]
    if gone:
        json.dump(gone, open(tmp, 'w'))
        call('POST', f'/storage/kv/namespaces/{ns}/bulk/delete', '-H', 'Content-Type: application/json', '--data-binary', f'@{tmp}')
    if os.path.exists(tmp):
        os.remove(tmp)
    meta = {'main_module': 'index.js', 'compatibility_date': '2026-10-01',
            'bindings': [{'type': 'kv_namespace', 'name': 'SITE', 'namespace_id': ns}]}
    call('PUT', '/workers/scripts/mystyle', '-F', f'metadata={json.dumps(meta)};type=application/json',
         '-F', f'index.js=@{os.path.join(HERE, "index.js")};type=application/javascript+module')
    call('POST', '/workers/scripts/mystyle/subdomain', '-H', 'Content-Type: application/json', '-d', '{"enabled":true}')
    changed = len(files) - sum(1 for k in files if old.get(k) == files[k])
    print(f'{len(files)} Dateien, {changed} neu, {len(gone)} entfernt')


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'dist')

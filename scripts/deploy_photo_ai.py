"""Deploy only the free HF Space. Token comes from secure environment, never CLI/chat."""
import argparse
import json
import os
import re
from pathlib import Path
import secrets


def main():
    from huggingface_hub import HfApi
    parser = argparse.ArgumentParser()
    parser.add_argument('--name', default='mystyle-photo-ai')
    args = parser.parse_args()
    if not re.fullmatch(r'[a-zA-Z0-9][a-zA-Z0-9-]{2,63}', args.name):
        raise SystemExit('Space-Name: 3–64 Buchstaben, Ziffern oder Bindestriche.')
    token = os.environ.get('HF_TOKEN')
    if not token:
        raise SystemExit('HF_TOKEN fehlt. Sicher in den Umgebungs-Secrets hinterlegen, nicht im Chat.')
    api = HfApi(token=token)
    user = api.whoami()['name']
    repo = f'{user}/{args.name}'
    # Do not silently rotate a code in an existing production Space.
    root = Path(__file__).resolve().parents[1]
    config_file = root / '.local' / 'photo-ai-connection.json'
    config_file.parent.mkdir(mode=0o700, exist_ok=True)
    old = json.loads(config_file.read_text()) if config_file.exists() else None
    exists = api.repo_exists(repo, repo_type='space')
    if exists:
        runtime = api.get_space_runtime(repo)
        if runtime.hardware not in (None, 'cpu-basic') or runtime.requested_hardware not in (None, 'cpu-basic'):
            raise SystemExit('Bestehender Space ist nicht CPU Basic. Kein kostenpflichtiges Deployment ausgeführt.')
        if not old or old.get('repo') != repo:
            raise SystemExit('Bestehender Space ohne lokalen Verbindungscode. Anderen Namen wählen; Zugang nicht stillschweigend überschreiben.')
    api.create_repo(repo, repo_type='space', space_sdk='docker', space_hardware='cpu-basic', private=False, exist_ok=True)
    code = old['code'] if old and old.get('repo') == repo else secrets.token_urlsafe(32)
    url = 'https://' + repo.replace('/', '-').replace('_', '-').lower() + '.hf.space'
    fd = os.open(config_file, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, 'w') as output:
        json.dump({'repo': repo, 'url': url, 'code': code, 'enabled': True}, output)
    api.add_space_secret(repo, 'MYSTYLE_ACCESS_CODE', code)
    api.add_space_variable(repo, 'ALLOWED_ORIGINS', 'https://treemonsal.github.io')
    api.upload_folder(repo_id=repo, repo_type='space', folder_path=str(root / 'server'), ignore_patterns=['__pycache__/**', 'test_*.py'], commit_message='Deploy MyStyle free CPU photo AI')
    print(f'Space: https://huggingface.co/spaces/{repo}')
    print(f'Verbindung sicher lokal abgelegt: {config_file} (Code nicht in Logs ausgegeben).')
    print('Warte auf Running; danach reale Kleidung und CPU-Laufzeit prüfen.')


if __name__ == '__main__':
    main()

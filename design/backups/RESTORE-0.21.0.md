# Zurück zum Codex-Stand 0.20.0

Vor der Überarbeitung 0.21.0 wurde der komplette Stand `945aad5` auf GitHub als Branch [`backup/codex-0.20.0`](https://github.com/treemonsal/Kleiderschrank/tree/backup/codex-0.20.0) gesichert. Diesen Branch nicht löschen.

Rückweg ohne Verlauf umzuschreiben (aus einem sauberen Checkout von `main`):

```sh
git fetch origin main backup/codex-0.20.0
git checkout -b zurueck-zu-codex origin/main
git checkout origin/backup/codex-0.20.0 -- .
git clean -n   # zeigt Dateien, die erst 0.21.0 hinzugefügt hat; danach mit -f entfernen
npm ci && npm run build && npm test
git commit -am "Zurück zum Codex-Stand 0.20.0"
```

Danach per Pull Request nach `main` übernehmen und den Pages-Workflow starten. Die Datenbank wurde in 0.21.0 nicht verändert (Dexie-Version 5, Sicherungsformat 8). Gespeicherte Kleiderschränke bleiben bei einem Rückweg erhalten; keine Website-Daten löschen.

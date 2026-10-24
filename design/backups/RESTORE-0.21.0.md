# Zurück zum Codex-Stand 0.20.0

Vor der Überarbeitung 0.21.0 wurde der komplette Stand `945aad5` als annotierter Tag `backup/codex-0.20.0` gesichert. `main` auf GitHub zeigt bis zur Übernahme der Überarbeitung weiterhin auf diesen Stand.

Rückweg ohne Verlauf umzuschreiben (aus einem sauberen Checkout):

```sh
git fetch origin main
git checkout -b zurueck-zu-codex origin/main
git revert --no-edit 945aad5..HEAD   # nimmt alle späteren Commits einzeln zurück
npm ci && npm run build && npm test
```

Ist der Tag auf GitHub vorhanden, zeigt `git show backup/codex-0.20.0` den gesicherten Stand. Die Datenbank wurde in 0.21.0 nicht verändert (weiterhin Dexie-Version 5, Sicherungsformat 8). Gespeicherte Kleiderschränke bleiben bei einem Rückweg also erhalten; keine Website-Daten löschen.

# Sicherungen und Rückwege

| Stand                                             | Wo                                                                                                                                            |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Gesamtstand 0.22.0 (Luxe-Design, alle Funktionen) | Branch [`backup/codex-0.20.0`](https://github.com/treemonsal/Kleiderschrank/tree/backup/codex-0.20.0), auf Wunsch am 24.10.2026 überschrieben |
| Design vor dem Luxe-Design (0.21.0)               | Branch [`backup/design-0.21.0`](https://github.com/treemonsal/Kleiderschrank/tree/backup/design-0.21.0)                                       |
| Ursprünglicher Codex-Stand 0.20.0                 | Commit `945aad5` in der Historie von `main`                                                                                                   |

Einen dieser Stände ohne Verlaufsänderung wiederherstellen (aus einem sauberen Checkout von `main`, `ZIEL` durch Branch oder Commit ersetzen):

```sh
git fetch origin main backup/codex-0.20.0 backup/design-0.21.0
git checkout -b zurueck origin/main
git checkout ZIEL -- .          # z. B. origin/backup/codex-0.20.0 oder 945aad5
git clean -n                    # zeigt später hinzugefügte Dateien; danach mit -f entfernen
npm ci && npm run build && npm test
git commit -am "Zurück zu ZIEL"
```

Danach per Pull Request nach `main` übernehmen und den Pages-Workflow starten. Keine dieser Versionen hat Datenbank oder Sicherungsformat verändert (Dexie 5, Format 8); gespeicherte Kleiderschränke bleiben erhalten. Keine Website-Daten löschen.

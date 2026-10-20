# MyStyle – Sicherung vor der Bereinigung

Stand: 0.17.0, Commit fb4f9af01d20f757cfc2a99471b9b5fa9cb39969.

Diese Sicherung enthält alle 158 versionierten Projektdateien, die vollständige Git-Historie und lesbare GitHub-Einstellungen. Sie enthält keine privaten Handy-Daten, Umgebungs-Secrets, installierten Abhängigkeiten oder Build-Ausgaben. GitHub Actions-Berechtigungen waren über die Integration nicht lesbar (403); dafür wird keine vollständige Sicherung behauptet.

## Separat wiederherstellen und prüfen

1. Sicherungsdateien aus diesem Ordner herunterladen und SHA-256 mit manifest.json vergleichen.
2. `git clone mystyle-0.17.0-history.bundle mystyle-restored`
3. `cd mystyle-restored`
4. `git switch -c restore-0.17.0 fb4f9af01d20f757cfc2a99471b9b5fa9cb39969`
5. Node gemäß `.nvmrc` verwenden, `npm ci`, `npm run build`, `npm test` ausführen.
6. Alternativ `tar -xzf mystyle-0.17.0-source.tar.gz` für den reinen Projektstand.

Verifikation: Alle 158 archivierten Dateien wurden byteweise mit Git verglichen. Das Bundle wurde separat geklont und mit `git fsck` geprüft.

Erneut prüfen, ohne die laufende App zu ändern: im Projekt-Root `python3 scripts/verify_project_backup.py` ausführen. Benötigt Python 3.11+ und Git, keine zusätzlichen Python-Pakete. Das Skript kontrolliert Prüfsummen, klont in einen temporären Ordner und vergleicht jede Archivdatei mit dem Git-Stand.

## Die laufende App zurücksetzen

Die Bereinigungs-Commits regulär mit `git revert` rückgängig machen, den Revert prüfen, nach main pushen und den Pages-Workflow starten. Kein Force-Push, kein `git reset --hard` und keine Löschung der Website-Daten auf dem Handy. Einstellungen in github-settings.json sind ein Snapshot; sie werden nicht automatisch auf GitHub zurückgeschrieben. Ein Backup des persönlichen Kleiderschranks erfolgt separat in der App über „Backup exportieren“.

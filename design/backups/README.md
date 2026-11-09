# Das vorherige Design zurückholen

Die vollständige Projektsicherung vor der Bereinigung von Version 0.17.0 liegt separat unter [full-0.17.0](full-0.17.0/RESTORE.md). Dieses Dokument beschreibt weiterhin den gezielten Rückweg zum älteren dunklen Design.

Vor der ersten Änderung wurde der vollständige Stand als annotierter Tag
[`design-backup/platinum-0.14.0`](https://github.com/treemonsal/Kleiderschrank/tree/92d9ea45ca6c229804f5bc33bfd090c573d9a885)
auf GitHub gesichert. Er zeigt auf `92d9ea45ca6c229804f5bc33bfd090c573d9a885`.
Es gibt zusätzlich das Quellarchiv `platinum-0.14.0.tar.gz` mit den alten
Oberflächen-Dateien. Es enthält keine Kleiderschrankdaten oder Zugangsdaten.

## Gezielt die Optik zurücksetzen

Aus einem sauberen Projektverzeichnis:

```sh
gzip -dc design/backups/editorial-0.15.0.patch.gz > /tmp/mystyle-design-restore.patch
git apply --reverse --check /tmp/mystyle-design-restore.patch
git apply --reverse /tmp/mystyle-design-restore.patch
npm run build
npm test
npm run test:e2e
```

Der Patch umfasst die Oberfläche, Installationstheming und dazugehörige
Darstellungsprüfungen. Er entfernt die neuen Editorial-Dateien wieder. Die
Versionsnummer und spätere Änderungen an Fachlogik werden nicht zurückgesetzt.
Anschliessend die Rückkehr regulär prüfen, committen und veröffentlichen.
Keine Website-Daten löschen und kein Datenbank-Downgrade durchführen.

Bei späteren Änderungen kann die Vorprüfung wegen überlappender Stellen
abbrechen. Dann den Patch gezielt zusammenführen; niemals mit `git reset --hard`
oder durch ungeprüftes Überschreiben des gesamten Projekts erzwingen.

## Vollständiger damaliger Quellstand

```sh
git fetch origin tag design-backup/platinum-0.14.0
git show design-backup/platinum-0.14.0:src/styles.css
tar -tzf design/backups/platinum-0.14.0.tar.gz
```

Der vollständige alte Commit bleibt zur Einsicht erhalten. Für eine reine
Design-Rückkehr ist der gezielte Patch vorzuziehen: die alten App-/Datenversionen
müssen dafür nicht installiert werden.

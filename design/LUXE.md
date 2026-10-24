# Luxe-Design (ab 0.22.0)

Ziel: ruhig, hochwertig und nicht nach KI aussehen. Vorbilder sind Apple- und Revolut-Apps.

| Prinzip                 | Umsetzung                                                                                 |
| ----------------------- | ----------------------------------------------------------------------------------------- |
| Eine Schrift            | Systemschrift (SF Pro auf dem iPhone), Hierarchie nur über Grösse und Gewicht             |
| Monochrom               | Hell: Weiss auf `#f5f5f7`, Schwarz für Aktionen. Dunkel: echtes Schwarz, Karten `#161618` |
| Farbe nur mit Bedeutung | Kleidungsfarben in Skizzen und Fotos, Rot nur für Favoriten und Fehler                    |
| Tiefe statt Linien      | Karten mit 24 px Radius und weichem Schatten, keine Rahmen                                |
| Glas                    | Header und schwebende Navigation mit Hintergrundunschärfe                                 |
| Sachliche Texte         | Kurze Titel ohne Punkt, keine Grossbuchstaben-Überzeilen, keine Slogans                   |

Code: `src/luxe.css` wird nach `styles.css` und `editorial.css` geladen und überschreibt Farben, Typografie und Komponenten. Layout, Gesten und Bewegung bleiben in den älteren Dateien.

## Zurück zum vorherigen Design

Der Stand vor dem Luxe-Design liegt im Branch [`backup/design-0.21.0`](https://github.com/treemonsal/Kleiderschrank/tree/backup/design-0.21.0). Die Daten sind davon nicht betroffen (keine Datenbank- oder Sicherungsänderung). Rückweg aus einem sauberen Checkout von `main`:

```sh
git fetch origin main backup/design-0.21.0
git checkout -b zurueck-zu-editorial origin/main
git checkout origin/backup/design-0.21.0 -- .
git clean -n   # zeigt neue Dateien wie src/luxe.css; danach mit -f entfernen
npm ci && npm run build && npm test
```

Danach per Pull Request nach `main` übernehmen und den Pages-Workflow starten.

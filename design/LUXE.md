# Store-Design (ab 0.27.0)

Auf Wunsch übernimmt MyStyle seit 0.27.0 die Gestaltung des Apple Store (apple.com/ch-de/store, am 25.10.2026 vermessen). Mobbin war als Quelle vorgesehen, verlangt für den Connector aber ein bezahltes Abo und wurde deshalb nicht genutzt.

| Element            | Apple Store                          | MyStyle                                                 |
| ------------------ | ------------------------------------ | ------------------------------------------------------- |
| Seite              | `#f5f5f7`                            | gleich, auch Sheets und Theme-Farbe                     |
| Karten             | weiss, 18 px Radius, Schatten 2/4/12 | gleich, auch Kleidungsbilder wie Produktfotos auf Weiss |
| Schrift            | `#1d1d1f`, Nebentext `#6e6e73`       | gleich                                                  |
| Titel              | „Der Store“ gross, halbfett          | Seitentitel 30–40 px, Untertitel halbfett in Schwarz    |
| Abschnitte         | „Zubehör. Must-haves, die …“         | zweifarbige Überschrift im Regal „Lange nicht getragen“ |
| Kategorien         | Bildreihe Mac · iPhone · iPad        | Bildreihe mit Kleidungsskizzen im Kleiderschrank        |
| Aktionen und Links | blaue Kapsel `#0071e3`, Links `#06c` | gleich; aktiver Tab blau, Liquid Glass bleibt           |

Code: `src/store.css` wird nach `luxe.css` geladen. Rückweg zum Luxe-Design 0.26.0: Import in `src/main.tsx` entfernen oder Branch `backup/design-0.26.0`.

# Luxe-Design (0.22.0 bis 0.26.0, hell ab 0.24.0)

Ziel: ruhig, hochwertig und nicht nach KI aussehen. Vorbilder sind Apple- und Revolut-Apps.

| Prinzip                 | Umsetzung                                                                                                                          |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Eine Schrift            | Systemschrift (SF Pro auf dem iPhone), Hierarchie nur über Grösse und Gewicht                                                      |
| Immer hell              | Warmes Elfenbein `#f6f4ef`, Karten `#fffefb`, Schrift und Aktionen `#141414`. Kein automatischer Dunkelmodus                       |
| Farbe nur mit Bedeutung | Kleidungsfarben in Skizzen und Fotos, Rot nur für Favoriten und Fehler                                                             |
| Tiefe statt Linien      | Karten mit 24 px Radius und weichem Schatten, keine Rahmen                                                                         |
| Liquid Glass            | Nur die Navigation: knapp über dem Home-Balken, durchsichtig, starke Unschärfe, helle Lichtkante. Der Header scrollt mit der Seite |
| Sachliche Texte         | Kurze Titel ohne Punkt, keine Grossbuchstaben-Überzeilen, keine Slogans                                                            |

Code: `src/luxe.css` wird nach `styles.css` und `editorial.css` geladen und überschreibt Farben, Typografie und Komponenten. Layout, Gesten und Bewegung bleiben in den älteren Dateien.

## Frühere Designs

Das automatische Hell-/Dunkel-Design 0.22–0.23 liegt im Branch [`backup/design-0.23.0`](https://github.com/treemonsal/Kleiderschrank/tree/backup/design-0.23.0). Der Stand vor dem Luxe-Design liegt im Branch [`backup/design-0.21.0`](https://github.com/treemonsal/Kleiderschrank/tree/backup/design-0.21.0). Die Daten sind davon nicht betroffen (keine Datenbank- oder Sicherungsänderung). Rückweg aus einem sauberen Checkout von `main`:

```sh
git fetch origin main backup/design-0.21.0
git checkout -b zurueck-zu-editorial origin/main
git checkout origin/backup/design-0.21.0 -- .
git clean -n   # zeigt neue Dateien wie src/luxe.css; danach mit -f entfernen
npm ci && npm run build && npm test
```

Danach per Pull Request nach `main` übernehmen und den Pages-Workflow starten.

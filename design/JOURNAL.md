# Journal-Design (ab 0.28.0)

Quelle: Claude-Design-Entwurf „MyStyle, ein Garderobenjournal“ (Classical-Designsystem), am 25.10.2026 übergeben. Die App liest sich wie ein gedruckter Almanach der eigenen Kleidung.

## Grundlagen

- Schrift: Cormorant Garamond (Titel, Zahlen, Buttons) über Lora (Fliesstext), beide unter der SIL Open Font License in `src/fonts` mitgeliefert. Keine externen Fonts.
- Farben: Papier `#f3f2f2`, Fläche `#eae9e9`, Tinte `#201f1d`, ein Akzent `#b68235`. Text im Akzent immer in der dunklen Stufe `#7d5411`.
- Haarlinien statt gefüllter Karten, umrandete Buttons statt Flächen, Radius 4 px, Schatten nur bei Sheets und Hinweisen.
- Überzeilen in Grossbuchstaben mit weiter Laufweite (10.5 px, 0.16 em).

## Bereiche

| Bereich    | Umsetzung                                                                                                                                 |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Kopf       | Kursives „MyStyle“, Sprechblase (Stylist) und Zahnrad (Einstellungen)                                                                     |
| Navigation | I Heute · II Garderobe · III Looks · IV Journal, goldene Haarlinie über dem aktiven Bereich                                               |
| Heute      | Wochentag, grosses Datum, Wetter rechts, Wochenleiste mit 38-px-Farbringen, Tageslook als Abbildungstafel „Abb. 1–n“                      |
| Garderobe  | Kategorie-Reiter mit Anzahl, Filter Favoriten/Wäsche, Farbbilanz nach Tragehäufigkeit, zweispaltige Tafeln                                |
| Looks      | Segmentierte Reiter, gespeicherte Looks als Farbstreifen mit Nummer                                                                       |
| Journal    | Monatskalender mit Farbringen, Tagesdetail, Tragetage und verschiedene Stücke im Monat, lange nicht getragen, Einkaufsberatung, Sicherung |

## Bewusste Abweichungen vom Entwurf

- „Heute getragen“ steht über der Abbildungstafel, weil die Tagesbestätigung auf dem iPhone ohne Scrollen erreichbar bleiben muss.
- Teile tauschen über den Pfeil auf jeder Abbildung; Antippen öffnet das Stück (wie bisher).
- Wärmer/Ruhiger/Ähnlich bleiben im bestehenden Dialog „Tageslook verfeinern“.
- Der Titel des Tageslooks nennt die zwei führenden erfassten Farben („Beige & Blau“). Der Entwurf zeigte Fantasienamen, die App kennt nur die festen Farbnamen.
- Stoffmuster sind ein Hinweis pro Kategorie, kein erfasster Stoff.

## Stylesheets

Seit 0.28.0 gibt es nur noch `src/styles.css` (Grundlage) und `src/journal.css` (Design). Die drei früheren Design-Schichten (editorial, luxe, store) wurden entfernt; aus ihnen blieben nur die Layout-Regeln, die die App noch sichtbar verändern, als Abschnitt „Layout base“ oben in `journal.css`. Geprüft wurde das, indem die berechneten Styles aller Elemente in 108 Ansichten, Sheets und leeren Zuständen bei 320, 390 und 820 px vor und nach dem Umbau verglichen wurden (0 Abweichungen). Die alten Dateien liegen im Branch `backup/design-0.27.0`.

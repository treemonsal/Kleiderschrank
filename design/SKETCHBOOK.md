# Skizzenbuch-Design (ab 0.35.0)

Apples Aufbau und Bewegung (Skill `.claude/skills/apple-design`) im Stil von Claude: warmes Papier, Tinte, ein Terrakotta-Akzent, Handschrift und Symbole, die wie von Hand gezeichnet wirken. Nur Hellmodus. Umgesetzt in `src/theme.css` (nach `journal.css` geladen), `src/spring.ts`, `src/useSheetMotion.ts`, `src/useDaySwipe.ts` und dem SVG-Filter `#hand-drawn` in `index.html`.

Das vorherige Journal-Design liegt im Branch `backup/design-0.34.1-journal`. Die Zwischenstufe „Apple pur“ wurde auf Wunsch nicht gesichert.

## Drei Farben

| Farbe      | Wert                                  | Einsatz                                               |
| ---------- | ------------------------------------- | ----------------------------------------------------- |
| Papier     | `#f5f4ed`, Karten `#faf9f5`           | Hintergrund, Flächen                                  |
| Tinte      | `#1f1e1d`, gedämpft `#66635c`         | Text, gefüllte Buttons, Schalter-Knopf, Auswahl       |
| Terrakotta | `#c15f3c`, als Text `#a64d2c` (5,1:1) | Heute, aktiver Tab, Links, Herz, Schalter an, Löschen |

Kleiderfarben (Fotos, Farbmuster, Farbringe, Farbbilanz) sind Daten und bleiben farbig.

## Schrift

- Überschriften, grosse Zahlen, Wortmarke: **Caveat** 600/700 (OFL), grösser gesetzt als Systemschrift, ohne Laufweite.
- Text, Buttons, Felder: **Patrick Hand** 400 (OFL). Nur ein Schnitt: Hervorhebung über Grösse, nicht fett.
- Beide selbst gehostet in `src/fonts` mit Lizenz. Dynamic Type auf dem iPhone bleibt (`font: -apple-system-body` setzt `1rem`).
- Datenschutzseiten bleiben in Systemschrift (Lesbarkeit langer Texte), aber in den drei Farben.

## Von Hand

- Symbole: SVG-Filter `#hand-drawn` (Turbulenz plus Verschiebung, Stärke 2,2) auf allen Icons und Skizzen; runde Linienenden.
- Ausgewählter Tag mit Tinte umkreist, heute mit Terrakotta (`--scribble-circle-*`), aktiver Tab mit Wellenlinie.
- Buttons, Chips, Segmente und Felder mit unregelmässigem Rand (`--sketch-radius`): primär Tinte gefüllt, sekundär nur Kontur.

## Weniger Kästen

Wochenleiste, Kalender und Kennzahlen stehen direkt auf dem Papier. Einstellungs-Zeilen ohne farbige Symbolkacheln. Karten ohne Rahmen und Schatten.

## Bewegung (unverändert aus dem Apple-Schritt)

| Was                   | Feder (Dämpfung, Antwort) |
| --------------------- | ------------------------- |
| Sheet steigt auf      | 1,0 / 0,36 s              |
| Sheet zurück nach Zug | 0,86 / 0,32 s             |
| Sheet hinaus          | 1,0 / 0,28 s              |
| Tageskarte zurück     | 0,86 / 0,32 s             |

Beim Loslassen entscheiden Projektion `(v/1000)·0,998/(1−0,998)` und Vorzeichen der Geschwindigkeit; hinter Grenzen Gummiband. Schliessen wirkt sofort, nur eine inerte Kopie gleitet hinaus. Drücken: sofort `scale(0.97)`. Reduzierte Bewegung: nur Überblendungen, kein Ziehen.

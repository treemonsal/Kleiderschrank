# Claude-Look (ab 0.35.0)

Apples Aufbau, Schrift und Bewegung (Skill `.claude/skills/apple-design`) in Claudes Farben und Formen. Nur Hellmodus. Umgesetzt in `src/theme.css` (nach `journal.css` geladen), `src/spring.ts`, `src/useSheetMotion.ts`, `src/useDaySwipe.ts` und `src/useFitText.ts`.

Das vorherige Journal-Design (inklusive Cormorant/Lora) liegt im Branch `backup/design-0.34.1-journal`. Die Zwischenstufen „Apple pur“ und „Skizzenbuch“ wurden auf Wunsch nicht gesichert.

## Quellen, kopiert statt nachgebaut

| Was     | Quelle                                                                                                                                                                    |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Farben  | Anthropics veröffentlichte Markenfarben, `github.com/anthropics/skills` → `brand-guidelines`                                                                              |
| Symbole | Lucide, wie im Design-System des Claude-Design-Exports (`design/claude-design-handoff/project/_ds/.../readme.md`: „Use Lucide icons throughout“), dünne runde Striche 1,5 |
| Schrift | Systemschrift (SF Pro auf Apple-Geräten) mit Dynamic Type, wie bei Apple                                                                                                  |

Nicht übernommen: Claude-Logo (Funke) und Anthropics Illustrationen aus Videos. Beides sind geschützte Marken- und Werkinhalte und gehören nicht in eine fremde App.

## Farben

| Rolle        | Wert      | Einsatz                                                                                                                           |
| ------------ | --------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Dark         | `#141413` | Text, gefüllte Buttons, gewählter Tag, aktive Chips                                                                               |
| Light        | `#faf9f5` | Hintergrund, Text auf Dark                                                                                                        |
| Orange       | `#d97757` | Nur Flächen (laut Markenrichtlinie): heute, aktiver Tab, Herz, Schalter an, Unterstreichung von Textaktionen und Links, Fokusring |
| Light Gray   | `#e8e6dc` | Haarlinien, Kartenränder                                                                                                          |
| Mid Gray     | `#b0aea5` | Deaktiviertes, Platzhalter                                                                                                        |
| Sekundärtext | `#5e5d59` | Warmes Grau derselben Familie, 6,3:1                                                                                              |

Karten weiss mit Haarlinie und kaum sichtbarem Schatten. Kleiderfarben (Fotos, Farbmuster, Farbringe, Farbbilanz) sind Daten und bleiben farbig.

## Bausteine

- Kopfleiste klebt oben und wird erst beim Scrollen zur Materialfläche.
- Tab-Leiste: Material, Symbol über Beschriftung, aktive Seite in einer orangen Kapsel.
- Buttons: abgerundete Rechtecke (10 px). Primär Dark, sekundär weiss mit Rand. Textaktionen dunkel mit oranger Unterstreichung.
- Chips als Kapseln (34 px gezeichnet, 44 px Tippfläche), Anlass als Segment-Steuerung, Checkbox-Zeilen als Schalter.
- Chat wie bei Claude: eigene Nachrichten in grauer Blase, Antworten ohne Blase.
- Datum auf Heute: grösste Grösse aus CSS, `useFitText` verkleinert es nur, wenn es mit der aktuellen Schrift nicht passt.

## Bewegung

| Was                   | Feder (Dämpfung, Antwort) |
| --------------------- | ------------------------- |
| Sheet steigt auf      | 1,0 / 0,36 s              |
| Sheet zurück nach Zug | 0,86 / 0,32 s             |
| Sheet hinaus          | 1,0 / 0,28 s              |
| Tageskarte zurück     | 0,86 / 0,32 s             |

Beim Loslassen entscheiden Projektion `(v/1000)·0,998/(1−0,998)` und Vorzeichen der Geschwindigkeit; hinter Grenzen Gummiband. Schliessen wirkt sofort, nur eine inerte Kopie gleitet hinaus; lehnt ein Fenster das Schliessen ab (z. B. beim Speichern), verschwindet die Kopie und das Sheet federt zurück. Drücken: sofort `scale(0.97)`. Reduzierte Bewegung: nur Überblendungen, kein Ziehen.

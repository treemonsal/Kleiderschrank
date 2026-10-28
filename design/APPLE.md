# Apple-Design (ab 0.35.0)

Grundlage ist der Skill `.claude/skills/apple-design` (Apple WWDC, übertragen aufs Web). Umgesetzt in `src/apple.css` (nach `journal.css` geladen), `src/spring.ts`, `src/useSheetMotion.ts` und `src/useDaySwipe.ts`.

## Zurück zum Journal-Design

Branch `backup/design-0.34.1-journal` enthält den kompletten Stand vor dem Wechsel. Schnellster Weg in diesem Stand: `import './apple.css'` in `src/main.tsx` entfernen und die Komponentenänderungen von 0.35.0 (Tab-Leiste, Bildunterschriften, Sheets) zurücknehmen.

## Farben

| Rolle                                | Hell      | Dunkel                      |
| ------------------------------------ | --------- | --------------------------- |
| Hintergrund (gruppiert)              | `#f2f2f7` | `#000000`                   |
| Fläche/Karte                         | `#ffffff` | `#1c1c1e`                   |
| Sheet (dunkel eine Ebene höher)      | `#f2f2f7` | `#1c1c1e`, Karten `#2c2c2e` |
| Text                                 | `#1d1d1f` | `#f5f5f7`                   |
| Sekundärtext (≥ 4,5:1)               | `#6a6a6f` | `#a1a1a6`                   |
| Tönung (Buttons, weisser Text 4,7:1) | `#0071e3` | `#0071e3`                   |
| Tönung als Text/Link                 | `#0066cc` | `#2997ff`                   |
| Rot (nur heute, Löschen)             | `#d70015` | `#ff453a`                   |

Erhöhter Kontrast dunkelt Tönung und Sekundärtext nach, reduzierte Transparenz macht Leisten deckend.

## Schrift

Systemschrift (SF Pro auf Apple-Geräten). Auf dem iPhone setzt `font: -apple-system-body` die Grundgrösse aus der eigenen Textgrösse (Dynamic Type); Schriftgrössen in `rem`. Grosse Titel 34 px fett mit `-0.022em`, Abschnittstitel 22 px, Fliesstext 17 px ohne Laufweite, Beschriftungen ab 12 px. Keine Kursive, keine gesperrten Grossbuchstaben ausser Wochentagskürzeln.

## Bausteine

- Kopfleiste klebt oben und wird erst zur Materialfläche, wenn Inhalt darunter liegt (`data-scrolled`).
- Tab-Leiste: Material mit Unschärfe, Symbol über Beschriftung, aktive Seite in Tönung.
- Buttons: Kapseln, primär gefüllt, sekundär grau getönt, Löschen rot getönt. Gedrückt sofort `scale(0.97)`.
- Kategorien als Kapselreihe, Anlass als Segment-Steuerung, Checkbox-Zeilen als Schalter.
- Karten ohne Rahmen und Schatten auf grauem Grund, Listen mit eingerückten Trennlinien.
- Sheets: abgerundet, Griff 36 × 5, runder Schliessen-Knopf mit 44-px-Fläche.

## Bewegung

| Was                   | Feder (Dämpfung, Antwort) |
| --------------------- | ------------------------- |
| Sheet steigt auf      | 1,0 / 0,36 s              |
| Sheet zurück nach Zug | 0,86 / 0,32 s             |
| Sheet hinaus          | 1,0 / 0,28 s              |
| Tageskarte zurück     | 0,86 / 0,32 s             |

Entscheidung beim Loslassen über die Projektion `(v/1000)·0,998/(1−0,998)` und das Vorzeichen der Geschwindigkeit, nicht nur über die Position. Hinter Grenzen Gummiband `x·d·0,55/(d+0,55·|x|)`. Reduzierte Bewegung: Sheets blenden nur, kein Ziehen, keine Skalierung.

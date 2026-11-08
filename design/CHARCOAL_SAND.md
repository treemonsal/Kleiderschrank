# Charcoal & Sand (0.38.0)

Von Tim gewählt (Vorschlag C, 08.11.2026). Ersetzt den Claude-Look 0.35.0 (gesichert im Branch `backup/design-0.37.0-claude`).

| Rolle   | Farbe                                                             |
| ------- | ----------------------------------------------------------------- |
| Grund   | `#232325` Charcoal                                                |
| Flächen | `#2b2a2b`                                                         |
| Schrift | `#eee6d8`, Zweitschrift `#b5ad9f`, leise `#878075`                |
| Linien  | `#3a3936`                                                         |
| Akzent  | `#d9c8a9` Sand (heute, Auswahl, Favorit), Schrift darauf Charcoal |

Regeln:

- Immer dunkel, unabhängig von der iPhone-Einstellung. Kein reines Schwarz, kein reines Weiss.
- Nichts leuchtet: keine Schatten, keine Unschärfe (`backdrop-filter`), kein Farbschein.
- Nur eine Flächenebene: In Karten und Sheets liegen keine weiteren Kästen (Look-Tafel, Fakten im Detail, Tag im Kalender, Stilgespräch im Chat, Wetter-Sheet).
- Konzentrische Ecken: inneres Element = äusserer Radius minus Abstand (Tausch-Knopf in der Look-Kachel, Segmente, Bilder in Karten). Tokens `--r-*` in `src/theme.css`.
- Zusammengehöriges nah beieinander, Wichtigstes gross: Look-Titel und Look-Bilder auf Heute, Namen direkt auf dem Bild.
- Keine Badges ohne Bedeutung, keine erklärenden Untertitel. Was etwas bedeutet, bleibt (z. B. „neu“ beim Verfeinern, Wetter veraltet, Tragezahl ab 1).
- Symbole: Lucide; Kleidungsstücke aus Phosphor Icons (MIT, `docs/licenses/phosphor-icons-LICENSE.txt`), weil Lucide keine Hose, kein Kleid und keine Jacke hat.

Geprüft durch `e2e/claude-design.spec.ts` (Farben, kein Leuchten, keine Box in der Box, konzentrische Ecken).

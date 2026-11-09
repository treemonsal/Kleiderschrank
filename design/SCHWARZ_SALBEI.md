# Schwarz & Salbei (0.39.0)

Designsprache der App Fits (Referenz von Tim, 08.11.2026), aber im eigenen Layout von MyStyle (Heute, Garderobe, Looks, Journal) und mit eigener Akzentfarbe. Löst Charcoal & Sand (0.38.0, design/CHARCOAL_SAND.md) ab.

Warum Fits mit Schwarz-Weiss funktioniert: Die Oberfläche ist fast unsichtbar, die Farbe kommt aus den freigestellten Kleidern. Darum gilt hier:

| Element       | Regel                                                                                                                                                                    |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Grund         | Echtes Schwarz `#000000`, eine Fläche, kein Muster                                                                                                                       |
| Schrift       | `#f5f5f7`, Zweitschrift `#a1a1a6`, leise `#6e6e73`                                                                                                                       |
| Flächen       | Grau gefüllt statt Linien: Karten `#1c1c1e` (Radius 24), Knöpfe und Chips `#2c2c2e`                                                                                      |
| Hauptaktion   | Weiss mit schwarzer Schrift, pro Ansicht möglichst nur eine                                                                                                              |
| Akzent        | Salbei `#9fc4a3`: heute, Favorit, Fortschritt. Bewusst nicht das Lila von Fits                                                                                           |
| Kleider       | Freigestellte Stücke schweben ohne Kachel (`.is-cutout`, `contain`); Namen nur für Screenreader. Fotos ohne Freistellung und Stücke ohne Foto behalten eine runde Kachel |
| Garderobe     | Drei Spalten, nur die Kleider                                                                                                                                            |
| Filter        | Wörter; der gewählte als weisse Pille. Bereiche (Anlass) als Wörter mit weisser Unterstreichung                                                                          |
| Leisten       | Seit 0.41.0 untere Leiste flach und vollbreit (Home · + · Profil, Haarlinie oben, wie youtube.com); Kopf-Icons gemeinsam in einer Kapsel                                 |
| Weiter gültig | Nichts leuchtet, keine Box in der Box, konzentrische Ecken, keine bedeutungslosen Badges                                                                                 |

Seit 0.41.0 übernommen (Wunsch): Home/Plus/Profil, Plus als Blatt von unten, Profil mit Kleidung und Outfits. Weiterhin nicht übernommen: Follower und die Farbe Lila.

Geprüft durch `e2e/claude-design.spec.ts`.

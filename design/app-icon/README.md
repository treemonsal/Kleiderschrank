# MyStyle – Platin-Icon

Freigegebenes Motiv für Version 0.11.1: plastischer, silberner Kleiderbügel auf vollflächigem Graphit. Keine Schrift, keine vorgerundeten Aussenecken. Das Betriebssystem setzt seine eigene Icon-Maske.

`platinum-master.png` ist das unveränderte, mit dem ImageGen-Werkzeug am 16. Oktober 2026 erzeugte Original (1254 × 1254 Pixel, RGB). Keine Nutzerfotos oder externen Marken als Vorlage. Gestaltungsbrief: ein einzelner kräftiger, satinierter Platin-Bügel, klare offene Dreiecksform, ruhiger dunkler Hintergrund mit dezenter Beleuchtung, ohne lila Akzente, Sterne oder zusätzliche Zeichen. Die Creative-Production-Board-Funktion war in dieser Umgebung nicht verfügbar; das tatsächliche erzeugte Motiv wurde direkt geprüft.

Deterministische Exporte: `python scripts/export_app_icons.py` (Python 3 und Pillow als reine Design-Werkzeuge). Das Skript verändert das Original nicht. Es erzeugt deckende RGB-PNGs in 180, 192 und 512 Pixeln, mit zusätzlichem Innenabstand für die Android-Maskierung. Das sichtbare Motiv dieser Variante liegt innerhalb des zentralen sicheren Kreises mit Radius 40 % der Icon-Breite. `exports.json` enthält Dateinamen, Grössen und SHA-256-Prüfsummen.

Die neuen Dateinamen werden in HTML und Manifest verwendet und vom Service Worker vorgehalten. Alte Adressen bleiben mit demselben neuen Motiv als kompatible Aliase erhalten. Der Installationspfad, lokale Daten und Sicherungsformate ändern sich nicht. Ein bereits von iOS gespeichertes Homescreen-Icon muss sich dadurch nicht sofort ändern; hierfür ist kein automatisches Löschen oder Neuinstallieren vorgesehen.

# MyStyle

Privater Fashion-Begleiter für das eigene iPhone. Eine installierbare, deutschsprachige PWA, die Kleidung lokal verwaltet. Kein App Store, keine Abonnements, keine bezahlten APIs, kein Konto und keine externen Bilddienste. Eigene Gestaltung, inspiriert von klaren iPhone-Oberflächen und moderner Fashion-Ästhetik.

## Erste Version

- Startseite mit persönlichem Bestand, Favoriten und zuletzt ergänzten Stücken.
- Kleiderschrank mit Kamera-/Fotoimport, Galerie, Suche, Kategorie- und Favoritenfilter.
- Hinzufügen, Anzeigen, Bearbeiten und Löschen; Name, Kategorie, Farbe, Marke, Jahreszeiten, Stilrichtungen und Notizen.
- Fotos werden im Browser auf höchstens 1600 Pixel verkleinert, als JPEG neu erzeugt und mit den Angaben in IndexedDB gespeichert. Keine Fotoübertragung, keine Beispielstücke als eigener Bestand.
- Versionierte JSON-Sicherungen inklusive Fotos, validierter Import mit Zusammenführen oder bewusstem Ersetzen des Bestands.
- Helles, dunkles oder systemgesteuertes Erscheinungsbild, Safe Areas, zugängliche Navigation, Offline-App-Shell und PWA-Installation.

## Spätere Funktionen

1. Nachvollziehbarer, lokaler Outfit-Generator ausschliesslich aus vorhandenen Stücken; Farbharmonie, Stil, Anlass, Saison, Favoriten und Ablehnungen.
2. Outfit-Speicherung und Kalender für geplante/getragene Kombinationen.
3. Optionales Wetter über Open-Meteo. Standort ausschliesslich nach Freigabe, alternativ manueller Ort. Keine Standortabfrage in Version 1.
4. Persönliche Präferenzen und Nutzungsfeedback.
5. Automatische Merkmale und lokale Freistellung erst nach Evaluation von Zuverlässigkeit, iPhone-Leistung und kostenloser Lizenzierung. Immer manuell korrigierbar.
6. Outfit-Fotobewertung nur bei realistisch kostenloser, zuverlässiger Bildanalyse. Keine simulierte KI-Bewertung; bis dahin allenfalls klar gekennzeichnete manuelle Stil-Checkliste.

## Datenschutz und Grenzen

Alle Kleidungsdaten bleiben im Browserprofil des Geräts. Kein Analytics, keine externen Fonts, kein Backend und keine geheimen Schlüssel im Frontend. App-Downloads und Hostingzugriffe sind technisch notwendige Netzwerkzugriffe. Backups enthalten private Fotos und sind nicht verschlüsselt. Gerätecode und sichere Aufbewahrung sind wichtig.

iOS kann Website-Daten entfernen; privates Surfen, Löschen von Safari-Daten, Deinstallation, Gerätewechsel und eine andere Domain können den Bestand unzugänglich machen. Regelmässig eine Sicherung in Dateien/iCloud Drive ablegen. Browserdaten sind kein dauerhaft garantiertes Backup. Ein Export enthält höchstens 100 MB und 1000 Stücke; grössere Sammlungen benötigen später ein gestreamtes Archivformat. Einzelne Fotoquellen höchstens 20 MB. Kein Hintergrundabgleich zwischen Geräten.

## Qualitätsziel

Reale, überprüfbare Funktionen; verständliche Fehler und leere Zustände; keine Attrappen. Automatisierte Daten- und Browserprüfungen, Darstellung bei 375, 390 und 430 Pixeln sowie dunkles Design. Echte iPhone-Tests bleiben vor langfristiger Verwendung nötig (Kamera, Fotomediathek, Download/Import, Homescreen, Offline, Speicherdruck).

Es wird auf ausdrücklichen Wunsch keine AGENTS.md erstellt.

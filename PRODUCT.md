# MyStyle

Privater Fashion-Begleiter für das eigene iPhone. Eine installierbare, deutschsprachige PWA, die Kleidung lokal verwaltet. Kein App Store, keine Abonnements, keine bezahlten APIs, kein Konto und keine externen Bilddienste. Eigene Gestaltung, inspiriert von klaren iPhone-Oberflächen und moderner Fashion-Ästhetik.

## Erste Version

- Startseite mit persönlichem Bestand, Favoriten und zuletzt ergänzten Stücken.
- Kleiderschrank mit Kamera-/Fotoimport, Galerie, Suche, Kategorie- und Favoritenfilter.
- Hinzufügen, Anzeigen, Bearbeiten und Löschen; Name, Kategorie, Farbe, Marke, Jahreszeiten, Stilrichtungen und Notizen.
- Fotos werden im Browser auf höchstens 1600 Pixel verkleinert, als JPEG neu erzeugt und mit den Angaben in IndexedDB gespeichert. Keine Fotoübertragung, keine Beispielstücke als eigener Bestand.
- Versionierte JSON-Sicherungen inklusive Fotos, validierter Import mit Zusammenführen oder bewusstem Ersetzen des Bestands.
- Helles, dunkles oder systemgesteuertes Erscheinungsbild, Safe Areas, zugängliche Navigation, Offline-App-Shell und PWA-Installation.

## Version 0.2 – lokale Outfits

- Nachvollziehbarer, begrenzter regelbasierter Generator für vollständige Looks aus vorhandenem Bestand; Anlass, Saison, gewünschter Stil und optionale Accessoires.
- Saisonfilter und konservative Anlassregeln anhand eigener Angaben. Einfache Farbakzent-Regeln, keine Bildanalyse, keine garantierte Harmonie, kein Wetter.
- Outfits speichern, benennen, löschen und favorisieren; Stücke referenzieren existierende IDs. Abhängige Outfits und Rückmeldungen werden bei Kleidungsstück-Löschung atomar entfernt.
- Lieblingsfarben/-stile, Kleidungsfavoriten und positives Feedback beeinflussen die Gewichtung. Ablehnungen gelten für die konkrete Kombination und sind zurücksetzbar.
- Datenbankmigration erhält den bestehenden Kleiderschrank. Sicherungsformat 2 umfasst auch Outfits, Feedback und Vorlieben; Format 1 bleibt lesbar.
- Gegenprüfungen und Fehlerbehebungen siehe REVIEW.md.

## Spätere Funktionen

1. Erweiterte Kalenderauswertung und Nutzerfeedback nach Erprobung im Alltag.
2. Genauere Farbangaben und weitere nachvollziehbare Kombinationsregeln nach Erprobung der ersten Vorschläge.
3. Feinere Wetterregeln nach Ergänzung zuverlässiger Material- und Wärmeangaben.
4. Erweiterte persönliche Empfehlungen anhand tatsächlich getragener Outfits.
5. Automatische Merkmale und lokale Freistellung erst nach Evaluation von Zuverlässigkeit, iPhone-Leistung und kostenloser Lizenzierung. Immer manuell korrigierbar.
6. Outfit-Fotobewertung nur bei realistisch kostenloser, zuverlässiger Bildanalyse. Keine simulierte KI-Bewertung; bis dahin allenfalls klar gekennzeichnete manuelle Stil-Checkliste.

## Datenschutz und Grenzen

Alle Kleidungsdaten bleiben im Browserprofil des Geräts. Kein Analytics, keine externen Fonts, kein Backend und keine geheimen Schlüssel im Frontend. App-Downloads und Hostingzugriffe sind technisch notwendige Netzwerkzugriffe. Backups enthalten private Fotos und sind nicht verschlüsselt. Gerätecode und sichere Aufbewahrung sind wichtig.

## Version 0.3 – Alltag und freiwilliges Wetter

- Kalender mit einem gespeicherten Look pro lokalem Tag, geplant/getragen, korrigierbarem Status und Notizen. Zukünftige Looks können nicht als getragen erfasst werden. Bis 3000 Tage, Notizen bis 200 Zeichen.
- Aus bestätigten Tagen berechnete Tragehäufigkeit; keine doppelten oder verwaisten Zähler. Kleine zusätzliche Gewichtung bereits getragener Stücke.
- Manuelle Ortssuche oder einmaliger Standortzugriff erst nach Nutzeraktion. Koordinaten werden auf zwei Dezimalstellen gerundet. Wetterabruf und Berücksichtigung in Vorschlägen sind separate bewusste Aktionen.
- Open-Meteo ohne Schlüssel für privaten Gebrauch. Bis sieben Wettertage, sichtbare Quelle/Zeitzone/Datenstand, sechs Stunden Aktualitätsgrenze, Offline-Anzeige und lokales Vergessen. Keine automatischen Wetteraufrufe und keine Übertragung von Fotos oder Kleidung. Der Dienst erhält Ortsnamen beziehungsweise gerundete Koordinaten und technisch die IP-Adresse.
- Grobe Temperatur-/Saisonregeln und Regenhinweis, keine behauptete Material-, Passform- oder Wasserdichtigkeitsanalyse.
- Datenbankversion 3 erhält die bisherigen Daten. Sicherungsformat 3 enthält Kalender und gegebenenfalls Ortsdaten/Vorhersage; Format 1 und 2 bleiben lesbar. Backups enthalten Ortsdaten unverschlüsselt, wenn Wetter eingerichtet wurde.
- Beide echten Wetterendpunkte inzwischen per HTTPS erreichbar. Cloud-Chromiums Proxy-Zertifikatsvertrauen verhindert noch den zusätzlichen Live-Browsernachweis; kontrollierte API-Tests ersetzen diesen und einen echten iPhone-Test nicht.

iOS kann Website-Daten entfernen; privates Surfen, Löschen von Safari-Daten, Deinstallation, Gerätewechsel und eine andere Domain können den Bestand unzugänglich machen. Regelmässig eine Sicherung in Dateien/iCloud Drive ablegen. Browserdaten sind kein dauerhaft garantiertes Backup. Ein Export enthält höchstens 100 MB und 1000 Stücke; grössere Sammlungen benötigen später ein gestreamtes Archivformat. Einzelne Fotoquellen höchstens 20 MB. Kein Hintergrundabgleich zwischen Geräten.

## Qualitätsziel

Version 0.4 ergänzt eine optionale lokale Farbprobe mit expliziter Übernahme in das vorhandene Farbfeld. Keine Fotoübertragung, neue Laufzeitabhängigkeit oder Modelldatei. Fotos bleiben unverändert; manuelle Korrektur und normales Speichern/Verwerfen gelten weiter. Ausführliche Entscheidung zu Bild-KI und ausstehenden Geräteprüfungen in IMAGE_ASSISTANCE.md. Eine veraltete Outfit-Namensbearbeitung wird nun mit Konflikthinweis abgewiesen; Ersetzungsimporte nennen sämtliche betroffenen Datenarten.

Reale, überprüfbare Funktionen; verständliche Fehler und leere Zustände; keine Attrappen. Automatisierte Daten- und Browserprüfungen, Darstellung bei 375, 390 und 430 Pixeln sowie dunkles Design. Echte iPhone-Tests bleiben vor langfristiger Verwendung nötig (Kamera, Fotomediathek, Download/Import, Homescreen, Offline, Speicherdruck).

Die Entwicklungsregeln stehen nach ausdrücklicher Freigabe in AGENTS.md.

## Version 0.5 – echte lokale Freistellung und Bereitstellung

- Optionale experimentelle Freistellung mit U2NETP/ONNX Runtime Web, ohne Fotoübertragung oder kostenpflichtige API. Einmaliger bewusster Download von rund 19 MB, lokale SHA-256-Prüfung und Offline-Cache; kein Hintergrunddownload des Modells.
- Berechnung in beendbarem Worker mit einem CPU/WASM-Thread; Vorschau, bewusste Übernahme, Verwerfen und Rückkehr zum Original. Original und transparente PNG werden separat gespeichert. Keine automatische Kleidungs-/Stilerkennung oder Fotobewertung behauptet.
- Additive Datenbankversion 4; Sicherungsversion 4 umfasst beide Fotovarianten. Formate 1–3 bleiben lesbar, alle Bilddateien werden vor Import decodiert. Kapazitätsgrenzen zählen beide Blobs.
- Selbst gehostete Modell-/Laufzeitdateien und Lizenzhinweise. Keine Bezahlangebote, keine zusätzlichen Schlüssel. Cache kann ohne Verlust von Fotos entfernt werden.
- Root-/GitHub-Projektseiten-Build und manuell auslösbarer Pages-Workflow. Keine Änderung der Repository-Sichtbarkeit; private Repositories werden vom Workflow übersprungen.
- Qualitätsnachweis auf echtem iPhone und tatsächliche öffentliche Bereitstellung fehlen weiterhin. Die experimentelle Option wird getrennt von den bereits nutzbaren Kernfunktionen angeboten; sie ist keine Zusicherung zuverlässiger iPhone-Segmentierung.

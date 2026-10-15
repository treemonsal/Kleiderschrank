# Entwicklungsplan

## Phase 1 – zuverlässiger privater Kleiderschrank

- [x] Projektstruktur, Produktanforderungen und Entwicklungsplan
- [x] React/TypeScript/Vite, Tailwind und lokales Datenmodell
- [x] Designsystem, Startseite, Bottom Navigation und Dunkelmodus
- [x] Fotos, Galerie, Suche, Filter und vollständige Bearbeitung
- [x] Export/Import inklusive Bildern mit Validierung und atomarem Schreiben
- [x] PWA, Offline-App-Shell und Updatehinweis
- [x] Automatisierte Tests, Produktionsbuild und iPhone-Bildschirmgrössen
- [x] Einfache Start-, iPhone- und Hostinganleitung
- [x] Reproduzierbarer Cloud-Installationsablauf mit eingefrorener Lockdatei und Tests

## Phase 2 – Outfits aus dem eigenen Bestand

- [x] Bestehende Version aus Sicht von Datenverlust, Fehlerfällen, Migration und Bedienung gegenprüfen; Befunde in REVIEW.md
- [x] Entwicklungsregeln in der nun freigegebenen AGENTS.md
- [x] Lokaler Generator mit echten Bestandsreferenzen, vollständigen Basis-Looks und erklärbaren Regeln
- [x] Anlass, Saison, Stil und optionale Accessoires; fehlende Angaben transparent behandeln
- [x] Neue Kombinationen, Speichern, Benennen, Löschen und Favorisieren von Outfits
- [x] Lieblingsfarben/-stile und positives/negatives Feedback lokal merken
- [x] Abhängige Outfits/Feedback bei Kleidungsstück-Löschung atomar entfernen
- [x] Additive Datenbankmigration und vollständige Sicherung Version 2; alte Sicherungen weiterhin lesen
- [x] Gegenprüfungen, Regressionstests und neue Browserabläufe

Phase 2 ist abgeschlossen. Keine automatische Bilderkennung oder vorgetäuschte KI-Bewertung in Version 0.2.

## Phase 3 – Alltag und Wetter

- [x] Additive Datenbankversion 3 mit Kalender und optionalem Wetterort
- [x] Lokale Kalendertage, Monatswechsel, geplante/getragene Looks und Notizen
- [x] Zukünftige Tragebestätigungen verhindern; veraltete Änderungen/Löschungen erkennen
- [x] Berechnete Tragehäufigkeit und leichte Gewichtung bereits getragener Stücke
- [x] Abhängige Kalendereinträge atomar bei Outfit-/Kleidungsstück-Löschung entfernen
- [x] Ortssuche und Standort ausschliesslich nach Nutzeraktion, gerundete Koordinaten
- [x] Wetterabruf, bewusste Aktivierung für Vorschläge, Quelle/Zeitpunkt/Zeitzone und Aktualitätsgrenze
- [x] Grobe Temperatur-/Saisonregeln, vorhandene Jacken und ehrlicher Regenhinweis
- [x] Offline-Wetter, kein automatischer Abruf und lokales Vergessen
- [x] Vollständige Sicherung Version 3; alte Sicherungen Version 1/2 lesen
- [x] Automatisierte Daten-/Browserprüfungen und iPhone-Bildschirmgrössen
- [ ] Echter Live-Wetterabruf nach Anwendung der Netzwerkfreigabe

Die Softwarefunktionen sind in Version 0.3 implementiert. Die beiden Open-Meteo-Domains wurden im Cloud-Konfigurationsentwurf ergänzt; aktuelle Live-Anfragen scheiterten noch am Proxy (CONNECT 403). Die Netzwerkfreigabe muss in den Umgebungseinstellungen gespeichert/angewendet und die Umgebung veröffentlicht werden. Erst danach kann der echte Abruf bestätigt werden. Die automatisierten Wetterprüfungen verwenden kontrollierte Antworten, keine erfundenen Live-Daten.

## Phase 4 – lokale Assistenz evaluieren

Bildfreistellung und Erkennung auf realem iPhone prüfen: Genauigkeit, Downloadgrösse, Speicherverbrauch, Laufzeit und Lizenz. Bildbewertung bleibt ausstehend, solange keine geeignete kostenlose Lösung existiert. Keine Bildübertragung ohne ausdrückliche Zustimmung.

## Testprotokoll

Ausgeführt am 15. Oktober 2026 in der Linux-Cloud-Umgebung mit Node 24.19.0:

- `npm run build`: bestanden, inklusive TypeScript-Prüfung und erzeugtem Service Worker.
- `npm test`: 19 Tests bestanden. Suche/Filter, Sicherungsformat, eingebettete Bilder, ungültige Eingaben, Zusammenführen, Ersetzen und Transaktions-Rollback.
- `npm run test:e2e`: 7 Chromium-Browserprüfungen bestanden. Fotoaufnahme-Importpfad mit Datei, JPEG-Verarbeitung, Bearbeiten, IndexedDB-Persistenz nach Neuladen, Suche, Filter, Favoriten, Löschbestätigung, Export und Wiederherstellung inklusive Foto, fehlerhafte Sicherung, Offline-Neustart und Schutz ungespeicherter Eingaben.
- Layouts bei 375, 390 und 430 Pixeln: Screenshots erstellt, keine horizontalen Überläufe. Startseite, dunkle Einstellungen und Editor visuell geprüft. Hell-/Dunkelmodus bleibt nach Neuladen erhalten. Kein externer Netzwerkzugriff im Haupt-Funktionstest.
- `VITE_BASE_PATH=/Kleiderschrank/ npm run build`: bestanden. Separater Browser-Smoke-Test für diesen Unterpfad: App, Service Worker, alle Manifest-Icons und Offline-Neuladen bestanden, keine JavaScript-Fehler.
- `npm audit --omit=dev`: keine bekannten Sicherheitsmeldungen für Laufzeitabhängigkeiten zum Prüfzeitpunkt.
- Gesamter Installationsablauf mit `npm ci --no-fund --no-audit`, Build, 19 Datentests und 7 Browserprüfungen erneut erfolgreich ausgeführt. Entwicklungsserver gestartet; separate Browserprüfung für Darstellung, Navigation und Editor bestanden.

Ein anfänglicher Offline-Test zeigte, dass der neue Service Worker die bereits offene Seite noch nicht übernahm. `clientsClaim` wurde aktiviert; der vollständige Browserlauf besteht anschliessend einschliesslich Offline-Prüfung. Eine fehlerhafte Suchtest-Fixture wurde korrigiert (zwei Stücke hatten unbeabsichtigt dieselbe Marke).

Nicht ausgeführt: echter iPhone-/Safari-Test, reale Kamera/HEIC, Home-Bildschirm-Installation, Speicherdruck, reale Hosting-Veröffentlichung und WebKit-Testlauf. Der zusätzliche Playwright-Browserdownload wurde mit „Domain forbidden“ blockiert; der vorhandene System-Chromium wurde stattdessen erfolgreich genutzt. WebKit bleibt optional und ist kein behaupteter Safari-Nachweis.

### Erneute Prüfung und Version 0.2

Am selben Tag nach der Gegenprüfung und Implementierung von Phase 2 ausgeführt:

- Produktionsbuild inklusive TypeScript und PWA: bestanden.
- `npm test`: 37 Tests bestanden. Neu unter anderem Datenbankmigration, gleichzeitige Favoritenaktionen, veraltete Bearbeitungen, Bestandsgrenzen, Outfit-Vollständigkeit, Referenzen, Saison-/Anlassregeln, Vorlieben, Ablehnungen und vollständige Wiederherstellung aller neuen Datenarten mit Transaktions-Rollback.
- `npm run test:e2e`: kompletter Lauf mit 13 Chromium-Prüfungen bestanden. Alle ursprünglichen Abläufe sowie neue Outfit-, Feedback-, Vorlieben-, Sicherungs- und Löschabläufe. Eine beschädigte Bilddatei mit gültiger JPEG-Signatur wird vor dem Import abgewiesen.
- Neue Outfit-/Vorliebenansichten bei 375, 390 und 430 Pixeln auf Überlauf geprüft, auch dunkel. Screenshots von Outfit-Auswahl und gespeichertem Look visuell geprüft.
- Einheitliche Formatierung und Format-Prüfbefehl eingeführt. Keine Veränderung der Laufzeitabhängigkeiten oder zusätzliche externen Dienste.

Der vollständige neue Browserablauf scheiterte zunächst an einem unpassenden Testselektor für das Kategorie-Auswahlfeld. Nach Auswahl über die tatsächliche Combobox-Rolle wurden die Abläufe erfolgreich ausgeführt. Dies war ein Testproblem; die Anwendung wurde nicht zum Umgehen des Tests vereinfacht.

Die Grenzen für echte iPhone-/Safari-, Kamera-, Installations-, Hosting- und WebKit-Prüfungen gelten weiterhin. Details und behobene Befunde stehen in REVIEW.md.

### Version 0.3

- Produktionsbuild inklusive TypeScript und PWA bestanden.
- `npm test`: 56 Tests bestanden. Neu: Migration von Version 2, Schaltjahre/Monatsgrenzen, lokale Tage, Tragehäufigkeit, zukünftige Tragetage, konkurrierende Kalenderbearbeitung/-löschung, abhängige Löschung, Wettervalidierung, Ablauf, gerundete Koordinaten und vollständige Sicherung/Wiederherstellung.
- `npm run test:e2e`: vollständiger Lauf mit 22 Chromium-Prüfungen bestanden. Alle bisherigen Abläufe plus Kalenderplanung, Bestätigung, Offline-Wiederherstellung, Abhängigkeiten, bewusste Wetteranfragen, Standortablehnung/-freigabe, grobe Koordinaten, Serverfehler, Cache, Alterung, lokale Zeitzone und neue Layouts bei 375/390/430 Pixeln.
- Die Kalender-/Wetterdarstellung und dunkle Kalenderansicht wurden anhand der erzeugten Screenshots visuell geprüft.
- Ein Test-Matcher bewertete ein natives `option disabled` inkorrekt als aktiv. Die Prüfung verwendet jetzt die native `disabled`-Eigenschaft; zukünftige Tragebestätigungen werden zusätzlich im Datenmodell zurückgewiesen. Der vollständige Kalenderablauf besteht.
- Live-API und echtes iPhone bleiben unbestätigt. Standort und Wetter in Browserprüfungen sind Testdaten; kein realer Gerätestandort wurde angefragt.

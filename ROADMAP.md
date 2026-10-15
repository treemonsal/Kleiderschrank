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
- [x] Echte Ortssuche und Vorhersage per HTTPS nach Anwendung der Netzwerkfreigabe
- [ ] Zusätzlicher Live-Browser-/CORS-Nachweis und echter iPhone-Test

Die Softwarefunktionen sind in Version 0.3 implementiert. Nach der Domainfreigabe lieferten beide echten Open-Meteo-Endpunkte am 15. Oktober 2026 HTTP 200: Zürcher Ort und sieben Vorhersagetage in Europe/Zurich mit erwarteten Einheiten. Die automatisierten Wetterprüfungen verwenden weiterhin kontrollierte Antworten. Cloud-Chromium meldet beim zusätzlichen echten Browserabruf ERR_CERT_AUTHORITY_INVALID für das Cloud-Proxy-Zertifikat. Dessen Aufnahme in den Browser-Vertrauensspeicher wurde von der automatischen Freigabeprüfung abgelehnt und nicht durchgeführt. Browser-CORS und iPhone bleiben offen; keine TLS-Prüfung deaktiviert.

## Phase 4 – lokale Assistenz

- [x] Offizielle Dokumentation und Lizenzen lokaler Verfahren prüfen; Grenzen und Quellen in IMAGE_ASSISTANCE.md
- [x] Kleine lokale Farbprobe ohne Modell oder Upload, mit expliziter Übernahme und manueller Korrektur
- [x] Antippen, Tastatur/Positionsregler, Offline und unveränderte Fotodaten prüfen
- [x] Unabhängige Gegenprüfung: Outfit-Namenskonflikte verhindern und Ersetzungswarnung vervollständigen
- [x] Konkrete U2NETP-Modellgewichte einschließlich Lizenz, Prüfsumme und Offline-Auslieferung auswählen
- [ ] Freistellung/Erkennung auf echtem iPhone prüfen: Genauigkeit, Downloadgröße, Speicher und Laufzeit
- [x] Echte Freistellung als getrennte experimentelle Option mit Vorschau und erhaltenem Original integrieren
- [ ] Erst nach geeigneter Geräteprüfung Freistellung als stabile iPhone-Funktion einstufen; automatische Merkmale bleiben offen

Version 0.4 lieferte die Farbprobe. Version 0.5 ergänzt echte U2NETP-Inferenz im Browser, bewusst experimentell bis zur Geräteprüfung. Bildbewertung und Kleiderklassifikation bleiben ausstehend. Keine Bildübertragung ohne ausdrückliche Zustimmung. Der nächste Qualitätsnachweis für das Modell ist der dokumentierte echte iPhone-Test, keine behauptete Simulation.

## Bereitstellung und letzte externe Nachweise

- [x] Manuell startbarer GitHub-Pages-Workflow mit festen Action-Commits, Format-/Datenprüfung und Projektpfad-Build
- [x] Private Repositories im Workflow überspringen; keine Sichtbarkeits- oder Tarifänderung
- [x] Einfache Installations- und echte Gerätecheckliste in IPHONE_CHECK.md
- [ ] GitHub Pages aktivieren, Workflow tatsächlich ausführen und öffentliche HTTPS-Seite prüfen
- [ ] Cloud-Browser-Vertrauen für echten Wetter-/CORS-Test ausdrücklich freigeben
- [ ] Echten iPhone-Test durchführen

GitHub-API und Pages-Domain wurden in dieser Cloud mit Proxy-403 abgewiesen. Erforderliche Domainergänzungen sind als Entwurf gespeichert; Speichern ist kein Laufzeit-/Veröffentlichungsnachweis. Die erneut versuchte Aufnahme der Cloud-Proxy-CA wurde trotz allgemeiner Fertigstellungsfreigabe vom Auto-Review abgelehnt: Diese dauerhafte Vertrauensänderung erfordert eine ausdrückliche Einzelzustimmung. Keine Änderung ausgeführt, kein TLS-Bypass.

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

### Version 0.4

- Produktionsbuild/TypeScript/PWA und Formatprüfung bestanden; keine neue Laufzeitabhängigkeit. Datenbank-/Sicherungsformat bleibt Version 3.
- `npm test`: 75 Tests bestanden. Neu: Farbzuordnung, Medianprobe, Positionen/Ränder/Transparenz, unveränderte Pixel sowie konkurrierende Outfit-Bearbeitung, gelöschte Looks und monotoner Versionszeitpunkt auch bei zurückgestellter Uhr.
- `npm run test:e2e`: kompletter Lauf mit 31 Chromium-Prüfungen bestanden. Neu: bewusste Farbübernahme, Verwerfen, Persistenz, identische exportierte Fotodaten, Tastatur, Offline ohne externe Anfragen, Fotowechsel/Entfernen, defektes Ersatzfoto und drei dunkle Bildschirmbreiten. Zwei-Tab-Konflikt und vollständiger Hinweis vor Ersetzen mit älterem Backup geprüft.
- Der erste neue Layoutlauf verwendete versehentlich „Start“ als Testselektor statt des vorhandenen Navigationslabels „Heute“. Selektor korrigiert; danach kompletter Lauf erfolgreich. Keine Anwendungseinschränkung zum Umgehen des Tests.
- Dunkle Farbprobe bei 390 Pixeln anhand Screenshot visuell geprüft. Synthetische Farbflächen belegen Funktion, keine Genauigkeit bei realer Kleidung.
- Echte Wetterendpunkte nun per HTTPS erfolgreich; Live-Browserprüfung durch Cloud-Chromiums Zertifikatsvertrauen blockiert. Kein GPS verwendet, keine Prüfung umgangen. Details oben und in REVIEW.md.
- Echte iPhone-/Safari-/WebKit-/HEIC-/Installations-/Speicherdruck- und Hostingprüfungen sowie Modellbenchmarks weiterhin nicht ausgeführt.

### Version 0.5

- Echtes U2NETP-Modell, Lizenzhinweise und ONNX Runtime Web lokal integriert. Vorschau/Übernahme, erhaltenes Original, Abbruch und separat löschbarer Offline-Cache. Keine Fotos übertragen, keine kostenpflichtige API. Experimentell bis zum echten iPhone-Test.
- Datenbank-/Sicherungsformat 4 mit Original und transparentem PNG; Formate 1–3 lesbar. Beide Bilder validiert und in Kapazitätsgrenzen einbezogen.
- `npm ci`, Produktionsbuild/TypeScript/PWA, 79 Datentests, 35 Chromium-Browserprüfungen und Formatprüfung bestanden. Tests umfassen echte Inferenz, Offline-Cache, Bilder-Wiederherstellung und Fehlerfälle. `npm audit --omit=dev` ohne bekannte Laufzeit-Schwachstellen zum Prüfzeitpunkt.
- Projektpfad `/Kleiderschrank/` separat einschließlich Icons, echter Inferenz und Offline-Neuladen/erneuter Inferenz geprüft. Passende Base-Konfiguration auch beim lokalen Preview nötig. KI-Vorschau auf synthetischem Testhemd visuell geprüft.
- Manuell auslösbarer GitHub-Pages-Workflow und Gerätecheckliste vorbereitet. Keine öffentliche Veröffentlichung behauptet. Echte iPhone-/Safari-/Kamera-/HEIC-/Speicherdruck-/Modelldatenqualitätsprüfungen bleiben offen.
- Entwicklungsstart nach `npm ci` separat mit echter KI geprüft. Nachträgliche Vite-Neuladung beim ersten Worker durch frühzeitige ONNX-Abhängigkeitsoptimierung behoben; ungespeicherter Testname bleibt erhalten.

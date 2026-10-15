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

Lokaler regelbasierter Generator, erklärbare Kombinationen, Favoriten und Ablehnungen, Stilpräferenzen. Keine fiktiven Kleidungsstücke. Gespeicherte Outfits referenzieren existierende IDs; Löschungen berücksichtigen.

## Phase 3 – Alltag und Wetter

Outfit-Kalender, geplant/getragen, optionale Open-Meteo-Abfrage nach Standortfreigabe oder manueller Ortswahl. Offline-Fallback und sichtbarer Wetterzeitpunkt.

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

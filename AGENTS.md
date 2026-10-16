# MyStyle – Regeln für die Weiterentwicklung

## Produkt und Zusammenarbeit

- Deutschsprachige iPhone-PWA mit getrennten lokalen Kleiderschränken pro Gerät. Anforderungen in PRODUCT.md, Fortschritt in ROADMAP.md, Bedienung in README.md aktuell halten.
- Normale technische Entscheidungen selbstständig treffen. Bei Kosten, erforderlichen Zugangsdaten und echten offenen Produktentscheidungen nachfragen.
- Bestehenden Checkout benutzen; Cloud-Aufgaben sind bereits isoliert. Ohne ausdrücklichen Auftrag keine zusätzlichen Git-Worktrees anlegen.

## Datenschutz und Kosten

- Keine bezahlten APIs, Abonnements oder Zahlungsdaten. Externe Foto-KI ist seit 15.10.2026 ausdrücklich gewünscht, weiterhin komplett kostenlos. Nur nach aktivierter Foto-Freigabe an die klar benannten und freigegebenen Dienste senden. Community-Dienste speichern gegebenenfalls temporäre Dateien; keine falschen Zusagen über deren Löschdauer machen.
- Seit 16.10.2026 ist Online-Outfit-Beratung mit ausgewählten gespeicherten Kleidungsfotos, Angaben, Stilwunsch und Wetterwerten ausdrücklich gewünscht. Kostenloser Qwen3-VL-Outpost-Dienst; vorhandene Community-Freigabe plus klar benannte Startaktion. Keine automatische Freigabe für andere Nutzer und kein vollständiger Sammlungs-/Sicherungsupload.
- Fotos, Kleidung, Outfits und Präferenzen lokal in IndexedDB speichern. Kein Tracking, keine externen Fonts, keine Anbieter-/Administrationsschlüssel im Frontend. Der persönliche Server-Verbindungscode bleibt nur in lokalen Geräteeinstellungen, nie im Backup.
- Standort erst nach ausdrücklicher Freigabe verwenden; manuellen Ort als Alternative anbieten.
- Keine simulierten KI-Ergebnisse oder funktionslosen Aktionen. Regeln und Grenzen verständlich benennen.
- Lokale KI nur nach bewusster Aktion starten; Modelle/Laufzeit selbst hosten, Lizenzen und Prüfsummen erhalten. Keine großen Modelldateien automatisch beim App-Start laden.

## Umsetzung

- React/TypeScript, Vite, Tailwind und Dexie nutzen. Abhängigkeiten sparsam ergänzen und Lockdatei erhalten.
- Funktionen in kleine, verständliche Module trennen. Reine Fachlogik getrennt von UI und Speicherung testen.
- Schreibvorgänge, Importe und abhängige Löschungen atomar ausführen. Schemaänderungen als additive Dexie-Migrationen; bestehende Daten erhalten.
- Jede neu gespeicherte Datenart in Export/Import einbeziehen. Alte Sicherungen weiterhin lesbar halten. Fehlerhafte Sicherungen dürfen vorhandene Daten nicht verändern.
- Bei Freistellung das gespeicherte Originalfoto separat erhalten; Vorschau bewusst übernehmen, abbrechen und zum Original zurückkehren können. Beide Fotovarianten validieren, sichern und auf die Kapazität anrechnen. Worker nach Abschluss/Abbruch beenden.
- Outfits ausschliesslich aus tatsächlich vorhandenen, eindeutig referenzierten Kleidungsstücken erzeugen. Fehlende Kategorien und nur geschätzte Farbharmonie offen benennen.
- iPhone-Safe-Areas, mindestens 44 Pixel grosse wichtige Touch-Ziele, Tastaturbedienung, echte Beschriftungen, ausschliesslich Dunkelmodus und reduzierte Bewegung berücksichtigen.

## Prüfung und Abschluss

- Änderungen aus Sicht von Datenverlust, Fehlerfällen, Zugänglichkeit, Datenschutz und Migration prüfen.
- Relevante Regressionstests hinzufügen; Build, Datentests und betroffene Browserabläufe tatsächlich ausführen. Nicht ausgeführte Tests ausdrücklich so bezeichnen.
- Standard: `npm run build`, `npm test`, `npm run test:e2e`. Chromium ist in dieser Cloud bereits unter /usr/bin/chromium vorhanden. WebKit ist optional; Chromium-Emulation ist kein echter Safari-/iPhone-Test.
- Benutzerdateien und fremde Änderungen erhalten. Keine Secrets, privaten Fotos oder generierten Test-/Builddateien einchecken.
- Geprüfte Änderungen mit aussagekräftigem Commit sichern und im bereits autorisierten Projektablauf auf GitHub pushen. Kein Force-Push.

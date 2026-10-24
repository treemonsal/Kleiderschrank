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

- Seit 19.10.2026 ist ein persönlicher KI-Chat ausdrücklich gewünscht: eigener gerätelokaler Opt-in, bestehender kostenloser Qwen3-VL-Outpost/8B-Dienst, pro Sendung höchstens 40 Kleidungsangaben und sechs alte Nachrichten plus Vorlieben/Wetter. Keine Kleidungsfotos, Notizen oder Koordinaten. Browser-Diktieren/Vorlesen nur nach eigener Aktion; keine Audiodateien speichern. Verlauf in Datenbankversion 5 erhalten. Seit Version 0.20 gilt Sicherungsformat 8 mit Lesbarkeit von 1–7. Keine stillen Daten-/Kalendereingriffe durch Modelltext; Look-Referenzen beim bewussten Speichern erneut prüfen.

- Seit 19.10.2026 ist die freiwillige Vertiefung nach dem dreiteiligen Stilcheck gewünscht: acht geführte Fragen im Chat, jede Antwort ausdrücklich bestätigen, überspringen/pausieren/ändern/löschen können. Bestätigte Antworten ergänzen bestehende freigegebene Online-Kontexte bei bewusster Sendung; kein behauptetes Modelltraining. Stilfokus und Accessoire-Auswahl wirken auf reale Vorschläge. Antwort-/Löschrevision unabhängig beim Merge prüfen. Lesemarkierungen sind gerätelokale UI-Zustände und werden wie Freigaben nicht gesichert; kein OS-Push, keine automatischen KI-Anfragen oder erfundenen Nachrichten. Nur sichtbare Hinweise/Antworten in einer sichtbaren App quittieren.

- Seit 20.10.2026 ist persönliche Shopping-Beratung nach ausreichender Stilgrundlage gewünscht: Stilcheck oder drei vertiefte Antworten, sieben gültige bestätigte Tragetage in den letzten 90 Tagen über mindestens zwei Wochen und drei unterschiedliche gültige Lookbewertungen in den letzten 180 Tagen, davon zwei positiv. Das sind transparente Heuristiken, kein Beweis perfekten Modellwissens. Preislimit pro Stück strikt höchstens 100 CHF, Standard 50 CHF; zuerst bis 50 CHF, Accessoires bis 25 CHF suchen. Kostenloser bestehender Qwen-Dienst nach eigener gerätelokaler Shopping-Freigabe; höchstens 40 Kleidungsangaben, bestätigtes Profil, abgeleitete Bewertungen und Budget, keine Fotos/Notizen/Chat-/Standortdaten. Keine erfundenen Produkte, Preise oder Verfügbarkeit: aktuell Suchideen mit geprüften bestehenden Outfit-Referenzen und konstruierten Zalando-Schweiz-Suchlinks mit Preisobergrenze, keine Live-Produktliste. Sortiment nicht aus Geschlecht/Körper ableiten. Budget/Sortiment mit eigener Revision sichern und beim Import unabhängig zusammenführen; Freigabe und kurzlebige Beratungen nicht exportieren. Kein Affiliate-Tracking oder automatisches Bestellen.

## Umsetzung

- React/TypeScript, Vite, Tailwind und Dexie nutzen. Abhängigkeiten sparsam ergänzen und Lockdatei erhalten.
- Funktionen in kleine, verständliche Module trennen. Reine Fachlogik getrennt von UI und Speicherung testen.
- Schreibvorgänge, Importe und abhängige Löschungen atomar ausführen. Schemaänderungen als additive Dexie-Migrationen; bestehende Daten erhalten.
- Jede neu gespeicherte Datenart in Export/Import einbeziehen. Alte Sicherungen weiterhin lesbar halten. Fehlerhafte Sicherungen dürfen vorhandene Daten nicht verändern.
- Seit 20.10.2026 sind die automatische Online-Fotoverarbeitung und der experimentelle Mehrfachscan auf Nutzerwunsch wieder entfernt. Fotoauswahl und Aktivierung/Freigabe starten keine Analyse und keinen Upload. Einzelbild-KI nur per ausdrücklichem Start; Angaben danach prüfbar ausfüllen, Freistellung erst nach ausdrücklichem Übernehmen verwenden. Verwerfen einer neuen Freistellung erhält eine bereits gewählte Variante. Original separat erhalten, abbrechen und zum Original zurückkehren können; endgültiges Speichern bleibt bewusst. Keine bestehenden Bestände automatisch hochladen oder bereits gespeicherte Mehrfachscan-Stücke löschen. Beide Fotovarianten validieren, sichern und auf die Kapazität anrechnen. Lokale Modelle bleiben manuell; Worker nach Abschluss/Abbruch beenden.
- Fotoanzeige zentral über `PhotoImage` verwalten. Bei Bildwechseln weder noch gesetztes `src` noch vom Browser verwendetes `currentSrc` vorzeitig freigeben; spätes Laden, Favoriten/Wäsche und bytegleiche Original-/Freistellungsdaten regressiv prüfen. Ein Original-Fallback ändert keine gespeicherten Blobs.
- Bereichszustände und Scrollposition innerhalb der laufenden App merken, ohne versteckte Ansichten oder Hintergrund-KI-Anfragen zu behalten. Tageswischen auf den Tagesbereich begrenzen; ungespeicherte Formularänderungen beim Schliessen schützen.
- Outfits ausschliesslich aus tatsächlich vorhandenen, eindeutig referenzierten Kleidungsstücken erzeugen. Fehlende Kategorien und nur geschätzte Farbharmonie offen benennen.
- iPhone-Safe-Areas, mindestens 44 Pixel grosse wichtige Touch-Ziele, Tastaturbedienung, echte Beschriftungen, das seit 24.10.2026 ausdrücklich gewünschte Luxe-Design (seit 24.10.2026 immer hell in warmem Elfenbein, Systemschrift, nicht klebender Header, Liquid-Glass-Navigation nahe am Home-Balken, keine Grossbuchstaben-Überzeilen, Slogans oder violetten KI-Motive; Details in design/LUXE.md) und reduzierte Bewegung berücksichtigen.

- Seit 21.10.2026: Foto-Schritte nach bewusster Aktion getrennt wiederholen, gelungenes Ergebnis erhalten und nur den betroffenen Community-Anbieter kontaktieren. Eigene Server müssen einzelne Schritte im authentifizierten Health-Vertrag bestätigen, sonst vor Fotoübertragung abbrechen; vollständige alte Analyse bleibt kompatibel. Keine automatische Fotoverarbeitung oder Mehrfachscans wieder einführen.
- Optionales Negativfeedback auch ohne Grund; „Zu auffällig“ (`bold`) gewichtet nur erfasste Farbakzente begrenzt schwächer, keine einzelnen Farben/Teile/Stile oder unbekannte Passform bestrafen. Anlassbezug und Zurücknehmen erhalten; Grund in Sicherungsformat 8 validieren und exportieren.
- Tageslook-Anpassungen für heute, vor Tragebestätigung: Teile für die konkrete Anpassung festhalten, ähnliche/wärmere/ruhigere Varianten aus echten verfügbaren Stücken mit möglichst wenigen Änderungen vorschlagen. Keine neuen externen Anfragen; Schichten/Saison/Farbanzahl nur nachvollziehbare Heuristiken. Vorschau ohne Schreibvorgang; Übernahme atomar gegen Tages-, Auswahl-, Präferenz-, Bestands- und Bewertungsänderungen prüfen. Geplanten Tag mit Notiz erhalten, alte gespeicherte Looks und Tragehistorie nicht überschreiben. Festhalten gilt für den offenen Anpassungsdialog; die übernommene Tagesauswahl bleibt gespeichert.

## Prüfung und Abschluss

- Änderungen aus Sicht von Datenverlust, Fehlerfällen, Zugänglichkeit, Datenschutz und Migration prüfen.
- Relevante Regressionstests hinzufügen; Build, Datentests und betroffene Browserabläufe tatsächlich ausführen. Nicht ausgeführte Tests ausdrücklich so bezeichnen.
- Standard: `npm run build`, `npm test`, `npm run test:e2e`. Chromium ist in dieser Cloud bereits unter /usr/bin/chromium vorhanden. WebKit ist optional; Chromium-Emulation ist kein echter Safari-/iPhone-Test.
- Benutzerdateien und fremde Änderungen erhalten. Keine Secrets, privaten Fotos oder generierten Test-/Builddateien einchecken.
- Geprüfte Änderungen mit aussagekräftigem Commit sichern und im bereits autorisierten Projektablauf auf GitHub pushen. Kein Force-Push.

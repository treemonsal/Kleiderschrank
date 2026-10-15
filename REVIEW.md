# Gegenprüfung und Phase 2

Prüfdatum: 15. Oktober 2026. Ausgangspunkt: erste Version, Commit `e784086`. Blickwinkel: Datenverlust und Wiederherstellung, gleichzeitige Änderungen, misslungene Eingaben, ehrliche Produktversprechen, iPhone-Bedienung und Grenzen der bisherigen Tests.

## Befunde und Korrekturen

| Befund                                                                                                                | Korrektur                                                                                                                      | Nachweis                                                                                  |
| --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Zwei Favoritenwechsel konnten denselben veralteten Wert verwenden.                                                    | Aktuellen Wert innerhalb einer Schreibtransaktion lesen und umschalten.                                                        | Test mit zwei gleichzeitig gestarteten Wechseln.                                          |
| Ein alter Bearbeitungsdialog konnte ein inzwischen gelöschtes Stück wieder anlegen oder neuere Angaben überschreiben. | Existenz und Änderungszeitpunkt vor dem Schreiben vergleichen; Eingaben im Dialog erhalten und verständlichen Konflikt melden. | Tests für beide Fälle, unveränderter Datenbestand.                                        |
| Bildsignatur allein bewies nicht, dass ein importiertes Foto lesbar ist.                                              | Alle Bilder vor der Importvorschau lokal decodieren; Fehler vor jeglicher Datenbankänderung melden.                            | Browserimport mit gefälschter JPEG-Signatur wird abgewiesen; ursprüngliches Stück bleibt. |
| Ein grosser Bestand oder zusammengeführter Import konnte die exportierbare Grösse überschreiten.                      | Stückzahl und geschätzte vollständige Sicherungsgrösse vor dem Schreiben prüfen, Platz für weitere Datenarten reservieren.     | Tests für zusammengeführten Überbestand und zu grosse Fotos; atomarer Abbruch.            |
| „Frisch im Kleiderschrank“ sortierte auch nach Bearbeitungen.                                                         | Hinzufügezeitpunkt für diesen Startseitenabschnitt verwenden.                                                                  | Fachliche Prüfung der Sortierung; bestehender Browserlauf bleibt erhalten.                |
| Fehler beim Favorisieren im Detaildialog erschienen hinter dem modalen Dialog.                                        | Fehler direkt im Dialog anzeigen und Aktion während des Schreibens sperren.                                                    | Prüfung des Fehlerpfads und weiterhin erfolgreicher Detail-/Favoriten-Browserablauf.      |
| Wichtige Galerie-Herzen waren nur 38 Pixel gross.                                                                     | Auf 44 Pixel vergrössert; neue Hauptnavigation mit vier Zielen auf schmalen Geräten geprüft.                                   | Bildschirmgrössen 375, 390 und 430 Pixel.                                                 |
| Stark komprimierte JSX-Zeilen erschwerten Wartung und Gegenprüfung.                                                   | Einheitliche Formatierung mit eingecheckter Prettier-Konfiguration und Prüfbefehl.                                             | `npm run format:check`.                                                                   |

Der bisherige Schliessen-Schutz des Kleidungseditors wurde zusätzlich um einen `beforeunload`-Hinweis ergänzt. iOS garantiert diesen Hinweis nicht beim Beenden oder Verwerfen der App; er ersetzt Speichern und Backups nicht.

## Neue Funktionen mit denselben Anforderungen

Der lokale Generator nutzt ausschliesslich vorhandene IDs und feste Basisregeln: Oberteil + Hose + Schuhe oder Kleid + Schuhe. Saisonangaben werden als Ausschluss verwendet; unvollständige Angaben werden offengelegt. Favoriten, Vorlieben und Rückmeldungen gewichten Vorschläge. Abgelehnte Kombinationen werden ausgeschlossen. Die Suche ist begrenzt; sie behauptet keine erschöpfende Optimierung und keine Bild-KI.

Die additive Datenbankversion 2 erhält alte Kleidungsstücke. Outfits, Feedback und Vorlieben sind im neuen Sicherungsformat enthalten. Exporte lesen einen konsistenten Snapshot; Importe schreiben alle Datenarten in derselben Transaktion. Gelöschte Kleidungsstücke hinterlassen keine abhängigen Looks. Alte Sicherungen bleiben lesbar. Ein bewusster Ersetzungsimport löscht alle nicht enthaltenen Datenarten; die Oberfläche weist darauf hin.

## Prüfstand

- Datentests: 37 bestanden, einschliesslich Migration, vollständiger Sicherung/Wiederherstellung, Zurückrollen bei Outfit-Schreibfehler, Referenzintegrität, Saison-/Anlassregeln, Ablehnungen und begrenzter Suche bei 900 Stücken.
- Die ursprünglichen sieben Chromium-Browserprüfungen bestehen weiterhin. Sechs zusätzliche Chromium-Prüfungen bestanden für Outfit-Speicherung/Bearbeitung/Favoriten, Vorlieben, vollständige Wiederherstellung, Ablehnung/Zurücksetzen, abhängige Löschung, beschädigte Bilder und drei Bildschirmbreiten.
- Start-/Sicherungsoberfläche und neue Outfit-/Vorliebenoberfläche bei 375, 390 und 430 Pixeln geprüft. Neue Ansichten auch im Dunkelmodus auf horizontalen Überlauf geprüft. Screenshots liegen in den ignorierten Testausgaben.

Nicht als geprüft behauptet: echtes iPhone/Safari, reale Kamera und HEIC, Home-Bildschirm-Installation, Speicherdruck, WebKit und öffentliche Bereitstellung. Browserdialoge bei erzwungenem iOS-App-Ende sind grundsätzlich unzuverlässig. Wetter, Kalender, Nutzungshäufigkeit und automatische Fotoanalyse bleiben für nachfolgende Phasen offen.

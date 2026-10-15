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

## Prüfstand Version 0.2

- Datentests: 37 bestanden, einschliesslich Migration, vollständiger Sicherung/Wiederherstellung, Zurückrollen bei Outfit-Schreibfehler, Referenzintegrität, Saison-/Anlassregeln, Ablehnungen und begrenzter Suche bei 900 Stücken.
- Die ursprünglichen sieben Chromium-Browserprüfungen bestehen weiterhin. Sechs zusätzliche Chromium-Prüfungen bestanden für Outfit-Speicherung/Bearbeitung/Favoriten, Vorlieben, vollständige Wiederherstellung, Ablehnung/Zurücksetzen, abhängige Löschung, beschädigte Bilder und drei Bildschirmbreiten.
- Start-/Sicherungsoberfläche und neue Outfit-/Vorliebenoberfläche bei 375, 390 und 430 Pixeln geprüft. Neue Ansichten auch im Dunkelmodus auf horizontalen Überlauf geprüft. Screenshots liegen in den ignorierten Testausgaben.

Nicht als geprüft behauptet: echtes iPhone/Safari, reale Kamera und HEIC, Home-Bildschirm-Installation, Speicherdruck, WebKit und öffentliche Bereitstellung. Browserdialoge bei erzwungenem iOS-App-Ende sind grundsätzlich unzuverlässig. Wetter, Kalender, Nutzungshäufigkeit und automatische Fotoanalyse bleiben für nachfolgende Phasen offen.

## Ergänzende Prüfung Version 0.3

Die Kalender- und Wetterfunktionen sind inzwischen implementiert. Die Nachweise der Version 0.2 bleiben historisch; der aktuelle Stand ist:

- Build/TypeScript/PWA, 56 Daten-/Logiktests und kompletter Lauf mit 22 Chromium-Browserprüfungen bestanden.
- Datenbankmigration von Version 2 erhält vorhandene Outfits. Kalender und Wetterort sind im neuen Sicherungsformat 3 enthalten; 1 und 2 bleiben lesbar. Ein Schreibfehler im Kalender rollt den gesamten Import zurück. Beim Ersetzen mit älteren Backups werden nicht enthaltene neuere Datenarten bewusst gelöscht, mit Hinweis vor Bestätigung.
- Eintrag-ID entspricht dem lokalen Tag, nicht dem UTC-Datum. Ein Browserfall um Mitternacht in Europe/Zurich am Tag des Sommerzeitwechsels bestätigt dies. Kalendertage und Schaltjahre werden validiert.
- Tragehäufigkeit entsteht aus bestätigten Tagen bis heute. Wiederholtes Bestätigen erhöht keinen separaten Zähler. Löschen, Statuskorrektur und Abhängigkeiten bleiben konsistent. Veraltete Editorstände können einen neueren Eintrag weder überschreiben noch löschen.
- Wetter bleibt optional. Keine Netzwerk- oder Standortanfrage beim Öffnen der App, nach Wiederherstellung oder beim Aufklappen der Wetterkarte. Browserprüfungen bestätigen beide Wege nach ausdrücklicher Aktion: manuelle Suche sowie freigegebene Testposition; eine verweigerte Freigabe lässt die Suche nutzbar.
- Nur gerundete Koordinaten werden an die Vorhersage-API gesendet und gespeichert. Requests verwenden `credentials: omit` und `referrerPolicy: no-referrer`. Fotos, Kleidung und Outfits werden nicht mitgeschickt. Der Dienst sieht technisch IP-Adresse und angefragten Ort. Die Sicherung kann gerundete Ortsdaten enthalten, worauf die Oberfläche hinweist.
- Antwortdaten werden auf echte Tage, sinnvolle Temperaturen, erwartete Einheiten, gültige WMO-Codes, Zeitzone und fehlende Werte geprüft. Fehler überschreiben den bestehenden Cache nicht. Nach sechs Stunden oder bei fehlendem Wettertag beeinflusst der Cache keine Vorschläge mehr. Ein Browserfall prüft sieben Stunden Alterung und die Entfernung der dadurch zuvor ergänzten Jacke.
- Eine laufende Ortssuche sperrt die Eingabe, damit eine alte Antwort nicht einem inzwischen neu eingegebenen Suchwort zugeordnet wird. Unmount bricht laufende HTTP-Anfragen ab; keine automatischen Wiederholungen oder Hintergrund-Ortung.
- Monatstasten, Datumsfeld, Planungsdialog und neue Wetterkarte wurden bei 375, 390 und 430 Pixeln geprüft. Screenshots des getragenen Looks, des dunklen Kalenders und der Wetterregeln visuell geprüft. Kein Nachweis eines echten iPhone-Geräts.

**Historischer externer Blocker:** In Version 0.3 wurden echte HTTPS-Wetterendpunkte noch mit CONNECT 403 abgewiesen. Nach Domainfreigabe lieferte die Wiederholungsprüfung in Version 0.4 am 15. Oktober 2026 HTTP 200 für Zürcher Ortssuche und sieben Vorhersagetage. Einheiten °C/%, WMO-Code und Europe/Zurich vorhanden. Der zusätzliche tatsächliche Browserabruf scheitert an Cloud-Chromiums Vertrauen in das Cloud-Proxy-Zertifikat (ERR_CERT_AUTHORITY_INVALID). Eine Aufnahme der bereits vom System vertrauten CA in Chromiums NSS-Speicher wurde von der automatischen Freigabeprüfung wegen dauerhafter Erweiterung der Vertrauensgrenze abgelehnt; keine Änderung ausgeführt und keine TLS-Prüfung abgeschaltet. Echtes Browser-CORS/Safari bleibt offen.

Weiterhin offen: echter iPhone-/Safari-Test, reale Kamera/HEIC, Home-Bildschirm-Installation, Speicherdruck, WebKit und öffentliche HTTPS-Bereitstellung. Lokale automatische Bildanalyse bleibt eine spätere Evaluationsphase.

## Unabhängige Gegenprüfung und Version 0.4

Der bestehende Stand wurde zusätzlich aus Sicht eines zweiten Prüfers untersucht. Zwei konkrete Befunde wurden reproduziert und korrigiert:

| Befund                                                                                               | Korrektur                                                                                                                                                                                                    | Nachweis                                                                                                         |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| Zwei offene Outfit-Editoren konnten einen neueren Namen mit einem alten Formularstand überschreiben. | Beim Umbenennen erwarteten Versionszeitpunkt innerhalb derselben Transaktion vergleichen; Konflikt anzeigen und Eingabe erhalten. Outfit-Änderungszeit monoton erhöhen, auch bei zurückgestellter Geräteuhr. | Datentests und echter Zwei-Tab-Browserablauf, neuester gespeicherter Name bleibt erhalten.                       |
| Die Warnung beim Ersetzen nannte Kalender, Feedback und Wetter nicht ausdrücklich.                   | Sämtliche betroffenen Datenarten und den Verlust nicht enthaltener Daten älterer Sicherungen vor Bestätigung nennen.                                                                                         | Browserprüfung mit Version-2-Sicherung; angekündigte Kalenderlöschung und erhaltenes Outfit nach Export geprüft. |

Die neue Farbprobe verarbeitet nur eine ausgewählte Stelle lokal und speichert erst nach Übernahme und normalem Speichern das vorhandene Farbfeld. Ein unverändertes Foto wird vor/nach Bearbeitung als identische Base64-Datei exportiert. Öffnen/Schließen der Probe allein verändert keine Kleidungsdaten und löst keinen Verwerfenhinweis aus. Fotowechsel und Entfernen verwerfen alte Proben; ein defektes Ersatzfoto lässt vorhandenes Foto und Farbe bestehen. Median und CIELAB-Nähe sind keine KI oder gemessene Klassifikationsgenauigkeit.

Build, 75 Daten-/Logiktests und 31 Chromium-Browserprüfungen bestanden. Farbprobe bei 375/390/430 Pixeln, Tastatur/44-Pixel-Reglern und Offline ohne externe Requests geprüft; dunklen 390-Pixel-Screenshot visuell geprüft. Keine neue Bibliothek, Schemaänderung oder Modelldatei. Modellkandidaten, Quellen und ausstehende echte iPhone-Messungen stehen in IMAGE_ASSISTANCE.md. Die oben genannten Geräte-/Hostinggrenzen gelten weiter.

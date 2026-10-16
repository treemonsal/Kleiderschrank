# Update 0.6.2 – Fehlerursachen getrennt anzeigen

Der Nutzer bestätigt gute Erkennung/Freistellung, meldet aber nach zwei Scans einen Fehler ausschliesslich bei der Erkennung. Die alte generische Meldung vermischte Limits, Ausfälle und ungültige Modellantworten. Daraus lässt sich kein bestimmtes Tageslimit oder sicherer damaliger Ausfall ableiten. Beide Spaces meldeten bei der aktuellen Statusabfrage RUNNING; das beweist keine freie GPU-Quota für diesen Nutzer.

Qwens Router fängt auch GPU-Fehler ab und liefert sie teilweise als erfolgreiche Gradio-Antwort mit `[ERROR]`-Text. Diese werden jetzt zusätzlich zu HTTP-Status und SSE-Fehlerereignissen ausgewertet. Bestätigte Quota/429, volle Queue, Dienstausfall, verweigerter Zugriff, Netz und unbrauchbare Ausgabe haben eigene Meldungen. Unbekannte Fehler werden nicht als Limit bezeichnet. Retry-After oder explizite „Try again in …“-Zeit wird in die lokale Gerätezeit umgerechnet; ohne Anbieterzeit kein erfundener Countdown. Rohantworten, Foto-/Dateinamen und interne Details erscheinen nicht in der Oberfläche.

Die Dienste, Foto-Freigabe und Inferenzparameter bleiben gleich. Keine automatischen Wiederholungen, Quota-Umgehung oder neuen Anbieter. Die Änderung hebt kostenlose GPU-Limits nicht auf; erfolgreiche Teilresultate und Original bleiben nutzbar. Fehlerprüfungen verwenden kontrollierte Anbieterantworten, keine erneuten echten Fotoanfragen zum Verbrauch weiterer Quota.

# Aktueller Stand 0.6.1 – kostenlos ohne eigenen Server

Die eigene HF-Serverbereitstellung wurde tatsächlich versucht. Der Token ist gültig, die E-Mail bestätigt, aber die Plattform verlangt aktuell PRO für Docker/Gradio-Spaces auf CPU Basic (HTTP 402). Offizielle Inference-Provider-Preise nennen für Free-Accounts ebenfalls keine Gratis-Credits mehr. Deshalb keine bezahlte Ressource und kein Umgehen einer Zugangsbeschränkung.

Aktueller Standard ist nach ausdrücklicher Freigabe die kostenlose Nutzung zweier öffentlich angebotener Gradio-APIs: `prithivMLmods/Qwen3-VL-Outpost` (`/run_router`, Qwen3-VL-4B-Instruct) für strukturierte Merkmale und `ZhengPeng7/BiRefNet_demo` (`/image`) für den transparenten Hintergrund. Keine Anbieterschlüssel und kein eigener Server. Öffentlich dokumentierte Schnittstellen ohne Authentifizierung verwendet; keine versteckten Qwen-Demo-Endpunkte umgangen. Nutzungslimits werden als Fehler angezeigt, nicht mit Identitäts-/IP-Wechseln umgangen.

Beide Anbieter und Datenübertragung werden vor Aktivierung sichtbar benannt. BiRefNet erhält einen Upload und stellt temporäre Ergebnisdateien bereit; Aufbewahrung/Löschung ist nicht unter unserer Kontrolle. Nicht behaupten, diese Drittanbieterverarbeitung wäre ausschliesslich im RAM oder privat selbst gehostet. Fotos mit Personen/privaten Hintergründen vermeiden. Bestehende Sammlung bleibt lokal; nur bewusst ausgewählte Fotos werden übertragen. Widerruf blockiert auch verspätete Aktivierungsantworten.

Der vollständige Ablauf wurde mit einem realen öffentlichen VANS-T-Shirt geprüft: Farbe Violett, Kategorie Oberteile, Marke VANS, passende sichtbare Notizen sowie Stil/Saison übernommen; transparente PNG-Vorschau geprüft und gespeichert. Browserprüfung lief mit einer HTTP-Brücke, die jede externe HTTPS-Verbindung mit dem vorhandenen Systemvertrauen prüft. Das umgeht keine TLS-Prüfung und ist keine native Safari-Prüfung. CORS des echten Anbieters erlaubte den Pages-Origin. Einzelne passende Beispiele sind keine generelle Genauigkeitsgarantie.

Auch die frühere optionale eigene Qwen2B-Inferenz konnte nach Anwendung der CDN-Freigabe wirklich auf der Cloud-CPU ausgeführt werden: passende Merkmale/Vans erkannt, 428,9 s inklusive Download/Import und 12.606 MiB Spitzen-RSS. Funktioniert, bietet aber keine kostenlose dauerhafte HF-Hostinglösung.

## Historischer Stand 0.6

# Bild-KI – aktueller Stand 0.6

Der Benutzer hat externe Foto-KI ausdrücklich gewünscht und die Vorgabe „komplett kostenlos“ bestätigt. Die bisherige U2NETP-Freistellung hat auf seinem iPhone nicht das gewünschte Ergebnis geliefert. Ein bestandener synthetischer Browserfall beweist keine Qualität für reale Kleidung.

Die neue Online-Anbindung und Servervorlage stehen in [server/README.md](server/README.md): Qwen3-VL-2B für alle vorhandenen Merkmalsfelder, BiRefNet-General-Lite für Segmentierung. Modelle laufen auf einem kostenlosen, eigenen HF CPU Basic Space, ohne bezahlte Anbieter-API. Fotos werden nach aktivierter Freigabe einzeln übertragen, im RAM verarbeitet und nicht absichtlich gespeichert oder geloggt. Hugging Face ist der Infrastrukturbetreiber.

Ohne bereitgestellten Server wird keine Online-Erkennung vorgetäuscht. Die PWA enthält eine echte Verbindungseinrichtung, keine Anbieter-Schlüssel. Gesundheitsprüfung bestätigt nur Erreichbarkeit/Auth/API-Version, keine Modellqualität. CPU-Laufzeit, RAM und echte Kleidung müssen zusätzlich geprüft werden. Notizen beschreiben nur sichtbare Details, Marke ohne lesbares Zeichen leer, Stil/Saison als Schätzungen.

Schema-/Browser-/API-Tests prüfen auch Teilausfälle, ungültige PNGs, Abbruch und eigene Änderungen während einer Anfrage. Ein altes Foto darf nach Fotowechsel keine Merkmale mehr übernehmen. Die KI füllt Felder automatisch, Freistellung wird bewusst übernommen und erst normales Speichern persistiert. Backup-Schema 4 bleibt erhalten.

## Historie: lokale Freistellung 0.5

# Lokale Fotoassistenz

Bewertung vom 15. Oktober 2026. Ziel: kostenlose Verarbeitung eigener Kleidungsfotos auf dem iPhone, ohne Upload, Schlüssel oder laufende Dienste. Eine Dokumentationsprüfung ist kein Gerätebenchmark.

## Version 0.5: experimentelle echte KI-Freistellung

U2NETP ist nun als kleine lokale Option praktisch integriert. Das Modell erzeugt eine Salienzmaske; es klassifiziert keine Kleidungsarten. Anders als die reine Farbprobe ist dies echte Modellinferenz. Die experimentelle Option erfordert eine bewusste Aktion und Vorschauprüfung; sie wird nicht als auf iPhone validierte Standardfunktion behauptet.

- Gewichte: unmodifiziertes `u2netp.onnx`, 4.574.861 Byte, aus dem offiziellen rembg-Release `v0.0.0`. Die veröffentlichte rembg-MD5 `8e83ca70e441ab06c318d82300c84806` wurde vor Übernahme geprüft; anschließend SHA-256 festgehalten: `309c8469258dda742793dce0ebea8e6dd393174f89934733ecc8b14c76f4ddd8`.
- ONNX Runtime Web 1.30.0, MIT; eigener WASM-CPU-Worker mit genau einem Thread. Kein WebGPU, SharedArrayBuffer, COOP/COEP oder externer Inferenzdienst nötig. Das WASM ist 14.239.897 Byte groß; SHA-256 `3398c10d07d229bd91b364548e130e0e51a8e5704b88c7c083ebbeb78842dee2`. Zusammen rund 18,8 MB Binärdateien, zuzüglich kleinem JavaScript-Worker. Tatsächliche HTTP-Transfergröße hängt von Hosting-Kompression ab.
- Beide Dateien werden von derselben App-Domain nur nach Start geladen, größen-/SHA-geprüft und bei verfügbarem Speicher in einem eigenen Cache gehalten. Nicht im automatischen PWA-Precache. Defekte Cachedateien werden gelöscht und müssen neu geladen werden; keine Integritätsumgehung. Unter Mehr lassen sich die KI-Binärdateien wieder entfernen.
- Normierung entspricht rembg: RGB auf 320 × 320, durch hellsten Kanalwert teilen, ImageNet-Mittelwerte/Standardabweichungen, CHW. Erste Modellmaske auf 0–255 normieren; konstante oder nicht endliche Ausgaben ablehnen. PNG-Vorschau bis 1200 Pixel, Original bleibt separat erhalten. Abbrechen/90-Sekunden-Grenze beendet den Worker; keine dauerhafte Sitzung im Hintergrund.
- Nur explizite Übernahme plus normales Speichern verändert den Datensatz. Datenbank/Sicherung 4 enthalten Original und Freistellung; alte Sicherungen bleiben lesbar. Bilder werden vor Import decodiert und beide Blobs zählen für die Kapazitätsgrenze.

Upstream U²-Net: Apache-2.0. rembg-ONNX-Auslieferung: MIT. Lizenztexte und Quellen liegen unter `public/ai/`. [Originalprojekt](https://github.com/xuebinqin/U-2-Net), [rembg-U2NETP-Sitzung mit Prüfsumme](https://github.com/danielgatis/rembg/blob/main/rembg/sessions/u2netp.py), [konkrete Gewichtsdatei](https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2netp.onnx).

Praktischer Nachweis: echtes Modell in Chromium, synthetische blaue T-Shirt-Silhouette. Die Maske erhält das Zentrum und macht Bildecken transparent; Original und PNG werden gespeichert, exportiert/importiert und das Original wiederhergestellt. Zweite echte Inferenz offline aus geprüftem Cache erfolgreich. Fehlende/beschädigte Dateien und Abbruch sind Fehlerfälle, keine ersetzten Modellantworten. Ohne Start erfolgen keine Modell-/WASM-Anfragen und während dieser Abläufe keine externen Fotoanfragen.

**Nicht nachgewiesen:** reale Kleidungsgenauigkeit, iPhone-Speicherbedarf, Akkulast, Safari-Stabilität oder feine Stoffkanten. Das Modell kann Schatten/Teile entfernen oder falsche Objekte behalten. Original und Vorschauprüfung sind deshalb zwingend. Klassifikation und Outfit-Fotobewertung bleiben offen; keine angebliche KI-Note.

## Ausgeliefert in Version 0.4: bewusste Farbprobe

Im Kleidungseditor erscheint bei vorhandenem Foto **Farbe aus Foto wählen**. Die Mitte ist die erste Probestelle; Antippen, Pfeiltasten oder zwei beschriftete Positionsregler verschieben sie. Die lokale Canvas-Vorschau hat höchstens 320 Pixel an der längsten Seite, also maximal 409.600 Byte RGBA-Pixel. Zusätzlich muss der Browser die bereits vorhandene Fotodatei decodieren; dies ist keine Aussage über den gesamten Speicherverbrauch.

Eine bis zu 5 × 5 Pixel grosse Medianprobe dämpft einzelne Bildstörungen. Der nächste Referenzton wird über CIELAB/D65 und Delta-E-76 der vorhandenen Kleiderschrankpalette zugeordnet. Mehrere helle, dunkle und gesättigte Referenzen repräsentieren deren grobe Farbfamilien. **Bunt** wird nicht aus einem einzelnen Bildpunkt abgeleitet. Es gibt keine Objektsegmentierung oder automatische Kleidungs-, Material-, Stil- oder Qualitätsbewertung.

Der Vorschlag ändert kein Feld, bis **Farbe übernehmen** angetippt wird. Danach gelten die normalen Speichern-/Verwerfen-Regeln. Manuelle Korrektur bleibt möglich. Foto und übrige Angaben bleiben unverändert; nur das bestehende Farbfeld wird gespeichert. Deshalb sind keine Datenbankmigration oder neue Sicherungsversion nötig. Fotowechsel/Entfernen verwirft die bisherige Probe. Keine neue Bibliothek, Modelldatei, Netzwerkverbindung oder Telemetrie ist nötig.

Grenzen: Licht, Schatten, Weißabgleich, Hintergrund und Muster beeinflussen die Probe. Haut- oder Wandfarbe wird genauso ausgewertet wie Stoff. Die Palette umfasst etwa kein eigenes Orange oder Türkis; der nächste vorhandene Farbname kann daher unpassend sein. Es gibt keine gemessene Erkennungsgenauigkeit. Automatisierte Tests verwenden selbst erzeugte Farbbilder, keine repräsentative reale Kleidersammlung.

## Geprüfte Modellkandidaten

| Verfahren                          | In offizieller Dokumentation belegt                                                                                                                                          | Noch zu klären                                                                                                                                  |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| IMG.LY `@imgly/background-removal` | Verarbeitung im Browser, ONNX/WASM, optionale GPU; dokumentiert ungefähr 40 MB quantisiertes bzw. 80 MB Standardmodell zuzüglich Laufzeitdateien; Assets selbst auslieferbar | AGPL-Bibliothek; konkrete Gewichtslizenz separat prüfen. COOP/COEP und SharedArrayBuffer für Leistung relevant. Kein eigener iPhone-Nachweis.   |
| Transformers.js                    | Apache-2.0-Bibliothek, lokale Bildpipelines, CPU/WASM und optional WebGPU, Quantisierung und eigene Asset-Auslieferung                                                       | Bibliothekslizenz ersetzt keine Modelllizenz. Kein konkretes Kleidungsmodell mit überprüfter Größe, Genauigkeit und iPhone-Laufzeit ausgewählt. |
| MODNet                             | Offizielles Projekt nennt Apache-2.0 für Code, Modelle und Demos; ONNX-Konvertierung beschrieben                                                                             | Für Porträt-Matting entwickelt. Zuverlässigkeit bei freiliegender Kleidung unbelegt. Die erwähnte kleine „7M“-Demo ist nicht veröffentlicht.    |

Quellenabweichungen nicht übergehen: IMG.LY nennt ISNET in seiner Drittanbieterliste MIT; das ursprüngliche DIS-Projekt nennt Apache-2.0 für Code/Evaluation und separate Dataset-Bedingungen. Vor Übernahme von Gewichten deren tatsächliche Herkunft und beiliegende Lizenz prüfen. Aktuelle MDN-Daten nennen WebGPU in Safari 26, während die ONNX-Runtime-Web-Matrix Safari-WebGPU noch nicht unterstützt nennt. Browserfähigkeit allein beweist weder Operator- noch Modellkompatibilität.

## Vor einer Modellintegration auf echtem iPhone prüfen

1. Vollständige Asset-/Gewichtslizenzen und selbst gehostete, versionierte Dateien mit Integritätsprüfung.
2. Tatsächliche Transfergröße einschließlich WASM, Kalt-/Warmstart, Spitzen-Speicher, wiederholte Fotos und Abstürze. Kein Modell ungefragt herunterladen.
3. CPU-Fallback ohne WebGPU, Abbruch, Offline-Neustart, fehlgeschlagene Downloads und Cache-Löschung. Originalfoto erhalten.
4. Einwilligungsbasierte lokale Testbilder: weiße, dunkle, gemusterte, transparente Kleidung, dünne Träger, komplexer Hintergrund. Randqualität und manuelle Korrektur vergleichen.
5. Festgehaltene iOS-/Safari-Version, installierte Homescreen-App, unterstütztes Hosting und kleine Displays.

Die Liste beschreibt die strengere Freigabe vor einer stabilen iPhone-Funktion. Die ursprüngliche Dokumentationsbewertung der Version 0.4 enthielt noch keinen Modelldownload. Seit Version 0.5 wurden Modell und Laufzeit tatsächlich bezogen und in Chromium geprüft (siehe oben). Echte Geräte- und repräsentative Bildprüfungen bleiben **nicht ausgeführt**. Keine privaten Fotos wurden übertragen. Automatische Merkmale und Outfit-Fotobewertung bleiben offen.

## Quellen

Am Bewertungstag gelesene offizielle Projektquellen; Angaben können sich ändern:

- [IMG.LY Browser-README](https://github.com/imgly/background-removal-js/blob/main/packages/web/README.md), [Konfiguration](https://github.com/imgly/background-removal-js/blob/main/packages/web/src/schema.ts), [Drittanbieter-Lizenzen](https://github.com/imgly/background-removal-js/blob/main/packages/web/ThirdPartyLicenses.json)
- [Transformers.js README](https://github.com/huggingface/transformers.js/blob/main/README.md), [Lizenz](https://github.com/huggingface/transformers.js/blob/main/LICENSE)
- [MODNet README](https://github.com/ZHKKKe/MODNet/blob/master/README.md), [DIS README](https://github.com/xuebinqin/DIS/blob/main/README.md)
- [ONNX Runtime Web Browsermatrix](https://github.com/microsoft/onnxruntime/blob/main/js/web/README.md)
- [MDN WebGPU-Kompatibilität](https://github.com/mdn/browser-compat-data/blob/main/api/GPU.json), [Canvas-Kompatibilität](https://github.com/mdn/browser-compat-data/blob/main/api/CanvasRenderingContext2D.json)

Hugging-Face-Modellkarten und eine WebKit-Seite waren bei dieser Recherche durch den Proxy nicht lesbar. Dafür werden keine ungeprüften Modellangaben übernommen.

## Online-Outfit-Beratung ab 0.12

Am 16.10.2026 vom Nutzer zusätzlich gewünscht: ausgewählte gespeicherte Fotos und Kontext online für bessere Outfit-Beratung verarbeiten. Derselbe öffentliche [Qwen3-VL-Outpost](https://huggingface.co/spaces/prithivMLmods/Qwen3-VL-Outpost), `/gradio_api/call/run_router`, öffentlich im Betreiber-Quellcode gelistetes `Qwen3-VL-8B-Instruct`. Kein Anbieter-Token im Client. Community-Freigabe plus bewusster Start; kein Hintergrund-Upload der Sammlung.

Beschriftete Übersicht maximal vier regelkonforme Looks mit 20 unterschiedlichen Teilen. Der Dienst wählt ausschliesslich einen vorgegebenen Look; neue IDs, beschädigte/unvollständige Antworten und zu grosse Texte werden verworfen. Originale werden nicht verändert. Wirklich gelieferter Modelltext mit drei öffentlichen Produkt-Testfotos und Nutzerwunsch geprüft, darunter korrekt begründete Auswahl eines Streifenoberteils gegenüber Logo-Shirts und benannte fehlende Fotos. Dies belegt Integration und ein Beispiel, keine allgemeine Empfehlungsgenauigkeit. Native Safari-Verbindung bleibt manuell zu prüfen; Cloud-Prüfung über TLS-geprüfte Host-Brücke.

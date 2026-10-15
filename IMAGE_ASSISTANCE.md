# Lokale Fotoassistenz

Bewertung vom 15. Oktober 2026. Ziel: kostenlose Verarbeitung eigener Kleidungsfotos auf dem iPhone, ohne Upload, Schlüssel oder laufende Dienste. Eine Dokumentationsprüfung ist kein Gerätebenchmark.

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

Diese Modell- und echten Geräteprüfungen wurden **nicht ausgeführt**. Keine Modelle heruntergeladen, keine Bilddienste eingebaut und keine privaten Fotos übertragen. Freistellung, automatische Merkmale und Outfit-Fotobewertung bleiben offen.

## Quellen

Am Bewertungstag gelesene offizielle Projektquellen; Angaben können sich ändern:

- [IMG.LY Browser-README](https://github.com/imgly/background-removal-js/blob/main/packages/web/README.md), [Konfiguration](https://github.com/imgly/background-removal-js/blob/main/packages/web/src/schema.ts), [Drittanbieter-Lizenzen](https://github.com/imgly/background-removal-js/blob/main/packages/web/ThirdPartyLicenses.json)
- [Transformers.js README](https://github.com/huggingface/transformers.js/blob/main/README.md), [Lizenz](https://github.com/huggingface/transformers.js/blob/main/LICENSE)
- [MODNet README](https://github.com/ZHKKKe/MODNet/blob/master/README.md), [DIS README](https://github.com/xuebinqin/DIS/blob/main/README.md)
- [ONNX Runtime Web Browsermatrix](https://github.com/microsoft/onnxruntime/blob/main/js/web/README.md)
- [MDN WebGPU-Kompatibilität](https://github.com/mdn/browser-compat-data/blob/main/api/GPU.json), [Canvas-Kompatibilität](https://github.com/mdn/browser-compat-data/blob/main/api/CanvasRenderingContext2D.json)

Hugging-Face-Modellkarten und eine WebKit-Seite waren bei dieser Recherche durch den Proxy nicht lesbar. Dafür werden keine ungeprüften Modellangaben übernommen.

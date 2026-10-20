---
title: MyStyle Photo AI
emoji: 🌙
colorFrom: indigo
colorTo: gray
sdk: docker
app_port: 7860
pinned: false
license: mit
---

MyStyle: optionale selbst gehostete CPU-Bildverarbeitung. **Nicht der aktuelle kostenlose Standardweg der App.** Seit dem tatsächlichen Deploymentversuch am 15.10.2026 bestätigt die Hugging-Face-API HTTP 402: Auch Docker mit CPU Basic benötigt dort PRO. Es wurde kein kostenpflichtiger Dienst angelegt. Der Softwarecode ist frei nutzbar, die Hostingkosten hängen vom Anbieter ab.

- **Qwen3-VL-2B-Instruct** (Apache 2.0) erkennt deutsche Merkmale.
- **BiRefNet-General-Lite** über rembg (MIT) erstellt Freistellungen.
- Fotos werden vom eigenen Server nur im RAM verarbeitet und nicht absichtlich gespeichert oder geloggt. Das gilt nicht automatisch für andere Hostinganbieter oder die separaten öffentlichen Community-Dienste.
- Die App bietet alternativ kostenlose Community-KI ohne Account/Token an. Hinweise im Haupt-README. Keine Serverbereitstellung nötig.

## Bereitstellen

1. Nur auf bereits verfügbarer eigener Infrastruktur oder einem ausdrücklich autorisierten Hostingplan betreiben. Für Hugging Face wäre aktuell PRO erforderlich; das ist nicht mit der Kosten-Null-Vorgabe dieser Aufgabe vereinbar. Keine kostenpflichtige Bereitstellung ohne gesonderten Auftrag. Die folgenden Space-Schritte beschreiben nur die technische Vorlage: **Docker Space**, **Blank**, **CPU Basic**. Sichtbarkeit kann öffentlich sein: Quellcode ist öffentlich, Foto-Endpunkt benötigt immer einen Code.
2. Dateien dieses Ordners in den Space hochladen (Dockerfile muss im Space-Root liegen).
3. Unter Settings → Variables and secrets als **Secret** `MYSTYLE_ACCESS_CODE` setzen: mindestens 24 zufällige Zeichen, empfohlen `python -c "import secrets; print(secrets.token_urlsafe(32))"`. Diesen persönlichen Verbindungscode nur auf deinem Gerät eingeben. Niemals einen Hugging-Face- oder GitHub-Token in der PWA verwenden.
4. Variable `ALLOWED_ORIGINS=https://treemonsal.github.io` setzen. Ohne Konfiguration ist das der Standard. Für lokale Tests zusätzlich den eigenen exakten Entwicklungs-Origin erlauben.
5. Wenn der Space „Running“ anzeigt: seine direkte **https://… .hf.space**-Adresse in MyStyle → Mehr → Online-Foto-KI eintragen, Verbindungscode eingeben, Fotoübertragung aktivieren, verbinden.
6. Neues Kleidungsfoto hinzufügen und **Foto mit KI vorbereiten** antippen. Angaben werden nach diesem Start vorbereitet; Freistellung prüfen und bei Bedarf ausdrücklich übernehmen. Ein einzelnes Stück bei gutem Licht hilft der Erkennung. Eine Etikettaufnahme ist für eine unbekannte Marke weiter nötig.

Ein Entwickler mit sicher eingebundenem `HF_TOKEN` (Write-Scope für Spaces) kann stattdessen `python scripts/deploy_photo_ai.py --name mystyle-photo-ai` im Hauptrepository ausführen. Das Skript wählt ausdrücklich CPU Basic an. Das schützt vor GPU-Upgrades, beseitigt aber nicht die inzwischen bestätigte PRO-Pflicht. Für diese kostenlose App nicht mehr als Standard-Deployment verwenden. Es veröffentlicht diese Serverdateien im öffentlichen Space, nicht deine Fotos. Der persönliche Verbindungscode wird zufällig erzeugt und als Space-Secret sowie lokal in einer ignorierten Datei abgelegt.

## Betrieb und Grenzen

`GET /health` und `POST /v1/garment` benötigen `Authorization: Bearer <Verbindungscode>`. JSON-Request: `{"photo":"data:image/jpeg;base64,…"}`. Antwort: `attributes` gemäß schema.py und/oder `cutout` als PNG-Data-URL. Beide Teilergebnisse dürfen null sein. Keine automatischen Ausweichanbieter oder gebührenpflichtigen Wiederholungen.

Keine Remote-Code-Ausführung aus Modell-Repositories (`trust_remote_code=False`). rembg prüft seine Modell-Downloads. Optional `QWEN_REVISION` auf einen geprüften Hugging-Face-Commit setzen; Standard ist der geprüfte offizielle Modell-Commit `89644892e4d85e24eaac8bacfd4f463576704203`. Modelle werden erst beim ersten autorisierten Foto geladen. Ein Auftrag gleichzeitig, keine Warteschlange; weitere Aufträge erhalten 429. Abbruch beendet den Upload/Empfang, ein bereits laufender CPU-Auftrag kann serverseitig bis zum Abschluss weiterlaufen. Neustart beendet ihn.

Die Vertrags-/Sicherheitstests verwenden künstliche Fotos und gemockte Inferenz. Reale Modellqualität, Laufzeit und RAM-Verbrauch auf CPU Basic müssen nach Bereitstellung mit echten Kleidungsfotos geprüft werden. Ein erfolgreicher Gesundheitstest bescheinigt die API-Verbindung, nicht die Erkennungsqualität.

## Bisheriger echter Modelltest

BiRefNet-General-Lite hat in der Entwicklungs-Cloud ein reales öffentliches T-Shirt-Foto sauber freigestellt; Original und transparentes PNG wurden visuell verglichen. Gecachter Lauf inklusive Prozessimports: 35,6 s, Spitzen-RSS 7.646 MiB. Sitzungen werden zwischen Segmentierung und Erkennung vollständig freigegeben. Dies ist kein Nachweis für HF CPU Basic oder allgemeine Fotoqualität. Qwen-Gewichte konnten wegen der Cloud-Netzwerksperre für `us.aws.cdn.hf.co` noch nicht geladen werden. Die Erkennung ist somit noch nicht mit echtem Modell validiert. Details: REVIEW.md im Hauptprojekt.

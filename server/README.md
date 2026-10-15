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

MyStyle: kostenlose CPU-Bildverarbeitung für die private Kleiderschrank-PWA.

- **Qwen3-VL-2B-Instruct** (Apache 2.0): Bildverständnis, deutsche Merkmale. Unsichere Marken leer lassen. Kein erfundenes Material.
- **BiRefNet-General-Lite** über rembg (MIT): Freistellung auf dem Server statt iPhone-WASM. Separate Vorschau, Original bleibt erhalten.
- Keine bezahlte API. Nur kostenlose **CPU Basic** Hardware wählen; keine GPU, Upgrades oder Zahlungsdaten erforderlich. Bei Inaktivität schläft der Space. Modellstart und CPU-Erkennung können mehrere Minuten dauern. Eine kostenlose Instanz bietet keine Verfügbarkeitsgarantie.
- Fotos werden nur im Arbeitsspeicher verarbeitet, nicht absichtlich gespeichert oder geloggt. Hugging Face betreibt die Infrastruktur; deren Datenschutzbedingungen gelten. Keine vollständige Sammlung hochladen, sondern nur das ausgewählte vorbereitete JPEG.

## Bereitstellen

1. Kostenlosen Hugging-Face-Account erstellen. Neuen **Docker Space**, **Blank**, **CPU Basic / Free** erstellen. Sichtbarkeit kann öffentlich sein: Quellcode ist öffentlich, Foto-Endpunkt benötigt immer einen Code.
2. Dateien dieses Ordners in den Space hochladen (Dockerfile muss im Space-Root liegen).
3. Unter Settings → Variables and secrets als **Secret** `MYSTYLE_ACCESS_CODE` setzen: mindestens 24 zufällige Zeichen, empfohlen `python -c "import secrets; print(secrets.token_urlsafe(32))"`. Diesen persönlichen Verbindungscode nur auf deinem Gerät eingeben. Niemals einen Hugging-Face- oder GitHub-Token in der PWA verwenden.
4. Variable `ALLOWED_ORIGINS=https://treemonsal.github.io` setzen. Ohne Konfiguration ist das der Standard. Für lokale Tests zusätzlich den eigenen exakten Entwicklungs-Origin erlauben.
5. Wenn der Space „Running“ anzeigt: seine direkte **https://… .hf.space**-Adresse in MyStyle → Mehr → Online-Foto-KI eintragen, Verbindungscode eingeben, Fotoübertragung aktivieren, verbinden.
6. Neues Kleidungsfoto hinzufügen. Angaben werden automatisch vorbereitet; Freistellung vor dem Speichern prüfen. Ein einzelnes Stück bei gutem Licht hilft der Erkennung. Eine Etikettaufnahme ist für eine unbekannte Marke weiter nötig.

Ein Entwickler mit sicher eingebundenem `HF_TOKEN` (Write-Scope für Spaces) kann stattdessen `python scripts/deploy_photo_ai.py --name mystyle-photo-ai` im Hauptrepository ausführen. Das Skript wählt ausdrücklich CPU Basic und legt keine kostenpflichtige Hardware an. Es veröffentlicht diese Serverdateien im öffentlichen Space, nicht deine Fotos. Der persönliche Verbindungscode wird zufällig erzeugt und als Space-Secret sowie lokal in einer ignorierten Datei abgelegt.

## Betrieb und Grenzen

`GET /health` und `POST /v1/garment` benötigen `Authorization: Bearer <Verbindungscode>`. JSON-Request: `{"photo":"data:image/jpeg;base64,…"}`. Antwort: `attributes` gemäß schema.py und/oder `cutout` als PNG-Data-URL. Beide Teilergebnisse dürfen null sein. Keine automatischen Ausweichanbieter oder gebührenpflichtigen Wiederholungen.

Keine Remote-Code-Ausführung aus Modell-Repositories (`trust_remote_code=False`). rembg prüft seine Modell-Downloads. Optional `QWEN_REVISION` auf einen geprüften Hugging-Face-Commit setzen; Standard ist der geprüfte offizielle Modell-Commit `89644892e4d85e24eaac8bacfd4f463576704203`. Modelle werden erst beim ersten autorisierten Foto geladen. Ein Auftrag gleichzeitig, keine Warteschlange; weitere Aufträge erhalten 429. Abbruch beendet den Upload/Empfang, ein bereits laufender CPU-Auftrag kann serverseitig bis zum Abschluss weiterlaufen. Neustart beendet ihn.

Die Vertrags-/Sicherheitstests verwenden künstliche Fotos und gemockte Inferenz. Reale Modellqualität, Laufzeit und RAM-Verbrauch auf CPU Basic müssen nach Bereitstellung mit echten Kleidungsfotos geprüft werden. Ein erfolgreicher Gesundheitstest bescheinigt die API-Verbindung, nicht die Erkennungsqualität.

## Bisheriger echter Modelltest

BiRefNet-General-Lite hat in der Entwicklungs-Cloud ein reales öffentliches T-Shirt-Foto sauber freigestellt; Original und transparentes PNG wurden visuell verglichen. Gecachter Lauf inklusive Prozessimports: 35,6 s, Spitzen-RSS 7.646 MiB. Sitzungen werden zwischen Segmentierung und Erkennung vollständig freigegeben. Dies ist kein Nachweis für HF CPU Basic oder allgemeine Fotoqualität. Qwen-Gewichte konnten wegen der Cloud-Netzwerksperre für `us.aws.cdn.hf.co` noch nicht geladen werden. Die Erkennung ist somit noch nicht mit echtem Modell validiert. Details: REVIEW.md im Hauptprojekt.

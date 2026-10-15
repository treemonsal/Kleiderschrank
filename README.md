# MyStyle

Dein persönlicher Kleiderschrank als private iPhone-PWA. React, TypeScript, Vite, Tailwind und Dexie/IndexedDB. Keine laufenden Software- oder API-Kosten, keine Accounts, keine Bildübertragung.

Version 0.6.1 ergänzt kostenlose Community-KI: Qwen3-VL erkennt Kleidungsmerkmale, BiRefNet entfernt den Hintergrund. Einmal unter **Mehr → Online-Foto-KI** die Fotoübertragung erlauben und **Kostenlose KI aktivieren** wählen. Kein Token, Konto oder eigener Server nötig. Ohne Freigabe werden keine Fotos gesendet. Die lokale experimentelle Freistellung bleibt als Alternative. Prüfungen und Grenzen stehen in [REVIEW.md](REVIEW.md).

**Veröffentlichte App:** https://treemonsal.github.io/Kleiderschrank/ — am 15. Oktober 2026 erfolgreich bereitgestellt und über HTTPS geprüft. Auf dem iPhone in Safari öffnen: **Teilen → Zum Home-Bildschirm → Hinzufügen**. Danach über das neue Symbol starten und einmal vollständig online laden.

## Lokal starten

Node.js 24 LTS und npm verwenden (siehe `.nvmrc`).

```sh
npm ci
npm run dev
```

Vite nennt den Port (standardmässig 5173). Für eine Prüfung der installierbaren Offline-Version:

```sh
npm run build
npm run preview -- --port 4173
```

PWA-Service-Worker werden nur im Produktionsbuild registriert. Entwicklung benötigt keine API-Schlüssel, Datenbankserver oder Umgebungsgeheimnisse.

## Auf dem iPhone

Die bereitgestellte **HTTPS-Adresse in Safari** öffnen. Teilen → „Zum Home-Bildschirm“ → „Hinzufügen“. Die App einmal vollständig online laden, dann funktioniert der Kleiderschrank auch offline. Keine Cloud- oder localhost-Adresse aus einer fremden Maschine auf dem iPhone verwenden. Für lokale Netzwerkentwicklung sind ein erreichbarer Rechner und für Service Worker HTTPS nötig; eine kostenlose HTTPS-Bereitstellung ist meist einfacher.

1. „Stück hinzufügen“ wählen und mit Kamera oder Fotomediathek ein Foto ergänzen.
2. Name und Kategorie eintragen; weitere Merkmale sind optional und manuell korrigierbar.
3. Ein Stück öffnen, um es zu bearbeiten oder zu löschen. Herzen markieren Favoriten.
4. Unter „Mehr“ regelmässig eine Sicherung mit Fotos exportieren und in Dateien speichern. Import erst prüfen, dann bestätigen. Zusammenführen behält die neuere Version derselben ID; Ersetzen entfernt den vorhandenen Bestand und stellt die Sicherung wieder her.

## Farbe aus einem Foto wählen

Im Kleidungseditor ein Foto hinzufügen und bei **Farbe** auf **Farbe aus Foto wählen** tippen. Eine einfarbige Stelle am Stoff antippen; die Positionsregler und Pfeiltasten helfen beim genauen Auswählen. Erst **Blau übernehmen** (beziehungsweise die vorgeschlagene Farbe) ändert das Farbfeld. Danach das Stück normal speichern oder Änderungen verwerfen. Die Farbe lässt sich weiterhin manuell ändern.

Die Farbprobe läuft auch offline vollständig auf deinem Gerät. Sie verändert dein Foto nicht. Licht, Schatten, Hintergrund und Muster können den Vorschlag verfälschen; **Bunt** bei Bedarf selbst wählen. Es handelt sich um eine lokale Pixelprobe mit grober Farbfamilie. Automatische Merkmale sind über den optionalen Online-KI-Server vorbereitet; Outfit-Fotobewertung ist noch nicht eingebaut.

## Foto automatisch erfassen

1. **Mehr → Online-Foto-KI** öffnen. Die genannten Anbieter und Datenschutzhinweise lesen, Fotoübertragung erlauben und **Kostenlose KI aktivieren** antippen. Dafür brauchst du keinen Token und kein Abo.
2. Neues Foto aufnehmen oder aus der Mediathek wählen. Qwen3-VL-Outpost erkennt Name, Kategorie, Farbe und sichtbare Marke sowie Notizen, Stil und Saison. Marke ohne lesbares Zeichen leer lassen; Stil/Saison sind Schätzungen. Alle Angaben bleiben korrigierbar. Während der Analyse selbst geänderte Felder bleiben erhalten.
3. BiRefNet erstellt eine transparente Vorschau. **Freistellung übernehmen** oder **Original behalten** wählen, dann das Stück speichern. Das vorbereitete Originalfoto bleibt zusätzlich erhalten und wird mitgesichert.
4. **Community-KI ausschalten** oder die Foto-Freigabe abwählen verhindert neue Übertragungen. Die vorhandene Sammlung bleibt auf deinem Gerät. Das Öffnen/Bearbeiten gespeicherter Stücke lädt sie nicht automatisch hoch.

Die App nutzt die öffentlich angebotenen Gradio-APIs von [Qwen3-VL-Outpost](https://huggingface.co/spaces/prithivMLmods/Qwen3-VL-Outpost) und der [offiziellen BiRefNet-Demo](https://huggingface.co/spaces/ZhengPeng7/BiRefNet_demo). **Das sind öffentliche Community-Dienste, kein privater MyStyle-Server.** Das ausgewählte Foto wird an beide übertragen; die Freistellung nutzt temporäre Dateien auf dem Server des Anbieters. Speicher-/Löschdauer können wir nicht garantieren. Fotos mit Personen oder privaten Hintergründen vermeiden. Es gibt keine Verfügbarkeitsgarantie; Warteschlangen, Tageslimits und Abschaltungen sind möglich. Dann bleibt das Foto erhalten, ein brauchbares Teilergebnis wird nicht verworfen. Keine automatischen Ausweichanbieter, Provider-Schlüssel oder bezahlten Wiederholungen.

Ein eigener kompatibler Server bleibt unter **Eigenen Server verbinden** optional. Unsere frühere Annahme, einen Docker-Space auf Hugging Face kostenlos selbst zu betreiben, war falsch: Die aktuelle API verlangt dafür PRO (HTTP 402). Auch Inference Providers bieten Free-Accounts aktuell keine Gratis-Credits. Der kostenlose App-Modus verwendet diese kostenpflichtigen Angebote nicht.

## Hintergrund mit lokaler KI entfernen

1. Ein Kleidungsstück mit Foto hinzufügen oder bearbeiten. **Hintergrund mit KI entfernen** aufklappen.
2. Hinweise lesen und **Lokale KI starten** antippen. Beim ersten Start lädt die App etwa 19 MB Modelldaten und Laufzeit von derselben Website. Kein Foto wird gesendet. Ohne diese Aktion erfolgt kein Download dieser Dateien.
3. Ergebnis prüfen. **Freistellung übernehmen** setzt die transparente Vorschau ins Formular; erst normales Speichern übernimmt sie dauerhaft. **Vorschau verwerfen** behält das bisherige Foto. Abbrechen beendet den laufenden Worker.
4. **Originalfoto verwenden** holt das unverändert aufbewahrte Original zurück. Neue Fotoauswahl verwirft die dazugehörige alte Freistellung.

Einzelne Stücke vor ruhigem Hintergrund eignen sich am besten. Das kleine U²-Net-Modell erkennt auffälligen Vordergrund; es versteht keine Kleidungskategorien, Passform oder Stilqualität. Kanten, Schatten und Muster können fehlerhaft sein. Die Funktion ist **experimentell und auf echtem iPhone noch nicht geprüft**; sie ist für die übrige App nicht erforderlich. Nach erfolgreichem ersten Laden arbeitet sie bei verfügbarem Cache auch offline. Unter **Mehr → KI-Dateien vom Gerät entfernen** lassen sich die etwa 19 MB Binärdateien löschen; Fotos und gespeicherte Freistellungen bleiben erhalten. Ein späterer Start benötigt dann wieder Netz. Quellen, Lizenzhinweise und Messgrenzen stehen in [IMAGE_ASSISTANCE.md](IMAGE_ASSISTANCE.md).

## Outfits und dein persönlicher Stil

Unter **Outfits → Entdecken** Anlass, Saison und gewünschten Stil wählen und „Outfits zusammenstellen“ antippen. Für einen vollständigen Look brauchst du ein Paar Schuhe und entweder ein Kleid oder ein Oberteil mit Hose. Ohne aktiviertes Wetter wird im Herbst/Winter eine vorhandene passende Jacke ergänzt; mit Wetter bei einer vorhergesagten Mindesttemperatur unter 15 °C. Accessoires sind optional. Stücke mit ausdrücklich anderer Saison werden ausgeschlossen. Ausschliesslich sportlich/Streetwear markierte Stücke werden für Büro und Abend nicht gewählt.

Die Vorschläge verwenden lokale Regeln und deine manuell eingegebenen Merkmale. Sie analysieren keine Bilder und garantieren keinen Dresscode, keine Passform oder ausreichende Wärme. Fehlende Angaben und Kategorien werden erklärt. „Warum diese Kombination?“ zeigt die Begründung. Die Suche betrachtet höchstens 18 Kandidaten je Kategorie; bei grossen Sammlungen „Neu kombinieren“ verwenden, um weitere gleichermassen geeignete Stücke einzubeziehen. Bestätigte Tragetage geben einem Stück ein kleines zusätzliches Gewicht.

- **Speichern:** einen Look später unter „Gespeichert“ wiederfinden, benennen, favorisieren oder löschen. Einzelne Stücke öffnen weiterhin ihre Angaben.
- **Daumen hoch:** diese Kombination und ihre Stücke erhalten mehr Gewicht in künftigen Vorschlägen.
- **Passt nicht:** genau diese Kombination wird nicht mehr vorgeschlagen. Ablehnungen lassen sich bewusst zurücksetzen; bis zu 1000 Rückmeldungen bleiben erhalten, ältere werden zuerst entfernt.
- **Regler oben rechts:** bevorzugte Farben und Stilrichtungen lokal speichern. Sie beeinflussen die Gewichtung, sind keine harten Filter.

Wird ein Kleidungsstück gelöscht, werden gespeicherte Outfits, zugehörige Kalendereinträge und Rückmeldungen mit diesem Stück ebenfalls entfernt. Beim Löschen eines Outfits werden dessen Kalendereinträge entfernt; die Kleidung bleibt erhalten. Eine Änderung der Kategorie lässt den gespeicherten Look bestehen, zeigt aber bei einer dadurch unvollständigen Kombination einen Prüfhinweis.

Neue Sicherungen (Version 4) enthalten Kleidung inklusive Originalfotos und übernommener Freistellungen, Outfits, Rückmeldungen, Stilvorlieben, Kalender und gegebenenfalls den gerundeten Wetterort mit letzter Vorhersage. Alle Daten stammen aus einem konsistenten Datenbanksnapshot. Alte Sicherungen (Version 1, 2 und 3) bleiben importierbar. **Ersetzen löscht alle Datenarten, die in der Sicherung fehlen**: Version 1 enthält keine Outfits/Vorlieben, Version 2 keinen Kalender/Wetterort; Version 1–3 enthalten keine Freistellungen. Beim Zusammenführen bleiben fehlende Datensätze erhalten; bei gleicher ID wird der gesamte neuere Stückdatensatz gewählt. Das Erscheinungsbild und heruntergeladene KI-Dateien gehören nicht zur Sicherung.

## Kalender und Tragehäufigkeit

Unter **Outfits → Kalender** einen Tag wählen, „Look einplanen“ antippen und einen gespeicherten Look zuordnen. Ein Look pro Tag, optional mit einer Notiz bis 200 Zeichen. Monatspfeile und Datumseingabe helfen beim Wechseln; „Heute“ führt zum aktuellen lokalen Tag.

Geplante Tage zählen noch nicht zur Tragehäufigkeit. Bestätige einen vergangenen oder heutigen Look mit „Getragen“ oder ändere seinen Status im Dialog. Zukünftige Looks bleiben geplant. Eine Korrektur zurück auf „Geplant“ oder das Löschen eines Eintrags passt die Statistik an, ohne doppelte Zähler. Bis zu 3000 Kalendertage werden unterstützt. Der Kalender verwendet den lokalen Gerätetag, keine UTC-Abkürzung. Er ist nach dem ersten Laden vollständig offline verfügbar.

## Wetter freiwillig aktivieren

1. Unter **Outfits → Entdecken** „Wetter für deinen Look“ aufklappen. Ohne weitere Aktion erfolgt keine Orts- oder Wetterabfrage.
2. Einen Ort eingeben, bewusst **Ort suchen** antippen und einen Treffer auswählen. Alternativ **Standort verwenden**: der Browser fragt nach deiner Standortfreigabe. Eine Ablehnung verhindert die manuelle Suche nicht.
3. **Wetter laden** antippen. Nur der Ortsname für die Suche beziehungsweise auf zwei Dezimalstellen gerundete Koordinaten für das Wetter werden an Open-Meteo übertragen. Keine Fotos, Kleidungsstücke, Cookies oder API-Schlüssel. Der API-Dienst erhält bei einem Zugriff technisch auch deine IP-Adresse.
4. Wettertag am ausgewählten Ort wählen und **Wetter für Vorschläge verwenden** aktivieren. Erst dann beeinflussen die Daten die Vorschläge. Kälte schliesst ausschliesslich als sommerlich markierte Stücke aus; Hitze ausschliesslich winterliche. Bei kühler Mindesttemperatur wird eine vorhandene Jacke ergänzt. Bei Regen erscheint ein Hinweis zur selbst zu prüfenden Wasserfestigkeit.

Wetter wird für bis zu sieben Tage gespeichert und mit Ortsname, Datenstand und Zeitzone angezeigt. Nach sechs Stunden oder wenn kein passender Tag mehr vorhanden ist, wird es nicht mehr als aktuell für Vorschläge verwendet. „Wetter laden“ aktualisiert bewusst; kein Hintergrundabruf und kein automatisches Standort-Tracking. Ohne Netz bleibt die letzte Vorhersage sichtbar, soweit noch ein passender Tag vorhanden ist. Beim erneuten Öffnen muss die Berücksichtigung für Vorschläge wieder aktiv gewählt werden. „Ort und Wetter vergessen“ löscht Ort und Vorhersage lokal, auch offline. Bereits exportierte Sicherungen enthalten diese Daten weiterhin.

Wetterquelle: [Open-Meteo](https://open-meteo.com/), Ortssuche basierend auf [GeoNames](https://www.geonames.org/), CC BY 4.0. Die kostenlose API ist für den privaten, nicht kommerziellen Gebrauch vorgesehen. Material, Isolation und Wasserdichtigkeit lassen sich aus den bisherigen Angaben nicht zuverlässig ableiten; Wetterregeln ersetzen keine eigene Prüfung.

Originalfotos werden beim Import lokal auf maximal 1600 Pixel verkleinert und als JPEG neu erzeugt (weisser Hintergrund, keine Übernahme der ursprünglichen EXIF-Metadaten). Freistellungen werden separat als transparente PNGs bis 1200 Pixel gespeichert. HEIC funktioniert nur, wenn der Browser es decodieren kann; andernfalls JPEG/PNG/WebP verwenden. Die Farbprobe benötigt keinen Modelldownload. Die Freistellung ist echte lokale KI, keine Kleidungs- oder Outfitbewertung.

## Datenschutz und Sicherung

Browserdaten können von iOS entfernt werden. Privates Surfen, Safari-Daten löschen, Gerätewechsel und Domainwechsel können Datenverlust oder einen anderen lokalen Bestand bedeuten. Auch Safari und die installierte App können getrennte Speicherbereiche verwenden: bei Bedarf per Export/Import übertragen. Speicheranforderungen sind keine Garantie. Backups sind unverschlüsselte JSON-Dateien mit privaten Fotos und gegebenenfalls Ortsdaten: sicher aufbewahren. Grenze: 100 MB/1000 Stücke pro Sicherung, 20 MB pro ausgewähltem Originalfoto. Regelmässig exportieren und Wiederherstellung prüfen.

Damit der Bestand sicherbar bleibt, werden Schreibvorgänge und zusammengeführte Importe oberhalb von 1000 Stücken oder etwa 90 MB Foto-/Kleidungsdaten im Sicherungsformat vollständig abgelehnt. Der übrige Platz ist für bis zu 1000 gespeicherte Outfits und die Vorlieben reserviert. Die App erklärt den Fehler; vorhandene Daten bleiben erhalten. Ein zwischenzeitlich gelöschtes oder geändertes Stück wird beim Speichern eines alten Bearbeitungsdialogs nicht stillschweigend überschrieben.

Bei einem App-Update erst Eingaben speichern, dann den eingeblendeten Updatehinweis verwenden. Ein Update löscht den Kleiderschrank nicht. Es gibt keinen automatischen Geräteabgleich.

## Tests

```sh
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm run format:check
```

Die Browserprüfungen starten selbst eine Produktionsvorschau auf Port 4173. Sie prüfen unter anderem reale Fotoverarbeitung, lokale Persistenz, Bearbeitung, Filter, Favoriten, Backups, Löschen, Offline-Betrieb und schmale Layouts. Screenshots entstehen in `test-results/` (nicht im Repository). Ein echter iPhone-Test wird dadurch nicht ersetzt.

In der vorbereiteten Cloud-Umgebung wird automatisch `/usr/bin/chromium` verwendet; dort ist kein Browserdownload nötig. Ein anderer vorhandener Chromium lässt sich mit `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` auswählen. Optional: `npx playwright install webkit` und `npm run test:e2e:webkit` für zusätzliche WebKit-Prüfungen. Browserdownloads benötigen die offizielle Playwright-CDN-Freigabe; WebKit wird in der aktuellen Cloud-Netzwerkfreigabe nicht heruntergeladen.

Die Wetter-Browserprüfungen verwenden kontrollierte API-Antworten, Fehler und eine Testposition; sie übertragen keinen echten Gerätestandort. Nach der Domainfreigabe wurden am 15. Oktober 2026 beide echten Endpunkte per HTTPS erfolgreich erreicht: Zürcher Ortssuche und sieben Vorhersagetage mit erwarteten Einheiten/Zeitzone. Die öffentliche App ist ebenfalls über HTTPS erreichbar; Skripte, Styles, Manifest, Icons, Service Worker, Worker, Modell und WASM wurden mit HTTP 200 und korrekten Binär-Prüfsummen bestätigt. Cloud-Chromiums zusätzlicher Live-Browserabruf scheitert weiterhin am Vertrauen in das Cloud-Proxy-Zertifikat (`ERR_CERT_AUTHORITY_INVALID`). Reales Browser-CORS und echtes iPhone/Safari sind dadurch nicht nachgewiesen. Keine TLS-Prüfung wurde abgeschaltet.

## Veröffentlichte Website und weitere Updates

Die App besteht ausschliesslich aus statischen Dateien in `dist/`. Sie lässt sich beispielsweise über GitHub Pages für ein öffentliches Repository im kostenlosen Tarif bereitstellen. Für private Repositories hängt die Pages-Verfügbarkeit vom GitHub-Tarif ab. Keine Zahlungsdaten für dieses Projekt hinterlegen; Tarif und Sichtbarkeit vor Aktivierung prüfen. Eine Veröffentlichung macht den Anwendungscode öffentlich erreichbar, aber überträgt keine lokal gespeicherten Kleidungsfotos.

Für eine GitHub-Projektseite unter `/Kleiderschrank/` bauen:

```sh
VITE_BASE_PATH=/Kleiderschrank/ npm run build
```

Auch eine lokale Vite-Vorschau dieses Builds benötigt denselben Pfad: `VITE_BASE_PATH=/Kleiderschrank/ npm run preview`. Danach für normale Root-Tests wieder mit `npm run build` bauen.

Der fertige manuell auslösbare Workflow liegt in `.github/workflows/pages.yml`. Er prüft Format/Daten und baut einschließlich eigener KI-Dateien für den richtigen Unterpfad:

1. Bei einem **bereits öffentlichen Repository** auf GitHub unter **Settings → Pages → Source** „GitHub Actions“ wählen.
2. Unter **Actions → MyStyle auf GitHub Pages → Run workflow** die Veröffentlichung starten.
3. Nach erfolgreichem Lauf die vom Deployment ausgegebene HTTPS-Adresse in Safari öffnen. Keine Adresse als live betrachten, bevor der Lauf erfolgreich und die Seite erreichbar ist.

Der Workflow startet nicht automatisch, verwendet Standard-Runner und überspringt private Repositories, um keine privaten kostenpflichtigen Minuten oder einen Tarifwechsel auszulösen. Die Sichtbarkeit wird nicht geändert. Ohne passenden kostenlosen Pages-Zugang kann der Root-Build als statische Website auf einem anderen kostenlosen HTTPS-Host bereitgestellt werden; keine kostenpflichtige Option aktivieren. Für eine eigene Root-Adresse genügt `npm run build`.

Das Repository wurde vom Nutzer öffentlich gestellt und Pages aktiviert. Anschließend wurde der [Workflow-Lauf 38783006210](https://github.com/treemonsal/Kleiderschrank/actions/runs/38783006210) erfolgreich gestartet: Installation, Formatprüfung, Datentests, Build, Upload und Deployment bestanden. Die veröffentlichte Anwendung stammt aus Commit `ca4af46a32520603fd42eb1a12a49a0cfdbbdf4f`. Normale Code-Pushes veröffentlichen nicht automatisch; nach späteren App-Änderungen den Workflow erneut starten. Der echte Gerätetest bleibt offen und ist in [IPHONE_CHECK.md](IPHONE_CHECK.md) beschrieben.

Funktionsumfang und weitere Phasen: [PRODUCT.md](PRODUCT.md), [ROADMAP.md](ROADMAP.md).

## Historie: Update 0.6

Die neue dunkle Oberfläche ist unter derselben App-Adresse veröffentlicht. Öffne MyStyle online und tippe bei „Eine neue Version ist bereit“ auf **Jetzt aktualisieren**. Deine lokale Sammlung bleibt erhalten. Neue Icons können auf bereits angelegten iPhone-Verknüpfungen vom Betriebssystem zwischengespeichert sein. Diese Server-Voraussetzung galt für die frühere Version 0.6. Ab 0.6.1 kann stattdessen die kostenlose Community-KI direkt in der App freigegeben werden.

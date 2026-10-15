# MyStyle

Dein persönlicher Kleiderschrank als private iPhone-PWA. React, TypeScript, Vite, Tailwind und Dexie/IndexedDB. Keine laufenden Software- oder API-Kosten, keine Accounts, keine Bildübertragung.

Version 0.3 ergänzt Outfit-Kalender, bestätigte Tragetage und freiwillige Wetterabfragen. Lokale Outfit-Vorschläge, gespeicherte Looks und persönliche Vorlieben bleiben ohne Netz nutzbar. Prüfungen und Grenzen sind in [REVIEW.md](REVIEW.md) dokumentiert.

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

## Outfits und dein persönlicher Stil

Unter **Outfits → Entdecken** Anlass, Saison und gewünschten Stil wählen und „Outfits zusammenstellen“ antippen. Für einen vollständigen Look brauchst du ein Paar Schuhe und entweder ein Kleid oder ein Oberteil mit Hose. Ohne aktiviertes Wetter wird im Herbst/Winter eine vorhandene passende Jacke ergänzt; mit Wetter bei einer vorhergesagten Mindesttemperatur unter 15 °C. Accessoires sind optional. Stücke mit ausdrücklich anderer Saison werden ausgeschlossen. Ausschliesslich sportlich/Streetwear markierte Stücke werden für Büro und Abend nicht gewählt.

Die Vorschläge verwenden lokale Regeln und deine manuell eingegebenen Merkmale. Sie analysieren keine Bilder und garantieren keinen Dresscode, keine Passform oder ausreichende Wärme. Fehlende Angaben und Kategorien werden erklärt. „Warum diese Kombination?“ zeigt die Begründung. Die Suche betrachtet höchstens 18 Kandidaten je Kategorie; bei grossen Sammlungen „Neu kombinieren“ verwenden, um weitere gleichermassen geeignete Stücke einzubeziehen. Bestätigte Tragetage geben einem Stück ein kleines zusätzliches Gewicht.

- **Speichern:** einen Look später unter „Gespeichert“ wiederfinden, benennen, favorisieren oder löschen. Einzelne Stücke öffnen weiterhin ihre Angaben.
- **Daumen hoch:** diese Kombination und ihre Stücke erhalten mehr Gewicht in künftigen Vorschlägen.
- **Passt nicht:** genau diese Kombination wird nicht mehr vorgeschlagen. Ablehnungen lassen sich bewusst zurücksetzen; bis zu 1000 Rückmeldungen bleiben erhalten, ältere werden zuerst entfernt.
- **Regler oben rechts:** bevorzugte Farben und Stilrichtungen lokal speichern. Sie beeinflussen die Gewichtung, sind keine harten Filter.

Wird ein Kleidungsstück gelöscht, werden gespeicherte Outfits, zugehörige Kalendereinträge und Rückmeldungen mit diesem Stück ebenfalls entfernt. Beim Löschen eines Outfits werden dessen Kalendereinträge entfernt; die Kleidung bleibt erhalten. Eine Änderung der Kategorie lässt den gespeicherten Look bestehen, zeigt aber bei einer dadurch unvollständigen Kombination einen Prüfhinweis.

Neue Sicherungen (Version 3) enthalten Kleidung inklusive Fotos, Outfits, Rückmeldungen, Stilvorlieben, Kalender und gegebenenfalls den gerundeten Wetterort mit letzter Vorhersage aus einem konsistenten Datenbanksnapshot. Alte Sicherungen (Version 1 und 2) bleiben importierbar. **Ersetzen löscht alle Datenarten, die in der Sicherung fehlen**: Version 1 enthält keine Outfits/Vorlieben, Version 2 keinen Kalender/Wetterort. Beim Zusammenführen bleiben vorhandene Daten erhalten. Das Erscheinungsbild ist eine separate Browsereinstellung.

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

Fotos werden lokal auf maximal 1600 Pixel verkleinert und als JPEG neu erzeugt (weisser Hintergrund, keine Übernahme der ursprünglichen EXIF-Metadaten). HEIC funktioniert nur, wenn der Browser es decodieren kann; andernfalls JPEG/PNG/WebP verwenden. Keine automatische Freistellung oder Bilderkennung in Version 1.

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

Die Wetter-Browserprüfungen verwenden kontrollierte API-Antworten, Fehler und eine Testposition; sie benötigen keine externen Wetterdienste und übertragen keinen echten Gerätestandort. Live-Abfragen wurden in dieser Cloud vom Netzwerkproxy mit 403 abgewiesen. Die erforderlichen Domains `api.open-meteo.com` und `geocoding-api.open-meteo.com` sind im Konfigurationsentwurf ergänzt. Für einen echten Abruf die Umgebungseinstellungen prüfen/speichern und die Umgebung veröffentlichen; danach den Live-Abruf erneut testen. Dies ist von der HTTPS-Bereitstellung der App und einem echten iPhone-Test getrennt.

## Später kostenlos bereitstellen

Die App besteht ausschliesslich aus statischen Dateien in `dist/`. Sie lässt sich beispielsweise über GitHub Pages für ein öffentliches Repository im kostenlosen Tarif bereitstellen. Für private Repositories hängt die Pages-Verfügbarkeit vom GitHub-Tarif ab. Keine Zahlungsdaten für dieses Projekt hinterlegen; Tarif und Sichtbarkeit vor Aktivierung prüfen. Eine Veröffentlichung macht den Anwendungscode öffentlich erreichbar, aber überträgt keine lokal gespeicherten Kleidungsfotos.

Für eine GitHub-Projektseite unter `/Kleiderschrank/` bauen:

```sh
VITE_BASE_PATH=/Kleiderschrank/ npm run build
```

Dann den Inhalt von `dist/` mit GitHub Pages bereitstellen (z. B. später über einen GitHub-Actions-Pages-Workflow) und die erzeugte HTTPS-Adresse auf dem iPhone öffnen. Für Hosting auf einer eigenen Root-Adresse genügt `npm run build`. Eine Veröffentlichung ist in dieser Entwicklungsphase nicht automatisch eingerichtet.

Funktionsumfang und weitere Phasen: [PRODUCT.md](PRODUCT.md), [ROADMAP.md](ROADMAP.md).

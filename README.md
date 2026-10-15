# MyStyle

Dein persönlicher Kleiderschrank als private iPhone-PWA. React, TypeScript, Vite, Tailwind und Dexie/IndexedDB. Keine laufenden Software- oder API-Kosten, keine Accounts, keine Bildübertragung.

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

Fotos werden lokal auf maximal 1600 Pixel verkleinert und als JPEG neu erzeugt (weisser Hintergrund, keine Übernahme der ursprünglichen EXIF-Metadaten). HEIC funktioniert nur, wenn der Browser es decodieren kann; andernfalls JPEG/PNG/WebP verwenden. Keine automatische Freistellung oder Bilderkennung in Version 1.

## Datenschutz und Sicherung

Browserdaten können von iOS entfernt werden. Privates Surfen, Safari-Daten löschen, Gerätewechsel und Domainwechsel können Datenverlust oder einen anderen lokalen Bestand bedeuten. Auch Safari und die installierte App können getrennte Speicherbereiche verwenden: bei Bedarf per Export/Import übertragen. Speicheranforderungen sind keine Garantie. Backups sind unverschlüsselte JSON-Dateien mit privaten Fotos: sicher aufbewahren. Grenze: 100 MB/1000 Stücke pro Sicherung, 20 MB pro ausgewähltem Originalfoto. Regelmässig exportieren und Wiederherstellung prüfen.

Bei einem App-Update erst Eingaben speichern, dann den eingeblendeten Updatehinweis verwenden. Ein Update löscht den Kleiderschrank nicht. Es gibt keinen automatischen Geräteabgleich.

## Tests

```sh
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Die Browserprüfungen starten selbst eine Produktionsvorschau auf Port 4173. Sie prüfen unter anderem reale Fotoverarbeitung, lokale Persistenz, Bearbeitung, Filter, Favoriten, Backups, Löschen, Offline-Betrieb und schmale Layouts. Screenshots entstehen in `test-results/` (nicht im Repository). Ein echter iPhone-Test wird dadurch nicht ersetzt.

In der vorbereiteten Cloud-Umgebung wird automatisch `/usr/bin/chromium` verwendet; dort ist kein Browserdownload nötig. Ein anderer vorhandener Chromium lässt sich mit `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` auswählen. Optional: `npx playwright install webkit` und `npm run test:e2e:webkit` für zusätzliche WebKit-Prüfungen. Browserdownloads benötigen die offizielle Playwright-CDN-Freigabe; WebKit wird in der aktuellen Cloud-Netzwerkfreigabe nicht heruntergeladen.

## Später kostenlos bereitstellen

Die App besteht ausschliesslich aus statischen Dateien in `dist/`. Sie lässt sich beispielsweise über GitHub Pages für ein öffentliches Repository im kostenlosen Tarif bereitstellen. Für private Repositories hängt die Pages-Verfügbarkeit vom GitHub-Tarif ab. Keine Zahlungsdaten für dieses Projekt hinterlegen; Tarif und Sichtbarkeit vor Aktivierung prüfen. Eine Veröffentlichung macht den Anwendungscode öffentlich erreichbar, aber überträgt keine lokal gespeicherten Kleidungsfotos.

Für eine GitHub-Projektseite unter `/Kleiderschrank/` bauen:

```sh
VITE_BASE_PATH=/Kleiderschrank/ npm run build
```

Dann den Inhalt von `dist/` mit GitHub Pages bereitstellen (z. B. später über einen GitHub-Actions-Pages-Workflow) und die erzeugte HTTPS-Adresse auf dem iPhone öffnen. Für Hosting auf einer eigenen Root-Adresse genügt `npm run build`. Eine Veröffentlichung ist in dieser Entwicklungsphase nicht automatisch eingerichtet.

Funktionsumfang und weitere Phasen: [PRODUCT.md](PRODUCT.md), [ROADMAP.md](ROADMAP.md).

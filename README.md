# MyStyle

Dein persönlicher Kleiderschrank als iPhone-PWA: ein Tageslook aus deinen eigenen Stücken, ein Journal deiner getragenen Tage und ein freiwilliger KI-Stylist. Jede Person hat auf ihrem Gerät einen eigenen Bestand, ohne Anmeldung oder laufende Kosten.

**[App öffnen](https://treemonsal.github.io/Kleiderschrank/)** · Version **0.30.0** · [iPhone-Prüfliste](docs/IPHONE_CHECK.md)

Auf dem iPhone in Safari öffnen, **Teilen → Zum Home-Bildschirm → Hinzufügen**, danach einmal vollständig online laden. Updates über den Hinweis in der App übernehmen. Keine Website-Daten löschen: Die Sammlung liegt auf dem Gerät.

## Was du wo findest

Seit 0.29.0 zeigt die App nur noch, was du täglich brauchst oder irgendwann wirklich vermisst. Gestaltung nach dem Claude-Design-Entwurf „Garderobenjournal“ ([design/JOURNAL.md](design/JOURNAL.md)).

| Bereich          | Inhalt                                                                                                                                                                                                                                                                                                                                                                                                              |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **I Heute**      | Datum und Wetter, Wochenleiste mit Farbringen, Tageslook als Abbildungstafel. Pfeil auf einem Teil tauscht es. **Verfeinern: Wärmer · Ruhiger · Ähnlich** zeigt eine Vorschau mit „neu“ auf der Tafel; erst **Übernehmen** speichert. **Heute getragen** (mit **Rückgängig**), „Wie gefällt dir der Look?“ mit freiwilligem Grund, Notiz des Tages, Stilcheck. Wischen wechselt den Tag, **Zu heute** führt zurück. |
| **II Garderobe** | Kategorien mit Anzahl, Filter **Favoriten** und **In der Wäsche**, Farbbilanz, Raster. **+** fügt ein oder mehrere Stücke hinzu. Favoriten setzt du im geöffneten Stück: Angaben, Tragehäufigkeit, „Passt gut zu“, Wäsche, Favorit, Bearbeiten, Löschen.                                                                                                                                                            |
| **III Looks**    | **Neu zusammenstellen:** Anlass wählen, **Aus der Garderobe vorschlagen**, dann **Speichern** oder **Für heute**. Darunter die gespeicherten Looks, zuletzt getragene zuerst, als Farbstreifen mit Herz und **Für heute**; Antippen des Namens benennt um oder löscht.                                                                                                                                              |
| **IV Journal**   | Monatskalender mit Farbringen, Tag planen oder bestätigen, Tragetage und verschiedene Stücke im Monat, lange nicht getragen, Einkaufsberatung, Sicherung.                                                                                                                                                                                                                                                           |
| **Sprechblase**  | Stylist-Chat und freiwilliges Stilgespräch (acht Fragen).                                                                                                                                                                                                                                                                                                                                                           |
| **Zahnrad**      | Kostenlose KI aktivieren, Stilprofil, Alltag (Temperaturempfinden, automatische Wäsche), Sicherung exportieren/importieren, Installationshilfe.                                                                                                                                                                                                                                                                     |

**Entfernt in 0.29.0**, weil selten gebraucht: Suche und Sortierung, Auswertung, Packliste, Preisfeld und Kosten pro Tragen, Online-Stylist (der Chat kann dasselbe), „Anderer Look“, „Look speichern“ auf Heute, Tagespfeile und Tageskalender auf Heute (Journal-Kalender), Stilvorlieben-Editor sowie Saison-, Stil- und Accessoire-Auswahl in Looks (Stilcheck und Stilgespräch setzen das), Sicherungserinnerung, Speicherdetails und KI-Dateien-Verwaltung. **Keine Daten gehen verloren:** gespeicherte Preise, Vorlieben und Erinnerungseinstellungen bleiben in der Datenbank und in jeder Sicherung. Alte Saison- und Stilfilter wirken nicht mehr unsichtbar weiter.

## KI und Grenzen

Eine Freigabe **Kostenlose KI aktivieren** schaltet Foto-KI, Chat und Einkaufsberatung frei. Ohne Freigabe werden Fotos nur auf dem Gerät vorbereitet, auch beim Hinzufügen mehrerer Fotos. Neue Fotos werden danach automatisch erkannt und freigestellt; **Original verwenden** macht die Freistellung rückgängig. Mehrere Fotos auf einmal werden nacheinander verarbeitet und erst mit **Alle speichern** gesichert. Bei Limit oder Ausfall übernimmt automatisch ein zweiter Qwen3-VL-Dienst, für reine Textberatung zusätzlich Pollinations; die Freistellung fällt auf ein Gerätemodell zurück. Alles kostenlos, ohne Konto.

Die Dienste sind öffentliche Community-Angebote: [Qwen3-VL-Outpost](https://huggingface.co/spaces/prithivMLmods/Qwen3-VL-Outpost), [BiRefNet](https://huggingface.co/spaces/ZhengPeng7/BiRefNet_demo), [Qwen3-VL-HF-Demo](https://huggingface.co/spaces/prithivMLmods/Qwen3-VL-HF-Demo) und [Pollinations](https://pollinations.ai/). Sie können Dateien temporär speichern, Limits haben oder ausfallen. Fotos mit Personen oder privaten Hintergründen vermeiden. Ein eigener kompatibler Server bleibt in den Einstellungen unter **Eigenen Server verbinden** optional.

Vorschläge kommen aus lokalen Regeln: vorhandene Stücke, deine Angaben und Bewertungen, Wäsche, Saison nach Datum oder Wetter, bestätigte Tragetage. Es wird kein Modell auf dich trainiert. Fehlende Stücke werden erklärt, nie erfunden. Passform, Material und Wärme bleiben ohne Nachweis unbekannt. Ohne Fotos ist keine visuelle Einschätzung möglich.

## Wetter

Auf **Heute** das Wetter antippen, Ort suchen oder **Standort verwenden**. Die Vorhersage kommt von [Open-Meteo](https://open-meteo.com/) (Ortssuche [GeoNames](https://www.geonames.org/), CC BY 4.0) mit auf zwei Dezimalstellen gerundeten Koordinaten. **Wetter für Vorschläge verwenden** lässt sich ausschalten, **Ort und Wetter vergessen** entfernt alles lokal. Älter als sechs Stunden gilt die Vorhersage als veraltet und beeinflusst keine Looks.

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

## Farbe aus einem Foto wählen

Im Kleidungseditor ein Foto hinzufügen und bei **Farbe** auf **Farbe aus Foto wählen** tippen. Eine einfarbige Stelle am Stoff antippen; die Positionsregler und Pfeiltasten helfen beim genauen Auswählen. Erst **Blau übernehmen** (beziehungsweise die vorgeschlagene Farbe) ändert das Farbfeld. Danach das Stück normal speichern oder Änderungen verwerfen. Die Farbe lässt sich weiterhin manuell ändern.

Die Farbprobe läuft auch offline vollständig auf deinem Gerät. Sie verändert dein Foto nicht. Licht, Schatten, Hintergrund und Muster können den Vorschlag verfälschen; **Bunt** bei Bedarf selbst wählen. Es handelt sich um eine lokale Pixelprobe mit grober Farbfamilie. Erkannte Merkmale liefert nach Freigabe die kostenlose Online-KI; sie bewertet keine Passform an deinem Körper.

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

## GitHub-Prüfungen und Veröffentlichung

Die App besteht aus statischen Dateien in `dist/`. Das öffentliche Repository verwendet kostenlose Standard-Runner und GitHub Pages. Sichtbarkeit und Tarif werden nicht automatisch geändert; private Repositories werden in den Workflows übersprungen.

- **App prüfen** (`.github/workflows/checks.yml`) prüft bei relevanten Pushes und Pull Requests Format, Datentests, Produktionsbuild und alle Chromium-Browserfälle. Dokumentations- und Backup-Änderungen allein starten keinen solchen Lauf. Der Workflow ist auch manuell ausführbar. Bei Browserfehlern werden Testdiagnosen sieben Tage aufbewahrt.
- **MyStyle auf GitHub Pages** (`.github/workflows/pages.yml`) bleibt bewusst manuell: **Actions → MyStyle auf GitHub Pages → Run workflow**. Er prüft Format und Daten, baut für den Pages-Unterpfad und veröffentlicht nur bei erfolgreichem Build. Normale Code-Pushes allein ändern die Live-App nicht.
- Alle verwendeten Actions sind an geprüfte Commit-SHAs gebunden. Node folgt `.nvmrc`; der Runner ist Ubuntu 24.04. Die Prüfungen benötigen nur Lesezugriff, ausschliesslich der Deployment-Job erhält Pages-/OIDC-Schreibrechte.

Für einen lokalen Build der Projektseite:

```sh
VITE_BASE_PATH=/Kleiderschrank/ npm run build
VITE_BASE_PATH=/Kleiderschrank/ npm run preview
```

Danach vor Root-Browserprüfungen wieder `npm run build` ausführen. Der echte iPhone-/Safari-Test bleibt separat in [IPHONE_CHECK.md](docs/IPHONE_CHECK.md) beschrieben.

Version **0.20.0** wurde am 21. Oktober 2026 durch [Pages-Lauf 39627640472](https://github.com/treemonsal/Kleiderschrank/actions/runs/39627640472) veröffentlicht. Der [GitHub-Gesamtlauf 39626544776](https://github.com/treemonsal/Kleiderschrank/actions/runs/39626544776) besteht mit **259 Datentests und allen 168 Browserfällen**. Zusätzlich bestehen zehn Python-Serverprüfungen und alle neun neuen Browserfälle unter dem Pages-Unterpfad einschliesslich Offline-Neustart. Öffentliche App-Dateien, Manifest, Icons und Service Worker sind bytegleich mit dem geprüften Pages-Build. Gezielte Foto-Wiederholung, freiwilliges detaillierteres Feedback und Tageslook-Anpassungen sind verfügbar; automatische Fotoverarbeitung und Mehrfachscan bleiben entfernt. Shopping und bestehende persönliche Daten bleiben erhalten.

## Projektbackup und Dokumentation

Vor der früheren Bereinigung wurde die **gesamte App 0.17.0** gesichert: Quellarchiv, vollständiges Git-Bundle, GitHub-Einstellungs-Snapshot und Prüfsummen unter [design/backups/full-0.17.0](design/backups/full-0.17.0/RESTORE.md). Alle 158 Projektdateien wurden byteweise verglichen; Bundle-Klon und `git fsck` bestehen. Der GitHub-Tag **`backup/before-cleanup-0.17.0`** hält den Ausgangsstand zusätzlich fest. Rückkehr über einen regulären Revert, ohne Force-Push oder Löschen lokaler Daten.

Der Stand vor der aktuellen Kritikerprüfung ist zusätzlich als GitHub-Tag **`backup/before-critic-review-0.17.1`** gesichert. Kritik, Korrekturen und verbleibende Grenzen stehen in [CRITIC_REVIEW.md](docs/archive/CRITIC_REVIEW.md).

Das frühere dunkle Design bleibt separat unter [Design-Backup](design/backups/README.md) erhalten. Einzelheiten zum aktuellen Icon stehen unter [design/app-icon](design/app-icon/README.md).

[Produktumfang](PRODUCT.md) · [Entwicklungsplan](ROADMAP.md) · [App-Audit](docs/archive/APP_AUDIT.md) · [Prüfprotokoll](docs/archive/REVIEW.md) · [Frühere Veröffentlichungen](docs/RELEASE_HISTORY.md)

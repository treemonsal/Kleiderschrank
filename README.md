# MyStyle

Dein persönlicher Kleiderschrank als private iPhone-PWA. React, TypeScript, Vite, Tailwind und Dexie/IndexedDB. Keine laufenden Software- oder API-Kosten und kein Konto nötig. Optionale Fotoübertragung nur nach Freigabe.

Version 0.11.2 hält die Glasnavigation beim Seitenwechsel durchgehend sichtbar. Der Seiteninhalt blendet weich ein, während Auswahl und Menü sofort reagieren. Das neue Platin-Homescreen-Icon aus 0.11.1 und die spielerischen Animationen bleiben erhalten. Die Produktkritik steht in [AUDIT.md](AUDIT.md).

**Veröffentlichte App:** https://treemonsal.github.io/Kleiderschrank/ — Version 0.11.1 am 16. Oktober 2026 erfolgreich bereitgestellt und über HTTPS geprüft. Auf dem iPhone in Safari öffnen: **Teilen → Zum Home-Bildschirm → Hinzufügen**. Danach über das neue Symbol starten und einmal vollständig online laden.

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
2. Mit aktivierter Online-Foto-KI die vorgeschlagenen Angaben prüfen; sonst Name und Kategorie eintragen. Alle Angaben bleiben korrigierbar.
3. Ein Stück öffnen, um es zu bearbeiten oder zu löschen. Herzen markieren Favoriten.
4. Unter „Mehr“ regelmässig eine Sicherung mit Fotos exportieren und in Dateien speichern. Import erst prüfen, dann bestätigen. Zusammenführen behält die neuere Version derselben ID; Ersetzen entfernt den vorhandenen Bestand und stellt die Sicherung wieder her.

## Direkt beim Öffnen

**Heute** zeigt statt des festen Begrüssungsblocks deinen Tageslook aus vorhandenen Stücken. Ein vollständiger, für heute im Kalender gewählter Look hat Vorrang. Sonst kombinieren die lokalen Regeln anhand der erfassten Merkmale, Vorlieben, Rückmeldungen, Outfit-Auswahl und gegebenenfalls aktuellen Wetterdaten. Ohne Wetter wird bei Saison „Alle“ die Jahreszeit des Gerätedatums verwendet. Bei gleichem Bestand und gleichen Einstellungen bleibt die Auswahl am selben Tag stabil; am nächsten Gerätetag wird neu ausgewählt. Fehlende Stücke werden erklärt, nie erfunden. Die Auswahl braucht keine weitere Foto-KI-Anfrage und lässt sich direkt speichern oder unter Outfits anpassen.

Links oben stehen Datum und Tagesvorhersage mit Temperaturspanne, Wetterlage und gespeichertem Ort. Das ist keine gemessene Live-Temperatur. Antippen öffnet die Wetterauswahl mit Schliessen-Taste. Ohne gespeicherten Ort erscheint „Ort auswählen“.

Auf der Startseite **nach rechts wischen → Vortag**, **nach links wischen → nächster Tag**. Die Hauptseiten werden dabei nicht mehr gewechselt; dafür bleibt die Navigationsleiste. Pfeiltasten am Datum und die Wochenleiste bieten dieselbe Tagesauswahl ohne Geste. Auf „Heute“/das Datum neben dem Kalendersymbol tippen, um den Monatskalender zu öffnen. Eine Datumswahl schliesst ihn automatisch, „Zu heute“ kehrt zum aktuellen Gerätetag zurück. Eingaben, offene Dialoge, vertikales Scrollen und Bildschirmränder lösen keinen Tageswechsel aus.

**Heute getragen** speichert den Vorschlag bei Bedarf als Outfit und vermerkt ihn atomar als getragen. „Look speichern“ allein ist weiterhin nur ein gespeichertes Outfit, keine Tragebestätigung. Vergangene Tage zeigen ausschliesslich hinterlegte Looks mit ihrem tatsächlichen Status; ein alter Plan wird nicht nachträglich als getragen ausgegeben, und leere Tage erhalten keinen erfundenen Vorschlag. Zukünftige Tage zeigen vorhandene Pläne. Leere vergangene Tage lassen sich über „Getragenen Look eintragen“ ergänzen, zukünftige über „Look einplanen“; „Tag bearbeiten“ erlaubt Korrekturen.

**Farbringe um die Tageszahl** zeigen die erfassten Farbfamilien bestätigter Looks bis heute, sowohl in der Wochenleiste als auch im Monatskalender unter Outfits. Pläne haben einen neutralen gestrichelten Kreis. Ohne Farbangaben bleibt die Markierung neutral. Die Farben stehen auch in der zugänglichen Tagesbeschriftung. Die Ringsegmente zeigen Farbfamilien, keine gemessenen Stoffflächen oder exakten Fotofarben.

Bei neuen Tragebestätigungen werden die Farben mitgesichert und bleiben bei späterer Änderung eines Kleidungsstücks erhalten. Wird ein Eintrag wieder auf „geplant“ gesetzt und neu bestätigt oder ein anderes Outfit ausgewählt, werden dessen Farben neu übernommen. Frühere Einträge ohne Farbsicherung verwenden die aktuellen Merkmale der referenzierten Stücke; einen früheren Farbstand können wir nicht rekonstruieren. Namen und Fotos bleiben mit den vorhandenen Kleidungsstücken verknüpft. Die bisherige abhängige Löschung beim Entfernen von Kleidung/Outfits gilt weiterhin.

## Animationen und Bewegung

Die Waschmaschinen-Tasten lassen kurz die Trommel drehen und das Gehäuse wippen. Favoriten reagieren mit einem kleinen Herz-Puls; erneutes Tippen startet einen neuen kurzen Effekt. Die Glasnavigation federt zur gewählten Seite, unterstützte Browser blenden den Seiteninhalt weich über. Ohne diese Browserfunktion bleibt eine kurze Einblendung. Fenster öffnen sanfter, Fotos blenden ein und die Teile eines Looks erscheinen leicht versetzt. Keine Endlosschleifen, zusätzliche Bibliothek oder Modelldatei.

Die Rückmeldung läuft unabhängig vom Speichern oder Filtern. Zustände ändern sich erst nach dem jeweiligen tatsächlichen Vorgang; eine Animation behauptet keinen erfolgreichen Speichervorgang. Bei **Bewegung reduzieren** im Betriebssystem stoppen laufende Tipp-Effekte, und neue Dreh-/Feder-/Seitenanimationen bleiben aus. Tageswischen und Tastaturbedienung funktionieren weiter.

## Direkte Tagesaktionen

**Heute getragen** steht direkt über den Kleidungsbildern. **Anderer Look** wählt für einen heutigen, noch nicht geplanten/bestätigten Tag eine andere vollständige Kombination und merkt sie über Neustarts hinweg. Der bisherige Look wird dadurch nicht negativ bewertet. Ist keine Alternative vorhanden, bleibt er erhalten. Unter **Gefällt mir** kannst du den Look positiv bewerten und die Bewertung durch erneutes Tippen zurücknehmen. Die Bewertung wirkt auf die Kombination und in kleinerem Umfang auf wiederkehrende Stückpaare. Sie ist keine Aussage darüber, ob du den Look tatsächlich getragen hast.

Anlass, Saison und Wetterverwendung stehen direkt an der Tageskarte. Jacken und Accessoires werden zusammen mit der Basis verglichen; gemeinsame erfasste Stile und bekannte Farben helfen bei der Gewichtung. Fehlende Angaben bleiben erkennbar. Empfehlungen basieren weiterhin auf lokalen Regeln und kennen weder deine genaue Passform noch Materialeigenschaften.

Bei leerem Bestand führt **Erstes Stück hinzufügen** sofort zum Foto-/Kleidungseditor. Ein Speicherproblem erscheint mit einer lesbaren Fehleransicht; Website-Daten dafür nicht löschen. Tastaturnutzer erreichen mit dem ersten Tab den Link **Zum Inhalt**.

## Teile tauschen, Wäsche und Abwechslung

Unter einem Stück im heutigen, noch nicht getragenen Tageslook **Austauschen** antippen. Die Auswahl zeigt verfügbare Alternativen derselben Kategorie passend zu Saison, Anlass und gegebenenfalls Wetter. Alle anderen Stücke bleiben erhalten. Die neue Tagesauswahl bleibt nach Neustart bestehen und wird mitgesichert. Bei einem heutigen Kalenderplan wird nur dieser Tag umgehängt; frühere Einträge und der ursprüngliche gespeicherte Look bleiben erhalten. Bestätigte Tragetage werden hier nicht verändert. Eine geänderte Outfit-Auswahl, ein entferntes Stück oder ein Stück in der Wäsche kann die automatische Tagesauswahl zurücksetzen.

In den Kleidungsdetails **In die Wäsche legen** wählen oder im Editor das Wäsche-Häkchen setzen. Das Stück bleibt mit Fotos erhalten, wird jedoch aus neuen automatischen Vorschlägen und Tauschalternativen ausgeschlossen. Im Kleiderschrank zeigt die Waschmaschinen-Taste **Nur Wäsche**. Nach dem Waschen **Als sauber markieren** wählen. Bestehende gespeicherte Looks und Tragetage bleiben unverändert; ein heutiger Plan mit einem solchen Stück zeigt einen Hinweis.

Bestätigte Tragetage der letzten Woche verringern das Gewicht kürzlich verwendeter Stücke und besonders derselben Kombination. Das sorgt bei genügend Auswahl für mehr Abwechslung. Die Auswahl bleibt regelbasiert; ein kleiner Bestand kann Wiederholungen nötig machen. Pläne und zukünftige Einträge zählen hierfür nicht als getragen.

Die Tageskarte folgt horizontal dem Finger und gleitet beim Loslassen weiter oder zurück. Bei aktivierter reduzierter Bewegung wechselt nur der Tag, ohne Verschiebung. Die unteren Hauptseiten bleiben über die Navigationsleiste erreichbar.

## Sicherungserinnerung

Frühestens nach einer Woche erscheint auf der Startseite ein kleiner Hinweis, wenn es noch ungesicherte Änderungen gibt. **Sicherung öffnen** führt zu „Mehr“, **In einer Woche** pausiert. Unter „Mehr“ lassen sich Erinnerungen dauerhaft ausschalten. Ein unveränderter exportierter Bestand und reine Vorhersage-Aktualisierungen lösen keinen neuen Hinweis aus. Wäsche, Tagesauswahl und Erinnerungseinstellungen sind im bisherigen Sicherungsformat 4 enthalten; alte Sicherungen bleiben lesbar.

Ein Export bedeutet, dass eine Datei erstellt wurde. Bitte selbst in „Dateien“ speichern; die App kann den tatsächlichen Abschluss des iPhone-Downloads nicht bestätigen. Es gibt weiterhin keinen automatischen Cloud-Abgleich oder Foto-Upload für Sicherungen.

## Farbe aus einem Foto wählen

Im Kleidungseditor ein Foto hinzufügen und bei **Farbe** auf **Farbe aus Foto wählen** tippen. Eine einfarbige Stelle am Stoff antippen; die Positionsregler und Pfeiltasten helfen beim genauen Auswählen. Erst **Blau übernehmen** (beziehungsweise die vorgeschlagene Farbe) ändert das Farbfeld. Danach das Stück normal speichern oder Änderungen verwerfen. Die Farbe lässt sich weiterhin manuell ändern.

Die Farbprobe läuft auch offline vollständig auf deinem Gerät. Sie verändert dein Foto nicht. Licht, Schatten, Hintergrund und Muster können den Vorschlag verfälschen; **Bunt** bei Bedarf selbst wählen. Es handelt sich um eine lokale Pixelprobe mit grober Farbfamilie. Automatische Merkmale liefert nach Freigabe die kostenlose Online-KI; Outfit-Fotobewertung ist noch nicht eingebaut.

## Foto automatisch erfassen

1. **Mehr → Online-Foto-KI** öffnen. Die genannten Anbieter und Datenschutzhinweise lesen, Fotoübertragung erlauben und **Kostenlose KI aktivieren** antippen. Dafür brauchst du keinen Token und kein Abo.
2. Neues Foto aufnehmen oder aus der Mediathek wählen. Qwen3-VL-Outpost erkennt Name, Kategorie, Farbe und sichtbare Marke sowie Notizen, Stil und Saison. Marke ohne lesbares Zeichen leer lassen; Stil/Saison sind Schätzungen. Alle Angaben bleiben korrigierbar. Während der Analyse selbst geänderte Felder bleiben erhalten.
3. BiRefNet erstellt eine transparente Vorschau. **Freistellung übernehmen** oder **Original behalten** wählen, dann das Stück speichern. Das vorbereitete Originalfoto bleibt zusätzlich erhalten und wird mitgesichert.
4. Nach Aktivierung zeigt die Einstellung nur den aktiven Status. Der Aktivieren-Knopf verschwindet; die Anbieter-/Datenschutzhinweise und Freigabe bleiben aufklappbar. **Community-KI ausschalten** oder die Foto-Freigabe abwählen verhindert neue Übertragungen. Die vorhandene Sammlung bleibt auf deinem Gerät. Das Öffnen/Bearbeiten gespeicherter Stücke lädt sie nicht automatisch hoch.

Die App nutzt die öffentlich angebotenen Gradio-APIs von [Qwen3-VL-Outpost](https://huggingface.co/spaces/prithivMLmods/Qwen3-VL-Outpost) und der [offiziellen BiRefNet-Demo](https://huggingface.co/spaces/ZhengPeng7/BiRefNet_demo). **Das sind öffentliche Community-Dienste, kein privater MyStyle-Server.** Das ausgewählte Foto wird an beide übertragen; die Freistellung nutzt temporäre Dateien auf dem Server des Anbieters. Speicher-/Löschdauer können wir nicht garantieren. Fotos mit Personen oder privaten Hintergründen vermeiden. Es gibt keine Verfügbarkeitsgarantie; Warteschlangen, Tageslimits und Abschaltungen sind möglich. Dann bleibt das Foto erhalten, ein brauchbares Teilergebnis wird nicht verworfen. Keine automatischen Ausweichanbieter, Provider-Schlüssel oder bezahlten Wiederholungen.

Fehlermeldungen nennen ab 0.6.2 **Bilderkennung** oder **Freistellung** und unterscheiden bestätigtes Nutzungslimit (z. B. HTTP 429/GPU-Quota), volle Warteschlange, Verbindungsfehler, nicht verfügbaren Dienst und unbrauchbare Antworten. Eine Zeit für einen neuen Versuch wird nur angezeigt, wenn der Anbieter sie liefert. Ohne eindeutigen Fehlergrund behauptet die App kein Limit. Die frühere Sammelmeldung erlaubt keine sichere rückwirkende Diagnose; zwei erfolgreiche Scans bedeuten kein festes Zwei-Scans-Limit. Die Grenzen der kostenlosen Dienste bleiben bestehen.

Ein eigener kompatibler Server bleibt unter **Eigenen Server verbinden** optional. Unsere frühere Annahme, einen Docker-Space auf Hugging Face kostenlos selbst zu betreiben, war falsch: Die aktuelle API verlangt dafür PRO (HTTP 402). Auch Inference Providers bieten Free-Accounts aktuell keine Gratis-Credits. Der kostenlose App-Modus verwendet diese kostenpflichtigen Angebote nicht.

## Hintergrund mit lokaler KI entfernen

1. Ein Kleidungsstück mit Foto hinzufügen oder bearbeiten. **Hintergrund mit KI entfernen** aufklappen.
2. Hinweise lesen und **Lokale KI starten** antippen. Beim ersten Start lädt die App etwa 19 MB Modelldaten und Laufzeit von derselben Website. Kein Foto wird gesendet. Ohne diese Aktion erfolgt kein Download dieser Dateien.
3. Ergebnis prüfen. **Freistellung übernehmen** setzt die transparente Vorschau ins Formular; erst normales Speichern übernimmt sie dauerhaft. **Vorschau verwerfen** behält das bisherige Foto. Abbrechen beendet den laufenden Worker.
4. **Originalfoto verwenden** holt das unverändert aufbewahrte Original zurück. Neue Fotoauswahl verwirft die dazugehörige alte Freistellung.

Einzelne Stücke vor ruhigem Hintergrund eignen sich am besten. Das kleine U²-Net-Modell erkennt auffälligen Vordergrund; es versteht keine Kleidungskategorien, Passform oder Stilqualität. Kanten, Schatten und Muster können fehlerhaft sein. Die Funktion ist **experimentell und auf echtem iPhone noch nicht geprüft**; sie ist für die übrige App nicht erforderlich. Nach erfolgreichem ersten Laden arbeitet sie bei verfügbarem Cache auch offline. Unter **Mehr → KI-Dateien vom Gerät entfernen** lassen sich die etwa 19 MB Binärdateien löschen; Fotos und gespeicherte Freistellungen bleiben erhalten. Ein späterer Start benötigt dann wieder Netz. Quellen, Lizenzhinweise und Messgrenzen stehen in [IMAGE_ASSISTANCE.md](IMAGE_ASSISTANCE.md).

## Outfits und dein persönlicher Stil

Unter **Outfits → Entdecken** Anlass, Saison und gewünschten Stil wählen und „Outfits zusammenstellen“ antippen. Für einen vollständigen Look brauchst du ein Paar Schuhe und entweder ein Kleid oder ein Oberteil mit Hose. Ohne aktiviertes Wetter wird im Herbst/Winter eine vorhandene passende Jacke ergänzt; mit Wetter bei einer vorhergesagten Mindesttemperatur unter 15 °C. Accessoires sind optional. Stücke mit ausdrücklich anderer Saison werden ausgeschlossen. Ausschliesslich sportlich/Streetwear markierte Stücke werden für Büro und Abend nicht gewählt.

Anlass, Saison, Stil und das Accessoire-Häkchen werden automatisch auf diesem Gerät gespeichert und mitgesichert. Die Vorschläge verwenden lokale Regeln und deine erfassten Merkmale (manuell oder per freigegebener Foto-KI). Sie analysieren keine Bilder und garantieren keinen Dresscode, keine Passform oder ausreichende Wärme. Fehlende Angaben und Kategorien werden erklärt. „Warum diese Kombination?“ zeigt die Begründung. Die Suche betrachtet höchstens 18 Kandidaten je Kategorie; bei grossen Sammlungen „Neu kombinieren“ verwenden, um weitere gleichermassen geeignete Stücke einzubeziehen. Bestätigte Tragetage geben einem Stück ein kleines zusätzliches Gewicht.

- **Speichern:** einen Look später unter „Gespeichert“ wiederfinden, benennen, favorisieren oder löschen. Einzelne Stücke öffnen weiterhin ihre Angaben.
- **Daumen hoch:** diese Kombination und ihre Stücke erhalten mehr Gewicht in künftigen Vorschlägen.
- **Passt nicht:** genau diese Kombination wird nicht mehr vorgeschlagen. Ablehnungen lassen sich bewusst zurücksetzen; bis zu 1000 Rückmeldungen bleiben erhalten, ältere werden zuerst entfernt.
- **Regler oben rechts:** bevorzugte Farben und Stilrichtungen lokal speichern. Sie beeinflussen die Gewichtung, sind keine harten Filter.

Wird ein Kleidungsstück gelöscht, werden gespeicherte Outfits, zugehörige Kalendereinträge und Rückmeldungen mit diesem Stück ebenfalls entfernt. Beim Löschen eines Outfits werden dessen Kalendereinträge entfernt; die Kleidung bleibt erhalten. Eine Änderung der Kategorie lässt den gespeicherten Look bestehen, zeigt aber bei einer dadurch unvollständigen Kombination einen Prüfhinweis.

Neue Sicherungen (Version 4) enthalten Kleidung inklusive Originalfotos und übernommener Freistellungen, Outfits, Rückmeldungen, Stilvorlieben samt Outfit-/Wetter-Einstellungen, Kalender und gegebenenfalls den gerundeten Wetterort mit letzter Vorhersage. Alle Daten stammen aus einem konsistenten Datenbanksnapshot. Alte Sicherungen (Version 1, 2 und 3) bleiben importierbar. **Ersetzen löscht alle Datenarten, die in der Sicherung fehlen**: Version 1 enthält keine Outfits/Vorlieben, Version 2 keinen Kalender/Wetterort; Version 1–3 enthalten keine Freistellungen. Beim Zusammenführen bleiben fehlende Datensätze erhalten; bei gleicher ID wird der gesamte neuere Stückdatensatz gewählt. Das Erscheinungsbild und heruntergeladene KI-Dateien gehören nicht zur Sicherung.

## Kalender und Tragehäufigkeit

Unter **Outfits → Kalender** einen Tag wählen, „Look einplanen“ antippen und einen gespeicherten Look zuordnen. Ein Look pro Tag, optional mit einer Notiz bis 200 Zeichen. Monatspfeile und Datumseingabe helfen beim Wechseln; „Heute“ führt zum aktuellen lokalen Tag.

Geplante Tage zählen noch nicht zur Tragehäufigkeit. Bestätige einen vergangenen oder heutigen Look mit „Getragen“ oder ändere seinen Status im Dialog. Zukünftige Looks bleiben geplant. Eine Korrektur zurück auf „Geplant“ oder das Löschen eines Eintrags passt die Statistik an, ohne doppelte Zähler. Bis zu 3000 Kalendertage werden unterstützt. Der Kalender verwendet den lokalen Gerätetag, keine UTC-Abkürzung. Er ist nach dem ersten Laden vollständig offline verfügbar.

## Wetter und gespeicherter Ort

1. Auf **Heute** die Wetterzeile antippen oder unter **Outfits → Entdecken** „Wetter für deinen Look“ aufklappen. Ohne gespeicherten Ort erfolgt keine automatische Anfrage.
2. Ort eingeben, **Ort suchen** antippen und einen Treffer auswählen. Die Auswahl lädt die Vorhersage, speichert Ort/Wetter atomar, aktiviert die Berücksichtigung für Looks, zeigt „Wetter für … gespeichert.“ und schliesst die Auswahl. Erst ein erfolgreiches Speichern wird bestätigt. Bei einem Fehler bleibt die Auswahl zur Korrektur offen und bisher gespeichertes Wetter erhalten.
3. Alternativ **Standort verwenden**: Der Browser fragt nach Freigabe. Nur diese Aktion ermittelt den Gerätestandort. Eine Ablehnung lässt die manuelle Suche verfügbar. Schliessen bricht die laufende Anfrage ab; eine verspätete Standortantwort löst keinen neuen Abruf aus.
4. Die Ortssuche sendet den Ortsnamen, die Wetterabfrage auf zwei Dezimalstellen gerundete Koordinaten an Open-Meteo. Keine Fotos, Kleidung, Cookies oder API-Schlüssel; technisch erhält der Dienst deine IP-Adresse. Mit gespeichertem Ort und aktivierter Wetterverwendung aktualisiert die App eine alte/fehlende Tagesvorhersage beim Öffnen bzw. Wiederkehren online. Keine erneute Geolokalisierung, keine Dauerversuche bei Dienstfehlern.
5. „Wetter für Vorschläge verwenden“ bleibt nach Neustart erhalten und lässt sich ausschalten. Eine ausgeschaltete Verwendung verhindert automatische Wetteraktualisierung und Einfluss auf Looks. Gespeichertes Wetter bleibt sichtbar. **Wetter laden** aktualisiert bewusst; **Ort und Wetter vergessen** entfernt die lokalen Angaben und schliesst die Auswahl. Eine noch eintreffende alte Antwort stellt den Ort nicht wieder her.

Wetter wird für bis zu sieben Tage gespeichert; älter als sechs Stunden oder ohne passenden Tag wird es als veraltet markiert und beeinflusst keine Looks. Offline bleibt die gespeicherte Vorhersage verfügbar. Der Tageslook nutzt den lokalen Gerätetag; im Outfit-Tab lässt sich bei Bedarf ein anderer Vorhersagetag wählen. Kälte schliesst ausdrücklich sommerliche Stücke aus, Hitze ausdrücklich winterliche. Bei kühler Mindesttemperatur wird eine vorhandene Jacke ergänzt. Regenhinweise ersetzen keine Prüfung der Wasserfestigkeit. Bereits exportierte Sicherungen enthalten einen später vergessenen Ort weiterhin.

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

Das Repository wurde vom Nutzer öffentlich gestellt und Pages aktiviert. Anschließend wurde der [Workflow-Lauf 38783006210](https://github.com/treemonsal/Kleiderschrank/actions/runs/38783006210) erfolgreich gestartet: Installation, Formatprüfung, Datentests, Build, Upload und Deployment bestanden. Dieser erste Lauf veröffentlichte Commit `ca4af46a32520603fd42eb1a12a49a0cfdbbdf4f`. Aktuell ist Version 0.11.1 aus Commit `df87983299bd2e1f6b45d9c2be400de6b42d0c4d` durch [Lauf 38863456501](https://github.com/treemonsal/Kleiderschrank/actions/runs/38863456501) erfolgreich veröffentlicht und über HTTPS geprüft. Normale Code-Pushes veröffentlichen nicht automatisch; nach späteren App-Änderungen den Workflow erneut starten. Der echte Gerätetest bleibt offen und ist in [IPHONE_CHECK.md](IPHONE_CHECK.md) beschrieben.

Funktionsumfang und weitere Phasen: [PRODUCT.md](PRODUCT.md), [ROADMAP.md](ROADMAP.md).

## Historie: Update 0.6

Die neue dunkle Oberfläche ist unter derselben App-Adresse veröffentlicht. Öffne MyStyle online und tippe bei „Eine neue Version ist bereit“ auf **Jetzt aktualisieren**. Deine lokale Sammlung bleibt erhalten. Neue Icons können auf bereits angelegten iPhone-Verknüpfungen vom Betriebssystem zwischengespeichert sein. Diese Server-Voraussetzung galt für die frühere Version 0.6. Ab 0.6.1 kann stattdessen die kostenlose Community-KI direkt in der App freigegeben werden.

## Neues Homescreen-Icon in 0.11.1

Die neuen Installationsdateien zeigen den silbernen Bügel auf Graphit. Öffne die App online und übernimm das angebotene Update. Neue Homescreen-Verknüpfungen laden das neue iPhone-Icon. iOS kann das Icon vorhandener Installationen länger behalten. Lösche dafür weder die App noch Safari-Websitedaten: Deine Sammlung liegt lokal. Vor einer bewussten Neuinstallation immer unter **Mehr** eine vollständige Sicherung exportieren und die Datei aufbewahren.

Original, Exportgrössen und reproduzierbare Aufbereitung stehen unter [design/app-icon](design/app-icon/README.md).

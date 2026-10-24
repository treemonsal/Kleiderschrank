# MyStyle

Dein persönlicher Kleiderschrank als iPhone-PWA: Tageslooks, Fotos, Kalender und ein freiwilliger KI-Stylist. Jede Person hat auf ihrem Gerät einen eigenen Bestand – ohne Anmeldung oder laufende Software-/API-Kosten.

**[App öffnen](https://treemonsal.github.io/Kleiderschrank/)** · Version **0.25.0** · [iPhone-Prüfliste](docs/IPHONE_CHECK.md)

Auf dem iPhone in Safari öffnen, **Teilen → Zum Home-Bildschirm → Hinzufügen**, danach einmal vollständig online laden. Spätere Updates über den Hinweis in der App übernehmen. Keine Website-Daten löschen: Die Sammlung liegt auf dem Gerät. Fotos verlassen es nur für ausdrücklich freigegebene Online-Funktionen; der Chat hat eine eigene Freigabe.

## Was du wo findest

- **Heute:** Wetter, automatisch gewählter Tageslook, Alternativen und Tragebestätigung. Im Tagesbereich links/rechts wischen; Datum oder Kalender öffnen für Rückblick und Planung.
- **Kleiderschrank:** Stücke aufnehmen, suchen, filtern, bearbeiten, favorisieren und in die Wäsche legen. Der Wäschefilter zeigt Stücke in der Wäsche; **Als sauber markieren** gibt sie wieder für Vorschläge frei.
- **Outfits:** Kombinationen erstellen, bewerten, speichern und im Kalender planen. Accessoire- und Wettervorlieben bleiben gespeichert.
- **Stylist ↗:** Fragen stellen oder das freiwillige vertiefte Stilgespräch öffnen. Ein kleiner Punkt kennzeichnet eine Einladung oder eine vorhandene ungelesene Antwort.
- **Mehr:** Stilprofil, Shopping-Fortschritt, Online-Foto-KI, persönliche Sicherung, Speicher- und Installationshilfe. Ein Export sichert den eigenen Bestand; ein Projektbackup ersetzt diesen Export nicht.

Die Gestaltung ist hell und ruhig: warmes Elfenbein, Systemschrift, weisse Karten, schwarze Pill-Buttons und eine Navigationsleiste aus durchsichtigem Liquid Glass knapp über dem Home-Balken. Die App bleibt auch im Dunkelmodus des iPhones hell. Das Homescreen-Icon bleibt schwarz-weiss. Bereichswechsel merken Datum, Filter und Scrollposition während der laufenden Sitzung. Erneutes Tippen auf den aktiven Bereich führt nach oben. Neue Versionen können auf dem iPhone erst nach Übernahme des Updates erscheinen; vorhandene Icons unterliegen zusätzlich dem iOS-Cache.

## Personalisierung und Beratung

Der freiwillige Stilcheck stellt drei kurze Fragen. Danach kannst du im Stylisten acht vertiefte Fragen beantworten, überspringen, pausieren und später ändern. Jede Antwort wird ausdrücklich gespeichert. Unter **Mehr → Dein Stilprofil** sind auch die Bewertungen erreichbar. Daumen hoch stärkt passende Vorschläge; Daumen runter fragt nach einem Grund. **Anderer Look** ist eine Alternative und keine negative Bewertung.

Lokale Vorschläge nutzen vorhandene Stücke, deine Angaben und Bewertungen sowie Wäsche, Saison, bestätigte Tragetage und freigegebenes Wetter. Die Regeln gewichten Vorlieben nachvollziehbar; es wird kein eigenes Modell auf dich trainiert. Ein kleiner Bestand kann Wiederholungen nötig machen.

Der **Online-Stylist** vergleicht auf deinen Tipp höchstens vier vollständige Looks mit maximal 20 unterschiedlichen Stücken. Dafür sendet er eine verkleinerte Fotoübersicht, Angaben, Stilprofil, begrenzte Bewertungsmuster, deinen Wunsch und gegebenenfalls Wetterwerte an Qwen3-VL-Outpost. Keine ganze Garderobe oder Standortkoordinaten. Er wählt nur aus vorhandenen, verfügbaren Kombinationen; eine Übernahme wird erneut lokal geprüft.

Der **Chat** nutzt nach eigener Freigabe Qwen3-VL-8B: deine Frage, höchstens sechs vorherige Nachrichten, bis zu 40 relevante Kleidungsangaben, Profil, ausgewählte Rückmeldungen und gegebenenfalls Wetterwerte. Keine Kleidungsfotos, Notizen oder Koordinaten. Antworten und prüfbare Lookkarten bleiben lokal; **Look speichern** ist eine eigene Aktion. Der Chat kann keine Kleidung löschen oder Einstellungen heimlich ändern. Ein ungesendeter Entwurf bleibt bis zum Neuladen im Arbeitsspeicher; bis zu 30 abgeschlossene Gesprächsrunden bleiben gespeichert. **Neues Gespräch → Gespräch löschen** entfernt sie nach Bestätigung. Ältere Sicherungen oder bereits gesendete Inhalte beim Anbieter können weiter bestehen.

**Nachricht diktieren** und **Vorlesen** sind optionale Browserfunktionen. Erkannten Text zuerst prüfen und selbst senden. Browser-Sprachdienste können Audio/Text an ihren Anbieter übertragen; MyStyle speichert keine Audiodateien. Tippen bleibt immer möglich.

Die öffentlichen KI-Dienste sind kostenlos, können aber Limits, Wartezeiten oder Ausfälle haben. Keine kostenpflichtigen Ersatzdienste oder automatischen Wiederholungen. Anbieter-Speicherung und Löschfristen sind nicht garantiert. Stilurteile sind subjektiv; Passform, Material, Wärme und Schutzwirkung bleiben ohne passende Nachweise unbekannt.

## Neu in 0.25.0

- **Automatische Wäsche:** Nach „Heute getragen“ kommen Oberteile und Kleider nach 2, Hosen nach 4 und Jacken nach 12 Tragetagen seit der letzten Wäsche in die Wäsche. Abschaltbar unter **Mehr → Alltag**.
- **Temperaturempfinden:** Unter **Mehr → Alltag**. Wer schnell friert, bekommt Jacken früher.
- **Preis und Kosten pro Tragen:** Optionales Preisfeld im Stück; das Detail zeigt CHF pro Tragen.
- **Auswertung:** Diagramm-Symbol im Kleiderschrank. Garderobenwert, meistgetragen, bester Preis pro Tragen, Allrounder, Stücke ohne Partner, lange oder nie getragen, Farben.
- **Was passt dazu?** Im Detail eines Stücks bis zu drei Looks mit genau diesem Stück.
- **Packliste:** Koffer-Symbol bei Outfits. Ein Look pro Tag mit möglichst wenigen Teilen, zum Abhaken.
- **Eine KI-Freigabe:** „Kostenlose KI aktivieren“ schaltet Foto-KI, Stylist, Chat und Kaufideen gemeinsam frei. Der Chat sieht jetzt bis zu zwölf Fotos, deine Notizen und wie oft du etwas getragen hast.

Die Ideen stammen aus einem Vergleich mit acht ähnlichen Apps ([Analyse](docs/COMPETITOR_ANALYSIS.md)).

## Farben, Stil und Tragestatistik

Lokale Vorschläge bewerten seit 0.21.0 bekannte Farbpaare nach klassischen Stylingregeln: Rot mit Grün oder Rot mit Rosa wird schwächer gewichtet, Blau mit Rosa oder Gelb stärker. Blaue Hosen zählen als Jeansbasis und damit fast neutral. Sehr sportliche und sehr elegante Stücke zusammen gelten als Stilbruch. Das sind nachvollziehbare Regeln für die erfassten Farbnamen, keine Analyse echter Farbtöne oder Muster. Stücke ohne Foto erscheinen als Skizze in ihrer erfassten Farbe.

Im Detail jedes Stücks steht, wie oft es als getragen bestätigt wurde und wann zuletzt. Sobald es bestätigte Tragetage gibt, zeigt **Heute** das Regal **Lange nicht getragen**. Unter **Kleiderschrank → Sortieren → Selten getragen zuerst** findest du Stücke, die nur im Schrank hängen.

## Deinen Tageslook verfeinern

Auf **Heute → Tageslook verfeinern** kannst du einzelne Teile für diese Anpassung festhalten, etwa deine Schuhe. **Ähnlich, aber wärmer** bevorzugt eine zusätzliche Jacke oder winterliche Saisonangaben, **Ruhiger kombinieren** weniger bekannte Farbakzente. **Ähnlich, aber anders** sucht eine andere Kombination mit möglichst wenigen Änderungen. Die Vorschau zeigt neue und erhaltene Teile. Erst **Für heute übernehmen** speichert die Auswahl; bei einem heutigen Kalenderplan bleibt dessen Notiz erhalten. Bereits getragene Tage werden hier nicht geändert. Die Auswahl bleibt nach Neustart gespeichert; die Festhalte-Häkchen gelten für den offenen Dialog.

Die Anpassung nutzt lokale Kombinationsregeln, deine Angaben und vorhandenes Feedback, keine zusätzliche Online-Anfrage oder neue Fotoanalyse. Material, Muster, Passform und tatsächliche Wärme sind nicht nachgewiesen. Ohne passende verfügbare Teile oder ausreichende Farbangaben wird keine passende Variante behauptet.

**Daumen runter:** Ein Grund ist freiwillig. **Zu auffällig** gibt künftigen Looks mit weniger erfassten Farbakzenten mehr Gewicht; **Ohne Grund ablehnen** blockiert nur diesen Look für den bewerteten Anlass. Vorhandene Farb-, Stil- und Anlassgründe sowie das Zurücknehmen unter **Mehr → Dein Stilprofil** bleiben erhalten.

## Fotos mit KI vorbereiten

Wähle ein einzelnes Kleidungsfoto und tippe bei Bedarf auf **Foto mit KI vorbereiten**. Erst dieser Start sendet das Foto an die freigegebenen Dienste. Die KI trägt erkannte Angaben ein; du kannst sie prüfen und ändern. Eine Freistellung erscheint zunächst als Vorschau: **Freistellung übernehmen** wendet sie an, **Freistellung verwerfen** erhält das bisherige Foto. Original und bewusst übernommene Freistellung werden erst beim Speichern dauerhaft abgelegt.

Wenn ein Schritt scheitert, kannst du **Nur Angaben erneut erkennen** oder **Nur Hintergrund erneut entfernen** wählen. Das gelungene Ergebnis und eigene Eingaben bleiben erhalten; nur der betroffene Community-Dienst erhält einen neuen Auftrag. Es gibt keine automatischen Wiederholungen. Eigene Server müssen die einzelnen Schritte unterstützen; bei älteren Servern wird vor einem weiteren Foto-Upload ein Hinweis angezeigt.

Automatische Fotoverarbeitung nach Auswahl/Freigabe und der experimentelle Mehrfachscan sind auf Wunsch ab Version 0.19.1 entfernt. Bereits gespeicherte Stücke und die Shopping-Funktion bleiben erhalten.

## Persönlich und günstig shoppen

Unter **Mehr → Shopping wird persönlich** siehst du den Fortschritt. Der Button **Mit KI günstig shoppen** erscheint auf **Heute** und unter **Outfits → Entdecken**, sobald die App genügend konkrete Hinweise hat: abgeschlossener Stilcheck oder drei bestätigte vertiefte Antworten, sieben bestätigte Tragetage aus mindestens zwei Wochen und drei unterschiedliche Lookbewertungen, davon zwei positive. Tragetage zählen aus den letzten 90, Bewertungen aus den letzten 180 Tagen. Geplante Tage, fehlende Outfitreferenzen und mehrfache Bewertungen desselben Looks zählen nicht zusätzlich. Die Freischaltung ist eine nachvollziehbare Grundlage für erste Ideen; sie bedeutet keine perfekte Kenntnis deiner Vorlieben.

Die freiwillige Beratung schlägt bis zu drei Ergänzungen vor und zeigt jeweils die vorhandenen Stücke, mit denen ein vollständiger Look möglich ist. Sie kann auch keinen Kauf empfehlen. Standardlimit **50 CHF**, wählbar 25/50/75/100 CHF, niemals über **100 CHF pro Stück**. Die erste Suche bleibt auch bei einem höheren Limit bei höchstens 50 CHF; Accessoires zuerst bei 25 CHF. Budget und selbst gewähltes Sortiment bleiben gespeichert und sind Teil deiner Sicherung. Das Sortiment wird nicht aus Namen, Körper oder Stil geraten.

Nach eigener Shopping-Freigabe sendet eine bewusst gestartete Beratung bestätigte Stilangaben, abgeleitete Bewertungen, Tragehäufigkeiten, Bestandszahlen und bis zu 40 Kleidungsangaben samt Budget/Sortiment an den vorhandenen kostenlosen Qwen3-VL-Outpost-Dienst. Keine Kleidungsfotos, Kalendernotizen, Chatnachrichten oder Standortdaten. Freigabe jederzeit zurücknehmen; Änderungen am Bestand, Budget oder Profil verwerfen laufende oder veraltete Ideen. Bei Fehlern gibt es keine automatischen Wiederholungen.

**Die Links öffnen preisgefilterte Suchideen bei Zalando Schweiz, keine geprüften Live-Produktangebote.** Aktueller Preis, Lagerbestand, Währung, Grösse, aktiver Shopfilter und Versandkosten sind im Shop zu prüfen. Die KI kann keine aktuellen Preise garantieren. MyStyle erhält keine Provision und bestellt nichts automatisch. Die externe Website öffnet erst beim Tippen auf den Link; nur der Suchbegriff und die Filter stehen darin.

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

Die Waschmaschinen-Tasten lassen kurz die Trommel drehen und das Gehäuse wippen. Favoriten reagieren mit einem kleinen Herz-Puls; erneutes Tippen startet einen neuen kurzen Effekt. Die schmale Markierung der Textnavigation gleitet zur gewählten Seite; der Seiteninhalt erscheint weich, während die Leiste sichtbar bleibt. Fenster öffnen sanfter, Fotos blenden ein und die Teile eines Looks erscheinen leicht versetzt. Keine Endlosschleifen, zusätzliche Bibliothek oder Modelldatei.

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

Frühestens nach einer Woche erscheint auf der Startseite ein kleiner Hinweis, wenn es noch ungesicherte Änderungen gibt. **Sicherung öffnen** führt zu „Mehr“, **In einer Woche** pausiert. Unter „Mehr“ lassen sich Erinnerungen dauerhaft ausschalten. Ein unveränderter exportierter Bestand und reine Vorhersage-Aktualisierungen lösen keinen neuen Hinweis aus. Wäsche, Tagesauswahl und Erinnerungseinstellungen sind im aktuellen Sicherungsformat 6 enthalten; Formate 1–5 bleiben lesbar.

Ein Export bedeutet, dass eine Datei erstellt wurde. Bitte selbst in „Dateien“ speichern; die App kann den tatsächlichen Abschluss des iPhone-Downloads nicht bestätigen. Es gibt weiterhin keinen automatischen Cloud-Abgleich oder Foto-Upload für Sicherungen.

## Farbe aus einem Foto wählen

Im Kleidungseditor ein Foto hinzufügen und bei **Farbe** auf **Farbe aus Foto wählen** tippen. Eine einfarbige Stelle am Stoff antippen; die Positionsregler und Pfeiltasten helfen beim genauen Auswählen. Erst **Blau übernehmen** (beziehungsweise die vorgeschlagene Farbe) ändert das Farbfeld. Danach das Stück normal speichern oder Änderungen verwerfen. Die Farbe lässt sich weiterhin manuell ändern.

Die Farbprobe läuft auch offline vollständig auf deinem Gerät. Sie verändert dein Foto nicht. Licht, Schatten, Hintergrund und Muster können den Vorschlag verfälschen; **Bunt** bei Bedarf selbst wählen. Es handelt sich um eine lokale Pixelprobe mit grober Farbfamilie. Erkannte Merkmale liefert nach Freigabe und bewusstem Start die kostenlose Online-KI; der Online-Stylist kann zusätzlich Übersichten ausgewählter Looks vergleichen; er bewertet keine Passform an deinem Körper.

## Foto-KI einrichten und verwenden

1. **Mehr → Online-Foto-KI** öffnen. Die genannten Anbieter und Datenschutzhinweise lesen, Fotoübertragung erlauben und **Kostenlose KI aktivieren** antippen. Dafür brauchst du keinen Token und kein Abo.
2. Neues Foto aufnehmen oder aus der Mediathek wählen und **Foto mit KI vorbereiten** antippen. Fotoauswahl und Aktivierung allein senden kein Foto. Qwen3-VL-Outpost erkennt Name, Kategorie, Farbe und sichtbare Marke sowie Notizen, Stil und Saison. Marke ohne lesbares Zeichen leer lassen; Stil/Saison sind Schätzungen. Alle Angaben bleiben korrigierbar. Während der Analyse selbst geänderte Felder bleiben erhalten.
3. BiRefNet entfernt den Hintergrund zunächst als Vorschau. Prüfen und **Freistellung übernehmen** wählen oder mit **Freistellung verwerfen** beim bisherigen Foto bleiben, dann das Stück speichern. Das vorbereitete Originalfoto bleibt zusätzlich erhalten und wird mitgesichert.
4. Nach Aktivierung zeigt die Einstellung nur den aktiven Status. Der Aktivieren-Knopf verschwindet; die Anbieter-/Datenschutzhinweise und Freigabe bleiben aufklappbar. **Community-KI ausschalten** oder die Foto-Freigabe abwählen verhindert neue Übertragungen. Die vorhandene Sammlung bleibt auf deinem Gerät. Das Öffnen/Bearbeiten gespeicherter Stücke lädt sie nicht automatisch hoch. Der Online-Stylist sendet ausgewählte gespeicherte Fotos erst beim ausdrücklich gestarteten Vergleich.

Die App nutzt die öffentlich angebotenen Gradio-APIs von [Qwen3-VL-Outpost](https://huggingface.co/spaces/prithivMLmods/Qwen3-VL-Outpost) und der [offiziellen BiRefNet-Demo](https://huggingface.co/spaces/ZhengPeng7/BiRefNet_demo). **Das sind öffentliche Community-Dienste, kein privater MyStyle-Server.** Das ausgewählte Foto wird an beide übertragen; die Freistellung nutzt temporäre Dateien auf dem Server des Anbieters. Speicher-/Löschdauer können wir nicht garantieren. Fotos mit Personen oder privaten Hintergründen vermeiden. Es gibt keine Verfügbarkeitsgarantie; Warteschlangen, Tageslimits und Abschaltungen sind möglich. Dann bleibt das Foto erhalten, ein brauchbares Teilergebnis wird nicht verworfen. Keine automatischen Ausweichanbieter, Provider-Schlüssel oder bezahlten Wiederholungen.

Fehlermeldungen nennen ab 0.6.2 **Bilderkennung** oder **Freistellung** und unterscheiden bestätigtes Nutzungslimit (z. B. HTTP 429/GPU-Quota), volle Warteschlange, Verbindungsfehler, nicht verfügbaren Dienst und unbrauchbare Antworten. Eine Zeit für einen neuen Versuch wird nur angezeigt, wenn der Anbieter sie liefert. Ohne eindeutigen Fehlergrund behauptet die App kein Limit. Die frühere Sammelmeldung erlaubt keine sichere rückwirkende Diagnose; zwei erfolgreiche Scans bedeuten kein festes Zwei-Scans-Limit. Die Grenzen der kostenlosen Dienste bleiben bestehen.

Ein eigener kompatibler Server bleibt unter **Eigenen Server verbinden** optional. Unsere frühere Annahme, einen Docker-Space auf Hugging Face kostenlos selbst zu betreiben, war falsch: Die aktuelle API verlangt dafür PRO (HTTP 402). Auch Inference Providers bieten Free-Accounts aktuell keine Gratis-Credits. Der kostenlose App-Modus verwendet diese kostenpflichtigen Angebote nicht.

## Hintergrund mit lokaler KI entfernen

1. Ein Kleidungsstück mit Foto hinzufügen oder bearbeiten. **Hintergrund mit KI entfernen** aufklappen.
2. Hinweise lesen und **Lokale KI starten** antippen. Beim ersten Start lädt die App etwa 19 MB Modelldaten und Laufzeit von derselben Website. Kein Foto wird gesendet. Ohne diese Aktion erfolgt kein Download dieser Dateien.
3. Ergebnis prüfen. **Freistellung übernehmen** setzt die transparente Vorschau ins Formular; erst normales Speichern übernimmt sie dauerhaft. **Vorschau verwerfen** behält das bisherige Foto. Abbrechen beendet den laufenden Worker.
4. **Originalfoto verwenden** holt das unverändert aufbewahrte Original zurück. Neue Fotoauswahl verwirft die dazugehörige alte Freistellung.

Einzelne Stücke vor ruhigem Hintergrund eignen sich am besten. Das kleine U²-Net-Modell erkennt auffälligen Vordergrund; es versteht keine Kleidungskategorien, Passform oder Stilqualität. Kanten, Schatten und Muster können fehlerhaft sein. Die Funktion ist **experimentell und auf echtem iPhone noch nicht geprüft**; sie ist für die übrige App nicht erforderlich. Nach erfolgreichem ersten Laden arbeitet sie bei verfügbarem Cache auch offline. Unter **Mehr → Lokale Freistellung & KI-Speicher → KI-Dateien vom Gerät entfernen** lassen sich die etwa 19 MB Binärdateien löschen; Fotos und gespeicherte Freistellungen bleiben erhalten. Ein späterer Start benötigt dann wieder Netz. Quellen, Lizenzhinweise und Messgrenzen stehen in [IMAGE_ASSISTANCE.md](docs/IMAGE_ASSISTANCE.md).

## Outfits und dein persönlicher Stil

Unter **Outfits → Entdecken** Anlass, Saison und gewünschten Stil wählen und „Outfits zusammenstellen“ antippen. Für einen vollständigen Look brauchst du ein Paar Schuhe und entweder ein Kleid oder ein Oberteil mit Hose. Ohne aktiviertes Wetter wird im Herbst/Winter eine vorhandene passende Jacke ergänzt; mit Wetter bei einer vorhergesagten Mindesttemperatur unter 15 °C. Accessoires sind optional. Stücke mit ausdrücklich anderer Saison werden ausgeschlossen. Ausschliesslich sportlich/Streetwear markierte Stücke werden für Büro und Abend nicht gewählt.

Anlass, Saison, Stil und das Accessoire-Häkchen werden automatisch auf diesem Gerät gespeichert und mitgesichert. Die Vorschläge verwenden lokale Regeln und deine erfassten Merkmale (manuell oder per freigegebener Foto-KI). Sie analysieren keine Bilder und garantieren keinen Dresscode, keine Passform oder ausreichende Wärme. Fehlende Angaben und Kategorien werden erklärt. „Warum diese Kombination?“ zeigt die Begründung. Die Suche betrachtet höchstens 18 Kandidaten je Kategorie; bei grossen Sammlungen „Neu kombinieren“ verwenden, um weitere gleichermassen geeignete Stücke einzubeziehen. Bestätigte Tragetage geben einem Stück ein kleines zusätzliches Gewicht.

- **Speichern:** einen Look später unter „Gespeichert“ wiederfinden, benennen, favorisieren oder löschen. Einzelne Stücke öffnen weiterhin ihre Angaben.
- **Daumen hoch:** diese Kombination und ihre Stücke erhalten mehr Gewicht in künftigen Vorschlägen.
- **Passt nicht:** genau diese Kombination wird nicht mehr vorgeschlagen. Ablehnungen lassen sich bewusst zurücksetzen; bis zu 1000 Rückmeldungen bleiben erhalten, ältere werden zuerst entfernt.
- **Regler oben rechts:** bevorzugte Farben und Stilrichtungen lokal speichern. Sie beeinflussen die Gewichtung, sind keine harten Filter.

Wird ein Kleidungsstück gelöscht, werden gespeicherte Outfits, zugehörige Kalendereinträge und Rückmeldungen mit diesem Stück ebenfalls entfernt. Beim Löschen eines Outfits werden dessen Kalendereinträge entfernt; die Kleidung bleibt erhalten. Eine Änderung der Kategorie lässt den gespeicherten Look bestehen, zeigt aber bei einer dadurch unvollständigen Kombination einen Prüfhinweis.

Neue Sicherungen verwenden **Format 7**: Kleidung mit Originalfotos und Freistellungen, Outfits, Bewertungen, Stilprofil samt vertieften Antworten, Shopping-Budget/-Sortiment, Outfit-/Wetter-Einstellungen, Kalender, gegebenenfalls Wetterort/Vorhersage und Chatverlauf. Sie stammen aus einem konsistenten Datenbanksnapshot. **Formate 1–6 bleiben importierbar.** Gerätelokale Freigaben, Verbindungscodes, Lesemarkierungen, UI-Scrollzustände, Erscheinungsbild und heruntergeladene KI-Dateien gehören nicht zur Sicherung.

**Ersetzen** entfernt auch Datenarten, die in älteren Sicherungen fehlen; bei einer Sicherung ohne Chat wird beispielsweise ein bisheriger Verlauf geleert. **Zusammenführen** erhält fehlende lokale Datensätze und bevorzugt neuere Revisionen. Bei gleicher Kleidungs-ID wird der gesamte neuere Stückdatensatz gewählt, inklusive seiner Bilder. Eine ältere App kann neue Sicherungsformate nicht lesen. Vor einem Downgrade deshalb eine aktuelle Sicherung behalten.

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

Beim Auswählen werden Fotos lokal auf maximal 1600 Pixel verkleinert und als JPEG neu erzeugt (weisser Hintergrund, keine Übernahme der ursprünglichen EXIF-Metadaten). Freistellungen bleiben separate transparente PNGs: online bis 1600 Pixel, mit dem optionalen lokalen Modell bis 1200 Pixel. Ein Sicherungsimport erhält die validierten Fotovarianten. HEIC funktioniert nur, wenn der Browser es decodieren kann; andernfalls JPEG/PNG/WebP verwenden. Die Farbprobe benötigt keinen Modelldownload. Die optionale lokale Freistellung verwendet ein echtes Bildmodell; ihre Maske ist keine Kleidungs- oder Outfitbewertung.

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

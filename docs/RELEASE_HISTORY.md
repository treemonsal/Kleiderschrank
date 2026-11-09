# Frühere Veröffentlichungen

Archiv der bisherigen Versionsbeschreibungen. Angaben zu Versionen, Farben und Sicherungsformaten gelten für den jeweils genannten Stand; die aktuelle Bedienung steht im [README](../README.md).

## Rundgang & Alltag – Version 0.17.0

Fotos bleiben bei Favoriten- und Wäschewechseln erhalten. Die gemeinsame Bildanzeige wartet auch auf die tatsächlich decodierte Browseradresse, versucht einen fehlgeschlagenen Ladevorgang einmal erneut und kann auf das erhaltene Original zurückfallen.

Beim Wechsel zwischen Heute, Kleiderschrank, Outfits und Mehr bleiben Datum, Suche, Filter, Sortierung, Outfit-Reiter und Scrollposition innerhalb der laufenden App erhalten. Tippe erneut auf den aktiven Bereich, um nach oben zu gelangen. Wischen wechselt nur im Tagesbereich das Datum. Deine dauerhaft gespeicherten Stil-/Outfit-Einstellungen bleiben davon unabhängig.

Lange Fenster behalten eine erreichbare Schliessen-Zeile. Ungespeicherte Änderungen an Look-Namen, Kalender, Vorlieben und Stilcheck verlangen vor dem Schliessen eine Entscheidung. Die Farbprobe schliesst nach Übernahme. Einstellungen enthalten eine aktuelle Bedienhilfe statt des alten Nachtmodus-Texts; lokale KI-Speicheroptionen sind eingeklappt. [Vollständiger Prüfumfang und Befunde](archive/APP_AUDIT.md).

## Schwarz-Weiss-Icon – Version 0.16.1

Das Homescreen-Icon zeigt jetzt ein weisses, verflochtenes M auf Schwarz. Es bleibt bewusst dunkel zur hellen App. iPhone-, Android- und Browser-Icons nutzen dasselbe Motiv; Original und reproduzierbare Exporte stehen unter [design/app-icon](../design/app-icon/README.md). iOS kann bestehende Homescreen-Icons länger zwischenspeichern. Dafür weder die App noch Website-Daten löschen: Die Sammlung liegt auf deinem Gerät. Vor einer bewussten Neuinstallation immer eine vollständige Sicherung exportieren.

## Freiwilliges Stilgespräch – Version 0.16.0

Der kurze Stilcheck mit drei Schritten bleibt der Einstieg. Danach zeigt ein kleiner rostfarbener Punkt an **Stylist** eine freiwillige Einladung an. Im Chat kannst du mit **Stilgespräch starten** acht zusätzliche Fragen zu Stilrichtung, Schnitten, Tagesablauf, Temperaturempfinden, Mustern, Accessoires, Dingen, die du ungern trägst, und Inspiration beantworten. Die Fragen sind geführt und funktionieren auch offline; dafür wird keine KI-Anfrage verbraucht.

Eine Auswahl wird erst mit **Antwort speichern** übernommen. **Frage überspringen**, **Später weiter** und ein früher Abschluss sind möglich. Bestätigte Antworten und übersprungene Fragen bleiben nach einem Neustart erhalten. **Keine weiteren Fragen** blendet die Einladung dauerhaft aus; das Gespräch bleibt im Chat auf eigene Initiative erreichbar. Unter **Antworten ansehen & ändern** lassen sich auch zuvor offengelassene Fragen ergänzen. **Vertiefte Antworten löschen** entfernt diese Angaben nach Bestätigung; kurzer Stilcheck, Bewertungen und die sichtbare Outfit-Auswahl bleiben bestehen. Bereits gesendete Informationen können noch im Chatverlauf, in älteren Sicherungen oder beim Anbieter stehen.

Der Punkt kennzeichnet ausserdem eine vorhandene ungelesene Stylist-Antwort. Ein Hinweis wird erst beim sichtbaren Lesen im geöffneten Chat als gelesen markiert; eine ausgeblendete App genügt nicht. Der Lesestand bleibt auf diesem Gerät gespeichert und wird zwischen dessen Fenstern geteilt. Es gibt keine Betriebssystem-Pushfreigabe, erfundenen Nachrichten oder automatischen Anbieter-Anfragen.

Die gewählte Stilrichtung gewichtet vorhandene Stilmerkmale in lokalen Vorschlägen etwas stärker. Die Accessoire-Antwort stellt die entsprechende Outfit-Option ein; sie bleibt dort jederzeit änderbar. Alle bestätigten Detailantworten fliessen bei einer bewusst gesendeten Chatfrage bzw. einem gestarteten Online-Lookvergleich in den bestehenden freigegebenen Dienst ein. Passform, Stoff, Muster und tatsächliche Wärme bleiben ohne passende Angaben/Fotos unbekannt. Die Antworten ergänzen dein Profil; es wird kein eigenes Modell auf dich trainiert.

Sicherungsformat **6** enthält die Detailantworten und den Fortschritt. Formate 1–5 bleiben lesbar; ältere App-Versionen können Format 6 nicht importieren. Die Datenbank bleibt Version 5, ohne Zurücksetzen vorhandener Daten. Gerätelokale Lesemarkierungen und Freigaben werden nicht exportiert. Beim Zusammenführen schützt eine eigene Änderungszeit auch gelöschte Detailantworten vor älteren Ständen. Zwei gleichzeitig geöffnete Stilgespräche überschreiben keine neuere Antwort; ein veralteter Entwurf verlangt ausdrücklich das Laden des aktuellen Stands.

## Garderobenjournal – Version 0.15.0

Die Oberfläche wurde vollständig neu gestaltet: warmes Papier, dunkle Schrift, Serifentitel, rostrote Markierungen und eine ruhige Textnavigation mit Kapitelnummern. Kleiderschrank, Tageslook, Outfits, Kalender, Editor, Einstellungen und Chat verwenden dieselbe Gestaltung. Foto-Platzhalter sind eigene Kategoriezeichnungen; vorhandene Fotos bleiben erhalten. Der freiwillige Stilcheck steht jetzt unter dem Tageslook. Frühere Theme-Einstellungen verändern das neue Design nicht.

Der bisherige Stand ist vor der Änderung als Git-Tag **`design-backup/platinum-0.14.0`** auf GitHub gesichert. Zusätzlich gibt es ein Quellarchiv und einen gezielten Rückweg unter [Design-Backup](../design/backups/README.md). Eine Rückkehr zur alten Optik benötigt kein Löschen oder Importieren deiner Kleidungsdaten. [Gestaltungsdetails](../design/EDITORIAL.md).

## Mit deinem Stylisten sprechen – Version 0.14.0

Oben rechts öffnet **Stylist ↗** (Beschriftung „Mit deinem Stylisten sprechen“) den persönlichen KI-Chat. Einmal **Kostenlosen Chat aktivieren**, dann Fragen tippen und mit **Senden** abschicken. Beispiele: „Was passt zu meinem blauen Hemd?“, „Und etwas eleganter?“ oder „Welche Farben passen zusammen?“. Der Chat nutzt echte Kleidungsangaben, dein Stilprofil, abgeleitete Vorlieben, den heutigen Look, zuletzt bestätigte Tragetage und vorhandene freigegebene Wetterwerte. Er kann Rückfragen stellen. Seine Antworten beruhen auf Angaben, nicht auf einer neuen Fotoanalyse.

Qwen3-VL-8B-Instruct läuft über den vorhandenen öffentlichen Community-Dienst. Pro bewusster Sendung gehen die Frage, höchstens sechs vorherige Nachrichten, bis zu 40 relevante Kleidungsangaben, Vorlieben und gegebenenfalls Wetterwerte an den Anbieter. Keine Kleidungsfotos, Notizen oder Standortkoordinaten. Anbieter-Speicherung, kostenlose Quoten, Wartezeiten und Ausfälle sind möglich. Die Chat-Freigabe gilt nur für dieses Gerät, ist unabhängig von der Foto-KI und wird nicht mit Sicherungen übertragen. Nach dem Aktivieren verschwindet der Einführungstext; unter **Dein Kontext & Chat-Einstellungen** kannst du die Freigabe ausschalten.

Outfitantworten zeigen prüfbare Stücke aus deinem Schrank. **Look speichern** übernimmt sie ausdrücklich als gespeichertes Outfit. Aktuelle Verfügbarkeit, Kategorien, Saison/Wetter und Ablehnungen werden erneut geprüft; erfundene, unvollständige oder inzwischen gewaschene Stücke werden abgewiesen. Der Chat kann keine Kleidung löschen, Wäsche markieren, Kalenderpläne ändern oder Einstellungen heimlich anpassen. Der Antworttext ist unverbindliche Beratung; Passform, Material und Schutzwirkung bleiben ungeprüft.

Der Verlauf bleibt lokal auf dem Gerät: maximal 30 vollständige Gesprächsrunden. **Neues Gespräch → Gespräch löschen** entfernt ihn, ohne Kleiderschrank oder Stilprofil zu verändern. Vorhandene Sicherungen können den alten Verlauf weiterhin enthalten. Der Chat ist ohne Freigabe und offline lesbar; für neue Antworten braucht er Internet. Fehlgeschlagene/abgebrochene Anfragen lassen den Text zum erneuten Senden stehen. Ein ungesendeter Entwurf bleibt beim Schliessen bis zum Neuladen im Arbeitsspeicher. Keine automatischen Wiederholungen; Schliessen, Abbrechen, Kontextwechsel, Reset und Freigabewiderruf verwerfen späte Ergebnisse.

Falls dein Browser die Funktion anbietet, setzt **Nachricht diktieren** deine Worte in einen bearbeitbaren Entwurf. Erst **Senden** überträgt ihn an den Stylisten. Bei fehlender Unterstützung oder verweigertem Mikrofon kannst du tippen oder die Diktierfunktion deiner Handy-Tastatur nutzen. **Vorlesen** und **Vorlesen stoppen** verwenden die Browserstimme. Browser-Sprachdienste können Audio bzw. Text an ihren Anbieter übertragen. MyStyle speichert keine Audiodateien; die Erkennung endet spätestens nach 30 Sekunden und beim Schliessen oder Wechsel in den Hintergrund. Native iPhone-/PWA-Unterstützung muss auf dem Gerät geprüft werden; dies ist kein garantierter dauerhafter Sprachdialog.

Sicherungsformat 5 enthält den Gesprächsverlauf einschliesslich Look-Referenzen. Versionen 1–4 bleiben lesbar. Beim bewussten Ersetzen durch eine alte Sicherung wird ein vorhandener Chat ebenfalls entfernt; beim Zusammenführen bleiben neuere lokale Gespräche/Resets erhalten. Vor einem App-Downgrade ein vollständiges Backup behalten: ältere App-Versionen verstehen Format 5 noch nicht.

## Persönlichere Vorschläge ab Version 0.13.0

Auf der Startseite bietet **Stilcheck starten** drei kurze, freiwillige Schritte: Stilrichtungen, Lieblingsfarben bzw. Farben für seltenere Vorschläge sowie üblicher Anlass und gewünschte Abwechslung. **Später** oder **Stilcheck überspringen** blendet die Einladung dauerhaft aus. Unter **Mehr → Dein Stilprofil** kannst du sie nachholen oder deine Antworten ändern. Ein abgebrochener Entwurf wird nicht gespeichert. Bestehende Stilvorlieben sind vorausgewählt.

An Tageslooks (auch im Rückblick), Outfitvorschlägen und gespeicherten Looks gibt es Daumen hoch und runter. Ein weiterer Daumen hoch nimmt die positive Bewertung zurück. Bei Daumen runter wählst du Kombination, Farben, Stil oder Anlass. Die App merkt sich die konkrete Ablehnung für den bewerteten Anlass; ein Farbgrund beeinflusst ähnliche Farbpaarungen, ein Stilgrund entsprechende erfasste Stilrichtungen. Ein Anlassgrund erzeugt keine allgemeine Stilabneigung. **Anderer Look** und **Neu kombinieren** sind weiterhin reine Alternativen, ohne negative Bewertung.

Positive Bewertungen wirken auch auf passende neue Stücke. Der übertragene Einfluss aus Bewertungen ist begrenzt; deine ausdrücklich gewählten Vorlieben werden weiterhin berücksichtigt. „Farben seltener“ ist eine Gewichtung, kein Verbot, damit eine kleine Garderobe weiter komplette Looks liefern kann. Abwechslung beeinflusst kürzlich getragene Stücke und die Unterschiedlichkeit der Vorschläge. Wäsche-, Saison- und Wetterregeln bleiben bestehen. Ein neues Profil erneuert unbestätigte Tagesvorschläge, überschreibt aber keine Kalenderpläne oder bestätigten Tragetage.

Unter **Mehr → Dein Stilprofil → Bewertungen ansehen** kannst du die 20 neuesten Rückmeldungen einzeln zurücknehmen oder nach Bestätigung alle Bewertungen zurücksetzen. Ältere rücken nach; insgesamt bleiben bis zu 1000 aktuelle Bewertungen erhalten, eine pro Kombination. Eine neue Bewertung desselben Looks ersetzt die vorherige, einschliesslich ihres Anlasses. Profil, Bewertungsgründe und Anlass sind im bestehenden Sicherungsformat 4 enthalten; ältere Sicherungen bleiben lesbar.

Die Personalisierung verwendet nachvollziehbare Gewichtungen aus deinen Angaben und Rückmeldungen, kein auf dich neu trainiertes Modell. Beim bewussten Start des Online-Stylisten erhält Qwen zusätzlich das Stilprofil und eine begrenzte Zusammenfassung passender Bewertungsmuster. Keine automatische Übertragung, keine neue Dienstfreigabe, keine Gebühren. Ob dir die Vorschläge im Alltag tatsächlich besser gefallen, muss sich in der Nutzung zeigen.

## Historie: Update 0.6

Die neue dunkle Oberfläche ist unter derselben App-Adresse veröffentlicht. Öffne MyStyle online und tippe bei „Eine neue Version ist bereit“ auf **Jetzt aktualisieren**. Deine lokale Sammlung bleibt erhalten. Neue Icons können auf bereits angelegten iPhone-Verknüpfungen vom Betriebssystem zwischengespeichert sein. Diese Server-Voraussetzung galt für die frühere Version 0.6. Ab 0.6.1 kann stattdessen die kostenlose Community-KI direkt in der App freigegeben werden.

## Neues Homescreen-Icon in 0.11.1

Die neuen Installationsdateien zeigen den silbernen Bügel auf Graphit. Öffne die App online und übernimm das angebotene Update. Neue Homescreen-Verknüpfungen laden das neue iPhone-Icon. iOS kann das Icon vorhandener Installationen länger behalten. Lösche dafür weder die App noch Safari-Websitedaten: Deine Sammlung liegt lokal. Vor einer bewussten Neuinstallation immer unter **Mehr** eine vollständige Sicherung exportieren und die Datei aufbewahren.

Original, Exportgrössen und reproduzierbare Aufbereitung stehen unter [design/app-icon](../design/app-icon/README.md).

## Online-Stylist ab 0.12

1. Kostenlose Community-KI unter **Mehr → Online-Foto-KI** aktivieren, falls noch nicht geschehen. Ein eigener Server-Modus unterstützt diese neue Beratung nicht; es wird kein anderer Dienst im Hintergrund verwendet.
2. Beim heutigen, noch nicht eingeplanten Tageslook oder unter **Outfits → Entdecken** den **Online-Stylisten** öffnen. Optional einen Wunsch eingeben, zum Beispiel „ruhiger fürs Büro“. Unter Outfits zuerst die normalen Vorschläge erstellen.
3. **Looks online vergleichen** sendet eine verkleinerte Fotoübersicht von höchstens vier vollständigen Kombinationen mit maximal 20 unterschiedlichen Stücken an denselben Qwen3-VL-Outpost. Freistellungen werden bevorzugt; Originale bleiben unverändert. Zusätzlich gehen die ausgewählten Kleidungsangaben, Anlass, Stil-/Farbvorlieben, Wunsch und gegebenenfalls Temperatur-/Regenwerte mit. Keine vollständige Sicherung, Standortkoordinaten, Zugangscodes oder fremden Kleiderschränke. Für Teile ohne Foto verwendet die KI ausschliesslich Angaben.
4. Qwen3-VL-8B wählt einen der angebotenen Looks und liefert eine kurze Begründung, aufklappbare Stylingtipps und Grenzen der Einschätzung. **Für heute übernehmen** speichert die Wahl dauerhaft; **Empfohlenen Look speichern** legt ein normales Outfit an. Die Beratung selbst bleibt nur in der aktuellen Ansicht, die übernommene Auswahl ist im bestehenden Backup enthalten.
5. Abbrechen, Seiten-/Tageswechsel, veränderte Auswahl oder zurückgezogene Freigabe verhindern die Übernahme verspäteter Antworten. Vor einer Tagesübernahme werden Bestand, Wäsche, Ablehnung und konkurrierende Änderungen nochmals atomar geprüft.

Das ist eine echte Online-Bild-KI zusätzlich zur lokalen Regelauswahl. Die Bilderkennung einzelner neuer Stücke verwendet weiterhin das sparsamere 4B-Modell, die neue Outfit-Beratung das ebenfalls öffentlich angebotene 8B-Modell. Der Dienst bleibt kostenlos, mit möglichen Nutzungslimits, Wartezeiten und Änderungen durch den Betreiber. Keine automatischen Wiederholungen oder kostenpflichtigen Ausweichdienste. Wenn er ausfällt, bleiben vorhandene Looks und alle lokalen Funktionen erhalten. Stilurteile sind subjektiv; Wärme, Wasserdichtigkeit, Dresscodes und tatsächliche Passform sind damit nicht nachgewiesen.

## Korrektur der Wäsche-Fotoanzeige in 0.12.1

Beim Statuswechsel werden Fotos nicht gelöscht. Die bisherige Anzeige konnte jedoch eine noch verwendete temporäre Bildadresse zu früh freigeben. Die neue Verwaltung gibt sie erst nach dem tatsächlichen Austausch der Bildquelle frei und räumt beim Schliessen auf. Öffne die App online und übernimm das angebotene Update; gespeicherte Bilder werden neu geladen. Keine Website-Daten löschen. Wäsche bleibt unter **Kleiderschrank → Waschmaschinen-Symbol** erreichbar; ein Stück öffnen und **Als sauber markieren**, um es wieder für Vorschläge zu verwenden.

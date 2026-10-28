# MyStyle

## Version 0.32.0 – Auf allen Geräten

- Freiwillige Anmeldung mit Google; der Kleiderschrank liegt zusätzlich im versteckten App-Ordner des eigenen Drive und wird zwischen eigenen Geräten abgeglichen. Kostenlos, kein eigener Server, jede Person mit eigenem Konto. Ohne Anmeldung bleibt alles wie bisher nur lokal.

Die Versionsabschnitte dokumentieren die Entwicklung. Massgeblich für den aktuellen Umfang sind Version 0.20.0 und die aktuelle README; ältere Abschnitte halten die damaligen Anforderungen und Grenzen fest.

## Version 0.28.0 – Garderobenjournal

- Neues, ausdrücklich gewünschtes Design aus Claude Design („MyStyle, ein Garderobenjournal“, Classical-System): Cormorant Garamond über Lora, beide selbst gehostet (OFL), Haarlinien statt gefüllter Karten, umrandete Buttons, ein Goldakzent `#b68235`, Überzeilen in Kapitälchen-Optik. Ersetzt das Store-Design 0.27.0; Rückweg über den Import in main.tsx.
- Navigation I Heute · II Garderobe · III Looks · IV Journal; Einstellungen (früher „Mehr“) über das Zahnrad. Kalender wandert aus Outfits in das neue Journal, zusammen mit Monatsstatistik, lange nicht getragenen Stücken, Shopping-Fortschritt und Sicherung.
- Tageslook als nummerierte Abbildungstafel, Tragebestätigung bleibt ohne Scrollen erreichbar. Stücke ohne Foto als Stoffmuster in ihrer erfassten Farbe. Keine neuen Daten, keine Datenbank- oder Sicherungsänderung.

## Version 0.20.0 – gezielter und zuverlässiger verfeinern

- Fehlgeschlagene Foto-Schritte separat, manuell wiederholen; nur betreffenden Community-Anbieter kontaktieren und gelungene Ergebnisse behalten. Eigene Server über expliziten Health-Vertrag absichern; keine stillschweigend doppelte Modellarbeit auf älteren Servern.
- Optionales Negativfeedback ohne Grund und neuer Grund „Zu auffällig“. Nur bekannte Farbakzente daraus begrenzt verallgemeinern, keine einzelnen Farben/Stile/Teile oder unbekannte Passform ablehnen. Anlassbezug, Rücknahme und bestehende Gründe erhalten. Sicherungsformat 8 mit Lesbarkeit 1–7, Datenbank weiterhin 5.
- Tageslook vor Tragebestätigung gezielt verfeinern: Teile für eine Anpassung festhalten und ähnliche, wärmere oder ruhigere Varianten mit möglichst wenigen Änderungen suchen. Vorschau ohne Änderung; erst explizit atomar übernehmen. Bestehende verfügbare Stücke, echte Kategorien und bisherige Eignungs-/Wäscheregeln respektieren, keine externen Anfragen. Wärme/Saison und Farbanzahl sind Heuristiken. Konflikte durch neue Bewertungen, Metadaten, Wäsche, Präferenzen, Tagesauswahl oder Tragebestätigung vor Übernahme prüfen. Heutigen Plan samt Notiz aktualisieren, historische und gespeicherte Original-Looks erhalten.

## Version 0.19.1 – manuelle Foto-KI wiederherstellen

- Automatische Fotoverarbeitung und experimentellen Mehrfachscan auf Wunsch entfernen; Shopping und übrige Funktionen erhalten.
- Neue Fotoauswahl, KI-Aktivierung und Wiederöffnen lösen keine Fotoanalyse aus. Einzelbild-KI bewusst starten, erkannte Angaben prüfen und korrigieren; Freistellung erst nach explizitem Übernehmen einsetzen. Verwerfen einer erneuten Vorschau erhält auch bereits gespeicherte Freistellungen.
- Bestehende Kleidungsstücke, Originale, Freistellungen und persönliche Daten erhalten. Keine Änderung an Datenbank 5 oder Sicherungsformat 7; frühere Formate bleiben lesbar.

## Version 0.19.0 – persönliche Shopping-Beratung

- Shopping erst nach bestätigtem Stilprofil oder drei vertieften Antworten, sieben bestätigten Tragetagen über mindestens zwei Wochen und drei verschiedenen Lookbewertungen (zwei positive) freischalten; nachvollziehbarer Fortschritt unter Mehr, bereite Einstiegspunkte auf Heute und Outfits. Tragetage letzte 90 Tage, Bewertungen letzte 180 Tage; keine falschen Gewissheiten über persönliches Modelltraining.
- Budget Standard 50 CHF, hart höchstens 100 CHF pro Stück. Zuerst günstige Suchgrenzen bis 50 CHF für Kleidung und bis 25 CHF für Accessoires; optional bis zum persönlichen Maximum erweitern. Sortiment ausdrücklich wählen, keine Geschlechts-/Körperannahmen.
- Bis zu drei generische Kaufideen mit vorhandenen Stücken zu vollständigen Looks validieren. Ablehnungen, Stilantworten und vermeidbare Farben berücksichtigen, exakte vorhandene Duplikate einschliesslich Wäsche ausschliessen. Leere Empfehlung ohne Kaufdruck zulassen.
- Eigene Shopping-Freigabe, vorhandener kostenloser Qwen3-VL-8B-Dienst und begrenzter Textkontext. Keine Fotos, Notizen, Chattexte oder Koordinaten. Keine neuen bezahlten APIs, echten Live-Preise oder verfügbaren Produkte behaupten. Externe Zalando-Schweiz-Suchlinks ausschliesslich lokal und mit gültigen Preisfiltern konstruieren; keine Modell-URLs oder Affiliate-Codes.
- Budget und Sortiment atomar, mit eigener Revision und ohne Tageslook-Reset speichern. Sicherungsformat 7, Formate 1–6 weiterhin lesen, DB weiterhin 5. Widerruf, Abbruch, Profil-/Bestands-/Budgetwechsel und verspätete Antworten berücksichtigen. Einkauf erfolgt im Shop, keine automatischen Bestellungen.

## Version 0.18.0 – einfachere Fotoaufnahme und Kritikerprüfung

- Neue Fotos nach vorhandener Freigabe automatisch erkennen, ausfüllen und freistellen. Online-Freistellung direkt in den Entwurf übernehmen, Original und Rückkehr erhalten; Speichern weiterhin ausdrücklich.
- Experimenteller Mehrfachscan für bis zu sechs getrennt sichtbare Kleidungsstücke: Gesamtfoto einmal erkennen, lokale Originalausschnitte erstellen, einzeln freistellen, Ergebnisse prüfen/abwählen und atomar speichern. Keine neue Datenbank- oder Sicherungsversion.
- Foto-KI direkt im Editor aktivieren, ohne den Entwurf zu verlassen. Schutz für offene Stilgespräch-, Planungs- und Vorliebenentwürfe, konkurrierende Fenster und laufende Schreibvorgänge.
- Empfehlungssuche bei ausgeschöpfter Vorauswahl erweitern. Tatsächlichen geplanten Anlass und vollständigen Tageslook im begrenzten Chat-Kontext erhalten; reine Textberatung ehrlich benennen.
- Kostenlose Dienste und freie Nutzung ohne Konto bleiben bestehen. Quoten, subjektive Stylingqualität und experimentelle Gruppenerkennung offen benennen. Details in CRITIC_REVIEW.md.

## Version 0.17.1 – abgesicherte Bereinigung

- Vollständiger Stand 0.17.0 vor Änderungen als Quellarchiv, Git-Bundle und GitHub-Snapshot sichern; Ausgangs-Tag auf GitHub, nachvollziehbarer Revert und ausführbare Wiederherstellungsprüfung. Persönliche Handy-Daten bleiben eine separate In-App-Sicherung.
- 125 überschriebene CSS-Deklarationen und neun nicht mehr verwendete Selektoren entfernen. Zwei ungenutzte frühere Sicherungs-Wrapper streichen; Tests verwenden direkt denselben vollständigen Import-/Prüfpfad wie die App. Formate 1–6 bleiben lesbar, Datenbank weiterhin Version 5.
- Chat-Freigabe vom Anfragecode trennen: wirksame dynamische Imports statt gleichzeitiger statischer Einbindung. Vorhandene Freigaben bleiben gültig; keine Anbieter- oder Kostenänderung.
- GitHub-Actions auf aktuelle, fest gepinnte Node-24-Versionen bringen. Separater öffentlicher Prüfworkflow für Format, Projektsicherung, Daten, Build und Browserfälle; Veröffentlichung bleibt manuell. Aktuelle Bedienung und historische Versionshinweise in der Dokumentation trennen.

## Version 0.17.0 – Rundgang und Alltag

- Gesamten bestehenden Funktionsumfang einschliesslich Unteransichten, Texten, Eingaben und Fehlerzuständen im [App-Audit](docs/archive/APP_AUDIT.md) erfassen. Gemeinsame Bildanzeige schützt sowohl `src` als auch das noch verwendete `currentSrc`; begrenzter Wiederholungsversuch und Original-Fallback ohne Änderung der Fotodaten.
- Bereichswechsel merken ausgewählten Tag, Filter/Suche/Sortierung, Outfit-Reiter und Scrollposition nur innerhalb der laufenden App. Keine versteckten Seiten oder automatischen KI-Anfragen. Erneutes Tippen auf den aktiven Bereich führt nach oben; Wischen unterhalb des Tagesbereichs verändert kein Datum.
- Erreichbare Schliessen-Zeile, Schutz für ungespeicherte Look-/Kalender-/Vorlieben-/Stilcheck-Entwürfe, schliessende Farbprobe und grössere Tippflächen. Gespeicherte Looks beim Favorisieren in stabiler Reihenfolge lassen. Erste Fotoaufnahme nicht vom Laden zusätzlicher Tagesdaten abhängig machen.
- Veralteten Nachtmodus-Abschnitt entfernen, Online-Hinweise präzisieren, seltene KI-Speicheroptionen einklappen, Bedienhilfe ergänzen. Eigene Serveroption und Community-Verbindung sauber trennen; späte Antworten, fensterübergreifenden Widerruf und Speicherfehler berücksichtigen. Favoritenrevisionen auch bei zurückgestellter Gerätezeit erhalten. Keine Datenbank-/Backupformatänderung oder neue Kosten.

## Version 0.16.1 – dunkles Schwarz-Weiss-Icon

- Eigenständiges verflochtenes M auf Schwarz, inspiriert vom gewünschten Mix aus ChatGPT und Essembl. Schlichte helle Bildmarke ohne Schrift oder Glanzeffekte; die App behält ihre helle Editorial-Gestaltung.
- Deckende Exporte in 180/192/512 Pixeln und eigener Android-Maskierung; neue versionierte Adressen für HTML und Manifest, unversionierte Aliase und Offline-Verfügbarkeit. Vorheriges Platin-Motiv bleibt gesichert. Installationspfad und lokale Daten unverändert; vorhandene iOS-Icons können zwischengespeichert bleiben.

## Version 0.16.0 – freiwillige Vertiefung im Chat

- Drei kurze Stilcheck-Schritte bleiben bestehen. Nach Abschluss zeigt der Stylist-Einstieg eine freiwillige Einladung mit einem kleinen Punkt; kein erzwungener Dialog.
- Acht geführte Fragen zu Stilfokus, Schnitten, Tagesablauf, Wärmeempfinden, Mustern, Accessoires, Abneigungen und Inspiration. Auch offline ohne Provider-Anfrage möglich. Jede Antwort wird bewusst bestätigt; Überspringen, Pause, früher Abschluss, Bearbeiten und bestätigtes Löschen möglich.
- Stilfokus wirkt auf bekannte Stilmerkmale der lokalen Auswahl; Accessoire-Antwort verändert ausdrücklich die sichtbare Outfit-Option. Bestätigte Angaben ergänzen die bestehenden Chat-/Lookvergleich-Kontexte bei bewusster Sendung. Keine simulierte Foto-/Passformkenntnis und kein behauptetes Modelltraining.
- Punkt für neue freiwillige Fragen oder vorhandene ungelesene Antworten; nur sichtbares Lesen in einer sichtbaren App quittiert. Gerätelokale Lesemarkierungen, keine OS-Pushfreigabe und keine automatischen KI-Anfragen.
- Additives Präferenzfeld, Datenbank weiterhin 5. Sicherungsformat 6 mit Lesbarkeit von 1–5; unabhängige Antwort-/Löschrevision beim Zusammenführen und Konfliktschutz für zwei Fenster. Stilcheck, Kleidungsfotos und bestätigte Kalendertage erhalten.

## Version 0.15.0 – Garderobenjournal

- Die bisherigen gestalterischen Vorgaben sind auf ausdrücklichen Nutzerwunsch aufgehoben. Neue eigenständige, helle Editorial-Gestaltung: Papierfarben, dunkle Schrift, lokale Serifentitel, rostrote Markierungen, kantige Bildflächen; keine violetten KI-Motive oder Sternchen-Symbole.
- Beschriftete Textnavigation mit Kapitelnummern und gleitender Linie; während Seitenanimationen durchgehend sichtbar. Datumsswipes und tatsächliche Kalenderfarbringe bleiben erhalten.
- Tageslook vor dem freiwilligen Stilcheck; gemeinsame Gestaltung für Kollektion, Outfitplanung, Dialoge, Einstellungen und Chat. Kategoriezeichnungen sind nur Platzhalter für fehlende Fotos.
- Altes Design vor Änderungen in GitHub-Tag `design-backup/platinum-0.14.0` gesichert; zusätzlich Quellarchiv und gezielter umkehrbarer Design-Patch. Keine Datenbank-/Sicherungsänderung, keine neuen Dienste oder Abhängigkeiten.
- Safe Areas, mindestens 44px wichtige Touch-Ziele, Tastaturbedienung, lesbare Kontraste und reduzierte Bewegung bleiben verbindlich. Frühere Dunkelmodus-Anforderungen beschreiben den damaligen Versionsstand.

## Version 0.14.0 – persönlicher KI-Chat

- Sprechblasen-Einstieg in der gemeinsamen Kopfzeile; dunkler, tastaturbedienbarer Dialog mit Folgefragen, natürlichen deutschen Antworten und bewusster Sendung.
- Kostenloser bestehender Qwen3-VL-Outpost/8B-Dienst, eigener widerrufbarer gerätelokaler Chat-Opt-in, keine zusätzlichen Provider-/Administrationsschlüssel und keine kostenpflichtigen APIs.
- Begrenzter Kontext: Frage, letzte sechs Nachrichten, höchstens 40 relevante Kleidungsangaben mit ausgewogener Kategorieauswahl, Stilprofil/abgeleitete Vorlieben, heutiger Look, Tragehistorie und bereits freigegebene frische Wetterwerte. Keine Kleidungsfotos, Notizen, Audioaufnahmen oder Koordinaten an Qwen.
- Echte vollständige Look-Referenzen validieren; Verfügbarkeit und Kontext beim Speichern erneut prüfen. Änderungen erst auf eigene Aktion. Keine automatischen Löschungen, Wäsche-, Kalender- oder Profileingriffe.
- Verlauf mit höchstens 30 vollständigen Gesprächsrunden, Neustart, Offline-Lesen, bestätigtem Löschen und erhaltenen Entwürfen nach Fehler/Abbruch. Verspätete Antworten nach Reset, Import, Kontextwechsel, Widerruf und Schliessen verwerfen. Keine automatischen Wiederholungen oder bezahlten Ausweichdienste.
- Optionale Browser-Diktierfunktion und Vorlesen mit sichtbaren Datenfluss-Hinweisen, Mikrofon nur nach Antippen, Text vor Sendung editierbar, 30-Sekunden-Grenze und Abbruch beim Verlassen. Tippen bleibt immer nutzbar; echte iPhone-Sprachunterstützung nicht behaupten.
- Additive Datenbankversion 5 und Sicherungsformat 5 für Gespräch/Look-Referenzen; Altbestände und Sicherungen 1–4 erhalten. Freigaben nicht exportieren, alte Sicherungen und konkurrierende Antworten dürfen gelöschte Verläufe nicht unbeabsichtigt wiederherstellen.

## Version 0.13.0 – Stilprofil und lernende Gewichtung

- Nicht blockierender, dauerhaft überspringbarer Stilcheck mit drei freiwilligen Schritten. Bestehende Vorlieben vorfüllen, Entwürfe abbrechbar, Profil unter Mehr jederzeit bearbeiten.
- Lieblingsstile/-farben, seltener gewünschte Farben, Farbigkeit, üblicher Anlass und Abwechslung beeinflussen tatsächliche Vorschlags- und Tauschteilgewichte. Keine verbotenen Stücke aus weichen Vorlieben ableiten; Verfügbarkeit, Vollständigkeit und Kontext erhalten.
- Einheitliche Daumen an Tages-, Rückblick-, vorgeschlagenen und gespeicherten Looks; optionale, gezielte Ablehnungsgründe. Rückmeldungen kontextbezogen anwenden, alte globale Rückmeldungen weiter beachten. Anlass-Ablehnung nicht als Geschmacksurteil lernen; alternatives Kombinieren ohne Ablehnung.
- Positive Hinweise auf neue passende Stücke übertragen; negative Stil-/Farbhinweise nur aus ausdrücklich gewähltem Grund. Begrenzter Einfluss, keine Körper-/Material-/Persönlichkeitsannahmen, kein vorgetäuschtes Modelltraining.
- Aktuelle Bewertung pro Kombination statt Mehrfachzählung; Bewertungen einzeln zurücknehmen oder insgesamt mit Bestätigung zurücksetzen. Profil und Sammlungsdaten erhalten, konkurrierende Profil-/Undo-Änderungen erkennen.
- Neue optionale Felder in vorhandenen Präferenz-/Feedbackobjekten, keine destruktive Datenbankmigration. Sicherungsformat 4 erweitert validieren und vollständig wiederherstellen; alte Sicherungen unverändert lesen.
- Stilprofil und kompakte gelernte Hinweise beim ausdrücklich gestarteten Online-Vergleich berücksichtigen; bestehende Freigabe, Grenzen und kostenlose Dienste erhalten. Kein automatischer Cloud-Upload.

Privater Fashion-Begleiter für das eigene iPhone. Eine installierbare, deutschsprachige PWA, die Kleidung lokal verwaltet. Kein App Store, keine Abonnements, keine bezahlten APIs, kein Konto für den lokalen Kleiderschrank. Optionale externe Bild-KI ist ausdrücklich gewünscht, bleibt kostenlos und nutzt nach Freigabe klar benannte öffentliche Community-Dienste. Ein eigener Server ist optional, aber kein kostenloses HF-Docker-Hosting. Eigene Gestaltung, inspiriert von klaren iPhone-Oberflächen und moderner Fashion-Ästhetik.

## Erste Version

- Startseite mit persönlichem Bestand, Favoriten und zuletzt ergänzten Stücken.
- Kleiderschrank mit Kamera-/Fotoimport, Galerie, Suche, Kategorie- und Favoritenfilter.
- Hinzufügen, Anzeigen, Bearbeiten und Löschen; Name, Kategorie, Farbe, Marke, Jahreszeiten, Stilrichtungen und Notizen.
- Fotos werden im Browser auf höchstens 1600 Pixel verkleinert, als JPEG neu erzeugt und mit den Angaben in IndexedDB gespeichert. Keine Fotoübertragung, keine Beispielstücke als eigener Bestand.
- Versionierte JSON-Sicherungen inklusive Fotos, validierter Import mit Zusammenführen oder bewusstem Ersetzen des Bestands.
- Ausschliesslich dunkles, an iPhone-Oberflächen orientiertes Erscheinungsbild, Safe Areas, zugängliche Navigation, Offline-App-Shell und PWA-Installation.

## Version 0.2 – lokale Outfits

- Nachvollziehbarer, begrenzter regelbasierter Generator für vollständige Looks aus vorhandenem Bestand; Anlass, Saison, gewünschter Stil und optionale Accessoires.
- Saisonfilter und konservative Anlassregeln anhand eigener Angaben. Einfache Farbakzent-Regeln, keine Bildanalyse, keine garantierte Harmonie, kein Wetter.
- Outfits speichern, benennen, löschen und favorisieren; Stücke referenzieren existierende IDs. Abhängige Outfits und Rückmeldungen werden bei Kleidungsstück-Löschung atomar entfernt.
- Lieblingsfarben/-stile, Kleidungsfavoriten und positives Feedback beeinflussen die Gewichtung. Ablehnungen gelten für die konkrete Kombination und sind zurücksetzbar.
- Datenbankmigration erhält den bestehenden Kleiderschrank. Sicherungsformat 2 umfasst auch Outfits, Feedback und Vorlieben; Format 1 bleibt lesbar.
- Gegenprüfungen und Fehlerbehebungen siehe REVIEW.md.

## Spätere Funktionen

1. Erweiterte Kalenderauswertung und Nutzerfeedback nach Erprobung im Alltag.
2. Genauere Farbangaben und weitere nachvollziehbare Kombinationsregeln nach Erprobung der ersten Vorschläge.
3. Feinere Wetterregeln nach Ergänzung zuverlässiger Material- und Wärmeangaben.
4. Erweiterte persönliche Empfehlungen anhand tatsächlich getragener Outfits.
5. Automatische Merkmale und lokale Freistellung erst nach Evaluation von Zuverlässigkeit, iPhone-Leistung und kostenloser Lizenzierung. Immer manuell korrigierbar.
6. Outfit-Fotobewertung nur bei realistisch kostenloser, zuverlässiger Bildanalyse. Keine simulierte KI-Bewertung; bis dahin allenfalls klar gekennzeichnete manuelle Stil-Checkliste.

## Datenschutz und Grenzen

Alle Kleidungsdaten bleiben im Browserprofil des Geräts. Kein Analytics, keine externen Fonts, ein optionaler Foto-KI-Server und keine Anbieter-Schlüssel im Frontend. Nur nach aktivierter Freigabe wird das jeweils neu ausgewählte Foto an den verbundenen Hugging-Face-Server gesendet; gespeicherte Sammlungen werden nicht automatisch hochgeladen. App-Downloads und Hostingzugriffe sind technisch notwendige Netzwerkzugriffe. Backups enthalten private Fotos und sind nicht verschlüsselt. Gerätecode und sichere Aufbewahrung sind wichtig.

## Version 0.3 – Alltag und freiwilliges Wetter

- Kalender mit einem gespeicherten Look pro lokalem Tag, geplant/getragen, korrigierbarem Status und Notizen. Zukünftige Looks können nicht als getragen erfasst werden. Bis 3000 Tage, Notizen bis 200 Zeichen.
- Aus bestätigten Tagen berechnete Tragehäufigkeit; keine doppelten oder verwaisten Zähler. Kleine zusätzliche Gewichtung bereits getragener Stücke.
- Manuelle Ortssuche oder einmaliger Standortzugriff erst nach Nutzeraktion. Koordinaten werden auf zwei Dezimalstellen gerundet. Wetterabruf und Berücksichtigung in Vorschlägen sind separate bewusste Aktionen.
- Open-Meteo ohne Schlüssel für privaten Gebrauch. Bis sieben Wettertage, sichtbare Quelle/Zeitzone/Datenstand, sechs Stunden Aktualitätsgrenze, Offline-Anzeige und lokales Vergessen. Keine automatischen Wetteraufrufe und keine Übertragung von Fotos oder Kleidung. Der Dienst erhält Ortsnamen beziehungsweise gerundete Koordinaten und technisch die IP-Adresse.
- Grobe Temperatur-/Saisonregeln und Regenhinweis, keine behauptete Material-, Passform- oder Wasserdichtigkeitsanalyse.
- Datenbankversion 3 erhält die bisherigen Daten. Sicherungsformat 3 enthält Kalender und gegebenenfalls Ortsdaten/Vorhersage; Format 1 und 2 bleiben lesbar. Backups enthalten Ortsdaten unverschlüsselt, wenn Wetter eingerichtet wurde.
- Beide echten Wetterendpunkte inzwischen per HTTPS erreichbar. Cloud-Chromiums Proxy-Zertifikatsvertrauen verhindert noch den zusätzlichen Live-Browsernachweis; kontrollierte API-Tests ersetzen diesen und einen echten iPhone-Test nicht.

iOS kann Website-Daten entfernen; privates Surfen, Löschen von Safari-Daten, Deinstallation, Gerätewechsel und eine andere Domain können den Bestand unzugänglich machen. Regelmässig eine Sicherung in Dateien/iCloud Drive ablegen. Browserdaten sind kein dauerhaft garantiertes Backup. Ein Export enthält höchstens 100 MB und 1000 Stücke; grössere Sammlungen benötigen später ein gestreamtes Archivformat. Einzelne Fotoquellen höchstens 20 MB. Kein Hintergrundabgleich zwischen Geräten.

## Qualitätsziel

Version 0.4 ergänzt eine optionale lokale Farbprobe mit expliziter Übernahme in das vorhandene Farbfeld. Keine Fotoübertragung, neue Laufzeitabhängigkeit oder Modelldatei. Fotos bleiben unverändert; manuelle Korrektur und normales Speichern/Verwerfen gelten weiter. Ausführliche Entscheidung zu Bild-KI und ausstehenden Geräteprüfungen in IMAGE_ASSISTANCE.md. Eine veraltete Outfit-Namensbearbeitung wird nun mit Konflikthinweis abgewiesen; Ersetzungsimporte nennen sämtliche betroffenen Datenarten.

Reale, überprüfbare Funktionen; verständliche Fehler und leere Zustände; keine Attrappen. Automatisierte Daten- und Browserprüfungen, Darstellung bei 375, 390 und 430 Pixeln sowie dunkles Design. Echte iPhone-Tests bleiben vor langfristiger Verwendung nötig (Kamera, Fotomediathek, Download/Import, Homescreen, Offline, Speicherdruck).

Die Entwicklungsregeln stehen nach ausdrücklicher Freigabe in AGENTS.md.

## Version 0.5 – echte lokale Freistellung und Bereitstellung

- Optionale experimentelle Freistellung mit U2NETP/ONNX Runtime Web, ohne Fotoübertragung oder kostenpflichtige API. Einmaliger bewusster Download von rund 19 MB, lokale SHA-256-Prüfung und Offline-Cache; kein Hintergrunddownload des Modells.
- Berechnung in beendbarem Worker mit einem CPU/WASM-Thread; Vorschau, bewusste Übernahme, Verwerfen und Rückkehr zum Original. Original und transparente PNG werden separat gespeichert. Keine automatische Kleidungs-/Stilerkennung oder Fotobewertung behauptet.
- Additive Datenbankversion 4; Sicherungsversion 4 umfasst beide Fotovarianten. Formate 1–3 bleiben lesbar, alle Bilddateien werden vor Import decodiert. Kapazitätsgrenzen zählen beide Blobs.
- Selbst gehostete Modell-/Laufzeitdateien und Lizenzhinweise. Keine Bezahlangebote, keine zusätzlichen Schlüssel. Cache kann ohne Verlust von Fotos entfernt werden.
- Root-/GitHub-Projektseiten-Build und manuell auslösbarer Pages-Workflow. Keine Änderung der Repository-Sichtbarkeit; private Repositories werden vom Workflow übersprungen.
- Öffentliche Bereitstellung am 15. Oktober 2026 erfolgreich: https://treemonsal.github.io/Kleiderschrank/ einschließlich geprüfter Installations-/KI-Dateien. Qualitätsnachweis auf echtem iPhone fehlt weiterhin. Die experimentelle Option wird getrennt von den Kernfunktionen angeboten; sie ist keine Zusicherung zuverlässiger iPhone-Segmentierung.

## Version 0.6 – dunkle iPhone-Oberfläche und vorbereitete Online-KI

- Benutzerwunsch: kein Hellmodus, stärkere externe Bild-KI, automatische Angaben statt manueller Erfassung. Weiterhin keine laufenden Kosten.
- Dunkle neutrale Flächen, Systemschrift, grosse klare Titel, violette Akzente, schwebende Navigation, dunkle Installationsfarben. Alte Hellmodus-Auswahl wird ohne Änderung der Kleidung auf Dunkel umgestellt.
- Nach verbundener und freigegebener Online-KI startet ein neues Foto automatisch die Analyse: Name, Kategorie, Farbe, Marke, Saison, Stil, Notizen. Alles bleibt korrigierbar. Während der Anfrage geänderte Felder haben Vorrang. Marken unbekannt lassen; Material nicht erfinden.
- Servervorlage für kostenloses Hugging Face CPU Basic: Qwen3-VL-2B-Instruct für Merkmale, BiRefNet-General-Lite für Freistellung. Keine bezahlte API. Getrennte Teilergebnisse und Freistellungsvorschau; Original, Backup und lokale Daten bleiben erhalten.
- Server-Verbindung benötigt eigenen Hosting-Zugang. Code und Dateien sind vorbereitet; ohne Deployment ist die Online-KI ausdrücklich nicht betriebsbereit. Kaltstart, echte Qualität und Laufzeiten sind gesondert zu prüfen. CPU kann langsam sein, kostenloses Hosting schläft.

## Version 0.6.1 – echte kostenlose Community-Erkennung

- Gültiger HF-Write-Token bestätigt. Tatsächliche Erstellung eines eigenen CPU-Docker-Spaces scheitert an neuer PRO-Pflicht (HTTP 402). Keine kostenpflichtige Ressource angelegt; frühere kostenlose Hostingannahme korrigiert.
- Stattdessen zwei öffentlich angebotene, ohne Provider-Key aufrufbare Gradio-APIs: Qwen3-VL-Outpost (4B Instruct) und offizielle BiRefNet-Demo. Echte Bildverarbeitung und ganzer Fotoimport erfolgreich geprüft, nicht nur Mock-Antworten.
- Einmalige Foto-Freigabe in der App statt Serveradresse/Token. Fotos gehen gezielt an die beiden benannten Anbieter; BiRefNet verwendet temporäre Dateien, deren Löschdauer wir nicht garantieren können. Keine pauschale Behauptung „keine Bildspeicherung“ für Community-Betrieb.
- Warteschlangen und Nutzungslimits sichtbar; begrenzte Antworten, nur definierte HTTPS-Anbieter, keine Credentials/Referrer, keine fremden Ergebnis-URLs oder automatischen Wiederholungen. Ausfall eines Teils erhält den anderen; Originale bleiben gespeichert.
- Widerruf wirkt sofort, auch während Verbindungsprüfung. Bestandsfotos werden beim Öffnen/Bearbeiten nicht automatisch gesendet. Kein neues Datenschema oder Backupformat.

## Version 0.6.2 – Glasnavigation und nachvollziehbare KI-Fehler

- Schwarzer Hintergrund, neutrale iOS-Grautöne, blaue Akzente und Systemschrift; schwebende durchscheinende Navigation mit Reflexen und beweglicher Auswahlfläche.
- Gut bedienbare Navigation bei 375/390/430 Pixeln; reduzierte Bewegung und reduzierte Transparenz/erhöhter Kontrast berücksichtigt. Glasoptik per CSS, kein natives Apple-Material.
- Bilderkennung und Freistellung benennen ihre Fehler separat: bestätigtes Limit, volle Warteschlange, nicht verfügbar, Zugriff verweigert, Verbindung oder unbrauchbare Antwort. Unbekannte Fehler bleiben ausdrücklich unbekannt; keine pauschale Limitbehauptung.
- Anbieterhinweise in HTTP- und Gradio-Fehlern einschliesslich Qwens `[ERROR]`-Text werden sicher ausgewertet. Wartezeit nur bei expliziter Anbieterangabe; sensible Rohdaten werden nicht angezeigt. Keine automatischen Wiederholungen und keine zusätzlichen Übertragungen oder Kosten.
- Original und brauchbare Teilergebnisse bleiben erhalten. Datenschema und Sicherung bleiben Version 4.

## Version 0.7 – direkter Alltagseinstieg

- Startseite mit lokalem Tagesdatum und gespeicherter Tagesvorhersage (Min/Max, Wetterlage und Ort; keine behauptete Live-Temperatur).
- Tageslook automatisch aus bestehendem Bestand und Regeln anhand erfasster Merkmale, Vorlieben, Rückmeldungen und Auswahl. Ein vollständiger heutiger Kalenderlook hat Vorrang; sonst stabile Auswahl pro lokalem Gerätetag. Keine neue Fotoübertragung für Outfits, keine erfundenen Stücke.
- Ortswahl lädt und speichert die Vorhersage samt Aktivierung der Wetterverwendung und bestätigt erst danach; Auswahl schliesst automatisch und besitzt explizites Schliessen. Fehler erhalten die vorige Vorhersage. Gerätestandort ausschliesslich auf Knopfdruck; späte Antworten nach Schliessen werden verworfen.
- Gespeicherter Ort darf nach diesem Nutzerauftrag bei veralteter/fehlender Tagesvorhersage online aktualisiert werden. Keine Dauerversuche; veraltetes Wetter sichtbar markieren und nicht für Looks verwenden. Ausschalten bleibt gespeichert, Vergessen wird nicht von einer alten Antwort rückgängig gemacht.
- Anlass, Saison, Stil, Accessoire-Wahl und Wetterverwendung in bestehenden persönlichen Vorlieben atomar speichern und sichern. Optionale Zusatzfelder in Sicherung 4, alte Sicherungen unverändert lesbar; Kleidungs-/Fotodaten bleiben erhalten.
- Aktivierte Foto-KI kompakt mit aufklappbaren Hinweisen/Freigabe und Abschalten; kein weiterer Aktivieren-Knopf. Ausreichende Hinweise bleiben vor der ersten Aktivierung sichtbar.
- Horizontale Wischgesten zwischen Hauptseiten; Formulare, Dialoge, Scrollleisten und Bildschirmränder ausnehmen. Navigationsleiste bleibt zugänglich. Dunkle Bestätigungen und automatisches Schliessen der Sortierauswahl nach Auswahl.

## Version 0.8 – Tageshistorie und Farbringe

- Neuer Farbwunsch: neutrale Platin-/Silberakzente mit Graphit/Schwarz, helle Buttons mit dunkler Schrift und passende Icons. Keine Änderung der Kleidungsfarben; Fehler-/Favoritenfarben behalten ihre Bedeutung.

- Horizontale Wischgesten auf der Startseite ändern den gewählten lokalen Tag, rechts zurück/links vor. Kein Wischwechsel der Haupttabs. Wochenleiste, Tagespfeile, „Zu heute“ und Monatsauswahl bieten zugängliche Alternativen.
- Automatischer Vorschlag nur für heute ohne Eintrag. Vergangenheit zeigt vorhandene Einträge mit bestätigtem/geplantem Status oder einen leeren Zustand; keine rekonstruierte oder erfundene Tragehistorie. Zukunft zeigt vorhandene Pläne.
- „Heute getragen“ speichert Outfit und Kalendereintrag atomar, schützt vor konkurrierenden Änderungen, lässt keine zukünftige Bestätigung zu und beeinflusst die vorhandene Tragehäufigkeit. Einfaches Outfit-Speichern bestätigt keinen Tragetag.
- Farbringe um Tageszahlen für bestätigte Tragetage in Wochen- und Monatskalender, neutrale gestrichelte Pläne und zugängliche Farbnamen. Bekannte Farbfamilien deduplizieren; fehlende Farben nicht erfinden und Bunt als mehrfarbige Familie zeigen.
- Neue Tragebestätigungen speichern `wornColors` optional im bestehenden Kalendereintrag. Sicherung 4 validiert/erhält dieses Feld; bestehende Sicherungen bleiben lesbar. Notizänderungen erhalten den Farbstand, neues Outfit/erneute Bestätigung erfasst neu. Alte Einträge verwenden vorhandene aktuelle Merkmale; Fotos/Namen bleiben referenziert und abhängige Löschungen unverändert.
- Monat/Jahr/Schaltjahr/Sommerzeit und Datumsgrenzen 1900–2200 berücksichtigen. Tageswechsel fragt weder Bild-KI noch Standort ab und zeigt für die Vergangenheit keine heutige Vorhersage als historisches Wetter.

## Version 0.9 – Kleidung im Alltag

- Einzelne Teile im heutigen, noch nicht getragenen Look austauschen; passende verfügbare Alternativen derselben Kategorie, restliche IDs erhalten. Automatische Tagesauswahl lokal merken; heutige Kalenderpläne atomar umhängen, gemeinsame gespeicherte Looks und frühere Tragetage erhalten. Konflikte und Schreibfehler überschreiben keinen neueren Stand.
- Bestätigte Tragetage der letzten sieben Tage verringern das Gewicht kürzlich getragener Stücke und Kombinationen. Kleine Bestände dürfen weiter vollständige wiederholte Looks liefern. Keine zusätzliche Fotoanalyse oder kostenpflichtige API.
- Optionaler Wäsche-Status an Kleidung, Bearbeitung und eigener Filter. Neue automatische Vorschläge und Tauschlisten schliessen solche Stücke aus; Originale, Freistellungen, gespeicherte Looks und bestätigte Historie bleiben bestehen. Sauber-Markierung gibt Stücke wieder frei.
- Tageskarte folgt der horizontalen Geste und rastet ein. Abbruch, kurze/vertikale Gesten, Bildschirmränder, Eingaben, Dialoge, parallele Tageswahl und reduzierte Bewegung sind berücksichtigt. Kein Wechsel der Hauptseiten.
- Freiwillige Sicherungserinnerung frühestens nach einer Woche und nur bei unexportierten Inhaltsänderungen, pausierbar/abschaltbar. Routine-Wetterrefresh und Erinnerungsverwaltung erzeugen keinen Hinweis. Exportstatus behauptet keine physische Speicherung der Datei. Keine automatische Übertragung.
- Additive optionale Felder in bestehenden Tabellen und Sicherungsformat 4; keine neue Datenbankstruktur, alte Sicherungen weiterhin lesbar. Alle neuen gespeicherten Angaben werden validiert und mitgesichert.

## Version 0.10 – Produktkritik und Korrekturen

- Kritische Bewertung in AUDIT.md über Bedienung, Empfehlungen, Foto-KI, Gestaltung, Zuverlässigkeit, Datenschutz, Sicherung, Zugänglichkeit, Leistung und Kosten. Redaktionelles Gesamturteil nach Korrekturen 7,5/10; keine Nutzerstudie oder behauptete modische Trefferquote.
- Erster Fotoimport und Tragebestätigung ohne Scrollen erreichbar; doppelte leere Einstiegsfläche entfernt. Tagesalternative bleibt gespeichert und ist keine Ablehnung. Bestehende Pläne/Historie bleiben geschützt.
- Gemeinsame Bewertung von Basis, bis zu vier Jacken und drei Accessoires; weniger Zufall, gemeinsame bekannte Stile und positiv bewertete Stückpaare. Unbekannte Farben erhalten keinen neutralen Harmoniebonus. Bestehende Saison-/Anlass-/Wetter-/Wäsche-/Ablehnungsregeln bleiben erhalten.
- Zurücknehmbare positive Bewertung auf Home und unter Outfits. Vorhandene Datentypen und Sicherungsformat 4 werden wiederverwendet, keine neue Migration oder Abhängigkeit.
- Sichtbarer Empfehlungskontext, zur Vorhersage passendes Symbol, deutsche Kopfzeile und echtes Einstellungen-Symbol. Lesbare Fehleransicht bei unzugänglichem lokalen Speicher, kein Löschen oder Neuladen eines offenen Entwurfs. Tastatur-Sprunglink und Dialogfokus geprüft.
- Keine neuen Dienste, Kosten oder automatischen Fotoübertragungen. Foto-KI-Limits, Passformkenntnis, automatische Synchronisierung und echter iPhone-/Safari-Nachweis bleiben ausdrückliche Grenzen.

## Version 0.11 – flüssigere und spielerische Bewegung

- Wäschetrommel dreht kurz mit leicht wippendem Gehäuse; Herz-Puls, kleine Reaktion auf Bewertungen und Tausch-Symbole sowie federnde Glasnavigation. Erneutes Tippen ersetzt den vorherigen Effekt; keine dekorative Endlosschleife.
- Native View Transitions als optionale Seitenüberblendung, ansonsten CSS-Einblendung. Die letzte Navigation gewinnt auch bei schnellen Wechseln oder sofortigem Zurücktippen. Inhalte bleiben bedienbar; nachfolgendes Scrollen/Fokussieren auf Sicherungen erfolgt erst nach dem tatsächlichen Seitenwechsel.
- Sanftere Fensteröffnung, Foto-Einblendung, leicht versetztes Erscheinen von Outfit-Teilen und kompakte Toast-Bewegung. Transform/Opacity statt zusätzlicher Layout-Schreibschleifen, keine neue Abhängigkeit.
- Systemweite reduzierte Bewegung stoppt laufende Tipp-Effekte und verhindert neue dekorative Bewegungen. Fehlende Animations-APIs blockieren keine Aktion. Keine Änderungen an Empfehlungen, Datenmodell, Sicherungsformat oder Fotoübertragung.

## Version 0.11.1 – neues Homescreen-Icon

- Plastischer Platin-Kleiderbügel auf Graphit für iPhone, PWA-Installation und Browser-Tab. Deckende Exporte in 180/192/512 Pixeln; Android-Maskierung erhält zusätzlichen sicheren Innenabstand.
- Neue Icon-Adressen für Neuinstallationen, bestehender App-Startpfad und lokale Sammlung bleiben erhalten. Bereits installierte iPhone-Icons können durch iOS weiterhin zwischengespeichert sein.

## Version 0.11.2 – durchgehend sichtbare Navigation

- Tabwechsel animieren den neuen Seiteninhalt innerhalb der normalen Ebenenfolge; die feste Glasnavigation bleibt davor sichtbar und bedienbar. Keine Browser-Snapshot-Ebene über der Menüleiste.
- Seiteninhalt und aktive Auswahl wechseln im selben Render-Schritt; Scrollen und nachfolgende Fokusaktionen beziehen sich auf den neuen Inhalt. Schnelles Zurücktippen, reduzierte Bewegung, Tageswischen und lokale Daten bleiben erhalten.

## Version 0.12 – echte Online-Outfit-Beratung

- Auf Nutzerwunsch externe Verarbeitung ausgewählter gespeicherter Kleidungsfotos und Kontext erlauben. Kostenlos bleiben; die Freigabe des einzelnen Nutzers respektieren. Kein Konto, Tracking oder neuer Cloud-Speicher erforderlich.
- Qwen3-VL-8B vergleicht bis zu vier vollständige, verfügbare Looks anhand einer beschrifteten Fotoübersicht, Anlass, Stil-/Farbvorlieben, optionalem Wunsch und frischem Wetter. Keine beliebigen neuen Stücke oder ungeprüften Referenzen übernehmen.
- Start auf ausdrückliche Aktion bei aktivierter Community-KI. Benannte Übertragung, Abbruch, Zeitgrenze, klare Dienstfehler und lokaler Fallback. Ohne Fotos wird die Beratung als angabenbasiert kenntlich gemacht.
- Kurze Begründung und aufklappbare Tipps, Empfehlung für heute oder als Outfit speichern. Tagesübernahme schützt inzwischen geänderte Bestände, Vorlieben, Wäsche und Ablehnungen. Bestätigte/geplante Tage werden nicht überschrieben. Bestehendes Sicherungsformat bleibt kompatibel.

## Version 0.12.1 – stabile Fotoanzeige bei Statuswechseln

- Alte Bildadressen bei neu gelesenen IndexedDB-Blobs erst freigeben, nachdem die sichtbare Bildquelle ersetzt wurde. Noch angezeigte und neu vorbereitete Quellen bleiben gültig; ungenutzte Quellen und beim Schliessen verbliebene Adressen werden freigegeben.
- Wäsche-/Sauberwechsel verändern keine Foto- oder Freistellungsdaten. Wiederholte Wechsel, Anzeige im Kleiderschrank, Neustart und bytegleicher Export beider Varianten werden im Browser geprüft. Keine Schema-, Sicherungsformat- oder Dienständerung.

# Produktkritik – MyStyle 0.10.0

## Urteil

**Vor den Korrekturen: 6,5/10. Nach den Korrekturen: 7,5/10.**

Das ist eine redaktionelle Produktbewertung mit besonderem Gewicht auf Alltagstauglichkeit und Empfehlungen. MyStyle ist ein brauchbarer privater Kleiderschrank mit guter dunkler Gestaltung. Ein verlässlich treffsicherer persönlicher Stylist ist es noch nicht. Die Anzahl bestandener Softwaretests misst keine modische Qualität.

Prüfungsbasis: Codeprüfung, visuelle Sichtung des Produktionsbuilds, kontrollierte Browserabläufe mit eigenem Testbestand, Datentests und Bildschirmgrössen 375/390/430 Pixel. Keine privaten Nutzerfotos, keine neuen echten Foto-KI-Aufträge. Keine Nutzerstudie, kein neuer Modell-Genauigkeitsbenchmark und kein echter iPhone-/Safari-/VoiceOver-Test.

| Thema                            | Bewertung nach Korrektur | Begründung und Grenze                                                                                                                                                                                                                                          |
| -------------------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bedienung und Einstieg           | 8/10                     | Erster Fotoimport und Tragebestätigung direkt sichtbar; Tagesauswahl, Teiletausch und Wäsche sind erreichbar. Umfangreiche Einstellungen und Sicherungen erfordern weiterhin etwas Einarbeitung.                                                               |
| Gestaltung                       | 8/10                     | Konsequente dunkle Platin-/Graphit-Flächen, Glasnavigation, klare Aktionen. Einige Nebenbeschriftungen bleiben klein; eine echte Gerätesichtung fehlt.                                                                                                         |
| Empfehlungen                     | 6,5/10                   | Verfügbare Stücke, Wetter, Saison, Anlass, Vorlieben, Wiederholungen sowie erfasste Stilrichtungen und positiv bewertete Stückpaare werden berücksichtigt. Passform, Material, genaue Farbtöne und ein individueller Dresscode sind nicht zuverlässig bekannt. |
| Foto-KI                          | 6,5/10                   | Automatische Merkmale und Freistellung sparen Eingaben; manuelle Korrektur, Originalerhalt und Abbruch sind vorhanden. Öffentliche kostenlose Dienste haben Limits und Wartezeiten. Genauigkeit hier nicht neu gemessen.                                       |
| Zuverlässigkeit und Offline      | 8/10                     | Atomare Speicherung, Konfliktprüfungen, validierte Sicherungen und Offline-Kernfunktionen. Speicherfehler haben jetzt eine lesbare Ansicht. Browserdaten bleiben von Gerätespeicher und iOS abhängig.                                                          |
| Datenschutz                      | 8/10                     | Lokale Sammlung, kein Tracking, keine Anbieter-Schlüssel im Frontend, Fotoübertragung nur nach Freigabe. Öffentliche KI-Dienste erhalten ausgewählte Bilder; deren Löschdauer ist unbekannt. Sicherungen sind unverschlüsselt.                                 |
| Datensicherung und Gerätewechsel | 7/10                     | Export, Import und Erinnerungen umfassen alle gespeicherten App-Daten. Dateien müssen bewusst gesichert werden; kein automatischer geräteübergreifender Abgleich.                                                                                              |
| Zugänglichkeit                   | 7,5/10                   | Native beschriftete Bedienelemente, wichtige Touch-Ziele ab 44 Pixeln, Tastatur-Sprunglink, Dialog-Fokusrückgabe und reduzierte Bewegung. Keine vollständige WCAG-/VoiceOver-Zertifizierung.                                                                   |
| Leistung                         | 7,5/10                   | Begrenzte Kombinationssuche und keine neue Abhängigkeit. Haupt-JavaScript rund 149 kB gzip; schwere lokale Inferenzdateien bleiben optional. Reale ältere iPhones und längere KI-Wartezeiten bleiben offen.                                                    |
| Kosten                           | 9/10                     | Weiterhin kostenlos ohne Konto für den Kleiderschrank. Kostenlose Bilddienste bieten keine Verfügbarkeitsgarantie.                                                                                                                                             |

## Wichtigste Befunde und ausgeführte Änderungen

### Kernaktionen zu weit unten

Bei 390 × 844 Pixeln lagen „Erstes Stück hinzufügen“ bei ungefähr y=1030 und „Heute getragen“ bei y=1034, jeweils unter dem ersten Bildschirm. Der leere Tageslook führte zunächst in die Outfit-Einstellungen und verlangte damit zusätzliche Schritte.

Im gleichen kontrollierten Vergleich liegt der erste Import nach der Korrektur bei y≈491 und die Tragebestätigung bei y≈517. Der erste Import liegt jetzt direkt in der Tageskarte. Der doppelte Einstiegsblock wurde entfernt. Tragebestätigung und „Anderer Look“ stehen vor den Kleidungsbildern. Die neuen Browserprüfungen verlangen bei 375/390/430 Pixeln, dass die Hauptaktion vollständig oberhalb von y=744 liegt und mindestens 44 Pixel hoch ist. Leere Bestände werden nicht als bereits zusammengestellter Look beschriftet.

### Empfehlungen teilweise vom Zufall und unvollständigen Angaben bestimmt

Zuvor wurde eine Jacke aus einer vorselektierten Liste anhand eines Zufallswerts gewählt; passende andere Jacken wurden für dieselbe Basis nicht verglichen. Ein abgelehnter vollständiger Look konnte deshalb die ganze Basis verstecken. Leere Farbangaben erhielten denselben Harmoniebonus wie bekannte neutrale Farben.

Jetzt werden pro vollständiger Basis bis zu vier Jacken und drei Accessoires gemeinsam bewertet. Bekannte Farben, gemeinsame erfasste Stilrichtungen, Vorlieben und kürzlich getragene Stücke bestimmen die Gewichtung; Zufallsanteile sind kleiner. Bei Ablehnung kann eine andere Jacke derselben Basis übrig bleiben. Fehlende Farben werden nicht als bestätigte Farbharmonie gewertet. Die Suche bleibt begrenzt und liefert weiterhin nur reale, vollständige Bestandskombinationen. Sie ist keine vollständige Suche über jede mögliche Kombination eines grossen Bestands.

Positiv bewertete Stückpaare erhalten auch in neuen Kombinationen einen kleinen Bonus. Ablehnungen gelten weiterhin nur für die konkrete Kombination und sperren nicht pauschal deren einzelne Stücke. Tauschalternativen berücksichtigen ebenfalls die übrigen Stücke.

### Zu wenig Kontrolle direkt auf der Startseite

„Anderer Look“ wählt eine andere vollständige Kombination und merkt sie lokal für heute. Überspringen ist keine negative Bewertung. Ohne Alternative bleibt der bisherige Look erhalten und die App erklärt dies. Geplante/bestätigte Tage, konkurrierende Änderungen und ein zwischenzeitlich geänderter Bestand werden geschützt. Die bestehende Tagesauswahl im Sicherungsformat wird wiederverwendet; keine neue Datenart oder Migration.

„Gefällt mir“ ist direkt am Tageslook möglich und zurücknehmbar. Auch der vorhandene positive Bewertungsbutton unter Outfits ist jetzt ein echter Schalter. Rücknahme entfernt die positive Bewertung und erzeugt keine Ablehnung.

### Vertrauen, Sprache und Orientierung

Die Tageskarte zeigt Anlass, gewählte Saison und ob Wetter berücksichtigt wird. Das Wettersymbol passt zur Vorhersage, etwa Regen statt des zuvor stets gleichen Wolken-/Sonnensymbols. Ein Einstellungen-Symbol ersetzt den wie ein Profil/Status wirkenden Buchstaben mit Punkt. Die Kopfzeile ist deutsch. Hinweise zur Foto-KI und zur lokalen Outfit-Auswahl benennen ihren jeweiligen Umfang, ohne eine perfekte Vollautomatik oder pauschal rein lokale Fotoverarbeitung zu behaupten.

### Speicherfehler und Tastaturbedienung

Ein nicht lesbarer Gerätespeicher darf nicht in einer endlosen Ladeanzeige enden. Die App zeigt jetzt eine Fehlermeldung mit erneutem Laden und Hinweisen zum Erhalt vorhandener Website-Daten. Während eines offenen Entwurfs wird kein Neuladen angeboten. Eine fehlgeschlagene Wetter-Cache-Abfrage verhindert diese Fehleransicht nicht.

Ein sichtbarer Sprunglink bei Tastaturfokus führt direkt zum Hauptinhalt. Ein Browserfall prüft zusätzlich Escape und Rückgabe des Dialogfokus an den ursprünglichen Auslöser. Dunkle Palette, reduzierte Bewegung, Foto-Freigabe und vorhandene Daten bleiben erhalten.

## Prüfung und Veröffentlichung

**140 Datentests, alle 70 Chromium-Browserfälle, Produktionsbuild und Formatprüfung bestanden.** Visuelle Gegenprüfung bei 375/390/430 Pixeln mit demselben Build; kein horizontaler Überlauf. Der finale Lauf umfasst bestehende Foto-/Offline-/Sicherungs-/Kalenderfälle und die neuen Tagesaktionen, Bewertungen, blockierten Speicher und Tastaturfokus. Veröffentlichung wird nach erfolgreicher Auslieferung ergänzt. Der Grossbestandsfall mit 1000 Stücken, Jacken und Accessoires ist durch einen begrenzten Laufzeittest abgesichert; das ist kein Leistungsnachweis auf einem echten iPhone.

## Grenzen des Urteils

Die Änderungen beheben konkrete Bedien- und Empfehlungsfehler. Eine hohe Trefferquote für den persönlichen Geschmack lässt sich erst anhand echter, freiwilliger Rückmeldungen über längere Zeit beurteilen. Körper-/Passformkenntnis, ein verlässlicher Dienst ohne Gratis-Limits und ein sicherer automatischer Geräteabgleich sind weiterhin nicht Bestandteil des Produkts. Diese Grenzen werden nicht durch zusätzliche vermeintliche KI-Funktionen verdeckt.

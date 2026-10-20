# Kritikerprüfung – MyStyle 0.18.0

## Würde ich die App selbst benutzen?

Für einen kostenlosen persönlichen Kleiderschrank ohne Anmeldung: ja. Vor dieser Runde hätten mich vor allem der umständliche erste KI-Scan, überraschend verlorene Entwürfe und vereinzelt falsche „keine Vorschläge“-Ergebnisse gestört. Das waren konkrete Schwächen, auch wenn die meisten normalen Abläufe bereits funktionierten.

Meine redaktionelle Gesamtbewertung nach den Korrekturen ist **8/10**. Die Gestaltung ist eigenständig, die täglichen Kernwege sind verständlicher und die gefundenen Fehler sind regressiv abgesichert. Das ist keine Nutzertest-Studie und kein gemessener Vergleich mit kommerziellen Styling-Apps. Die Qualität jedes subjektiven Stilurteils, die Verfügbarkeit kostenloser Anbieter und echtes iPhone-Verhalten sind durch einen Cloud-Test allein nicht bewiesen.

## Drei Runden mit vier unabhängigen Perspektiven

1. **Erste Kritik:** Einstieg und Alltag, Empfehlungen und Personalisierung sowie technische Zuverlässigkeit getrennt untersuchen. Konkrete Fehler anhand des Codes und kontrollierter Browser-/Datentests belegen.
2. **Gegenseitige Nachprüfung:** Die Agents prüfen fremde Korrekturen. Dabei zusätzlich übersehene Zustandsanzeigen, Einstellungs-Synchronisierung, Form-Submits und laufende Schreibvorgänge untersuchen.
3. **Frische Endnutzer-Perspektive:** Zusätzliche unabhängige Nachprüfung besonders des freiwilligen Stilgesprächs, von Abbruch, Fokus und verbleibenden Entwurfverlusten. Anschliessend bestehende und neue Browserabläufe im Gesamtlauf sowie schmale Ansichten und den Projektpfad durch den Hauptagent prüfen.

Der Ausgangsstand bleibt unter dem GitHub-Tag `backup/before-critic-review-0.17.1` erhalten. Der ältere vollständige Archiv-/Bundle-Backupstand bleibt ebenfalls verfügbar. Die persönlichen Kleiderschränke auf fremden Handys sind davon getrennt.

## Belegte Probleme und Korrekturen

| Bereich                   | Was mich als Nutzer stören würde                                                                      | Verbesserung                                                                                                                                                                                                        |
| ------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Erster Foto-Scan          | Für die KI-Freigabe muss ich meinen offenen Entwurf verlassen.                                        | Kostenlose Foto-KI direkt beim Foto einrichten; Zustimmung und Aktivierung ausdrücklich, danach dasselbe Foto analysieren. Foto und Eingaben bleiben erhalten. Ohne KI weiterarbeiten bleibt möglich.               |
| Formular                  | Speichern ist beim fehlenden Namen still deaktiviert; die Abbruchrückfrage liegt weit unten.          | Native Pflichtfeldprüfung und Fokus, Whitespace-Prüfung, verständlicher Hinweis; Verwerfen erreichbar oben. Optionale KI-Serverfelder lösen weder Kleidungs-Submits aus noch blockieren sie diese.                  |
| Erststart                 | „Auswahl anpassen“ führt ohne Kleidung zu einer weiteren leeren Ansicht.                              | Im leeren Bestand bleibt die eindeutige erste Aufnahme; mit Bestand bleibt Anpassung erreichbar.                                                                                                                    |
| Empfehlungssuche          | Ein gültiges 19. Oberteil oder eine weitere Jacke kann hinter einem Suchfenster verschwinden.         | Bevorzugtes Fenster beibehalten, bei ausgeschöpften Vorschlägen begrenzt weiter suchen. Ablehnungen, Wäsche und Ausschlüsse gelten weiterhin. Kein vollständiges riesiges Produkt aller Kleidungsstücke.            |
| Chat-Kontext              | Ein geplanter Abendlook wird als Alltag beschrieben oder der heutige Schuh aus dem Kontext verdrängt. | Tatsächlichen Anlass/Saison/Stil des gespeicherten Looks übernehmen; Tageslook vollständig vor Auffüllung des weiterhin auf 40 Stücke begrenzten Kontexts reservieren.                                              |
| Ehrliche Beratung         | Eine Beratung ohne Fotos heisst trotzdem „visuell“.                                                   | Ergebnisüberschrift unterscheidet Fotovergleich und Beratung nach Angaben. Veraltete Erkennungshinweise nach Fotoersatz/-entfernung zurücksetzen.                                                                   |
| Tagesplanung              | Ein zweites Fenster ersetzt meine ungespeicherte Notiz.                                               | Beim Öffnen Tag und Revision festhalten; fremde Änderungen erzeugen einen Konflikt statt einer stillen Entwurfsersetzung.                                                                                           |
| Gelöschtes Detail         | Nach fremdem Löschen bleibt der Stylist gesperrt.                                                     | Verwaiste Auswahl bereinigen, Entfernung melden und tatsächlichen geöffneten Datensatz für die Bedienbarkeit verwenden.                                                                                             |
| Stilprofil und Vorlieben  | Ein alter Entwurf überschreibt neue Vorlieben; eine Einladung verschwindet samt offenem Stilcheck.    | Atomare Stilrevision prüfen und offenen Stilcheck behalten. Reine Wetter-/Erinnerungsänderungen bleiben konfliktfrei.                                                                                               |
| Freiwilliges Stilgespräch | Nicht bestätigte Antworten gehen beim Schliessen oder Pausieren verloren.                             | Schliessen und unbeabsichtigten Wechsel vor dem Verwerfen bestätigen. Unveränderte gespeicherte Antworten gelten nicht als neue Änderung. Bei fremden Antworten bleibt auch die richtige Frage am Entwurf erhalten. |
| Laufende Speicherung      | Ein noch sichtbares „Verwerfen“ kann während des Speicherns schliessen.                               | Schliessen und Verwerfen während tatsächlicher DB-Schreibvorgänge sperren; KI-Anfragen bleiben ausdrücklich abbrechbar.                                                                                             |
| Einstellungen             | Mehrere offene Einstellungsansichten zeigen unterschiedliche Aktivierungen.                           | Erfolgreiche lokale Änderungen und Änderungen anderer Fenster synchronisieren, ohne ungespeicherte Serverangaben zu überschreiben oder Freigaben still zu erteilen.                                                 |

## Ergänzte Foto-Automatik

Neue gewählte Fotos werden nach bestehender Freigabe automatisch ausgefüllt und freigestellt. Die Online-Freistellung wird direkt im Entwurf angewendet; das Original bleibt separat und kann wieder gewählt werden. Endgültiges Speichern bleibt eine eigene Aktion.

Der neue experimentelle Mehrfachscan erkennt höchstens sechs getrennte Stücke mit einer Qwen-Anfrage. Die lokalen Ausschnitte werden nacheinander mit BiRefNet freigestellt. Bei einer fehlgeschlagenen Freistellung stoppen weitere Freistellungsanfragen; alle bereits erkannten Originalausschnitte bleiben nutzbar. Namen/Kategorien sind vor dem gemeinsamen atomaren Speichern änderbar, falsche Treffer abwählbar. Das Gesamtfoto wird nicht zusätzlich archiviert. Kontrollierte Tests prüfen Ablauf und Ausschnitte, beweisen aber keine allgemeine Erkennungsqualität des echten Modells.

## Grenzen, die verbleiben

- Öffentliche kostenlose KI-Dienste können ausfallen, warten lassen oder Quoten erreichen. Keine kostenpflichtigen Ersatzanbieter oder automatischen Anfrage-Schleifen.
- Outfit-Auswahl bleibt eine begrenzte, nachvollziehbare Gewichtung. Ein Foto beweist keine Passform, Stoffqualität, Wärme oder Wasserdichtigkeit. Mehr passende Kleidung und Rückmeldungen sind weiterhin nötig.
- Der Bestand liegt pro Gerät. Ein Projektbackup ersetzt keine persönliche Sicherung; automatischer Geräteabgleich ist nicht enthalten.
- Echtes iPhone/Safari, Kamera/HEIC, Betriebssystem-Icon-Cache und Verhalten unter Speicherdruck benötigen weiterhin einen tatsächlichen Gerätetest.

## Prüfung

Die neuen Fälle liegen in den `*-critic`-Testdateien unter `tests/` und `e2e/`. Mehrere Regressionen wurden gegen den vorherigen Stand tatsächlich zum Scheitern gebracht; reine bestehende Normalabläufe wurden nicht als neu entdeckte Fehler ausgegeben. Kontrollierte KI-Antworten prüfen Ablauf und Vertragsgrenzen, keine behauptete echte Anbieterqualität.

Die endgültigen Testergebnisse und Veröffentlichung stehen im [Prüfprotokoll](REVIEW.md).

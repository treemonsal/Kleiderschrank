# Vergleich mit ähnlichen Open-Source-Apps (24.10.2026)

Acht öffentliche GitHub-Projekte wurden geklont und anhand von README und Kernlogik gelesen. Bewertet wurde aus Sicht einer Person, die die App täglich auf dem iPhone nutzt.

| App                                                            | Bestes Feature                                                                                                                                                      | Schwächstes Feature                                                                         |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| [wardrowbe](https://github.com/Anyesh/wardrowbe)               | Wäsche-Automatik: nach X-mal Tragen (je Kleidungstyp) „muss gewaschen werden“; dazu Analysen (meist/nie getragen, Farben, Balance-Hinweise) und Temperaturempfinden | Braucht Docker, Server und rund 4 GB RAM; für eine Person viel zu schwer einzurichten       |
| [Libre-Closet](https://github.com/lazztech/Libre-Closet)       | Wochenplanung mit Wetter, sehr schnell                                                                                                                              | Keine KI-Vorschläge; Freistellung startet automatisch bei jedem Upload                      |
| [sardrobe](https://github.com/omarkawach/sardrobe)             | Packlisten mit Tagen, Outfits und Abhaken                                                                                                                           | KI nur in Desktop-Browsern mit WebGPU, nicht auf dem Handy                                  |
| [noorghamm/wardrobe](https://github.com/noorghamm/wardrobe)    | Durchdachte Bewertung (Farbe, Formalität, Wärme, Muster) plus Kosten pro Tragen, Garderobenwert und Kapselcheck                                                     | Formalität und Wärme müssen pro Stück per Regler eingegeben werden: hoher Erfassungsaufwand |
| [wardrobe-ai](https://github.com/alexwboles/wardrobe-ai)       | Einfach: Wetter und Anlass rein, Look raus                                                                                                                          | Daten in `localStorage`; Fotos werden stark verkleinert, Speicher ist schnell voll          |
| [wardrobe-pwa](https://github.com/EllieGolightly/wardrobe-pwa) | Kosten pro Tragen mit Verlauf und Ladenhüter-Hinweisen                                                                                                              | Keine Outfit-Vorschläge, nur Erfassung                                                      |
| [ClosetAI](https://github.com/Ryebreadseeds/ClosetAI)          | „Was passt dazu?“ direkt im Stück; abgelehnte Looks kommen nie wieder                                                                                               | Gute Funktionen nur mit eigenem API-Schlüssel; Standardort fest auf eine US-Stadt           |
| [wardrobe-app](https://github.com/cgoncalves94/wardrobe-app)   | Virtuelles Anprobieren                                                                                                                                              | Outfit-Funktionen hinter „Pro“; Mannequin-Stil nach Geschlecht                              |

## Übernommen in MyStyle 0.25.0

| Idee                        | Vorbild                 | Umsetzung                                                                                                                                                                          |
| --------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Automatische Wäsche         | wardrowbe               | Nach „Heute getragen“: Oberteile/Kleider nach 2, Hosen nach 4, Jacken nach 12 Tragetagen seit der letzten Wäsche. Schuhe/Accessoires nie. Abschaltbar.                             |
| Temperaturempfinden         | wardrowbe               | „Ich friere schnell / Normal / Mir ist schnell warm“ verschiebt die Jacken- und Saisongrenzen um −4 bzw. +3 °C                                                                     |
| Preis und Kosten pro Tragen | noorghamm, wardrobe-pwa | Optionales Preisfeld; Detail zeigt CHF pro Tragen                                                                                                                                  |
| Auswertung                  | wardrowbe, noorghamm    | Garderobenwert, Tragetage in 30 Tagen, meistgetragen, bester Preis pro Tragen, Allrounder, Stücke ohne Partner, 90 Tage ungetragen, nie getragen, Farbverteilung, Balance-Hinweise |
| Was passt dazu?             | ClosetAI                | Im Stück-Detail bis zu drei echte Looks mit genau diesem Stück, direkt speicherbar                                                                                                 |
| Packliste                   | sardrobe                | Tage und Anlass wählen; ein Look pro Tag, bevorzugt mit bereits eingepackten Teilen; Liste zum Abhaken                                                                             |

## Aus den Schwächen gelernt

| Schwäche anderswo                             | Stand bei MyStyle                                                                                                              |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Server/Docker nötig                           | Läuft weiterhin direkt im iPhone-Browser                                                                                       |
| Regler pro Stück (Aufwand)                    | Wärme und Wäsche-Rhythmus werden aus Kategorie und Saison abgeleitet, keine neuen Pflichtfelder                                |
| KI nur gegen Bezahlung oder eigenen Schlüssel | Weiterhin kostenlose Community-KI; jetzt mit **einer** Freigabe für Foto-KI, Stylist, Chat und Kaufideen statt drei getrennten |
| KI sieht nur Text                             | Chat sendet jetzt bis zu zwölf Fotos als beschriftete Collage plus Notizen und Tragehäufigkeit                                 |
| Feste Standardstadt                           | Ort wird weiterhin selbst gewählt                                                                                              |
| Abgelehnte Looks kehren zurück                | War schon gelöst: Ablehnungen bleiben gesperrt                                                                                 |

Nicht übernommen: automatische Fotoverarbeitung beim Upload und Mehrfachscan (bewusst auf eigenen Wunsch am 20.10.2026 entfernt), Wardrobe-Sharing und virtuelles Anprobieren (braucht Konten bzw. bezahlte Bild-KI).

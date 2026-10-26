# MyStyle / Garderobenjournal

> Archiv: Seit 0.28.0 sind die Dateien dieses Designs entfernt. Sie liegen im Branch `backup/design-0.27.0`; aktuelles Design in [JOURNAL.md](JOURNAL.md).

Die neue Gestaltung ab 0.15.0 folgt einem gedruckten Garderobenjournal:
Papier, dunkle Schrift, fotografische Flächen, feine Trennlinien und sparsame
rostrote Markierungen. Eine erkennbare typografische Hierarchie ersetzt die
vorherige Glas-/Dashboard-Ästhetik. Der Nutzer hat die früheren gestalterischen
Vorgaben ausdrücklich aufgehoben; dies ist ein bewusst eigenständiges helles
Design, keine zusätzliche Hell-/Dunkelmodus-Verwaltung.

- **Typografie:** lokal verfügbare Iowan/Palatino/Georgia für Titel und Wortmarke,
  System-Sans für Bedienelemente und längere Texte. Keine Font-Downloads.
- **Palette:** Papier `#f4f0e8`, Fotokarton `#e8e2d7`, Tinte `#252822`,
  Rost `#914936`, Aktionen `#292f28`. Gedämpfter Text `#656258` bleibt auch auf
  Fotokarton über 4,5:1. Violett bleibt ausschliesslich eine wählbare Kleidungsfarbe.
- **Navigation:** klare Namen, kleine Kapitelnummern, bewegliche Linie.
  Die Leiste bleibt während Seitenanimationen in derselben Ebene sichtbar.
- **Fotos:** ruhige rechteckige Bühnen; eigene Kategoriezeichnungen dienen nur
  als erkennbare Platzhalter, wenn tatsächlich kein Foto vorhanden ist.
  Vorhandene Originale und Freistellungen werden unverändert dargestellt.
- **Hierarchie:** Datum/Wetter, Tageslook, dann freiwilliger Stilcheck und
  Kollektion. Keine neue Begrüssungs- oder Marketingwand vor dem Outfit.
- **Weitere Ansichten:** flache Kategoriereiter, ruhige Formularflächen,
  typografisch passende Einstellungen und Chat. Keine Sternchen-/Zauberstabmotive.
- **Bewegung:** bestehendes kurzes, funktionales Feedback und Wäscheanimation
  bleiben. Safe Areas, Tastaturfokus und reduzierte Bewegung gelten weiterhin.

`src/styles.css` enthält die gemeinsamen funktionalen Regeln und Farbtokens.
`src/editorial.css` bündelt die neue visuelle Hierarchie und responsive Art Direction.
Es gibt keine neue Datenbank, Freigabe, kostenpflichtige API oder Bibliothek.
Das vorhandene platinfarbene Installationszeichen bleibt als dunkles Monogramm;
Start-/Browserhintergrund und Manifest verwenden jetzt die Papierfarbe.

Die vorherige Gestaltung und die Anleitung zur gezielten Rückkehr liegen unter
[backups/README.md](backups/README.md).

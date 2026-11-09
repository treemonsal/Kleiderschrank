# Such-Server für „Kleidung online suchen“

Ein kleiner Cloudflare Worker (kostenlos). Er hält den SerpApi-Schlüssel geheim, sucht über Google Bilder (Schweiz, Deutsch) und lädt gewählte Produktbilder für die App. Nur MyStyle selbst (https://mystyle.hahntim518.workers.dev) darf ihn aufrufen (`ALLOWED_ORIGINS` in `index.js`). Läuft seit 9. November 2026 als `mystyle-suche.hahntim518.workers.dev`. Suchergebnisse werden einen Tag zwischengespeichert.

## Einrichten (etwa 15 Minuten, keine Kreditkarte)

1. **SerpApi:** Auf https://serpapi.com ein Gratis-Konto anlegen (250 Suchen pro Monat). Unter „Api Key“ den Schlüssel kopieren.
2. **Cloudflare:** Auf https://dash.cloudflare.com ein Gratis-Konto anlegen.
3. **Worker anlegen:** „Workers & Pages“ → „Create“ → „Create Worker“ → Name `mystyle-suche` → „Deploy“.
4. **Code einfügen:** „Edit code“ → den ganzen Inhalt von `index.js` einfügen → „Deploy“.
5. **Schlüssel hinterlegen:** Im Worker unter „Settings“ → „Variables and Secrets“ → „Add“ → Typ „Secret“, Name `SERPAPI_KEY`, Wert = SerpApi-Schlüssel → speichern.
6. **Adresse weitergeben:** Die Adresse des Workers (z. B. `https://mystyle-suche.<name>.workers.dev`) an Claude geben. Sie ist nicht geheim und kommt als `PUBLIC_SEARCH_URL` in `src/product-search.ts` (oder als Repo-Variable `SEARCH_URL`).

Ohne Adresse bleibt die Suche in der App unsichtbar.

## Grenzen

- 250 Suchen pro Monat. Ist das Kontingent aufgebraucht, sagt die App es; Fotos von Hand gehen weiter.
- Die Herkunftsprüfung hält Browser anderer Seiten fern, schützt aber nicht vor gezieltem Missbrauch mit Skripten. Im schlimmsten Fall ist das Gratis-Kontingent früher aufgebraucht; Kosten entstehen nie, weil kein Zahlungsmittel hinterlegt ist.
- Manche Shops sperren das Laden ihrer Bilder; dann nimmt die App das Vorschaubild oder meldet es.

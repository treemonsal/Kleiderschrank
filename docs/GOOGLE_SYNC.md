# Google-Anmeldung einrichten (einmalig, kostenlos)

„Mit Google anmelden“ erscheint in den Einstellungen erst, wenn die App eine **Client-ID** von Google hat. Das ist eine öffentliche Kennung der App, kein Passwort. Jede Person meldet sich danach mit ihrem eigenen Google-Konto an; ihr Kleiderschrank liegt in ihrem eigenen Google Drive.

Dauer: etwa 10 Minuten. Kosten: keine (keine Kreditkarte nötig).

## 1. Projekt anlegen

1. <https://console.cloud.google.com> öffnen und mit deinem Google-Konto anmelden.
2. Oben auf die Projektauswahl → **Neues Projekt** → Name `MyStyle` → **Erstellen**.

## 2. Google Drive API einschalten

1. Menü → **APIs und Dienste** → **Bibliothek**.
2. Nach **Google Drive API** suchen → **Aktivieren**.

## 3. Anmeldeseite (OAuth-Zustimmung)

1. Menü → **Google Auth Platform** (früher „OAuth-Zustimmungsbildschirm“) → **Jetzt starten**.
2. App-Name `MyStyle`, Support-E-Mail: deine Adresse.
3. Zielgruppe: **Extern**. Kontaktdaten: deine Adresse. Bedingungen akzeptieren → **Erstellen**.
4. **Datenzugriff** → **Bereiche hinzufügen**: `.../auth/drive.appdata`, `openid`, `.../auth/userinfo.email` → **Speichern**.
5. **Zielgruppe** → **App veröffentlichen**, damit sich auch deine Kollegen anmelden können.
   Falls Google stattdessen eine Prüfung verlangt: im Testmodus bleiben und unter **Testnutzer** die Gmail-Adressen deiner Kollegen eintragen (bis 100 Personen).

## 4. Client-ID erstellen

1. **Clients** → **Client erstellen** → Typ **Webanwendung**, Name `MyStyle`.
2. **Autorisierte JavaScript-Quellen**: `https://treemonsal.github.io`
3. **Autorisierte Weiterleitungs-URIs**: `https://treemonsal.github.io/Kleiderschrank/` (mit Schrägstrich am Ende)
4. **Erstellen** und die **Client-ID** kopieren (endet auf `.apps.googleusercontent.com`). Das Client-Secret wird nicht gebraucht.

## 5. In die App bringen

Entweder die Client-ID an Claude schicken, oder selbst eintragen:
GitHub → Repository `Kleiderschrank` → **Settings** → **Secrets and variables** → **Actions** → Reiter **Variables** → **New repository variable**, Name `GOOGLE_CLIENT_ID`, Wert = Client-ID. Danach die App neu veröffentlichen (Actions → „MyStyle auf GitHub Pages“ → Run workflow).

## Was die App damit darf

- Nur den versteckten App-Ordner in Google Drive (`drive.appdata`): Er ist im normalen Drive nicht sichtbar, MyStyle sieht keine anderen Dateien.
- Name und E-Mail des Kontos, um „Angemeldet als …“ anzuzeigen.
- Die Anmeldung gilt eine Stunde. Beim nächsten App-Start erneuert sie sich mit einer kurzen Weiterleitung zu Google.
- Abmelden behält alles auf dem Gerät und im Drive. Den App-Ordner löscht man in Google Drive unter **Einstellungen → Apps verwalten → MyStyle → Ausgeblendete App-Daten löschen**.

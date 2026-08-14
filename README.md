# Tagebuch → GitHub Deploy

## Setup (One-Time)

### Windows:
1. `tagebuch-app.zip` entpacken (Rechtsklick → Extract)
2. `create-shortcut.bat` doppelklicken
3. Auf dem Desktop sollte jetzt `Tagebuch Deploy.lnk` liegen
4. Von jetzt an: Einfach die .lnk doppelklicken, Fragen beantworten, fertig

### macOS:
1. `tagebuch-app.zip` entpacken (Doppelklick)
2. Terminal öffnen, in den entpackten Ordner gehen:
   ```
   cd path/to/tagebuch-app
   chmod +x create-shortcut.sh
   ./create-shortcut.sh
   ```
3. Auf dem Desktop sollte jetzt `Tagebuch Deploy.app` liegen
4. Von jetzt an: Einfach doppelklicken

### Linux:
1. `tagebuch-app.zip` entpacken
2. Terminal:
   ```
   cd path/to/tagebuch-app
   chmod +x create-shortcut.sh
   ./create-shortcut.sh
   ```
3. Desktop-Verknüpfung wird erstellt

## Beim Deployen braucht ihr:

- **GitHub-Nutzername** (dein Benutzername auf github.com)
- **GitHub Token** (erstellen unter github.com/settings/tokens)
  - Neuer "Classic token"
  - Haken bei "repo" setzen
  - Token kopieren
- **Email** (beliebig, die du bei Git brauchst)

## Nach dem Deploy (One-Time):

1. github.com → dein Repo "tagebuch"
2. Settings → Pages
3. Branch: `main`, Folder: `/` → Save
4. Warten bis "✅ Your site is published" (paar Sekunden)
5. Link: `https://dein-username.github.io/tagebuch`

## Auf dem Handy:

**iPhone:**
- Link öffnen → Teilen-Button → "Zum Home-Bildschirm"

**Android:**
- Link öffnen → Menü (⋮) → "App installieren"

Fertig. Läuft offline, Daten bleiben privat.

---

**Wenn's hakt:**
- Python installiert? (python3 --version im Terminal)
- Git installiert? (git --version)
- GitHub Token korrekt eingegeben?
- Ordner mit der App ist der aktive Ordner beim Deploy?

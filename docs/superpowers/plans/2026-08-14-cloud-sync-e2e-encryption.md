# Cloud-Sync mit Ende-zu-Ende-Verschlüsselung Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tagebuch-Einträge zwischen mehreren Geräten synchronisieren, ohne dass der Backend-Anbieter (Firebase) sie im Klartext lesen kann.

**Architecture:** Firebase Auth (E-Mail/Passwort) für Login, Firestore als verschlüsselter Datenspeicher. Ein aus dem Passwort abgeleiteter AES-Schlüssel (PBKDF2) ver-/entschlüsselt jeden Eintrag ausschließlich im Browser; Firestore sieht nur Chiffretext. Firestores eingebaute Offline-Persistenz übernimmt die Synchronisation bei fehlendem Netz.

**Tech Stack:** Vanilla JS (ES-Module, kein Build-Schritt), Web Crypto API, Firebase JS SDK v10.7.1 (CDN, modular), Node.js `node:test` für Unit-Tests von `crypto.js`.

**Spec:** `docs/superpowers/specs/2026-08-14-cloud-sync-e2e-encryption-design.md`

## Global Constraints

- Dateien unter 500 Zeilen halten (Projektregel aus `CLAUDE.md`)
- Kein Build-Prozess / keine npm-Abhängigkeiten — Firebase SDK per CDN-`<script type="module">`-Import
- Firestore-Feldnamen exakt wie in der Spec: `encryptionSalt`, `ciphertext`, `iv`, `updatedAt`
- Firebase SDK Version exakt `10.7.1` in allen Imports (Konsistenz zwischen Dateien)
- Passwort-Wiederherstellung ist explizit Out of Scope — nicht implementieren

---

## Vorbereitung: Node-Testlauf ohne package.json

Dieses Projekt hat kein `package.json` und soll auch keins bekommen (kein Build-Schritt). Tests für `crypto.js` laufen direkt mit Node's eingebautem Test-Runner:

```bash
node --test tests/crypto.test.mjs
```

Node 24 (installiert, siehe `node --version`) unterstützt `node:test` und globales `crypto.subtle`/`crypto.getRandomValues` ohne weitere Abhängigkeiten.

---

### Task 1: Firebase-Projekt anlegen und konfigurieren (manuell)

**Files:**
- Create: `firebase-config.js`
- Create: `firestore.rules` (Referenzkopie im Repo, wird per Copy-Paste in der Firebase-Konsole eingetragen)

**Interfaces:**
- Produces: `FIREBASE_CONFIG` (exportiertes Objekt aus `firebase-config.js`), das Task 3 (`auth.js`) importiert

Dieser Task erfordert einen interaktiven Browser-Login mit einem Google-Konto und kann nicht automatisiert werden. Führe die Schritte selbst aus:

- [ ] **Schritt 1: Firebase-Projekt erstellen**
  1. Öffne https://console.firebase.google.com im Browser
  2. Mit dem Google-Konto einloggen, das du für dieses Projekt nutzen willst
  3. "Projekt hinzufügen" → Name eingeben, z.B. `tagebuch-app` → Google Analytics kann deaktiviert werden (nicht benötigt) → Projekt erstellen

- [ ] **Schritt 2: Web-App im Projekt registrieren**
  1. Auf der Projekt-Übersichtsseite auf das Web-Symbol (`</>`) klicken, um eine neue Web-App hinzuzufügen
  2. App-Spitzname eingeben, z.B. `tagebuch-web` → "App registrieren"
  3. Firebase zeigt jetzt einen Code-Block mit `const firebaseConfig = { apiKey: "...", authDomain: "...", projectId: "...", storageBucket: "...", messagingSenderId: "...", appId: "..." }` — diese Werte im nächsten Schritt übernehmen

- [ ] **Schritt 3: `firebase-config.js` mit den echten Werten anlegen**

```javascript
export const FIREBASE_CONFIG = {
  apiKey: "HIER_DEN_ECHTEN_WERT_AUS_DER_FIREBASE_KONSOLE_EINTRAGEN",
  authDomain: "HIER_DEN_ECHTEN_WERT_EINTRAGEN",
  projectId: "HIER_DEN_ECHTEN_WERT_EINTRAGEN",
  storageBucket: "HIER_DEN_ECHTEN_WERT_EINTRAGEN",
  messagingSenderId: "HIER_DEN_ECHTEN_WERT_EINTRAGEN",
  appId: "HIER_DEN_ECHTEN_WERT_EINTRAGEN"
};
```

Trage exakt die Werte aus Schritt 2 ein (Datei liegt im Repo-Root, neben `index.html`). Diese Werte sind nicht geheim — der Schutz kommt über die Firestore Security Rules aus Schritt 5, nicht über Geheimhaltung dieser Datei.

- [ ] **Schritt 4: Authentication aktivieren**
  1. In der Firebase-Konsole links: "Authentication" → "Los geht's" (Get started)
  2. Tab "Sign-in method" → "E-Mail/Passwort" auswählen → aktivieren → Speichern

- [ ] **Schritt 5: Firestore-Datenbank anlegen**
  1. Links: "Firestore Database" → "Datenbank erstellen"
  2. Standort auswählen (z.B. `eur3 (europe-west)`) → "Production mode" auswählen → Erstellen

- [ ] **Schritt 6: `firestore.rules` anlegen und in die Konsole übernehmen**

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;

      match /entries/{entryId} {
        allow read, write: if request.auth != null && request.auth.uid == uid;
      }
    }
  }
}
```

Diesen Inhalt sowohl in `firestore.rules` im Repo speichern als auch: Firestore Database → Tab "Regeln" → vorhandenen Text ersetzen → "Veröffentlichen"

- [ ] **Schritt 7: Verifizieren**

In der Firebase-Konsole prüfen:
- Authentication → Sign-in method → E-Mail/Passwort steht auf "Aktiviert"
- Firestore Database → Daten-Tab ist erreichbar (noch leer, das ist korrekt)
- Firestore Database → Regeln-Tab zeigt den Inhalt aus Schritt 6

- [ ] **Schritt 8: Commit**

```bash
git add firebase-config.js firestore.rules
git commit -m "Add Firebase project configuration and security rules"
```

---

### Task 2: `crypto.js` — Schlüsselableitung und Verschlüsselung (TDD)

**Files:**
- Create: `crypto.js`
- Test: `tests/crypto.test.mjs`

**Interfaces:**
- Produces (für Task 3 `auth.js` und Task 4 `sync.js`):
  - `generateSalt(): Promise<string>` — Base64-kodierter zufälliger Salt
  - `deriveKey(password: string, saltBase64: string): Promise<CryptoKey>`
  - `encryptEntry(entry: object, key: CryptoKey): Promise<{ciphertext: string, iv: string}>`
  - `decryptEntry(ciphertextBase64: string, ivBase64: string, key: CryptoKey): Promise<object>`

- [ ] **Step 1: Write the failing tests**

Create `tests/crypto.test.mjs`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateSalt, deriveKey, encryptEntry, decryptEntry } from '../crypto.js';

test('generateSalt returns a non-empty base64 string', async () => {
  const salt = await generateSalt();
  assert.equal(typeof salt, 'string');
  assert.ok(salt.length > 0);
});

test('encryptEntry/decryptEntry round-trip preserves the entry', async () => {
  const salt = await generateSalt();
  const key = await deriveKey('correct-horse-battery-staple', salt);
  const entry = { id: 'abc', time: '2026-08-14T10:00:00.000Z', name: 'Kaffee', amount: 1, unit: 'Tasse', category: 'Getränk', note: 'stark' };
  const { ciphertext, iv } = await encryptEntry(entry, key);
  const decrypted = await decryptEntry(ciphertext, iv, key);
  assert.deepEqual(decrypted, entry);
});

test('same password and salt derive a key that decrypts data encrypted by an independently derived instance', async () => {
  const salt = await generateSalt();
  const key1 = await deriveKey('hunter2', salt);
  const key2 = await deriveKey('hunter2', salt);
  const entry = { name: 'Test' };
  const encrypted = await encryptEntry(entry, key1);
  const decrypted = await decryptEntry(encrypted.ciphertext, encrypted.iv, key2);
  assert.deepEqual(decrypted, entry);
});

test('decryptEntry rejects when the key is derived from a different password', async () => {
  const salt = await generateSalt();
  const key1 = await deriveKey('password-a', salt);
  const key2 = await deriveKey('password-b', salt);
  const entry = { name: 'Geheim' };
  const { ciphertext, iv } = await encryptEntry(entry, key1);
  await assert.rejects(() => decryptEntry(ciphertext, iv, key2));
});

test('encrypting the same entry twice produces different ciphertext (random IV)', async () => {
  const salt = await generateSalt();
  const key = await deriveKey('alpha', salt);
  const entry = { name: 'X' };
  const first = await encryptEntry(entry, key);
  const second = await encryptEntry(entry, key);
  assert.notEqual(first.ciphertext, second.ciphertext);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/crypto.test.mjs`
Expected: FAIL — `Cannot find module '../crypto.js'`

- [ ] **Step 3: Write the implementation**

Create `crypto.js`:

```javascript
function toBase64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function fromBase64(b64) {
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}

export async function generateSalt() {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return toBase64(salt);
}

export async function deriveKey(password, saltBase64) {
  const enc = new TextEncoder();
  const salt = fromBase64(saltBase64);
  const baseKey = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptEntry(entry, key) {
  const enc = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = enc.encode(JSON.stringify(entry));
  const ciphertextBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
  return { ciphertext: toBase64(ciphertextBuf), iv: toBase64(iv) };
}

export async function decryptEntry(ciphertextBase64, ivBase64, key) {
  const dec = new TextDecoder();
  const ciphertext = fromBase64(ciphertextBase64);
  const iv = fromBase64(ivBase64);
  const plaintextBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return JSON.parse(dec.decode(plaintextBuf));
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tests/crypto.test.mjs`
Expected: PASS — 5 tests, 0 failures

- [ ] **Step 5: Commit**

```bash
git add crypto.js tests/crypto.test.mjs
git commit -m "Add crypto.js: PBKDF2 key derivation and AES-GCM entry encryption"
```

---

### Task 3: `auth.js` — Firebase Auth + Schlüsselverwaltung

**Files:**
- Create: `auth.js`

**Interfaces:**
- Consumes: `generateSalt`, `deriveKey` from `crypto.js` (Task 2)
- Produces (für Task 4 `sync.js` und Task 5 `index.html`):
  - `app` (Firebase App-Instanz), `db` (Firestore-Instanz) — exportierte Konstanten
  - `registerUser(email: string, password: string): Promise<{uid: string, encryptionKey: CryptoKey}>`
  - `loginUser(email: string, password: string): Promise<{uid: string, encryptionKey: CryptoKey}>`
  - `unlockWithPassword(password: string): Promise<{uid: string, encryptionKey: CryptoKey}>` — für den Fall, dass Firebase die Sitzung nach einem Seiten-Reload automatisch wiederherstellt (der Nutzer bleibt eingeloggt), der Verschlüsselungs-Schlüssel aber nur im Speicher lag und weg ist. Fragt das Passwort erneut ab, ohne einen neuen Login-Vorgang auszulösen.
  - `logoutUser(): Promise<void>`
  - `onAuthChange(callback: (user: {uid: string, email: string} | null) => void): void`
  - `getEncryptionKey(): CryptoKey | null`

- [ ] **Step 1: Implementierung schreiben**

Create `auth.js`:

```javascript
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getFirestore, doc, setDoc, getDoc, enableIndexedDbPersistence
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { FIREBASE_CONFIG } from './firebase-config.js';
import { generateSalt, deriveKey } from './crypto.js';

export const app = initializeApp(FIREBASE_CONFIG);
export const db = getFirestore(app);
const auth = getAuth(app);

enableIndexedDbPersistence(db).catch((err) => {
  console.warn('Offline-Persistenz konnte nicht aktiviert werden:', err.code);
});

let currentKey = null;

async function deriveKeyForCurrentUser(password) {
  const user = auth.currentUser;
  const snap = await getDoc(doc(db, 'users', user.uid));
  const salt = snap.data().encryptionSalt;
  currentKey = await deriveKey(password, salt);
  return currentKey;
}

export async function registerUser(email, password) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const salt = await generateSalt();
  await setDoc(doc(db, 'users', cred.user.uid), { encryptionSalt: salt });
  currentKey = await deriveKey(password, salt);
  return { uid: cred.user.uid, encryptionKey: currentKey };
}

export async function loginUser(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  await deriveKeyForCurrentUser(password);
  return { uid: cred.user.uid, encryptionKey: currentKey };
}

export async function unlockWithPassword(password) {
  if (!auth.currentUser) throw new Error('Nicht eingeloggt');
  await deriveKeyForCurrentUser(password);
  return { uid: auth.currentUser.uid, encryptionKey: currentKey };
}

export function logoutUser() {
  currentKey = null;
  return signOut(auth);
}

export function onAuthChange(callback) {
  onAuthStateChanged(auth, (user) => {
    callback(user ? { uid: user.uid, email: user.email } : null);
  });
}

export function getEncryptionKey() {
  return currentKey;
}
```

- [ ] **Step 2: Manuell testen**

Da dieser Code eine echte Firebase-Verbindung braucht, gibt es keinen automatisierten Test (kein Emulator im Projekt-Scope). Stattdessen manuell verifizieren:

1. `index.html` lokal öffnen (z.B. mit `python -m http.server` im Repo-Root und im Browser `http://localhost:8000` aufrufen — `type="module"`-Skripte funktionieren nicht über `file://`)
2. In der Browser-Konsole ausführen:
   ```javascript
   import('./auth.js').then(async (auth) => {
     const result = await auth.registerUser('test@example.com', 'testpasswort123');
     console.log('Registriert:', result.uid, result.encryptionKey);
   });
   ```
3. In der Firebase-Konsole → Authentication prüfen: neuer Nutzer `test@example.com` erscheint
4. In der Firebase-Konsole → Firestore prüfen: Dokument `users/{uid}` mit Feld `encryptionSalt` existiert
5. Konsolen-Ausgabe zeigt eine `uid` und ein `CryptoKey`-Objekt ohne Fehler

Erwartet: Alle vier Punkte treffen zu.

- [ ] **Step 3: Commit**

```bash
git add auth.js
git commit -m "Add auth.js: Firebase Auth wrapper with local key derivation"
```

---

### Task 4: `sync.js` — Firestore-Synchronisation

**Files:**
- Create: `sync.js`

**Interfaces:**
- Consumes: `db` from `auth.js` (Task 3), `encryptEntry`, `decryptEntry` from `crypto.js` (Task 2)
- Produces (für Task 5 `index.html`):
  - `initSync(uid: string, encryptionKey: CryptoKey): void`
  - `pushEntry(entry: object): Promise<void>` — `entry` muss ein `id`-Feld haben
  - `deleteEntry(entryId: string): Promise<void>`
  - `pullAllEntries(): Promise<object[]>`
  - `migrateLocalEntries(localEntries: object[]): Promise<number>` — gibt Anzahl hochgeladener Einträge zurück

- [ ] **Step 1: Implementierung schreiben**

Create `sync.js`:

```javascript
import { db } from './auth.js';
import {
  collection, doc, setDoc, deleteDoc, getDocs, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { encryptEntry, decryptEntry } from './crypto.js';

let currentUid = null;
let currentKey = null;

export function initSync(uid, encryptionKey) {
  currentUid = uid;
  currentKey = encryptionKey;
}

export async function pushEntry(entry) {
  if (!currentUid || !currentKey) return;
  const { ciphertext, iv } = await encryptEntry(entry, currentKey);
  await setDoc(doc(db, 'users', currentUid, 'entries', entry.id), {
    ciphertext, iv, updatedAt: serverTimestamp()
  });
}

export async function deleteEntry(entryId) {
  if (!currentUid) return;
  await deleteDoc(doc(db, 'users', currentUid, 'entries', entryId));
}

export async function pullAllEntries() {
  if (!currentUid || !currentKey) return [];
  const snap = await getDocs(collection(db, 'users', currentUid, 'entries'));
  const result = [];
  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    try {
      const entry = await decryptEntry(data.ciphertext, data.iv, currentKey);
      result.push(entry);
    } catch (err) {
      console.warn('Eintrag konnte nicht entschlüsselt werden, übersprungen:', docSnap.id, err);
    }
  }
  return result;
}

export async function migrateLocalEntries(localEntries) {
  let count = 0;
  for (const entry of localEntries) {
    await pushEntry(entry);
    count++;
  }
  return count;
}
```

- [ ] **Step 2: Manuell testen**

Weiterhin im Browser (via `http://localhost:8000`, siehe Task 3):

```javascript
import('./auth.js').then(async (auth) => {
  const { uid, encryptionKey } = await auth.loginUser('test@example.com', 'testpasswort123');
  const sync = await import('./sync.js');
  sync.initSync(uid, encryptionKey);
  await sync.pushEntry({ id: 'test-1', time: new Date().toISOString(), name: 'Testeintrag', amount: null, unit: '', category: 'Sonstiges', note: '' });
  const all = await sync.pullAllEntries();
  console.log('Pulled entries:', all);
});
```

Erwartet:
1. In der Firebase-Konsole → Firestore → `users/{uid}/entries/test-1`: Dokument mit Feldern `ciphertext`, `iv`, `updatedAt` — **kein** Klartextfeld wie `name` sichtbar
2. `pullAllEntries()` liefert ein Array mit dem entschlüsselten Objekt `{ id: 'test-1', name: 'Testeintrag', ... }`

- [ ] **Step 3: Commit**

```bash
git add sync.js
git commit -m "Add sync.js: encrypted Firestore read/write/delete and migration"
```

---

### Task 5: `index.html` — UI und Wiring

**Files:**
- Modify: `index.html:158` (Header-Buttons)
- Modify: `index.html:218-231` (nach dem `menuSheet`-Block: neuer `accountSheet`)
- Modify: `index.html:233` (`<script>` → `<script type="module">` + Imports)
- Modify: `index.html:338-340` (Sheet-Referenzen um `accountSheet` erweitern)
- Modify: `index.html:346-349` (`closeSheets()` um `accountSheet` erweitern)
- Modify: `index.html:383-405` (`saveBtn`-Handler: zusätzlich `pushEntry` aufrufen)
- Modify: `index.html:407-416` (`deleteBtn`-Handler: zusätzlich `deleteEntry` aufrufen)
- Modify: `index.html:420-421` (neue Event-Listener für Konto-Buttons ergänzen)

**Interfaces:**
- Consumes: `registerUser`, `loginUser`, `unlockWithPassword`, `logoutUser`, `onAuthChange`, `getEncryptionKey` from `auth.js` (Task 3); `initSync`, `pushEntry`, `deleteEntry`, `pullAllEntries`, `migrateLocalEntries` from `sync.js` (Task 4)

- [ ] **Step 1: Header-Button ergänzen**

In `index.html:158`, direkt nach dem `menuBtn`-Button einfügen:

```html
      <button class="icon-btn" id="menuBtn" title="Export / Import">⋯</button>
      <button class="icon-btn" id="accountBtn" title="Konto / Cloud-Sync">☁</button>
```

- [ ] **Step 2: Konto-Sheet ergänzen**

Nach dem `</div>` von `menuSheet` (`index.html:231`), vor dem `<script>`-Tag (`index.html:233`), einfügen:

```html
<div class="sheet menu-sheet" id="accountSheet">
  <div class="sheet-handle"></div>
  <h2>Konto</h2>

  <div id="authLoggedOut">
    <div class="field">
      <label>E-Mail</label>
      <input type="email" id="acc_email" placeholder="du@example.com">
    </div>
    <div class="field">
      <label>Passwort</label>
      <input type="password" id="acc_password" placeholder="Mindestens 6 Zeichen">
    </div>
    <div class="sheet-actions">
      <button class="btn btn-ghost" id="acc_registerBtn">Registrieren</button>
      <button class="btn btn-primary" id="acc_loginBtn">Login</button>
    </div>
    <div class="hint" id="acc_error" style="color:#c2685a;"></div>
  </div>

  <div id="authUnlock" style="display:none;">
    <div class="hint">Angemeldet als <span id="acc_unlockEmail"></span>. Bitte Passwort erneut eingeben, um Einträge zu entschlüsseln.</div>
    <div class="field">
      <label>Passwort</label>
      <input type="password" id="acc_unlockPassword">
    </div>
    <div class="sheet-actions">
      <button class="btn btn-primary" id="acc_unlockBtn">Entsperren</button>
    </div>
    <div class="hint" id="acc_unlockError" style="color:#c2685a;"></div>
  </div>

  <div id="authLoggedIn" style="display:none;">
    <div class="hint">Angemeldet als <span id="acc_currentEmail"></span>. Deine Einträge werden verschlüsselt synchronisiert.</div>
    <button class="menu-btn" id="acc_logoutBtn">Abmelden</button>
  </div>
</div>
```

- [ ] **Step 3: Script-Tag zu ES-Modul machen und Imports ergänzen**

In `index.html:233`, `<script>` ersetzen durch:

```html
<script type="module">
import { registerUser, loginUser, unlockWithPassword, logoutUser, onAuthChange, getEncryptionKey } from './auth.js';
import { initSync, pushEntry, deleteEntry, pullAllEntries, migrateLocalEntries } from './sync.js';
```

(Die schließende `</script>`-Tag am Dateiende bleibt unverändert; die umschließende `(function(){ ... })()`-IIFE bleibt ebenfalls bestehen — `type="module"` erlaubt `import`-Statements vor der IIFE im selben Skriptblock.)

- [ ] **Step 4: Sheet-Referenzen und `closeSheets()` erweitern**

In `index.html:338-340` ergänzen:

```javascript
  const overlay = document.getElementById('overlay');
  const formSheet = document.getElementById('formSheet');
  const menuSheet = document.getElementById('menuSheet');
  const accountSheet = document.getElementById('accountSheet');
```

In `index.html:346-349` (`closeSheets`) ergänzen:

```javascript
  function closeSheets(){
    overlay.classList.remove('open');
    formSheet.classList.remove('open');
    menuSheet.classList.remove('open');
    accountSheet.classList.remove('open');
  }
```

- [ ] **Step 5: Konto-Logik ergänzen**

Nach dem bestehenden Block `document.getElementById('menuBtn').addEventListener(...)` (`index.html:421`) einfügen:

```javascript
  // ---------- Konto / Cloud-Sync ----------
  const MIGRATION_FLAG = 'tagebuch_migrated_v1';
  let localEntriesBeforeSync = null;

  document.getElementById('accountBtn').addEventListener('click', ()=> openOverlay(accountSheet));

  function showAuthPanel(panel){
    document.getElementById('authLoggedOut').style.display = panel==='loggedOut' ? '' : 'none';
    document.getElementById('authUnlock').style.display = panel==='unlock' ? '' : 'none';
    document.getElementById('authLoggedIn').style.display = panel==='loggedIn' ? '' : 'none';
  }

  async function afterUnlock(uid, email){
    initSync(uid, getEncryptionKey());
    if (!localStorage.getItem(MIGRATION_FLAG) && entries.length > 0) {
      await migrateLocalEntries(entries);
      localStorage.setItem(MIGRATION_FLAG, '1');
    }
    const remoteEntries = await pullAllEntries();
    const byId = new Map(entries.map(e => [e.id, e]));
    remoteEntries.forEach(e => byId.set(e.id, e));
    entries = Array.from(byId.values());
    persist();
    renderChips();
    renderList();
    document.getElementById('acc_currentEmail').textContent = email;
    showAuthPanel('loggedIn');
  }

  onAuthChange(async (user) => {
    if (user && getEncryptionKey()) {
      await afterUnlock(user.uid, user.email);
    } else if (user) {
      document.getElementById('acc_unlockEmail').textContent = user.email;
      showAuthPanel('unlock');
    } else {
      showAuthPanel('loggedOut');
    }
  });

  document.getElementById('acc_registerBtn').addEventListener('click', async ()=>{
    const email = document.getElementById('acc_email').value.trim();
    const password = document.getElementById('acc_password').value;
    document.getElementById('acc_error').textContent = '';
    try{
      const { uid } = await registerUser(email, password);
      await afterUnlock(uid, email);
    }catch(err){
      document.getElementById('acc_error').textContent = 'Registrierung fehlgeschlagen: ' + err.message;
    }
  });

  document.getElementById('acc_loginBtn').addEventListener('click', async ()=>{
    const email = document.getElementById('acc_email').value.trim();
    const password = document.getElementById('acc_password').value;
    document.getElementById('acc_error').textContent = '';
    try{
      const { uid } = await loginUser(email, password);
      await afterUnlock(uid, email);
    }catch(err){
      document.getElementById('acc_error').textContent = 'Login fehlgeschlagen: ' + err.message;
    }
  });

  document.getElementById('acc_unlockBtn').addEventListener('click', async ()=>{
    const password = document.getElementById('acc_unlockPassword').value;
    document.getElementById('acc_unlockError').textContent = '';
    try{
      const { uid } = await unlockWithPassword(password);
      const email = document.getElementById('acc_unlockEmail').textContent;
      await afterUnlock(uid, email);
    }catch(err){
      document.getElementById('acc_unlockError').textContent = 'Falsches Passwort.';
    }
  });

  document.getElementById('acc_logoutBtn').addEventListener('click', async ()=>{
    await logoutUser();
    showAuthPanel('loggedOut');
    closeSheets();
  });
```

- [ ] **Step 6: `saveBtn`-Handler um Cloud-Push erweitern**

In `index.html`, im bestehenden `saveBtn`-Click-Handler (`index.html:383-405`), nach der Zeile `persist();` ergänzen:

```javascript
    persist();
    if (getEncryptionKey()) pushEntry(data);
    closeSheets();
```

(ersetzt die bisherige Zeilenfolge `persist(); closeSheets();`)

- [ ] **Step 7: `deleteBtn`-Handler um Cloud-Löschung erweitern**

In `index.html`, im bestehenden `deleteBtn`-Click-Handler (`index.html:407-416`), nach `entries = entries.filter(e=>e.id!==editingId);` ergänzen:

```javascript
      entries = entries.filter(e=>e.id!==editingId);
      if (getEncryptionKey()) deleteEntry(editingId);
      persist();
```

- [ ] **Step 8: Manuell end-to-end testen**

1. Lokalen Server starten: `python -m http.server` im Repo-Root, Browser öffnet `http://localhost:8000`
2. ☁-Button klicken → mit Test-Konto aus Task 3 einloggen (oder neu registrieren)
3. Neuen Eintrag anlegen → in Firebase-Konsole → Firestore prüfen: verschlüsselter Eintrag erscheint unter `users/{uid}/entries/`
4. Browser-Tab schließen, neu öffnen, `http://localhost:8000` erneut aufrufen → Konto-Sheet sollte "Entsperren"-Ansicht zeigen (Firebase-Sitzung wiederhergestellt, Schlüssel fehlt) → Passwort eingeben → Eintrag aus Schritt 3 erscheint korrekt entschlüsselt in der Liste
5. In einem zweiten Browser (oder Inkognito-Fenster) mit demselben Konto einloggen → derselbe Eintrag erscheint dort ebenfalls
6. Eintrag löschen → in Firebase-Konsole prüfen: Dokument ist aus `entries` verschwunden
7. Flugmodus/Offline simulieren (DevTools → Network → Offline) → Eintrag anlegen → lokal sofort sichtbar → wieder online schalten → in Firebase-Konsole erscheint der Eintrag automatisch (Firestore-Offline-Queue)

Erwartet: Alle sieben Punkte funktionieren wie beschrieben.

- [ ] **Step 9: Commit**

```bash
git add index.html
git commit -m "Wire cloud sync into index.html: account UI, login/register/unlock, entry push/delete"
```

---

### Task 6: Deployen und auf dem Handy verifizieren

**Files:** keine Code-Änderungen — nur Push und manuelle Verifikation

- [ ] **Step 1: Push nach GitHub**

```bash
git push origin main
```

- [ ] **Step 2: Warten, bis GitHub Pages neu gebaut hat**

```bash
gh api repos/Solvaray/Tagebuch/pages/builds/latest --jq '.status'
```

Wiederholen, bis der Wert `built` ist (analog zum bisherigen Vorgehen bei der Ersteinrichtung).

- [ ] **Step 3: Auf dem Handy testen**

1. `https://solvaray.github.io/Tagebuch/` auf dem Handy öffnen (falls die App bereits als Home-Bildschirm-Icon installiert ist: Icon einmal löschen und über den Link neu installieren, damit der Service Worker die neuen Dateien lädt)
2. ☁-Button → mit dem Test-Konto einloggen
3. Eintrag anlegen → App auf einem zweiten Gerät (oder PC-Browser) mit demselben Konto öffnen → Eintrag erscheint dort ebenfalls

Erwartet: Cloud-Sync funktioniert identisch zum lokalen Test aus Task 5, Step 8.

- [ ] **Step 4: Test-Konto aufräumen (optional)**

Falls `test@example.com` aus Task 3 nur zum Testen diente: Firebase-Konsole → Authentication → Nutzer löschen, sowie zugehöriges Firestore-Dokument `users/{uid}` inkl. `entries`-Subcollection löschen.

---

## Self-Review-Notizen

- **Spec-Abdeckung:** Auth (Task 3), Verschlüsselung (Task 2), Datenmodell/Security-Rules (Task 1), Datenfluss inkl. Migration (Task 5), Fehlerfälle falsches Passwort/Offline/korrupter Eintrag (Tasks 3, 4, 5 Steps), Testplan aus der Spec ist 1:1 in Task 5/6 übernommen.
- **Ergänzung gegenüber der Spec:** Die Spec beschreibt Login nur für den Fall der expliziten Passworteingabe. Ein Seiten-Reload stellt die Firebase-Sitzung automatisch wieder her, aber der nur im Speicher gehaltene Verschlüsselungs-Schlüssel geht dabei verloren — deshalb wurde `unlockWithPassword` (Task 3) und der "Entsperren"-Zustand im Konto-Sheet (Task 5) ergänzt. Kein Widerspruch zur Spec, sondern eine notwendige Detaillierung des dort beschriebenen Datenflusses.
- **Typkonsistenz geprüft:** Funktionsnamen/Signaturen aus den "Produces"-Abschnitten (Task 2 → 3 → 4 → 5) sind in den jeweiligen Implementierungs-Codeblöcken identisch verwendet.

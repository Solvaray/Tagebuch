/* Tagebuch – Cloud-Sync mit Ende-zu-Ende-Verschlüsselung.

   Firebase Auth regelt nur, WER du bist. Was du eingetragen hast, sieht
   Firebase nie: verschlüsselt wird ausschliesslich hier im Browser, mit
   demselben Code wie die App-Sperre und einem Salt, das im eigenen
   Nutzer-Dokument liegt, damit jedes Gerät denselben Schlüssel ableitet.
   In Firestore stehen nur ciphertext, iv und ein Zeitstempel.

   Bewusst ohne Live-Listener: Synchronisiert wird beim Anmelden, beim
   Speichern und auf Knopfdruck. Das ist leichter nachvollziehbar als ein
   Datenstrom, der im Hintergrund Einträge verändert. */
import { FIREBASE_CONFIG, configured } from './firebase-config.js';

const V = '10.7.1';
const state = { ready: false, user: null, key: null, salt: null, busy: false };
let fb = null;
let listeners = [];

function emit() { listeners.forEach(fn => { try { fn(status()); } catch (e) {} }); }

function status() {
  return {
    configured: configured(),
    signedIn: !!state.user,
    email: state.user ? state.user.email : null,
    unlocked: !!state.key,
    busy: state.busy
  };
}

async function boot() {
  if (fb || !configured()) return fb;
  const [app, auth, store] = await Promise.all([
    import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`),
    import(`https://www.gstatic.com/firebasejs/${V}/firebase-auth.js`),
    import(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore.js`)
  ]);
  const application = app.initializeApp(FIREBASE_CONFIG);
  fb = { auth: auth.getAuth(application), db: store.getFirestore(application), a: auth, s: store };
  fb.a.onAuthStateChanged(fb.auth, (u) => {
    state.user = u ? { uid: u.uid, email: u.email } : null;
    if (!u) { state.key = null; state.salt = null; }
    emit();
  });
  state.ready = true;
  return fb;
}

/* Schlüssel herstellen: Salt aus dem eigenen Dokument holen, beim ersten Mal
   eines anlegen. Danach denselben Code wie die App-Sperre verwenden. */
async function prepareKey() {
  const Lock = window.TagebuchLock;
  if (!Lock || !Lock.isEnabled()) throw new Error('Richte zuerst die App-Sperre ein – der Code ist auch der Schlüssel für den Sync.');
  if (!Lock.isUnlocked()) throw new Error('App ist gesperrt.');
  if (!state.user) throw new Error('Nicht angemeldet.');

  const ref = fb.s.doc(fb.db, 'users', state.user.uid);
  const snap = await fb.s.getDoc(ref);
  let salt = snap.exists() ? snap.data().syncSalt : null;
  if (!salt) {
    salt = Lock.newSalt();
    await fb.s.setDoc(ref, { syncSalt: salt }, { merge: true });
  }
  state.salt = salt;
  state.key = await Lock.deriveWithSalt(salt);
  emit();
}

async function register(email, password) {
  await boot();
  await fb.a.createUserWithEmailAndPassword(fb.auth, email, password);
  await prepareKey();
}

async function login(email, password) {
  await boot();
  await fb.a.signInWithEmailAndPassword(fb.auth, email, password);
  await prepareKey();
}

async function logout() {
  if (!fb) return;
  await fb.a.signOut(fb.auth);
  state.key = null; state.salt = null;
  emit();
}

function stamp(entry) {
  return entry.updatedAt || entry.time || '1970-01-01T00:00:00.000Z';
}

async function pull() {
  const col = fb.s.collection(fb.db, 'users', state.user.uid, 'entries');
  const snap = await fb.s.getDocs(col);
  const out = [];
  for (const d of snap.docs) {
    const data = d.data();
    try {
      out.push(await window.TagebuchLock.decryptWith({ ciphertext: data.ciphertext, iv: data.iv }, state.key));
    } catch (e) {
      // Mit einem anderen Code verschlüsselt – überspringen statt abstürzen
      console.warn('Eintrag nicht entschlüsselbar, übersprungen:', d.id);
    }
  }
  return out;
}

async function pushOne(entry) {
  const box = await window.TagebuchLock.encryptWith(entry, state.key);
  await fb.s.setDoc(fb.s.doc(fb.db, 'users', state.user.uid, 'entries', entry.id), {
    ciphertext: box.ciphertext, iv: box.iv, updatedAt: stamp(entry)
  });
}

async function removeOne(id) {
  if (!state.key || !state.user) return;
  await fb.s.deleteDoc(fb.s.doc(fb.db, 'users', state.user.uid, 'entries', id));
}

/* Zusammenführen: gleiche id, jüngerer Zeitstempel gewinnt. Nichts wird
   gelöscht, was nur auf einer Seite existiert – im Zweifel lieber ein
   Eintrag zu viel als einer zu wenig. */
function merge(local, remote) {
  const byId = new Map();
  local.forEach(e => byId.set(e.id, e));
  remote.forEach(e => {
    const mine = byId.get(e.id);
    if (!mine || stamp(e) > stamp(mine)) byId.set(e.id, e);
  });
  return Array.from(byId.values());
}

async function syncNow(localEntries) {
  if (!state.key) throw new Error('Sync ist nicht bereit.');
  state.busy = true; emit();
  try {
    const remote = await pull();
    const merged = merge(localEntries, remote);
    const remoteById = new Map(remote.map(e => [e.id, e]));
    for (const e of merged) {
      const r = remoteById.get(e.id);
      if (!r || stamp(e) > stamp(r)) await pushOne(e);
    }
    return merged;
  } finally {
    state.busy = false; emit();
  }
}

window.TagebuchSync = {
  status, boot, register, login, logout, syncNow,
  pushOne: (e) => (state.key ? pushOne(e) : Promise.resolve()),
  removeOne,
  onChange: (fn) => { listeners.push(fn); fn(status()); }
};
window.dispatchEvent(new Event('tagebuch-sync-ready'));

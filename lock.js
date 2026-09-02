/* Tagebuch – App-Sperre und Verschlüsselung der Einträge im Gerät.

   Der Schlüssel wird aus dem Code des Nutzers abgeleitet (PBKDF2, SHA-256)
   und liegt ausschliesslich im Arbeitsspeicher. Im localStorage steht nur
   Chiffretext, ein Salt und eine Pruefmarke. Es gibt keinen Server, keine
   Hintertuer und keine Wiederherstellung: Code vergessen heisst Daten weg.
   Genau deshalb erzwingt die Oberflaeche vorher einen Export. */
(function () {
  'use strict';

  var LOCK_KEY = 'tagebuch_lock_v1';
  var ENC_KEY = 'tagebuch_entries_enc_v1';
  var PLAIN_KEY = 'tagebuch_entries_v1';
  var ITERATIONS = 250000;
  var AUTOLOCK_MS = 5 * 60 * 1000;

  var memKey = null;          // CryptoKey, nur im Speicher
  var memCode = null;         // Klartext-Code, ebenfalls nur im Speicher -
                              // wird gebraucht, um fuer den Sync einen zweiten
                              // Schluessel mit anderem Salt abzuleiten
  var hiddenSince = null;
  var writeChain = Promise.resolve();

  function available() {
    return !!(window.crypto && window.crypto.subtle && window.isSecureContext);
  }

  function toB64(buf) {
    var bytes = new Uint8Array(buf), s = '';
    for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s);
  }
  function fromB64(b64) {
    return Uint8Array.from(atob(b64), function (c) { return c.charCodeAt(0); });
  }

  function config() {
    try { return JSON.parse(localStorage.getItem(LOCK_KEY) || 'null'); }
    catch (e) { return null; }
  }

  async function deriveKey(code, saltB64, iterations) {
    var base = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(code), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: fromB64(saltB64), iterations: iterations, hash: 'SHA-256' },
      base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }

  async function encryptJSON(value, key) {
    var iv = crypto.getRandomValues(new Uint8Array(12));
    var data = new TextEncoder().encode(JSON.stringify(value));
    var ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, data);
    return { ciphertext: toB64(ct), iv: toB64(iv) };
  }

  async function decryptJSON(box, key) {
    var plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromB64(box.iv) }, key, fromB64(box.ciphertext));
    return JSON.parse(new TextDecoder().decode(plain));
  }

  // ---------- oeffentliche API ----------

  function isEnabled() { return !!config(); }
  function isUnlocked() { return memKey !== null; }

  /* Sperre einschalten. Reihenfolge ist bewusst so:
     verschluesseln, zurueckentschluesseln und vergleichen, und erst wenn das
     stimmt, den Klartext entfernen. Sonst waere ein Fehler mitten drin
     gleichbedeutend mit Datenverlust. */
  async function enable(code, entries) {
    if (!available()) throw new Error('Verschlüsselung steht in diesem Browser nicht zur Verfügung.');
    if (!code || code.length < 4) throw new Error('Der Code braucht mindestens 4 Zeichen.');

    var salt = toB64(crypto.getRandomValues(new Uint8Array(16)));
    var key = await deriveKey(code, salt, ITERATIONS);

    var box = await encryptJSON(entries, key);
    var check = await encryptJSON({ ok: true }, key);

    var back = await decryptJSON(box, key);
    if (!Array.isArray(back) || back.length !== entries.length) {
      throw new Error('Verschlüsselung fehlgeschlagen – es wurde nichts verändert.');
    }

    localStorage.setItem(ENC_KEY, JSON.stringify(box));
    localStorage.setItem(LOCK_KEY, JSON.stringify({ salt: salt, iterations: ITERATIONS, check: check }));
    localStorage.removeItem(PLAIN_KEY);
    memKey = key; memCode = code;
    return true;
  }

  async function unlock(code) {
    var cfg = config();
    if (!cfg) throw new Error('Es ist keine Sperre eingerichtet.');
    var key = await deriveKey(code, cfg.salt, cfg.iterations || ITERATIONS);
    try {
      await decryptJSON(cfg.check, key);   // wirft bei falschem Code
    } catch (e) {
      throw new Error('Falscher Code.');
    }
    memKey = key; memCode = code;
    return true;
  }

  async function disable(code) {
    await unlock(code);
    var entries = await loadEntries();
    localStorage.setItem(PLAIN_KEY, JSON.stringify(entries));
    localStorage.removeItem(ENC_KEY);
    localStorage.removeItem(LOCK_KEY);
    memKey = null; memCode = null;
    return entries;
  }

  async function loadEntries() {
    if (!memKey) throw new Error('Noch gesperrt.');
    var raw = localStorage.getItem(ENC_KEY);
    if (!raw) return [];
    return decryptJSON(JSON.parse(raw), memKey);
  }

  /* Schreibvorgaenge nacheinander, damit zwei schnelle Speichervorgaenge
     sich nicht gegenseitig ueberholen und der aeltere Stand gewinnt. */
  function saveEntries(entries) {
    writeChain = writeChain.then(async function () {
      if (!memKey) throw new Error('Noch gesperrt.');
      var box = await encryptJSON(entries, memKey);
      localStorage.setItem(ENC_KEY, JSON.stringify(box));
    });
    return writeChain;
  }

  function lockNow() { memKey = null; memCode = null; }

  // Automatisch sperren, wenn die App laenger im Hintergrund lag
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      hiddenSince = Date.now();
    } else if (hiddenSince && isEnabled() && isUnlocked() && Date.now() - hiddenSince > AUTOLOCK_MS) {
      lockNow();
      if (typeof window.TagebuchOnAutoLock === 'function') window.TagebuchOnAutoLock();
    }
  });

  /* Fuer den Sync: derselbe Code, aber ein eigener Schluessel mit dem Salt,
     das in der Cloud liegt. So leiten alle Geraete denselben Sync-Schluessel
     ab, ohne dass der lokale Schluessel das Geraet verlaesst. */
  async function deriveWithSalt(saltB64) {
    if (!memCode) throw new Error('Noch gesperrt.');
    return deriveKey(memCode, saltB64, ITERATIONS);
  }
  function newSalt() { return toB64(crypto.getRandomValues(new Uint8Array(16))); }

  window.TagebuchLock = {
    available: available,
    isEnabled: isEnabled,
    isUnlocked: isUnlocked,
    enable: enable,
    unlock: unlock,
    disable: disable,
    loadEntries: loadEntries,
    saveEntries: saveEntries,
    lockNow: lockNow,
    deriveWithSalt: deriveWithSalt,
    newSalt: newSalt,
    encryptWith: encryptJSON,
    decryptWith: decryptJSON
  };
})();

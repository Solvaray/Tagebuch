# Cloud-Sync mit Ende-zu-Ende-Verschlüsselung — Design

## Kontext

Die Tagebuch-PWA (`index.html`, `sw.js`, `manifest.json`) speichert Einträge
aktuell ausschließlich lokal im `localStorage` des Browsers. Das bedeutet:
kein Zugriff von einem zweiten Gerät, kein Backup bei Geräteverlust. Der
Nutzer möchte Cloud-Sync, damit Einträge zwischen mehreren Geräten
verfügbar sind. Da es sich um persönliche Tagebuch-/Tracking-Einträge
handelt, ist Ende-zu-Ende-Verschlüsselung (E2E) eine harte Anforderung —
der Backend-Anbieter (Firebase) soll die Inhalte nicht im Klartext lesen
können.

Getroffene Entscheidungen (siehe Brainstorming-Dialog):
- Mehrbenutzerfähig (mehrere Personen, je eigenes Konto, eigene Einträge)
- Ende-zu-Ende-Verschlüsselung ist Pflicht, kein optionaler Modus
- Firebase (Auth + Firestore) als Backend
- Verschlüsselungsschlüssel wird aus dem Login-Passwort abgeleitet; ein
  vergessenes Passwort bedeutet unwiederbringlichen Datenverlust — akzeptiert

## Architektur

- **Auth**: Firebase Authentication, Provider E-Mail/Passwort
- **Datenbank**: Firestore (NoSQL, dokumentbasiert)
- **Verschlüsselung**: Web Crypto API (`crypto.subtle`) im Browser
  - Schlüsselableitung: PBKDF2-SHA256 aus dem Klartext-Passwort + einem
    pro-Nutzer generierten, nicht-geheimen Salt (liegt in Firestore unter
    `users/{uid}.encryptionSalt`)
  - Verschlüsselung: AES-GCM, pro Eintrag ein zufälliger IV
  - Der abgeleitete Schlüssel verlässt das Gerät nie; Firebase Auth erhält
    nur das rohe Passwort über die Standard-Firebase-SDK-Login-Methode
    (das ist unabhängig von der lokalen Schlüsselableitung — Firebase
    speichert intern einen eigenen, gesalzenen Passwort-Hash, wie üblich)
- **Kein Build-Schritt**: Firebase JS SDK wird per CDN `<script type="module">`
  eingebunden, passt zur bestehenden buildlosen Single-File-Architektur

## Neue Dateien

Die bestehende `index.html` hat bereits 488 Zeilen (Projektregel: Dateien
unter 500 Zeilen halten). Die neue Logik kommt daher in eigene, fokussierte
Dateien statt weiter in `index.html` zu wachsen:

| Datei | Verantwortung |
|---|---|
| `firebase-config.js` | Firebase-Projektkonfiguration (öffentliche Werte — Schutz erfolgt über Firestore Security Rules, nicht Geheimhaltung) |
| `crypto.js` | `deriveKey(password, salt)`, `encryptEntry(entry, key)`, `decryptEntry(ciphertext, iv, key)` |
| `auth.js` | Login-/Registrierungs-/Logout-UI-Logik, hält aktuellen Firebase-User-Status |
| `sync.js` | Liest/schreibt verschlüsselte Einträge von/zu Firestore, Migration alter Klartext-Lokaldaten beim ersten Login |

`index.html` bindet diese vier Dateien per `<script type="module" src="...">`
ein und ruft an den bestehenden Stellen (`persist()`, Initial-Load) Hooks in
`sync.js` auf.

## Datenmodell (Firestore)

```
users/{uid}
  encryptionSalt: string        // Base64, nicht geheim

users/{uid}/entries/{entryId}
  ciphertext: string            // Base64, AES-GCM-verschlüsselte JSON-Repräsentation von {time, name, amount, unit, category, note}
  iv: string                    // Base64, pro Eintrag zufällig
  updatedAt: Timestamp          // Firestore Server-Timestamp, für Last-Write-Wins
```

Kein Feld liegt im Klartext, auch nicht `category` oder `name` — die
gesamte Eintrags-Payload wird als ein JSON-Blob verschlüsselt (gleiche
Struktur wie das bestehende `data`-Objekt in `index.html`, Zeilen 387–395).

## Firestore Security Rules

```
match /users/{uid} {
  allow read, write: if request.auth != null && request.auth.uid == uid;
  match /entries/{entryId} {
    allow read, write: if request.auth != null && request.auth.uid == uid;
  }
}
```
Jeder Nutzer kann ausschließlich seine eigenen Dokumente lesen/schreiben.

## Datenfluss

1. **Registrierung**: E-Mail + Passwort → Firebase Auth erstellt Account →
   `crypto.js` generiert einen zufälligen Salt → wird in
   `users/{uid}.encryptionSalt` abgelegt → Schlüssel wird lokal aus
   Passwort + Salt abgeleitet und im Speicher gehalten (nicht persistiert)
2. **Login**: Firebase Auth prüft Passwort → Salt wird aus Firestore
   geladen → Schlüssel wird lokal neu abgeleitet
3. **Erstlogin-Migration**: Vorhandene lokale Klartext-Einträge (aus
   `localStorage`, altes Format) werden einmalig verschlüsselt und nach
   Firestore hochgeladen, dann als migriert markiert
4. **Laufender Betrieb**: `persist()` in `index.html` verschlüsselt
   geänderte/neue Einträge zusätzlich zum lokalen Speichern und schreibt
   sie über `sync.js` nach Firestore. Firestores Offline-Persistenz
   übernimmt Warteschlange bei fehlendem Netz automatisch — kein
   manuelles Konfliktmanagement nötig (Last-Write-Wins reicht für
   Einzelnutzer-Bearbeitung eines Eintrags)
5. **Gerätewechsel/Zweitgerät**: Nach Login werden alle Firestore-Einträge
   geholt, entschlüsselt, in `entries` gemergt und in `localStorage` als
   Offline-Cache gespiegelt

## Fehlerfälle

- Falsches Passwort → Firebase-Auth-Fehler, klare UI-Meldung, keine
  Entschlüsselung versucht
- Kein Netzwerk → App bleibt voll nutzbar (bestehendes Offline-Verhalten),
  Firestore synchronisiert automatisch nach, sobald wieder online
- Entschlüsselung eines einzelnen Eintrags schlägt fehl (korrupte Daten) →
  dieser Eintrag wird übersprungen und in der Konsole gewarnt, statt die
  gesamte Liste zum Absturz zu bringen
- Registrierung mit bereits vergebener E-Mail → Firebase-Standardfehler
  wird in verständlicher Meldung angezeigt

## Testen

- Manuell: Registrieren → Eintrag anlegen → auf zweitem Gerät/Browser
  einloggen → Eintrag erscheint korrekt entschlüsselt
- Firestore-Konsole öffnen → prüfen, dass nur `ciphertext`/`iv` sichtbar
  sind, keine Klartextfelder
- Offline-Test: Flugmodus aktivieren → Eintrag anlegen → wieder online →
  Eintrag taucht in Firestore auf
- Falsches Passwort beim Login → verständliche Fehlermeldung, kein Absturz
- Migration: bestehenden `localStorage`-Klartext-Eintrag simulieren →
  nach erstem Login prüfen, dass er verschlüsselt in Firestore landet

## Out of Scope

- Passwort-Wiederherstellung / Recovery-Codes (bewusst nicht gewünscht)
- Mehrgeräte-Konfliktauflösung über einfaches Last-Write-Wins hinaus
- Native Mobile-Apps (bleibt PWA)

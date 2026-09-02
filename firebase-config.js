/* Werte aus der Firebase-Konsole: Projekt-Uebersicht -> Web-App -> Konfiguration.
   Diese Werte sind nicht geheim. Der Schutz kommt aus firestore.rules und
   daraus, dass die Eintraege das Geraet nur verschluesselt verlassen.

   Solange hier Platzhalter stehen, bleibt die Sync-Funktion in der App
   ausgeblendet - die App laeuft dann wie bisher rein lokal weiter. */
export const FIREBASE_CONFIG = {
  apiKey: "HIER_EINTRAGEN",
  authDomain: "HIER_EINTRAGEN",
  projectId: "HIER_EINTRAGEN",
  storageBucket: "HIER_EINTRAGEN",
  messagingSenderId: "HIER_EINTRAGEN",
  appId: "HIER_EINTRAGEN"
};

export function configured() {
  return FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.apiKey.indexOf("HIER_") !== 0;
}

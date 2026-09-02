/* Werte aus der Firebase-Konsole: Projekteinstellungen -> Meine Apps -> Konfiguration.
   Diese Werte sind nicht geheim. Der Schutz kommt aus firestore.rules und daraus,
   dass die Eintraege das Geraet nur verschluesselt verlassen.

   measurementId (Analytics) ist bewusst nicht uebernommen - die App laedt kein
   Analytics-SDK und schickt entsprechend auch nichts dorthin. */
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyArH-FzcI6fEgSh9sEi-oIUT5VEnkHKaX8",
  authDomain: "tagebuch-feacd.firebaseapp.com",
  projectId: "tagebuch-feacd",
  storageBucket: "tagebuch-feacd.firebasestorage.app",
  messagingSenderId: "685147713781",
  appId: "1:685147713781:web:6423e6c237c746f07f15bc"
};

export function configured() {
  return FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.apiKey.indexOf("HIER_") !== 0;
}

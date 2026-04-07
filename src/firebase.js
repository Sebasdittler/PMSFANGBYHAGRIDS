import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import 'firebase/compat/auth';

const firebaseConfig = {
  apiKey:            "AIzaSyCl0sGzLlRFB__vU5HUdy4trsRBoHWFJwU",
  authDomain:        "fangpmshagrids.firebaseapp.com",
  projectId:         "fangpmshagrids",
  storageBucket:     "fangpmshagrids.firebasestorage.app",
  messagingSenderId: "244923261273",
  appId:             "1:244923261273:web:2e4e13f70b3c8b98daac48",
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

export const db       = firebase.firestore();
export const auth     = firebase.auth();
export const fbReady  = true;
export { firebase };

// Compatibilidad con el código existente que usa window._db etc.
window._db      = db;
window._auth    = auth;
window._fbReady = fbReady;

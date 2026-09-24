import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getActiveFirebaseConfig } from './firebaseConfig';

const activeConfig = getActiveFirebaseConfig();

// Initialisation unique et partagée de l'App Firebase
export const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(activeConfig);

// Service Firebase Authentication
export const auth: Auth = getAuth(app);

// Activer la persistance locale sur le stockage du navigateur
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn('[Firebase] Impossible d\'activer browserLocalPersistence:', err);
});

// Service Cloud Firestore
export const firestore: Firestore = getFirestore(app);

// src/app/firebase.ts
import { initializeApp } from 'firebase/app';
import {
  initializeAuth,
  connectAuthEmulator,
  getAuth                       // still useful in other services
} from 'firebase/auth';
import {
  getFirestore,
  connectFirestoreEmulator
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { environment } from '../environments/environment';

const app  = initializeApp(environment.firebase);

// ---------- Auth ----------
export const auth = initializeAuth(app);
if (location.hostname === 'localhost') {
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
}

// ---------- Firestore ----------
export const db = getFirestore(app);
if (location.hostname === 'localhost') {
  connectFirestoreEmulator(db, 'localhost', 8080);   // keep this in sync with firebase.json
}

// ---------- Storage ----------
export const storage = getStorage(app);

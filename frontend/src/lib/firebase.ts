// lib/firebase.ts — Firebase initialization for Forkful
// Configure VITE_FIREBASE_* env vars in frontend/.env to enable Firebase Storage

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let firebaseApp: FirebaseApp | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  // Check that at least the API key is present
  if (!firebaseConfig.apiKey) {
    console.warn(
      "[Forkful] Firebase not configured. Set VITE_FIREBASE_* env vars in frontend/.env to enable photo uploads."
    );
    return null;
  }
  if (!firebaseApp) {
    firebaseApp = getApps().length === 0
      ? initializeApp(firebaseConfig)
      : getApps()[0];
  }
  return firebaseApp;
}

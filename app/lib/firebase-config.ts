// lib/firebase-config.ts
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';  // For Firebase Authentication
import { getFirestore } from 'firebase/firestore';  // For Firestore database

const firebaseConfig = {
    apiKey: "AIzaSyAYZih8F1tdsCNzRZt5hkG3rrdmMWHtlNI",
    authDomain: "osbazar.firebaseapp.com",
    projectId: "osbazar",
    storageBucket: "osbazar.firebasestorage.app",
    messagingSenderId: "745174758013",
    appId: "1:745174758013:web:878d3c0b4dcb5c4a6af714"
};

// Initialize Firebase if not already initialized
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Get Auth and Firestore instances
const auth = getAuth(app);
const firestore = getFirestore(app);

export { app, auth, firestore };

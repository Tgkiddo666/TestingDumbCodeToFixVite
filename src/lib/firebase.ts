
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

/*
  ========================================================================================
  === CRITICAL: FIREBASE & GOOGLE CLOUD PROJECT SETUP                                  ===
  ========================================================================================
  
  This file contains critical setup information for your Firebase project. An incorrect
  configuration here is a very common cause of authentication redirect loops, especially
  in browsers like Chrome that have strict security policies.

  Please CAREFULLY review and apply these settings in your cloud consoles.

  --------------------------------------------------------------------------------------
  --- 1. Firebase Console: Authorized Domains                                        ---
  --------------------------------------------------------------------------------------
  
  *** If you see "auth/unauthorized-domain" or a redirect loop after signing in,     ***
  *** it's likely because your app's domain is not authorized.                       ***

  To fix this:
  1. Go to your Firebase Console.
  2. Navigate to Authentication -> Settings -> Authorized domains.
  3. Click "Add domain" and add the EXACT domain where your app is hosted.
     (e.g., your-app-name.web.app or your custom domain).
  4. For local development, `localhost` should already be present.

  --------------------------------------------------------------------------------------
  --- 2. Google Cloud Console: OAuth Redirect URIs                                   ---
  --------------------------------------------------------------------------------------
  
  Firebase uses Google Cloud for its OAuth identity services. The redirect URI
  must be whitelisted there as well.

  1. Go to the Google Cloud Console: https://console.cloud.google.com/
  2. Make sure you have selected the correct Google Cloud project that corresponds
     to your Firebase project.
  3. Navigate to "APIs & Services" -> "Credentials".
  4. Find your "OAuth 2.0 Client ID" used for web applications.
  5. Under "Authorized redirect URIs", ensure this URI is present:
     https://[YOUR_PROJECT_ID].firebaseapp.com/__/auth/handler

     Replace [YOUR_PROJECT_ID] with your actual Firebase Project ID.

*/


const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

// Set persistence at the global level right after initialization.
// This is the most robust way to fix "missing initial state" errors.
setPersistence(auth, browserLocalPersistence);


export { app, auth, db };

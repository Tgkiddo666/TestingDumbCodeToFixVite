
import * as admin from 'firebase-admin';

// This file is kept for potential future server-side functionality,
// but it is not currently used by the authentication flow, which is now
// handled robustly on the client-side.
if (!admin.apps.length) {
  // On Google Cloud environments like App Hosting, initializeApp() with no arguments
  // automatically discovers the project's service account credentials and configuration.
  admin.initializeApp();
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();

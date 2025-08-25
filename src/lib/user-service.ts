
'use server';

/**
 * @fileOverview A server-side service for managing user data in Firestore.
 * This file centralizes the logic for creating and updating user documents,
 * making it easier to debug and maintain.
 */

import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import type { User as FirebaseUser } from 'firebase/auth';
import { db } from "@/lib/firebase";
import { PRICING_PLANS } from "@/lib/constants";

/**
 * Creates a new user document in Firestore if one doesn't already exist.
 * This is called immediately after a user signs up for the first time.
 * @param fbUser The FirebaseUser object from the authentication provider.
 */
export async function handleNewUserSetup(fbUser: FirebaseUser): Promise<void> {
  if (!fbUser.uid) {
    throw new Error("Cannot create user document without a UID.");
  }
  
  const userDocRef = doc(db, "users", fbUser.uid);
  const docSnap = await getDoc(userDocRef);

  // If the user document already exists, we don't need to do anything.
  if (docSnap.exists()) {
    console.log(`User document for ${fbUser.uid} already exists. Skipping creation.`);
    return;
  }

  // A small perk for a specific user, otherwise defaults to 'Free'
  const isSpecialUser = fbUser.email === 'thegraykiddo09@gmail.com';
  const planName = isSpecialUser ? 'Power' : 'Free';
  const assignedPlan = PRICING_PLANS.find(p => p.name === planName);

  if (!assignedPlan) {
    throw new Error(`Default pricing plan "${planName}" not found.`);
  }

  try {
    // Create the new user document with default values.
    await setDoc(userDocRef, {
      email: fbUser.email,
      name: fbUser.displayName || 'New User',
      avatarUrl: fbUser.photoURL || null,
      username: (fbUser.displayName || 'user').toLowerCase().replace(/\s+/g, '') + Math.floor(Math.random() * 1000),
      createdAt: serverTimestamp(),
      subscriptionPlan: assignedPlan.name,
      creditsUsed: 0,
      storageUsed: 0,
      planDetails: {
        creditLimit: assignedPlan.creditLimit,
        storageLimit: assignedPlan.storageLimit,
      },
      planExpiryDate: null,
      subscriptionEndsAt: null,
      paddleCustomerId: null,
      paddleSubscriptionId: null,
      bio: `Welcome to my Data Weaver profile!`,
      socialLinks: { koFi: "", patreon: "", paypal: "", customLink: "" },
      favoriteLink: null,
      totalDownloads: 0,
      isVerified: isSpecialUser,
      lastNameUpdate: null,
      lastUsernameUpdate: null,
      exportTimestamps: [],
    });
    console.log(`Successfully created new user document for ${fbUser.uid}`);
  } catch (error) {
    console.error("Failed to create new user document:", error);
    // Re-throw the error so it can be handled by the caller
    throw new Error("A server error occurred while setting up the new user account.");
  }
}

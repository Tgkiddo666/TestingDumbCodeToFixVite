
"use client";

import React, { createContext, useState, useEffect, useContext } from 'react';
import { onAuthStateChanged, User as FirebaseUser, signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot, Timestamp } from "firebase/firestore";
import type { User } from '@/lib/types';
import LoadingSpinner from './loading-spinner';
import { handleNewUserSetup } from '@/lib/user-service';

type AuthContextType = {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({ user: null, firebaseUser: null, loading: true });

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setFirebaseUser(fbUser);

        try {
          await handleNewUserSetup(fbUser);
        } catch (error) {
           console.error("Error during new user setup:", error);
           await signOut(auth); // Sign out to prevent broken state
           return; // Stop further execution
        }

        const userDocRef = doc(db, 'users', fbUser.uid);
        const unsubFirestore = onSnapshot(userDocRef, (userDoc) => {
          if (userDoc.exists()) {
              const firestoreData = userDoc.data() as Omit<User, 'uid' | 'planExpiryDate' | 'subscriptionEndsAt' | 'lastNameUpdate' | 'lastUsernameUpdate' | 'exportTimestamps'> & { planExpiryDate?: Timestamp, subscriptionEndsAt?: Timestamp, lastNameUpdate?: Timestamp, lastUsernameUpdate?: Timestamp, exportTimestamps?: Timestamp[] };
              
              setUser({
                uid: fbUser.uid,
                name: firestoreData.name || fbUser.displayName || "User",
                email: firestoreData.email || fbUser.email,
                avatarUrl: firestoreData.avatarUrl || fbUser.photoURL,
                ...firestoreData,
                planExpiryDate: firestoreData.planExpiryDate?.toDate() || null,
                subscriptionEndsAt: firestoreData.subscriptionEndsAt?.toDate() || null,
                lastNameUpdate: firestoreData.lastNameUpdate?.toDate(),
                lastUsernameUpdate: firestoreData.lastUsernameUpdate?.toDate(),
                exportTimestamps: firestoreData.exportTimestamps?.map(t => t.toDate()) || [],
              });
          } else {
            // This can happen briefly if the user document is still being created.
            // AuthProvider will re-run, so we just log it for now.
            console.warn(`User document for ${fbUser.uid} not found yet.`);
          }
          setLoading(false);
        }, (error) => {
          console.error("Firestore snapshot error:", error);
          signOut(auth);
          setLoading(false);
        });
        
        return () => unsubFirestore();
      } else {
        setUser(null);
        setFirebaseUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading }}>
      {loading ? <LoadingSpinner /> : children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

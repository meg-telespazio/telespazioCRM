'use client';
import { useState, useEffect, useMemo } from 'react';
import { onAuthStateChanged, type User as AuthUser } from 'firebase/auth';
import { doc } from 'firebase/firestore';
import { useAuth, useFirestore, useDoc } from '@/firebase';
import type { UserProfile } from '@/lib/types';

// This will be the new user object type throughout the app
export type AppUser = AuthUser & Partial<UserProfile>;

export const useUser = () => {
  const auth = useAuth();
  const firestore = useFirestore();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, [auth]);

  const userDocRef = useMemo(() => {
    if (!authUser) return null;
    return doc(firestore, 'users', authUser.uid);
  }, [firestore, authUser]);

  const { data: userProfile, loading: profileLoading } =
    useDoc<UserProfile>(userDocRef);

  const user: AppUser | null = useMemo(() => {
    if (!authUser) return null;
    // We create a merged user object.
    // Start with the auth user object, then spread the firestore profile over it.
    // This ensures that fields like photoURL from firestore (which can be a long data URL)
    // overwrite the ones from auth.
    // Also provide fallbacks from auth user if firestore profile is not yet loaded or doesn't have a field.
    return {
      ...authUser,
      ...userProfile, // `userProfile` from useDoc includes the id, which is fine.
      // Explicitly define important fields to ensure they are not accidentally overwritten by `undefined`
      // if userProfile is loading or doesn't have them.
      displayName: userProfile?.displayName || authUser.displayName,
      photoURL: userProfile?.photoURL || authUser.photoURL,
      email: authUser.email, // email from auth is source of truth
      uid: authUser.uid, // uid from auth is source of truth
    };
  }, [authUser, userProfile]);

  const loading = authLoading || (!!authUser && profileLoading);

  return { user, loading };
};

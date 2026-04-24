'use client';
import { useState, useEffect, useMemo } from 'react';
import { onAuthStateChanged, type User as AuthUser } from 'firebase/auth';
import { doc } from 'firebase/firestore';
import { useAuth, useFirestore, useDoc } from '@/firebase';
import type { UserProfile } from '@/lib/types';

// This will be the new user object type throughout the app
export type AppUser = AuthUser & Partial<UserProfile>;

const ADMIN_EMAIL = 'mariano.gonzalez@telespazio.com';

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
    
    const isSuperAdmin = authUser.email === ADMIN_EMAIL;
    
    // We return null if the profile is still loading to prevent partial/incorrect identity states
    // However, for the SuperAdmin we can bypass since the rules handle it by email token
    if (profileLoading && !isSuperAdmin) return null;

    return {
      ...authUser,
      ...userProfile,
      role: isSuperAdmin ? 'admin' : (userProfile?.role || null),
      management: userProfile?.management || null,
      displayName: userProfile?.displayName || authUser.displayName,
      photoURL: userProfile?.photoURL || authUser.photoURL,
      email: authUser.email,
      uid: authUser.uid,
    };
  }, [authUser, userProfile, profileLoading]);

  const loading = authLoading || (!!authUser && profileLoading);

  return { user, loading };
};

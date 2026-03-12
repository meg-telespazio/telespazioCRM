
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
    
    const isAdmin = authUser.email === ADMIN_EMAIL;
    
    return {
      ...authUser,
      ...userProfile,
      role: isAdmin ? 'admin' : (userProfile?.role || 'ejecutivo'),
      management: userProfile?.management || 'Satellite Communications',
      displayName: userProfile?.displayName || authUser.displayName,
      photoURL: userProfile?.photoURL || authUser.photoURL,
      email: authUser.email,
      uid: authUser.uid,
    };
  }, [authUser, userProfile]);

  const loading = authLoading || (!!authUser && profileLoading);

  return { user, loading };
};

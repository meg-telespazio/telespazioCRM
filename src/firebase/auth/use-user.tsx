'use client';
import { useState, useEffect, useMemo } from 'react';
import { onAuthStateChanged, type User as AuthUser } from 'firebase/auth';
import { doc } from 'firebase/firestore';
import { useAuth, useFirestore, useDoc } from '@/firebase';
import type { UserProfile } from '@/lib/types';

// This will be the new user object type throughout the app
export type AppUser = AuthUser & Partial<UserProfile>;

// Lista de correos con privilegios de Super Administrador (Bypass de reglas)
const SUPER_ADMIN_EMAIL = 'mariano.gonzalez@telespazio.com';
const GMAIL_EXECUTIVE_EMAIL = 'mariano.telespazio@gmail.com';

export const useUser = () => {
  const auth = useAuth();
  const firestore = useFirestore();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setAuthUser(user);
        // Sync Firebase auth state to a cookie for Next.js Middleware
        const token = await user.getIdToken();
        document.cookie = `__session=${token}; path=/; max-age=${60 * 60 * 24 * 5}; SameSite=Lax`;
      } else {
        setAuthUser(null);
        document.cookie = '__session=; path=/; max-age=0';
      }
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
    
    const isSuperAdmin = authUser.email === SUPER_ADMIN_EMAIL;
    const isGmailExecutive = authUser.email === GMAIL_EXECUTIVE_EMAIL;
    
    // Regresamos null si el perfil aún está cargando para evitar estados de identidad parciales
    // excepto si es SuperAdmin, que ya tiene bypass por reglas de email
    if (profileLoading && !isSuperAdmin) return null;

    // Lógica de roles: 
    // 1. Super Admin corporativo tiene prioridad
    // 2. Usuario Gmail específico SIEMPRE es ejecutivo (limita visualización)
    // 3. Otros usuarios respetan su rol en Firestore (o default ejecutivo)
    let role = userProfile?.role || 'ejecutivo';
    if (isSuperAdmin) role = 'admin';
    if (isGmailExecutive) role = 'ejecutivo';

    return {
      ...authUser,
      ...userProfile,
      role,
      management: userProfile?.management || 'Satellite Communications',
      displayName: userProfile?.displayName || authUser.displayName,
      photoURL: userProfile?.photoURL || authUser.photoURL,
      email: authUser.email,
      uid: authUser.uid,
    };
  }, [authUser, userProfile, profileLoading]);

  const loading = authLoading || (!!authUser && profileLoading);

  return { user, loading };
};


'use client';

import { useMemo } from 'react';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { SystemConfig, UserRole } from '@/lib/types';

/**
 * Hook para manejar permisos dinámicos basados en la matriz de roles
 * guardada en systemConfig/globals.
 */
export function usePermissions() {
  const { user } = useUser();
  const firestore = useFirestore();

  const configDocRef = useMemo(() => 
    firestore ? doc(firestore, 'systemConfig', 'globals') : null, 
  [firestore]);
  
  const { data: config } = useDoc<SystemConfig>(configDocRef);

  const permissions = useMemo(() => {
    if (!user || !config?.permissionsMatrix) return null;
    return config.permissionsMatrix[user.role as UserRole] || null;
  }, [user, config]);

  const can = (action: 'view' | 'create' | 'edit' | 'delete', module: string) => {
    if (user?.role === 'admin') return true; // Admin siempre tiene bypass local (aunque el servidor valide)
    if (!permissions) return false;
    return permissions.modules[module]?.[action] === true;
  };

  const canSeeMenu = (menuItem: keyof typeof permissions.menu) => {
    if (user?.role === 'admin') return true;
    if (!permissions) return false;
    return permissions.menu[menuItem] === true;
  };

  return { 
    can, 
    canSeeMenu, 
    role: user?.role,
    isLoading: !config && !!user 
  };
}

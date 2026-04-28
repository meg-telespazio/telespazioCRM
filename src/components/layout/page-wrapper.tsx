'use client';

import { usePathname, useRouter } from 'next/navigation';
import { AppNavbar } from '@/components/layout/app-navbar';
import { SessionTimeoutController } from '@/components/auth/session-timeout-controller';
import { useUser, useAuth } from '@/firebase';
import { useEffect, useState } from 'react';
import { multiFactor } from 'firebase/auth';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ShieldAlert, ArrowRight } from 'lucide-react';
import { useI18n } from '@/firebase/client-provider';
import { usePermissions } from '@/hooks/use-permissions';

// VERSIÓN 1.9.9 - Client Resolution Fix
const APP_VERSION = '1.9.9'; 

export function PageWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useUser();
  const auth = useAuth();
  const { t } = useI18n();
  const { canSeeMenu, isLoading: permissionsLoading } = usePermissions();
  const [isMfaModalOpen, setIsMfaModalOpen] = useState(false);

  const isPublicPage = pathname === '/login' || pathname === '/register' || pathname === '/cotizacion';
  const isUnauthorizedPage = pathname === '/unauthorized';

  // Lógica de actualización forzada para PWA
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleUpdate = async () => {
      const savedVersion = localStorage.getItem('crm_app_version');
      
      if (savedVersion !== APP_VERSION) {
        console.warn(`Nueva versión detectada (${APP_VERSION}). Actualizando aplicación...`);
        
        try {
          if ('caches' in window) {
            const cacheKeys = await caches.keys();
            await Promise.all(cacheKeys.map(key => caches.delete(key)));
          }

          if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const registration of registrations) {
              await registration.unregister();
            }
          }

          localStorage.setItem('crm_app_version', APP_VERSION);
          window.location.reload();
        } catch (e) {
          console.error('Error durante la actualización automática:', e);
        }
      }
    };

    handleUpdate();
  }, []);

  // Guardia de Rutas Dinámica basada en la Matriz
  useEffect(() => {
    if (loading || permissionsLoading || !user || isPublicPage || isUnauthorizedPage) return;

    // Mapa de rutas a permisos de menú
    const routePermissionMap: Record<string, any> = {
      '/opportunities': 'showOpportunities',
      '/products-and-services': 'showCatalog',
      '/reports': 'showReports',
      '/settings': 'showSettings',
      '/contracts': 'showContracts',
      '/purchase-orders': 'showPos',
      '/services': 'showServices',
      '/equipment': 'showEquipment',
      '/activities': 'showActivities',
      '/locations': 'showLocations',
      '/service-orders': 'showServiceOrders',
    };

    // Encontrar si la ruta actual (o su padre) requiere permiso
    const matchedRoute = Object.keys(routePermissionMap).find(route => pathname.startsWith(route));
    
    if (matchedRoute) {
      const permissionKey = routePermissionMap[matchedRoute];
      if (!canSeeMenu(permissionKey)) {
        console.warn(`Acceso denegado a ${pathname}. Redirigiendo a unauthorized...`);
        router.replace('/unauthorized');
      }
    }
  }, [pathname, user, loading, permissionsLoading, canSeeMenu, router, isPublicPage, isUnauthorizedPage]);

  // MFA Enforcement
  useEffect(() => {
    if (!loading && user && !isPublicPage && !isUnauthorizedPage) {
      const mfaUser = auth.currentUser ? multiFactor(auth.currentUser) : null;
      const hasMfa = mfaUser ? mfaUser.enrolledFactors.length > 0 : false;
      
      const isBypassed = user.email === 'roxana.patrese@telespazio.com';

      if (user.mfaEnforced && !hasMfa && !isBypassed) {
        setIsMfaModalOpen(true);
        if (pathname !== '/profile') {
          router.push('/profile');
        }
      } else {
        setIsMfaModalOpen(false);
      }
    }
  }, [user, loading, pathname, auth.currentUser, router, isPublicPage, isUnauthorizedPage]);

  if (isPublicPage || isUnauthorizedPage) {
    return <main>{children}</main>;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AppNavbar />
      <main className="flex flex-1 flex-col">{children}</main>
      <SessionTimeoutController />

      <div id="recaptcha-container"></div>

      <Dialog open={isMfaModalOpen} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md [&>button]:hidden" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <div className="mx-auto bg-amber-100 p-3 rounded-full w-fit mb-4">
              <ShieldAlert className="h-8 w-8 text-amber-600" />
            </div>
            <DialogTitle className="text-center text-xl">
              {t('Auth.mfaComplianceTitle')}
            </DialogTitle>
            <DialogDescription className="text-center pt-2">
              {t('Auth.mfaComplianceDesc')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center pt-4">
            <Button 
              className="w-full sm:w-auto gap-2" 
              onClick={() => {
                setIsMfaModalOpen(false);
                router.push('/profile');
              }}
            >
              Ir a Configuración de Seguridad
              <ArrowRight className="h-4 w-4" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

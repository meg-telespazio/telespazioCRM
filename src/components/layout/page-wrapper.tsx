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

// VERSIÓN 1.1.0 - Forza limpieza total de PWA y Caché
const APP_VERSION = '1.1.0'; 

export function PageWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useUser();
  const auth = useAuth();
  const { t } = useI18n();
  const [isMfaModalOpen, setIsMfaModalOpen] = useState(false);

  const isAuthPage = pathname === '/login' || pathname === '/register';

  // Lógica de actualización forzada y limpieza de caché profunda
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleUpdate = async () => {
      const savedVersion = localStorage.getItem('crm_app_version');
      
      // Si la versión ha cambiado o es la primera vez, limpiamos todo de raíz
      if (savedVersion !== APP_VERSION) {
        console.warn('Nueva versión detectada (1.1.0). Forzando limpieza de PWA...');
        
        try {
          // 1. Borrar todos los storages de caché del navegador
          if ('caches' in window) {
            const cacheKeys = await caches.keys();
            await Promise.all(cacheKeys.map(key => caches.delete(key)));
          }

          // 2. Desregistrar todos los Service Workers de forma agresiva
          if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const registration of registrations) {
              await registration.unregister();
            }
          }

          // 3. Guardar nueva versión
          localStorage.setItem('crm_app_version', APP_VERSION);
          
          // 4. Recarga dura desde el servidor (no desde caché)
          window.location.reload();
        } catch (e) {
          console.error('Error durante la actualización automática:', e);
        }
      }
    };

    handleUpdate();

    // Notificar al service worker que se actualice si hay algo nuevo
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.update();
      });
    }
  }, []);

  useEffect(() => {
    if (!loading && user && !isAuthPage) {
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
  }, [user, loading, pathname, auth.currentUser, router, isAuthPage]);

  if (isAuthPage) {
    return <main>{children}</main>;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AppNavbar />
      <main className="flex flex-1 flex-col">{children}</main>
      <SessionTimeoutController />

      {/* Mandatory MFA Compliance Modal */}
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

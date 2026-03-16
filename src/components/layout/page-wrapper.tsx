
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

export function PageWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useUser();
  const auth = useAuth();
  const { t } = useI18n();
  const [isMfaModalOpen, setIsMfaModalOpen] = useState(false);

  const isAuthPage = pathname === '/login' || pathname === '/register';

  useEffect(() => {
    if (!loading && user && !isAuthPage) {
      const mfaUser = multiFactor(auth.currentUser!);
      const hasMfa = mfaUser.enrolledFactors.length > 0;
      
      // If MFA is enforced by admin but not enrolled by user
      if (user.mfaEnforced && !hasMfa) {
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

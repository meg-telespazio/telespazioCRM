'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useI18n } from '@/firebase/client-provider';
import { useEffect, useState } from 'react';

interface SessionTimeoutDialogProps {
  isOpen: boolean;
  onStay: () => void;
  onLogout: () => void;
  countdownStart: number;
}

export function SessionTimeoutDialog({
  isOpen,
  onStay,
  onLogout,
  countdownStart,
}: SessionTimeoutDialogProps) {
  const { t } = useI18n();
  const [countdown, setCountdown] = useState(countdownStart);

  useEffect(() => {
    if (isOpen) {
      setCountdown(countdownStart);
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            onLogout(); // Trigger logout when countdown finishes
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isOpen, onLogout, countdownStart]);

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('Auth.sessionTimeoutTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('Auth.sessionTimeoutDescription', { countdown })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onLogout}>
            {t('Sidebar.logout')}
          </AlertDialogCancel>
          <AlertDialogAction onClick={onStay}>
            {t('Auth.stayLoggedInButton')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

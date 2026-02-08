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
    if (!isOpen) {
      return;
    }

    setCountdown(countdownStart); // Reset countdown when dialog opens

    const intervalId = setInterval(() => {
      setCountdown((prevCountdown) => {
        if (prevCountdown <= 1) {
          clearInterval(intervalId);
          return 0;
        }
        return prevCountdown - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [isOpen, countdownStart]);

  useEffect(() => {
    if (isOpen && countdown === 0) {
      onLogout();
    }
  }, [isOpen, countdown, onLogout]);


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

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { SessionTimeoutDialog } from './session-timeout-dialog';

const INACTIVITY_MINUTES = 60; // Incrementado a 1 hora
const WARNING_MINUTES = 1; // Show warning 1 minute before logout

const INACTIVITY_MS = INACTIVITY_MINUTES * 60 * 1000;
const WARNING_MS = (INACTIVITY_MINUTES - WARNING_MINUTES) * 60 * 1000;
const COUNTDOWN_SECONDS = WARNING_MINUTES * 60;

const EVENTS_TO_LISTEN: (keyof WindowEventMap)[] = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];

export function SessionTimeoutController() {
  const router = useRouter();
  const auth = useAuth();
  const [isWarningOpen, setWarningOpen] = useState(false);

  const warningTimer = useRef<NodeJS.Timeout>();
  const logoutTimer = useRef<NodeJS.Timeout>();

  const handleLogout = useCallback(() => {
    setWarningOpen(false);
    if (warningTimer.current) clearTimeout(warningTimer.current);
    if (logoutTimer.current) clearTimeout(logoutTimer.current);
    signOut(auth).then(() => {
      router.push('/login');
    });
  }, [auth, router]);

  const resetTimers = useCallback(() => {
    // Clear existing timers
    if (warningTimer.current) clearTimeout(warningTimer.current);
    if (logoutTimer.current) clearTimeout(logoutTimer.current);

    // If warning is open, user activity means they want to stay, so close it.
    setWarningOpen(current => {
        if (current) return false;
        return current;
    });
    
    // Set new timers
    warningTimer.current = setTimeout(() => {
      setWarningOpen(true);
    }, WARNING_MS);

    logoutTimer.current = setTimeout(() => {
      handleLogout();
    }, INACTIVITY_MS);
  }, [handleLogout]);


  // Add/remove event listeners for activity
  useEffect(() => {
    // Set initial timers
    resetTimers();

    // Add event listeners for user activity
    EVENTS_TO_LISTEN.forEach((event) => {
      window.addEventListener(event, resetTimers);
    });

    // Cleanup function
    return () => {
      if (warningTimer.current) clearTimeout(warningTimer.current);
      if (logoutTimer.current) clearTimeout(logoutTimer.current);
      EVENTS_TO_LISTEN.forEach((event) => {
        window.removeEventListener(event, resetTimers);
      });
    };
  }, [resetTimers]);

  return (
    <SessionTimeoutDialog
        isOpen={isWarningOpen}
        onStay={resetTimers}
        onLogout={handleLogout}
        countdownStart={COUNTDOWN_SECONDS}
    />
  );
}

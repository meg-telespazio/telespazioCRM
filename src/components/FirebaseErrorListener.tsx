
'use client';
import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';
import { useI18n } from '@/firebase/client-provider';

export function FirebaseErrorListener() {
  const { toast } = useToast();
  const { t } = useI18n();

  useEffect(() => {
    const handleError = (error: Error) => {
      console.error(error);
      if (error instanceof FirestorePermissionError) {
        toast({
          variant: 'destructive',
          title: t('Actions.title'),
          description: t('Errors.firestore.permissionDenied'),
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: t('Errors.firestore.generic'),
        });
      }
    };

    errorEmitter.on('permission-error', handleError);

    return () => {
      // Not removing the listener as it's a singleton for the app's lifetime.
    };
  }, [toast, t]);

  return null;
}

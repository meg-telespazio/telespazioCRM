'use client';
import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';

export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handleError = (error: Error) => {
      console.error(error); // We still want to see it in the console
      if (error instanceof FirestorePermissionError) {
        toast({
          variant: 'destructive',
          title: 'Permission Denied',
          description: 'You do not have permission to perform this action.',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'An error occurred',
          description: error.message,
        });
      }
    };

    errorEmitter.on('permission-error', handleError);

    return () => {
      // Not removing the listener as it's a singleton for the app's lifetime.
    };
  }, [toast]);

  return null;
}

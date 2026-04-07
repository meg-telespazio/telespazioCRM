'use client';
import { useMemo, useRef } from 'react';
import { queryEqual, refEqual, Query, DocumentReference } from 'firebase/firestore';

/**
 * Hook para estabilizar referencias y consultas de Firestore.
 * Evita ciclos de renderizado infinitos cuando se pasan consultas creadas inline a otros hooks.
 */
export function useMemoFirebase<T extends Query<any> | DocumentReference<any> | null>(
  factory: () => T,
  deps: any[]
): T {
  const value = useMemo(factory, deps);
  const ref = useRef<T>(value);

  if (value && ref.current) {
    let equal = false;
    try {
      if (value instanceof Query && ref.current instanceof Query) {
        equal = queryEqual(value, ref.current);
      } else if (value instanceof DocumentReference && ref.current instanceof DocumentReference) {
        equal = refEqual(value, ref.current);
      }
    } catch (e) {
      equal = false;
    }

    if (!equal) {
      ref.current = value;
    }
  } else {
    ref.current = value;
  }

  return ref.current;
}

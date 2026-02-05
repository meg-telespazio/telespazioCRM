'use client';
import { FirebaseProvider } from './provider';
import {
  createContext,
  useState,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import { translations } from '@/lib/translations';

type Locale = 'en' | 'es';
type I18nContextType = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}

function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>('es'); // Default to Spanish

  const t = useMemo(
    () =>
      (key: string, params?: Record<string, string | number>): string => {
        const keys = key.split('.');
        let result: any = translations[locale];
        for (const k of keys) {
          result = result?.[k];
          if (result === undefined) {
            // Fallback to English if key not found in current locale
            let fallbackResult: any = translations['en'];
            for (const fk of keys) {
              fallbackResult = fallbackResult?.[fk];
            }
            if (fallbackResult === undefined) {
              return key;
            }
            result = fallbackResult;
            break; // Exit loop after finding fallback
          }
        }

        let finalResult = String(result || key);
        if (params) {
          for (const [paramKey, paramValue] of Object.entries(params)) {
            finalResult = finalResult.replace(
              `{${paramKey}}`,
              String(paramValue)
            );
          }
        }

        return finalResult;
      },
    [locale]
  );

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t,
    }),
    [locale, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function FirebaseClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <I18nProvider>
      <FirebaseProvider>{children}</FirebaseProvider>
    </I18nProvider>
  );
}

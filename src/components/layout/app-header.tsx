import type { ReactNode } from 'react';
import { useI18n } from '@/firebase/client-provider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type AppHeaderProps = {
  title: string;
  children?: ReactNode;
};

function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();
  return (
    <Select
      value={locale}
      onValueChange={(value) => setLocale(value as 'en' | 'es')}
    >
      <SelectTrigger className="w-fit">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="es">ES</SelectItem>
        <SelectItem value="en">EN</SelectItem>
      </SelectContent>
    </Select>
  );
}

export function AppHeader({ title, children }: AppHeaderProps) {
  return (
    <div className="flex items-center justify-between p-4 sm:p-6 border-b">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <div className="flex items-center gap-2">
        <LanguageSwitcher />
        {children}
      </div>
    </div>
  );
}

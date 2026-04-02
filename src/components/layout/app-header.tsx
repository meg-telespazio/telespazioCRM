import type { ReactNode } from 'react';

type AppHeaderProps = {
  title: ReactNode;
  children?: ReactNode;
};

export function AppHeader({ title, children }: AppHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b p-4 sm:p-6">
      <div suppressHydrationWarning className="text-xl sm:text-2xl font-bold tracking-tight truncate mr-2">{title}</div>
      <div className="flex items-center gap-2 shrink-0">{children}</div>
    </div>
  );
}

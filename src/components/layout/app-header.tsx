import type { ReactNode } from 'react';

type AppHeaderProps = {
  title: string;
  children?: ReactNode;
};

export function AppHeader({ title, children }: AppHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b p-4 sm:p-6">
      <h1 suppressHydrationWarning className="text-xl sm:text-2xl font-bold tracking-tight truncate mr-2">{title}</h1>
      <div className="flex items-center gap-2 shrink-0">{children}</div>
    </div>
  );
}

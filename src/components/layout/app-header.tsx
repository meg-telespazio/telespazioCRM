import type { ReactNode } from 'react';

type AppHeaderProps = {
  title: string;
  children?: ReactNode;
};

export function AppHeader({ title, children }: AppHeaderProps) {
  return (
    <div className="flex items-center justify-between p-4 sm:p-6 border-b">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

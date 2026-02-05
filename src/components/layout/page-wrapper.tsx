'use client';

import { usePathname } from 'next/navigation';
import { AppNavbar } from '@/components/layout/app-navbar';

export function PageWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === '/login' || pathname === '/register';

  if (isAuthPage) {
    return <main>{children}</main>;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AppNavbar />
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}

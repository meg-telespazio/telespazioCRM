'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Sidebar,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarFooter,
  sidebarMenuButtonVariants,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Contact,
  Telescope,
  LogOut,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { cn } from '@/lib/utils';
import { useUser, useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { Button } from '../ui/button';
import { useI18n } from '@/firebase/client-provider';

const userAvatar = PlaceHolderImages.find((img) => img.id === 'user-avatar');

export function AppSidebar() {
  const pathname = usePathname();
  const { user, loading } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const { t } = useI18n();

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  const menuItems = [
    { href: '/dashboard', label: t('Sidebar.dashboard'), icon: LayoutDashboard },
    { href: '/opportunities', label: t('Sidebar.opportunities'), icon: Briefcase },
    { href: '/clients', label: t('Sidebar.clients'), icon: Users },
    { href: '/contacts', label: t('Sidebar.contacts'), icon: Contact },
  ];

  return (
    <Sidebar className="border-r">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <Telescope className="w-8 h-8 text-primary" />
          <h2 className="text-xl font-bold">{t('App.appName')}</h2>
        </div>
      </SidebarHeader>
      {user && (
        <>
          <SidebarMenu className="flex-1 p-4">
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <Link
                  href={item.href}
                  data-active={pathname.startsWith(item.href)}
                  className={cn(
                    sidebarMenuButtonVariants({
                      variant: 'default',
                      size: 'default',
                    }),
                    'w-full justify-start'
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
          <SidebarFooter className="p-4 border-t">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage
                  src={user?.photoURL || userAvatar?.imageUrl}
                  alt="User Avatar"
                  data-ai-hint={userAvatar?.imageHint}
                />
                <AvatarFallback>
                  {user?.email?.[0].toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col overflow-hidden">
                <span className="font-semibold truncate">
                  {user?.displayName || user?.email}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="h-auto p-0 justify-start text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  {t('Sidebar.logout')}
                </Button>
              </div>
            </div>
          </SidebarFooter>
        </>
      )}
      {!user && !loading && (
        <div className="p-4">
          <p className="text-sm text-muted-foreground mb-4">
            {t('Sidebar.loginPrompt')}
          </p>
          <div className="flex flex-col gap-2">
            <Button asChild>
              <Link href="/login">{t('Sidebar.login')}</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/register">{t('Sidebar.register')}</Link>
            </Button>
          </div>
        </div>
      )}
    </Sidebar>
  );
}

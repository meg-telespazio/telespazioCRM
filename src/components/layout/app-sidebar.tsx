'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { cn } from '@/lib/utils';

const userAvatar = PlaceHolderImages.find((img) => img.id === 'user-avatar');

export function AppSidebar() {
  const pathname = usePathname();

  const menuItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/opportunities', label: 'Opportunities', icon: Briefcase },
    { href: '/clients', label: 'Clients', icon: Users },
    { href: '/contacts', label: 'Contacts', icon: Contact },
  ];

  return (
    <Sidebar className="border-r">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <Telescope className="w-8 h-8 text-primary" />
          <h2 className="text-xl font-bold">T-Track</h2>
        </div>
      </SidebarHeader>
      <SidebarMenu className="flex-1 p-4">
        {menuItems.map((item) => (
          <SidebarMenuItem key={item.href}>
            <Link
              href={item.href}
              data-active={pathname.startsWith(item.href)}
              className={cn(
                sidebarMenuButtonVariants({ variant: 'default', size: 'default' }),
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
              src={userAvatar?.imageUrl}
              alt="User Avatar"
              data-ai-hint={userAvatar?.imageHint}
            />
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-semibold">User</span>
            <span className="text-sm text-muted-foreground">user@t-track.com</span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}


'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Contact,
  LogOut,
  Menu,
  User as UserIcon,
  BarChartHorizontal,
  Package,
  ChevronDown,
  FileText,
  MapPin,
  Building,
  Activity as ActivityIcon,
  ShoppingCart,
  Zap,
  HardDrive,
} from 'lucide-react';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useUser, useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { Button } from '../ui/button';
import { useI18n } from '@/firebase/client-provider';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const userAvatar = PlaceHolderImages.find((img) => img.id === 'user-avatar');

function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale } = useI18n();
  return (
    <Select
      value={locale}
      onValueChange={(value) => setLocale(value as 'en' | 'es')}
    >
      <SelectTrigger
        className={cn(
          'w-fit border-0 bg-transparent focus:ring-0 focus:ring-offset-0',
          className
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="es">ES</SelectItem>
        <SelectItem value="en">EN</SelectItem>
      </SelectContent>
    </Select>
  );
}

export function AppNavbar() {
  const pathname = usePathname();
  const { user } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const { t } = useI18n();
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  const menuItems = [
    {
      href: '/dashboard',
      label: t('Sidebar.dashboard'),
      icon: LayoutDashboard,
    },
    {
      href: '/opportunities',
      label: t('Sidebar.opportunities'),
      icon: Briefcase,
    },
    {
      label: t('Sidebar.management'),
      icon: Building,
      subItems: [
        { href: '/clients', label: t('Pages.clients'), icon: Users },
        { href: '/contacts', label: t('Sidebar.contacts'), icon: Contact },
        { href: '/contracts', label: t('Sidebar.contracts'), icon: FileText },
        { href: '/purchase-orders', label: t('Sidebar.pos'), icon: ShoppingCart },
        { href: '/services', label: t('Sidebar.services'), icon: Zap },
        { href: '/equipment', label: t('Sidebar.equipment'), icon: HardDrive },
        { href: '/locations', label: t('Pages.locations'), icon: MapPin },
        { href: '/activities', label: t('Pages.activities'), icon: ActivityIcon },
      ]
    },
    { href: '/products-and-services', label: t('Sidebar.ps'), icon: Package },
    { href: '/reports', label: t('Pages.reports'), icon: BarChartHorizontal },
  ];

  if (!user) return null;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-destructive text-destructive-foreground">
      <div className="container flex h-16 items-center px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Image
              src="/img/logoSmall.png"
              alt="T-Track Logo"
              width={32}
              height={32}
            />
            <h1 className="hidden text-xl font-bold sm:inline-block">
              {t('App.appName')}
            </h1>
          </Link>
          {/* Desktop Menu */}
          <nav className="hidden items-center gap-6 md:flex">
            {menuItems.map((item) => (
              item.subItems ? (
                <DropdownMenu key={item.label}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="gap-1 px-2 text-sm font-medium text-white/70 transition-colors hover:bg-transparent hover:text-white/90 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:text-white/90">
                      {item.label}
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56">
                    <DropdownMenuGroup>
                      {item.subItems.map(subItem => (
                        <DropdownMenuItem key={subItem.href} asChild>
                          <Link href={subItem.href} className={cn('flex items-center gap-2', pathname.startsWith(subItem.href) ? 'font-bold' : '')}>
                            <subItem.icon className="h-4 w-4 text-muted-foreground"/>
                            {subItem.label}
                          </Link>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link
                  key={item.href}
                  href={item.href!}
                  className={cn(
                    'text-sm font-medium transition-colors hover:text-white/90',
                    pathname.startsWith(item.href!)
                      ? 'text-white'
                      : 'text-white/70'
                  )}
                >
                  {item.label}
                </Link>
              )
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4 md:ml-auto">
          <div className="hidden items-center gap-2 md:flex">
            <LanguageSwitcher className="text-white hover:bg-red-700" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-9 w-9 rounded-full hover:bg-red-700"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarImage
                      src={user?.photoURL || userAvatar?.imageUrl}
                      alt="User Avatar"
                      data-ai-hint={userAvatar?.imageHint}
                    />
                    <AvatarFallback>
                      {user?.email?.[0].toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user?.displayName}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile">
                    <UserIcon className="mr-2 h-4 w-4" />
                    <span>{t('Pages.profile')}</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{t('Sidebar.logout')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile Menu */}
          <div className="md:hidden">
            <Sheet open={isMobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="hover:bg-red-700">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-full border-0 bg-destructive text-destructive-foreground sm:max-w-xs"
              >
                <SheetHeader className="p-6">
                  <SheetTitle className="sr-only">
                    {t('App.appName')} Menu
                  </SheetTitle>
                </SheetHeader>
                <div className="flex h-full flex-col">
                  <div className="p-6 pt-0">
                    <Link
                      href="/dashboard"
                      className="mb-6 flex items-center gap-2"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Image
                        src="/img/logoSmall.png"
                        alt="T-Track Logo"
                        width={32}
                        height={32}
                      />
                      <h1 className="text-xl font-bold">{t('App.appName')}</h1>
                    </Link>
                    <nav className="flex flex-col gap-1">
                      {menuItems.map((item) => (
                        item.subItems ? (
                          <Collapsible key={item.label} className="w-full">
                            <CollapsibleTrigger className="-mx-3 flex w-full items-center justify-between rounded-lg px-3 py-2 text-base font-medium transition-colors hover:bg-red-700">
                              <div className='flex items-center gap-4'>
                                <item.icon className="h-5 w-5" />
                                {item.label}
                              </div>
                              <ChevronDown className="h-5 w-5 transition-transform duration-200 [&[data-state=open]>svg]:rotate-180" />
                            </CollapsibleTrigger>
                            <CollapsibleContent className="pl-8 pt-2">
                               {item.subItems.map(subItem => (
                                <Link
                                  key={subItem.href}
                                  href={subItem.href}
                                  onClick={() => setMobileMenuOpen(false)}
                                  className={cn(
                                    '-mx-3 flex items-center gap-4 rounded-lg px-3 py-2 text-base font-medium transition-colors hover:bg-red-700',
                                    pathname.startsWith(subItem.href) ? 'bg-red-800' : ''
                                  )}
                                >
                                  <subItem.icon className="h-5 w-5" />
                                  {subItem.label}
                                </Link>
                               ))}
                            </CollapsibleContent>
                          </Collapsible>
                        ) : (
                          <Link
                            key={item.href}
                            href={item.href!}
                            onClick={() => setMobileMenuOpen(false)}
                            className={cn(
                              '-mx-3 flex items-center gap-4 rounded-lg px-3 py-2 text-base font-medium transition-colors hover:bg-red-700',
                              pathname.startsWith(item.href!) ? 'bg-red-800' : ''
                            )}
                          >
                            <item.icon className="h-5 w-5" />
                            {item.label}
                          </Link>
                        )
                      ))}
                    </nav>
                  </div>

                  <div className="mt-auto border-t border-red-600 p-6">
                    <div className="mb-4 flex items-center gap-3">
                      <Link
                        href="/profile"
                        onClick={() => setMobileMenuOpen(false)}
                      >
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
                      </Link>
                      <div className="flex flex-col overflow-hidden">
                        <span className="truncate font-semibold">
                          {user?.displayName || user?.email}
                        </span>
                        <Link
                          href="/profile"
                          className="text-sm text-white/80 hover:underline"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          {t('Pages.profile')}
                        </Link>
                      </div>
                    </div>
                    <LanguageSwitcher className="mb-2 w-full justify-start text-white hover:bg-red-700" />
                    <Button
                      variant="ghost"
                      onClick={() => {
                        handleLogout();
                        setMobileMenuOpen(false);
                      }}
                      className="-mx-3 mt-2 w-full justify-start gap-4 p-3 text-base font-medium hover:bg-red-700"
                    >
                      <LogOut className="h-5 w-5" />
                      {t('Sidebar.logout')}
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}

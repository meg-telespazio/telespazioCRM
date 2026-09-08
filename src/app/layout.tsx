import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase';
import { PageWrapper } from '@/components/layout/page-wrapper';

export const metadata: Metadata = {
  title: 'T-Track Sales',
  description: 'Sistema Integral de Gestión Comercial - Telespazio Argentina',
  manifest: '/manifest.json',
  applicationName: 'T-Track Sales',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'T-Track Sales',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: '/img/logoLarge.png',
    apple: '/img/logoLarge.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#EC1C24',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/img/logoLarge.png"></link>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased">
        <FirebaseClientProvider>
          <PageWrapper>{children}</PageWrapper>
        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}

import type {NextConfig} from 'next';
import withPWAInit from '@ducanh2912/next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  reloadOnOnline: true,
  workboxOptions: {
    cleanupOutdatedCaches: true,
    clientsClaim: true,
    exclude: [/index\.html$/, /_next\/static\/.*\.html$/],
    // Fuerza a que las llamadas de Auth NUNCA pasen por la caché del Service Worker
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/(www\.)?googleapis\.com\/identitytoolkit/,
        handler: 'NetworkOnly',
      },
      {
        urlPattern: /^https:\/\/securetoken\.googleapis\.com/,
        handler: 'NetworkOnly',
      },
      {
        urlPattern: /^https:\/\/(www\.)?googleapis\.com\/recaptcha/,
        handler: 'NetworkOnly',
      }
    ]
  }
});

const isDev = process.env.NODE_ENV !== 'production';

const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval'" : ""} https://apis.google.com https://www.gstatic.com https://www.google.com https://www.googletagmanager.com;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com;
    img-src 'self' blob: data: https://images.unsplash.com https://picsum.photos https://logo.clearbit.com https://*.tile.openstreetmap.org https://firebasestorage.googleapis.com https://placehold.co https://www.google.com https://*.firebasestorage.app;
    font-src 'self' https://fonts.gstatic.com;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'self' https: https://*.cloudworkstations.dev https://*.firebaseapp.com https://*.google.com;
    frame-src 'self' https://*.firebaseapp.com https://*.google.com https://firebasestorage.googleapis.com https://*.firebasestorage.app blob:;
    connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://dolarapi.com https://www.google.com https://*.firebaseapp.com;
    upgrade-insecure-requests;
`.replace(/\s{2,}/g, ' ').trim();

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspHeader,
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), display-capture=(), browsing-topics=()',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'same-origin',
          },
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET,DELETE,PATCH,POST,PUT,OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization',
          },
          {
            key: 'Access-Control-Expose-Headers',
            value: 'Content-Length, X-Kuma-Revision',
          },
          {
            key: 'Access-Control-Max-Age',
            value: '86400',
          },
          {
            key: 'Vary',
            value: 'Origin',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
};

export default withPWA(nextConfig);

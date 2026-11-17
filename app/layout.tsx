import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { ServiceWorkerRegistration } from '@/src/components/ServiceWorkerRegistration';
import { Toaster } from '@/src/components/ui/Toaster';
import './globals.css';

const sans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Fila Viva · Banco Demo',
  description: 'Tu turno y tu tiempo de espera real, actualizados en vivo.',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/icon.svg', apple: '/icon.svg' },
  appleWebApp: { capable: true, title: 'Fila Viva', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  themeColor: '#FBF6EE',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={sans.variable}>
      <body>
        <Toaster>{children}</Toaster>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}

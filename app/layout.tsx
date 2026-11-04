import type { Metadata, Viewport } from 'next';
import { ServiceWorkerRegistration } from '@/src/components/ServiceWorkerRegistration';
import './globals.css';

export const metadata: Metadata = {
  title: 'Fila Viva · Banco Demo',
  description: 'Tu turno y tu tiempo de espera real, actualizados en vivo.',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/icon.svg', apple: '/icon.svg' },
  appleWebApp: { capable: true, title: 'Fila Viva', statusBarStyle: 'black-translucent' },
};

export const viewport: Viewport = {
  themeColor: '#0B141C',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}

import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Fila Viva',
  description: 'Predicción inteligente de tiempos de espera',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}

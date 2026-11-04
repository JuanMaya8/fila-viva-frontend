import { AdvisorPanel } from '@/src/components/AdvisorPanel';

/** Rendering: CSR behind the role middleware; data arrives over an authenticated socket. */
export const metadata = { title: 'Panel del asesor · Fila Viva' };

export default function AdvisorPage() {
  return (
    <main className="page">
      <AdvisorPanel />
    </main>
  );
}

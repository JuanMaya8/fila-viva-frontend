import { Brand } from '@/src/components/Brand';
import { LiveTicket } from '@/src/components/LiveTicket';

/** Rendering: CSR. The ticket is private and live, so nothing is pre-rendered. */
export const metadata = { title: 'Mi turno · Fila Viva' };

export default function TurnPage({ params }: { params: { id: string } }) {
  return (
    <main className="page">
      <div className="topbar">
        <Brand />
      </div>
      <LiveTicket turnId={params.id} />
    </main>
  );
}

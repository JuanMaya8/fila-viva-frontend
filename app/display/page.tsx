import { LiveDisplay } from '@/src/components/LiveDisplay';
import { loadDisplay } from '@/src/lib/server-api';

/**
 * Rendering: SSR. The waiting-room screen is rendered on every request so
 * it shows the current state immediately, then stays live via Socket.io.
 * Only ticket codes and window numbers are shown: no personal data.
 */
export const dynamic = 'force-dynamic';

export const metadata = { title: 'Pantalla de sala · Fila Viva' };

export default async function DisplayPage() {
  const initial = await loadDisplay();
  return <LiveDisplay initial={initial} />;
}

import { Brand } from '@/src/components/Brand';
import { ServicePicker } from '@/src/components/ServicePicker';
import { loadCatalog } from '@/src/lib/server-api';

/**
 * Rendering: ISR. The service catalogue is pre-rendered and revalidated
 * every 30 s; live waiting times then arrive through Socket.io.
 */
export const revalidate = 30;

export const metadata = { title: 'Tomar turno · Fila Viva' };

export default async function TakeTurnPage() {
  const { institution, serviceTypes } = await loadCatalog(revalidate);
  return (
    <main className="page">
      <div className="topbar">
        <Brand subtitle={institution?.name} />
      </div>
      <span className="eyebrow">Paso 1 de 2</span>
      <h1>¿Qué trámite vas a hacer?</h1>
      <p className="ink-2">Elige uno: verás la espera real estimada antes de tomar tu turno.</p>
      <ServicePicker initialInstitution={institution} initialServiceTypes={serviceTypes} />
    </main>
  );
}

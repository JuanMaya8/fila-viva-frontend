'use client';

import { Activity } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api, pickInstitution } from '../lib/api';
import { formatMinutes } from '../lib/format';
import type { PublicServiceType } from '../lib/types';

/** Live snapshot of the branch shown on the landing page. */
export function BranchPulse() {
  const [types, setTypes] = useState<PublicServiceType[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const institution = pickInstitution(await api.institutions());
        const data = institution ? await api.publicServiceTypes(institution.id) : [];
        if (!cancelled) {
          setTypes(data);
        }
      } catch {
        if (!cancelled) {
          setFailed(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (failed) {
    return null;
  }

  const waiting = types?.reduce((sum, t) => sum + t.waiting, 0) ?? 0;
  const waits = (types ?? [])
    .map((t) => t.estimatedWaitMinutes)
    .filter((v): v is number => typeof v === 'number');
  const shortest = waits.length ? Math.min(...waits) : null;

  return (
    <section className="card soft" aria-live="polite" style={{ marginTop: '1rem' }}>
      <div className="spread" style={{ marginBottom: '0.75rem' }}>
        <h2 style={{ margin: 0 }}>La sucursal ahora</h2>
        <span className="chip live">
          <span className="dot" /> En vivo
        </span>
      </div>
      {types === null ? (
        <div className="skeleton" style={{ minHeight: 64 }} />
      ) : (
        <div className="live-stats">
          <div className="metric">
            <span className="label">En fila</span>
            <span className="value">{waiting}</span>
          </div>
          <div className="metric">
            <span className="label">Espera mínima</span>
            <span className="value ai">{formatMinutes(shortest)}</span>
          </div>
          <div className="metric">
            <span className="label">Trámites</span>
            <span className="value">{types.length}</span>
          </div>
        </div>
      )}
      <p className="tiny muted" style={{ marginTop: '0.6rem', display: 'flex', gap: 6, alignItems: 'center' }}>
        <Activity size={13} aria-hidden /> Estimaciones calculadas por la IA con el estado actual de la fila.
      </p>
    </section>
  );
}

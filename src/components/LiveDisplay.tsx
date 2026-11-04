'use client';

import { useCallback, useState } from 'react';
import { useNow } from '../hooks/useNow';
import { useRoom, useSocket } from '../hooks/useSocket';
import { api, pickInstitution } from '../lib/api';
import { formatMinutes } from '../lib/format';
import type { DisplayView } from '../lib/types';

export function LiveDisplay({ initial }: { initial: DisplayView | null }) {
  const { socket, connected } = useSocket();
  const [view, setView] = useState(initial);
  const now = useNow(15_000);

  const refresh = useCallback(async () => {
    try {
      const id = view?.institutionId ?? pickInstitution(await api.institutions())?.id;
      if (id) {
        setView(await api.display(id));
      }
    } catch {
      // Keep showing the last known state; the socket will retry.
    }
  }, [view]);

  useRoom<DisplayView>(
    socket,
    view ? { event: 'joinDisplay', id: view.institutionId } : null,
    'displayUpdate',
    setView,
    () => void refresh(),
  );

  if (!view) {
    return (
      <main className="display">
        <h1>Fila Viva</h1>
        <p className="callout warn">Conectando con la sucursal…</p>
      </main>
    );
  }

  return (
    <main className="display stack">
      <header className="spread">
        <div>
          <h1 style={{ margin: 0 }}>{view.institutionName}</h1>
          <p className="muted">Turnos en atención</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700 }}>
            {new Date(now).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
          </div>
          <span className={`chip ${connected ? 'live' : 'down'}`}>{connected ? '● En vivo' : '○ Reconectando…'}</span>
        </div>
      </header>

      {view.serving.length === 0 ? (
        <p className="card muted">En este momento no hay turnos llamados.</p>
      ) : (
        <section className="serving" aria-live="polite">
          {view.serving.map((item) => (
            <div key={item.ticketCode} className={`card ${item.status === 'called' ? 'accent' : ''}`}>
              <div className="code">{item.ticketCode}</div>
              <div className="big-window">Ventanilla {item.windowNumber}</div>
              <p className="muted small">{item.status === 'called' ? 'Pase ahora' : 'En atención'}</p>
            </div>
          ))}
        </section>
      )}

      <div className="grid two">
        <section className="card">
          <h2>Próximos turnos</h2>
          {view.upcoming.length === 0 ? (
            <p className="muted">No hay personas esperando.</p>
          ) : (
            <p style={{ fontSize: '1.4rem', fontWeight: 700, letterSpacing: '0.03em' }}>
              {view.upcoming.map((item) => item.ticketCode).join('   ·   ')}
            </p>
          )}
        </section>
        <section className="card ai">
          <h2>Espera estimada por trámite</h2>
          <table>
            <tbody>
              {view.queues.map((queue) => (
                <tr key={queue.serviceTypeId}>
                  <td>
                    {queue.prefix} · {queue.name}
                  </td>
                  <td>{queue.waiting} en fila</td>
                  <td style={{ color: 'var(--teal)' }}>{formatMinutes(queue.estimatedWaitMinutes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}

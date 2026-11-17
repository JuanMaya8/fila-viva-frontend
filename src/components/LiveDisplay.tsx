'use client';

import { BellRing, Clock3, ListOrdered, Volume2 } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useNow } from '../hooks/useNow';
import { useRoom, useSocket } from '../hooks/useSocket';
import { api, pickInstitution } from '../lib/api';
import { formatMinutes } from '../lib/format';
import type { DisplayView } from '../lib/types';
import { Brand } from './Brand';
import { ServiceIcon } from './ui/visuals';

export function LiveDisplay({ initial }: { initial: DisplayView | null }) {
  const { socket, connected } = useSocket();
  const [view, setView] = useState(initial);
  const now = useNow(10_000);

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
      <main className="display stack">
        <Brand />
        <p className="callout warn">
          <Clock3 size={18} aria-hidden /> Conectando con la sucursal…
        </p>
      </main>
    );
  }

  const calling = view.serving.filter((item) => item.status === 'called');
  const attending = view.serving.filter((item) => item.status !== 'called');

  return (
    <main className="display stack">
      <header className="spread">
        <Brand subtitle={view.institutionName} />
        <div style={{ textAlign: 'right' }}>
          <div className="clock" suppressHydrationWarning>
            {new Date(now).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
          </div>
          <span className={`chip ${connected ? 'live' : 'down'}`}>
            <span className="dot" />
            {connected ? 'En vivo' : 'Reconectando…'}
          </span>
        </div>
      </header>

      <section>
        <h2 className="row" style={{ gap: 8 }}>
          <BellRing size={22} aria-hidden /> Llamando ahora
        </h2>
        {view.serving.length === 0 ? (
          <div className="card empty">
            <Volume2 size={34} aria-hidden />
            <p>En este momento no hay turnos llamados.</p>
          </div>
        ) : (
          <div className="serving" aria-live="assertive">
            {[...calling, ...attending].map((item) => (
              <div key={item.ticketCode} className={`card ${item.status === 'called' ? 'calling' : 'flat'}`}>
                <div className="code">{item.ticketCode}</div>
                <div className="row" style={{ justifyContent: 'center', gap: 6 }}>
                  <span className="small ink-2" style={{ fontWeight: 700 }}>
                    Ventanilla
                  </span>
                  <span style={{ fontSize: '2rem', fontWeight: 800 }}>{item.windowNumber}</span>
                </div>
                <span className={`chip ${item.status === 'called' ? 'live' : ''}`}>
                  {item.status === 'called' ? 'Pase ahora' : 'En atención'}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid wide-left" style={{ alignItems: 'start' }}>
        <section className="card">
          <h2 className="row" style={{ gap: 8 }}>
            <ListOrdered size={20} aria-hidden /> Próximos turnos
          </h2>
          {view.upcoming.length === 0 ? (
            <p className="muted">No hay personas esperando.</p>
          ) : (
            <div className="ticker">
              {view.upcoming.map((item) => (
                <span key={item.ticketCode} title={item.serviceTypeName}>
                  {item.ticketCode}
                </span>
              ))}
            </div>
          )}
        </section>
        <section className="card ai">
          <h2 className="row" style={{ gap: 8 }}>
            <Clock3 size={20} aria-hidden /> Espera estimada
          </h2>
          <div className="stack tight">
            {view.queues.map((queue) => (
              <div key={queue.serviceTypeId} className="spread">
                <span className="row nowrap small" style={{ gap: 8 }}>
                  <span className="icon-badge" style={{ width: 30, height: 30, borderRadius: 9 }}>
                    <ServiceIcon prefix={queue.prefix} size={15} />
                  </span>
                  {queue.name}
                  <span className="muted tiny">· {queue.waiting} en fila</span>
                </span>
                <span className="wait-pill">{formatMinutes(queue.estimatedWaitMinutes)}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

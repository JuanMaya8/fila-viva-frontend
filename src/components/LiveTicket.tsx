'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useCountdown } from '../hooks/useCountdown';
import { useRoom, useSocket } from '../hooks/useSocket';
import { forgetTurn } from '../lib/active-turn';
import { api, ApiError } from '../lib/api';
import {
  CONGESTION_LABEL,
  formatCountdown,
  formatMinutes,
  SOURCE_LABEL,
  TURN_STATUS_LABEL,
} from '../lib/format';
import { canAskNotifications, notify } from '../lib/notify';
import type { TurnResponse } from '../lib/types';

const SOON_MINUTES = 5;
const CLOSED = new Set(['completed', 'absent', 'cancelled']);

export function LiveTicket({ turnId }: { turnId: string }) {
  const { socket, connected } = useSocket();
  const [turn, setTurn] = useState<TurnResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [askNotifications, setAskNotifications] = useState(false);
  const warnedSoon = useRef(false);
  const notifiedCall = useRef<string | null>(null);

  const load = useCallback(async () => {
    try {
      setTurn(await api.turn(turnId));
      setError(null);
    } catch (err) {
      setError(
        err instanceof ApiError && (err.status === 404 || err.status === 400)
          ? 'Este turno no existe. Revisa el enlace o toma uno nuevo.'
          : err instanceof ApiError
            ? err.message
            : 'No se pudo cargar tu turno.',
      );
    }
  }, [turnId]);

  useEffect(() => {
    void load();
    setAskNotifications(canAskNotifications());
  }, [load]);

  useRoom<TurnResponse>(
    socket,
    { event: 'joinTurn', id: turnId },
    'turnUpdate',
    (update) => {
      if (update.id === turnId) {
        setTurn(update);
      }
    },
    () => void load(),
  );

  const waiting = turn?.status === 'created';
  const seconds = useCountdown(waiting ? (turn?.estimatedWaitMinutes ?? null) : null);

  useEffect(() => {
    if (!turn) {
      return;
    }
    if (
      turn.status === 'created' &&
      turn.estimatedWaitMinutes !== null &&
      turn.estimatedWaitMinutes <= SOON_MINUTES &&
      turn.peopleAhead > 0 &&
      !warnedSoon.current
    ) {
      warnedSoon.current = true;
      notify('Ya casi es tu turno', `Faltan unos ${formatMinutes(turn.estimatedWaitMinutes)}. Acércate a la sala.`);
    }
    if (turn.status === 'called' && notifiedCall.current !== turn.calledAt) {
      notifiedCall.current = turn.calledAt;
      notify(`Turno ${turn.ticketCode}`, `Pase a la ventanilla ${turn.windowNumber ?? ''}`);
    }
    if (CLOSED.has(turn.status)) {
      forgetTurn(turn.id);
    }
  }, [turn]);

  async function cancel() {
    if (!turn || !window.confirm('¿Seguro que quieres cancelar tu turno?')) {
      return;
    }
    setCancelling(true);
    try {
      setTurn(await api.cancelTurn(turn.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cancelar el turno.');
    } finally {
      setCancelling(false);
    }
  }

  async function enableNotifications() {
    await Notification.requestPermission().catch(() => undefined);
    setAskNotifications(canAskNotifications());
  }

  if (error && !turn) {
    return (
      <div className="stack">
        <p className="callout error" role="alert">
          {error}
        </p>
        <Link className="button block" href="/turno">
          Tomar un turno
        </Link>
      </div>
    );
  }

  if (!turn) {
    return (
      <div className="stack" aria-busy>
        <div className="skeleton" style={{ minHeight: 160 }} />
        <div className="skeleton" />
      </div>
    );
  }

  const soon =
    waiting && turn.estimatedWaitMinutes !== null && turn.estimatedWaitMinutes <= SOON_MINUTES;
  const maxBar = Math.max(1, turn.estimatedWaitMinutes ?? 0, turn.traditionalEstimateMinutes ?? 0);

  return (
    <div className="stack">
      <div className="spread">
        <span className={`chip ${connected ? 'live' : 'down'}`}>
          {connected ? '● En vivo' : '○ Reconectando…'}
        </span>
        <span className="chip">{TURN_STATUS_LABEL[turn.status]}</span>
      </div>

      <section className="card accent" aria-live="polite">
        <p className="muted small">Turno · {turn.serviceTypeName}</p>
        <div className="ticket-code">{turn.ticketCode}</div>
        {turn.preferential && <span className="chip" style={{ marginTop: '0.5rem' }}>Preferencial</span>}
      </section>

      {turn.status === 'called' && (
        <section className="callout go" role="alert">
          <p>¡Es tu turno!</p>
          <div className="big-window">Pase a ventanilla {turn.windowNumber}</div>
        </section>
      )}

      {turn.status === 'in_service' && (
        <section className="callout go">
          Te están atendiendo en la ventanilla {turn.windowNumber}.
        </section>
      )}

      {turn.status === 'completed' && <section className="callout go">Atención finalizada. ¡Gracias por tu visita!</section>}
      {turn.status === 'absent' && (
        <section className="callout warn">
          Te llamamos y no llegaste a tiempo, así que el turno se marcó como ausente. Puedes tomar uno nuevo.
        </section>
      )}
      {turn.status === 'cancelled' && <section className="callout warn">Cancelaste este turno.</section>}

      {waiting && (
        <>
          {soon && turn.peopleAhead > 0 && (
            <section className="callout warn" role="status">
              Faltan 5 minutos o menos. Acércate a la zona de ventanillas.
            </section>
          )}
          <section className="card ai">
            <div className="grid two">
              <div className="metric">
                <span className="label">Personas delante</span>
                <span className="value">{turn.peopleAhead}</span>
              </div>
              <div className="metric">
                <span className="label">Confianza</span>
                <span className="value ai">{turn.confidence ?? '—'}%</span>
              </div>
            </div>
            <div className="metric" style={{ marginTop: '1rem' }}>
              <span className="label">Tiempo estimado</span>
              <span className="countdown">{seconds === null ? '—' : formatCountdown(seconds)}</span>
              {turn.lowerMinutes !== null && turn.upperMinutes !== null && (
                <span className="muted small">
                  Entre {formatMinutes(turn.lowerMinutes)} y {formatMinutes(turn.upperMinutes)}
                </span>
              )}
            </div>
            {turn.congestionLevel && (
              <span className={`chip ${turn.congestionLevel}`} style={{ marginTop: '0.75rem' }}>
                {CONGESTION_LABEL[turn.congestionLevel]}
              </span>
            )}
          </section>

          <section className="card">
            <h2>IA vs. método tradicional</h2>
            <p className="muted small">
              El método tradicional multiplica tu posición por un promedio fijo. La IA mira el trámite de cada
              persona, los asesores activos y cómo va cada atención.
            </p>
            <div className="stack" style={{ marginTop: '0.75rem' }}>
              <div>
                <div className="spread small">
                  <span>IA ({turn.source ? SOURCE_LABEL[turn.source] : '—'})</span>
                  <strong>{formatMinutes(turn.estimatedWaitMinutes)}</strong>
                </div>
                <div className="bar ai">
                  <span style={{ width: `${((turn.estimatedWaitMinutes ?? 0) / maxBar) * 100}%` }} />
                </div>
              </div>
              <div>
                <div className="spread small">
                  <span>Tradicional</span>
                  <strong>{formatMinutes(turn.traditionalEstimateMinutes)}</strong>
                </div>
                <div className="bar traditional">
                  <span style={{ width: `${((turn.traditionalEstimateMinutes ?? 0) / maxBar) * 100}%` }} />
                </div>
              </div>
            </div>
          </section>

          {askNotifications && (
            <button className="secondary block" onClick={() => void enableNotifications()}>
              Avisarme con una notificación
            </button>
          )}
        </>
      )}

      {error && (
        <p className="callout error" role="alert">
          {error}
        </p>
      )}

      {(turn.status === 'created' || turn.status === 'called') && (
        <button className="danger block" onClick={() => void cancel()} disabled={cancelling}>
          {cancelling ? 'Cancelando…' : 'Cancelar mi turno'}
        </button>
      )}

      {CLOSED.has(turn.status) && (
        <Link className="button block" href="/turno">
          Tomar otro turno
        </Link>
      )}

      <p className="muted small" style={{ textAlign: 'center' }}>
        Guarda esta página: tu turno se actualiza solo, sin recargar.
      </p>
    </div>
  );
}

'use client';

import {
  AlertCircle,
  BellRing,
  BrainCircuit,
  CheckCircle2,
  Footprints,
  Gauge,
  Share2,
  Ticket,
  Users,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useCountdown } from '../hooks/useCountdown';
import { useRoom, useSocket } from '../hooks/useSocket';
import { forgetTurn } from '../lib/active-turn';
import { api, ApiError } from '../lib/api';
import { CONGESTION_LABEL, formatCountdown, formatMinutes, SOURCE_LABEL } from '../lib/format';
import { canAskNotifications, notify } from '../lib/notify';
import type { TurnResponse } from '../lib/types';
import { waitProgress } from '../lib/visual';
import { useToast } from './ui/Toaster';
import { IntervalBar, ProgressRing, QueueDots, StatusStepper } from './ui/visuals';

const SOON_MINUTES = 5;
const CLOSED = new Set(['completed', 'absent', 'cancelled']);

export function LiveTicket({ turnId }: { turnId: string }) {
  const toast = useToast();
  const { socket, connected } = useSocket();
  const [turn, setTurn] = useState<TurnResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [askNotifications, setAskNotifications] = useState(false);
  const warnedSoon = useRef(false);
  const notifiedCall = useRef<string | null>(null);
  const longestWait = useRef<number | null>(null);
  const previousStatus = useRef<string | null>(null);

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
  if (waiting && turn?.estimatedWaitMinutes !== null && turn?.estimatedWaitMinutes !== undefined) {
    longestWait.current = Math.max(longestWait.current ?? 0, turn.estimatedWaitMinutes * 60);
  }

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
      const body = `Faltan unos ${formatMinutes(turn.estimatedWaitMinutes)}. Acércate a la zona de ventanillas.`;
      notify('Ya casi es tu turno', body);
      toast({ tone: 'warn', title: 'Ya casi es tu turno', body });
    }
    if (turn.status === 'called' && notifiedCall.current !== turn.calledAt) {
      notifiedCall.current = turn.calledAt;
      notify(`Turno ${turn.ticketCode}`, `Pase a la ventanilla ${turn.windowNumber ?? ''}`);
      toast({ tone: 'success', title: '¡Es tu turno!', body: `Pase a la ventanilla ${turn.windowNumber ?? ''}` });
    }
    if (previousStatus.current && previousStatus.current !== turn.status && turn.status === 'absent') {
      toast({ tone: 'error', title: 'Turno marcado como ausente' });
    }
    previousStatus.current = turn.status;
    if (CLOSED.has(turn.status)) {
      forgetTurn(turn.id);
    }
  }, [turn, toast]);

  async function cancel() {
    if (!turn || !window.confirm('¿Seguro que quieres cancelar tu turno?')) {
      return;
    }
    setCancelling(true);
    try {
      setTurn(await api.cancelTurn(turn.id));
      toast({ tone: 'info', title: 'Turno cancelado' });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cancelar el turno.');
    } finally {
      setCancelling(false);
    }
  }

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: `Mi turno ${turn?.ticketCode ?? ''}`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast({ tone: 'success', title: 'Enlace copiado', body: 'Ábrelo en otro dispositivo para seguir tu turno.' });
    } catch {
      // The user closed the share sheet.
    }
  }

  async function enableNotifications() {
    await Notification.requestPermission().catch(() => undefined);
    setAskNotifications(canAskNotifications());
    if (Notification.permission === 'granted') {
      toast({ tone: 'success', title: 'Avisos activados', body: 'Te avisaremos cuando falte poco y cuando te llamen.' });
    }
  }

  if (error && !turn) {
    return (
      <div className="stack">
        <p className="callout error" role="alert">
          <AlertCircle size={18} aria-hidden />
          {error}
        </p>
        <Link className="button block" href="/turno">
          <Ticket size={18} aria-hidden /> Tomar un turno
        </Link>
      </div>
    );
  }

  if (!turn) {
    return (
      <div className="stack" aria-busy>
        <div className="skeleton" style={{ minHeight: 170 }} />
        <div className="skeleton" style={{ minHeight: 220 }} />
      </div>
    );
  }

  const soon = waiting && turn.estimatedWaitMinutes !== null && turn.estimatedWaitMinutes <= SOON_MINUTES;
  const difference =
    turn.estimatedWaitMinutes !== null && turn.traditionalEstimateMinutes !== null
      ? turn.traditionalEstimateMinutes - turn.estimatedWaitMinutes
      : null;
  const maxBar = Math.max(1, turn.estimatedWaitMinutes ?? 0, turn.traditionalEstimateMinutes ?? 0);

  return (
    <div className="ticket-layout fade-in">
      <div className="ticket-side">
      <section className="ticket-hero" aria-live="polite">
        <div className="spread">
          <span className="label">Tu turno · {turn.serviceTypeName}</span>
          <span className="chip">
            <span className="dot" style={{ background: connected ? '#b8f5c9' : '#ffd1c9' }} />
            {connected ? 'En vivo' : 'Reconectando…'}
          </span>
        </div>
        <div className="ticket-code" style={{ margin: '0.6rem 0 0.4rem' }}>
          {turn.ticketCode}
        </div>
        <div className="row">
          {turn.preferential && <span className="chip">Preferencial</span>}
          <button
            className="ghost"
            onClick={() => void share()}
            style={{ color: '#fff', minHeight: 32, padding: '0.3rem 0.6rem', marginLeft: 'auto' }}
          >
            <Share2 size={16} aria-hidden /> Compartir
          </button>
        </div>
        <div className="ticket-notch" />
      </section>
      </div>

      <div className="ticket-main stack">

      {!CLOSED.has(turn.status) || turn.status === 'completed' ? (
        <section className="card flat">
          <StatusStepper status={turn.status} />
        </section>
      ) : null}

      {turn.status === 'called' && (
        <section className="called-banner" role="alert">
          <Footprints size={28} aria-hidden />
          <p style={{ fontWeight: 700, opacity: 0.9 }}>¡Es tu turno! Pase a</p>
          <div className="window">Ventanilla {turn.windowNumber}</div>
        </section>
      )}

      {turn.status === 'in_service' && (
        <section className="callout go">
          <CheckCircle2 size={20} aria-hidden />
          Te están atendiendo en la ventanilla {turn.windowNumber}.
        </section>
      )}
      {turn.status === 'completed' && (
        <section className="callout go">
          <CheckCircle2 size={20} aria-hidden />
          Atención finalizada. ¡Gracias por tu visita!
        </section>
      )}
      {turn.status === 'absent' && (
        <section className="callout warn">
          <AlertCircle size={20} aria-hidden />
          Te llamamos y no llegaste a tiempo, así que el turno se marcó como ausente. Puedes tomar uno nuevo.
        </section>
      )}
      {turn.status === 'cancelled' && (
        <section className="callout warn">
          <XCircle size={20} aria-hidden />
          Cancelaste este turno.
        </section>
      )}

      {waiting && (
        <>
          {soon && turn.peopleAhead > 0 && (
            <section className="callout warn" role="status">
              <BellRing size={20} aria-hidden />
              Faltan 5 minutos o menos. Acércate a la zona de ventanillas.
            </section>
          )}

          <section className="card ai">
            <div className="grid two" style={{ alignItems: 'center' }}>
              <div style={{ display: 'grid', placeItems: 'center' }}>
                <ProgressRing progress={waitProgress(seconds, longestWait.current)}>
                  <span className="tiny muted" style={{ fontWeight: 700 }}>
                    TIEMPO ESTIMADO
                  </span>
                  <span className="countdown">{seconds === null ? '—' : formatCountdown(seconds)}</span>
                  {turn.confidence !== null && <span className="chip ai">{turn.confidence}% confianza</span>}
                </ProgressRing>
              </div>
              <div className="stack">
                <div>
                  <div className="row" style={{ gap: 6, marginBottom: 6 }}>
                    <Users size={16} aria-hidden className="muted" />
                    <span className="small ink-2" style={{ fontWeight: 700 }}>
                      {turn.peopleAhead === 0
                        ? 'Eres el siguiente'
                        : `${turn.peopleAhead} ${turn.peopleAhead === 1 ? 'persona' : 'personas'} delante`}
                    </span>
                  </div>
                  <QueueDots peopleAhead={turn.peopleAhead} />
                </div>
                <div>
                  <div className="row" style={{ gap: 6, marginBottom: 6 }}>
                    <Gauge size={16} aria-hidden className="muted" />
                    <span className="small ink-2" style={{ fontWeight: 700 }}>
                      Confianza de la estimación
                    </span>
                  </div>
                  <div className="meter ai">
                    <span style={{ width: `${turn.confidence ?? 0}%` }} />
                  </div>
                </div>
                {turn.congestionLevel && (
                  <span className={`chip ${turn.congestionLevel}`} style={{ width: 'fit-content' }}>
                    <span className="dot" />
                    {CONGESTION_LABEL[turn.congestionLevel]}
                  </span>
                )}
              </div>
            </div>
            {turn.lowerMinutes !== null && turn.upperMinutes !== null && turn.estimatedWaitMinutes !== null && (
              <>
                <hr className="divider" />
                <p className="tiny muted" style={{ fontWeight: 700, marginBottom: 4 }}>
                  RANGO PROBABLE (80 % DE LAS VECES)
                </p>
                <IntervalBar
                  lower={turn.lowerMinutes}
                  value={turn.estimatedWaitMinutes}
                  upper={turn.upperMinutes}
                />
              </>
            )}
          </section>

          <section className="card">
            <div className="card-title">
              <span className="icon-badge ai">
                <BrainCircuit size={20} aria-hidden />
              </span>
              <div>
                <h2 style={{ margin: 0 }}>IA vs. método tradicional</h2>
                <p className="tiny muted" style={{ margin: 0 }}>
                  {turn.source ? SOURCE_LABEL[turn.source] : '—'}
                </p>
              </div>
            </div>
            <div className="stack tight">
              <div>
                <div className="spread small">
                  <span className="ink-2">Fila Viva (IA)</span>
                  <strong className="num">{formatMinutes(turn.estimatedWaitMinutes)}</strong>
                </div>
                <div className="meter ai">
                  <span style={{ width: `${((turn.estimatedWaitMinutes ?? 0) / maxBar) * 100}%` }} />
                </div>
              </div>
              <div>
                <div className="spread small">
                  <span className="ink-2">Tradicional (posición × promedio)</span>
                  <strong className="num">{formatMinutes(turn.traditionalEstimateMinutes)}</strong>
                </div>
                <div className="meter traditional">
                  <span style={{ width: `${((turn.traditionalEstimateMinutes ?? 0) / maxBar) * 100}%` }} />
                </div>
              </div>
              {difference !== null && Math.abs(difference) >= 1 && (
                <p className="small ink-2" style={{ marginTop: 4 }}>
                  {difference > 0
                    ? `El método tradicional te diría ${formatMinutes(difference)} más de lo que realmente esperarás.`
                    : `El método tradicional se queda corto por ${formatMinutes(-difference)}: no ve las atenciones largas en curso.`}
                </p>
              )}
            </div>
          </section>

          {askNotifications && (
            <button className="secondary block" onClick={() => void enableNotifications()}>
              <BellRing size={18} aria-hidden /> Avisarme con una notificación
            </button>
          )}
        </>
      )}

      {error && (
        <p className="callout error" role="alert">
          <AlertCircle size={18} aria-hidden />
          {error}
        </p>
      )}

      {(turn.status === 'created' || turn.status === 'called') && (
        <button className="danger block" onClick={() => void cancel()} disabled={cancelling}>
          <XCircle size={18} aria-hidden />
          {cancelling ? 'Cancelando…' : 'Cancelar mi turno'}
        </button>
      )}

      {CLOSED.has(turn.status) && (
        <Link className="button block" href="/turno">
          <Ticket size={18} aria-hidden /> Tomar otro turno
        </Link>
      )}

      <p className="tiny muted" style={{ textAlign: 'center' }}>
        Guarda esta página: tu turno se actualiza solo, sin recargar.
      </p>
      </div>
    </div>
  );
}

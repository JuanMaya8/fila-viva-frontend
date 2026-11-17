'use client';

import {
  AlertCircle,
  BrainCircuit,
  CheckCheck,
  Coffee,
  Megaphone,
  PlayCircle,
  SkipForward,
  UserCheck,
  UserX,
  Users,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNow } from '../hooks/useNow';
import { useRoom, useSocket } from '../hooks/useSocket';
import { api, ApiError } from '../lib/api';
import { AGENT_STATUS_LABEL, CONGESTION_LABEL, formatCountdown, formatMinutes } from '../lib/format';
import type { AdvisorCurrentTurn, AdvisorView } from '../lib/types';
import { initials } from '../lib/visual';
import { LogoutButton } from './LogoutButton';
import { useToast } from './ui/Toaster';
import { ProgressRing, ServiceIcon } from './ui/visuals';

const NOTES_DEBOUNCE_MS = 800;

export function AdvisorPanel() {
  const router = useRouter();
  const toast = useToast();
  const { socket, connected } = useSocket(true);
  const [view, setView] = useState<AdvisorView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setView(await api.advisorMe());
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace('/?next=/advisor');
        return;
      }
      setError(err instanceof ApiError ? err.message : 'No se pudo cargar tu panel.');
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  useRoom<AdvisorView>(socket, null, 'advisorUpdate', setView, () => void load());

  const run = useCallback(
    async (label: string, action: () => Promise<unknown>) => {
      setPending(label);
      setError(null);
      try {
        await action();
        await load();
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'No se pudo completar la acción.');
      } finally {
        setPending(null);
      }
    },
    [load],
  );

  const callNext = useCallback(
    () =>
      run('call', async () => {
        const { turn } = await api.callNext();
        toast(
          turn
            ? { tone: 'success', title: `Llamando a ${turn.ticketCode}`, body: turn.serviceTypeName }
            : { tone: 'info', title: 'No hay turnos en espera', body: 'Nadie espera en tus trámites.' },
        );
      }),
    [run, toast],
  );

  async function complete(callNextAfter: boolean) {
    const current = view?.currentTurn;
    if (!current) {
      return;
    }
    await run(callNextAfter ? 'complete-next' : 'complete', async () => {
      const { next } = await api.completeTurn(current.id, callNextAfter);
      toast(
        callNextAfter && next
          ? { tone: 'success', title: `${current.ticketCode} finalizado`, body: `Llamando a ${next.ticketCode}` }
          : { tone: 'success', title: `${current.ticketCode} finalizado` },
      );
    });
  }

  // Keyboard shortcut: N calls the next turn when the advisor is free.
  const canCall = view?.status === 'available' && !view.currentTurn && pending === null;
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        return;
      }
      if (event.key.toLowerCase() === 'n' && canCall) {
        event.preventDefault();
        void callNext();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canCall, callNext]);

  if (!view) {
    return error ? (
      <div className="stack">
        <p className="callout error" role="alert">
          <AlertCircle size={18} aria-hidden />
          {error}
        </p>
        <button onClick={() => void load()}>Reintentar</button>
      </div>
    ) : (
      <div className="stack" aria-busy>
        <div className="skeleton" />
        <div className="skeleton" style={{ minHeight: 260 }} />
      </div>
    );
  }

  const current = view.currentTurn;
  const waitingTotal = view.queues.reduce((sum, q) => sum + q.waiting, 0);

  return (
    <div className="stack fade-in">
      <header className="card">
        <div className="spread">
          <div className="row" style={{ gap: '0.8rem' }}>
            <span className="avatar">{initials(view.fullName)}</span>
            <div>
              <h1 style={{ fontSize: '1.3rem', margin: 0 }}>Ventanilla {view.windowNumber}</h1>
              <p className="muted small" style={{ margin: 0 }}>
                {view.fullName}
              </p>
            </div>
          </div>
          <div className="row">
            <span className={`chip ${connected ? 'live' : 'down'}`}>
              <span className="dot" />
              {connected ? 'En vivo' : 'Reconectando…'}
            </span>
            <LogoutButton />
          </div>
        </div>
        <hr className="divider" />
        <div className="spread">
          <span className="small ink-2">
            Estado: <span className={`chip ${view.status}`}>{AGENT_STATUS_LABEL[view.status]}</span>
          </span>
          <div className="segmented" role="group" aria-label="Cambiar estado">
            <button
              className={view.status === 'available' ? 'on available' : ''}
              disabled={Boolean(current) || pending !== null}
              onClick={() => void run('status', () => api.setMyStatus('available'))}
            >
              <UserCheck size={16} aria-hidden /> Disponible
            </button>
            <button
              className={view.status === 'on_break' ? 'on on_break' : ''}
              disabled={Boolean(current) || pending !== null}
              onClick={() => void run('status', () => api.setMyStatus('on_break'))}
            >
              <Coffee size={16} aria-hidden /> En pausa
            </button>
          </div>
        </div>
        {current && (
          <p className="tiny muted" style={{ marginTop: 6 }}>
            Finaliza la atención actual para cambiar tu estado.
          </p>
        )}
      </header>

      {error && (
        <p className="callout error" role="alert">
          <AlertCircle size={18} aria-hidden />
          {error}
        </p>
      )}

      {current ? (
        <CurrentTurnCard
          key={current.id}
          turn={current}
          absentTimeoutMinutes={view.absentTimeoutMinutes}
          pending={pending}
          onStart={() =>
            void run('start', async () => {
              await api.startTurn(current.id);
              toast({ tone: 'info', title: `Atendiendo a ${current.ticketCode}` });
            })
          }
          onAbsent={() =>
            void run('absent', async () => {
              await api.markAbsent(current.id);
              toast({ tone: 'warn', title: `${current.ticketCode} marcado ausente` });
            })
          }
          onComplete={(next) => void complete(next)}
          onError={setError}
        />
      ) : (
        <section className="card accent stack" style={{ textAlign: 'center' }}>
          <span className="icon-badge" style={{ margin: '0 auto', width: 56, height: 56 }}>
            <Megaphone size={26} aria-hidden />
          </span>
          <div>
            <h2 style={{ margin: 0 }}>{waitingTotal > 0 ? `${waitingTotal} en espera` : 'Sin personas en espera'}</h2>
            <p className="small muted">
              {view.status === 'available'
                ? 'Llama al siguiente turno de tus trámites.'
                : 'Ponte en Disponible para llamar turnos.'}
            </p>
          </div>
          <button className="big block" disabled={!canCall} onClick={() => void callNext()}>
            <SkipForward size={20} aria-hidden />
            {pending === 'call' ? 'Llamando…' : 'Llamar siguiente'}
          </button>
          <p className="tiny muted">
            Atajo: <span className="kbd">N</span>
          </p>
        </section>
      )}

      <section className="card">
        <div className="card-title">
          <span className="icon-badge honey">
            <Users size={20} aria-hidden />
          </span>
          <h2 style={{ margin: 0 }}>Tus filas</h2>
        </div>
        {view.queues.length === 0 ? (
          <p className="muted small">Sin datos de filas por ahora.</p>
        ) : (
          <div className="stack tight">
            {view.queues.map((queue) => (
              <div key={queue.serviceTypeId} className="spread" style={{ padding: '0.35rem 0' }}>
                <div className="row nowrap" style={{ gap: '0.6rem' }}>
                  <span className="icon-badge" style={{ width: 34, height: 34 }}>
                    <ServiceIcon prefix={queue.prefix} size={17} />
                  </span>
                  <div>
                    <strong className="small">{queue.name}</strong>
                    <p className="tiny muted" style={{ margin: 0 }}>
                      {queue.waiting} en fila · nuevo turno ~{formatMinutes(queue.estimatedWaitMinutes)}
                    </p>
                  </div>
                </div>
                <span className={`chip ${queue.congestionLevel}`}>{CONGESTION_LABEL[queue.congestionLevel]}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

interface CurrentTurnProps {
  turn: AdvisorCurrentTurn;
  absentTimeoutMinutes: number;
  pending: string | null;
  onStart: () => void;
  onAbsent: () => void;
  onComplete: (callNext: boolean) => void;
  onError: (message: string) => void;
}

function CurrentTurnCard({
  turn,
  absentTimeoutMinutes,
  pending,
  onStart,
  onAbsent,
  onComplete,
  onError,
}: CurrentTurnProps) {
  const now = useNow();
  const [completed, setCompleted] = useState<string[]>(turn.completedStepIds);
  const [notes, setNotes] = useState(turn.notes);
  const [isComplex, setIsComplex] = useState(turn.isComplex);
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setCompleted(turn.completedStepIds), [turn.completedStepIds]);
  useEffect(() => setIsComplex(turn.isComplex), [turn.isComplex]);
  useEffect(
    () => () => {
      if (notesTimer.current) {
        clearTimeout(notesTimer.current);
      }
    },
    [],
  );

  const save = useCallback(
    (progress: { completedStepIds?: string[]; notes?: string; isComplex?: boolean }) =>
      api.updateProgress(turn.id, progress).catch((err: unknown) =>
        onError(err instanceof ApiError ? err.message : 'No se pudo guardar el progreso.'),
      ),
    [turn.id, onError],
  );

  function toggleStep(stepId: string) {
    const next = completed.includes(stepId)
      ? completed.filter((id) => id !== stepId)
      : [...completed, stepId];
    setCompleted(next);
    void save({ completedStepIds: next });
  }

  function changeNotes(value: string) {
    setNotes(value);
    if (notesTimer.current) {
      clearTimeout(notesTimer.current);
    }
    notesTimer.current = setTimeout(() => void save({ notes: value }), NOTES_DEBOUNCE_MS);
  }

  const inService = turn.status === 'in_service';
  const since = Date.parse((inService ? turn.startedAt : turn.calledAt) ?? '') || now;
  const elapsedSeconds = (now - since) / 1000;
  const absentInSeconds = absentTimeoutMinutes * 60 - elapsedSeconds;
  const expectedSeconds = (turn.expectedTotalMinutes ?? 0) * 60;
  const stepShare = turn.steps.length ? completed.length / turn.steps.length : 0;

  return (
    <section className="card accent stack">
      <div className="spread">
        <div className="row" style={{ gap: '0.75rem' }}>
          <span className="icon-badge" style={{ width: 48, height: 48 }}>
            <ServiceIcon prefix={turn.ticketCode.split('-')[0]} size={24} />
          </span>
          <div>
            <div className="ticket-code" style={{ fontSize: '2.2rem', color: 'var(--primary)' }}>
              {turn.ticketCode}
            </div>
            <p className="muted small" style={{ margin: 0 }}>
              {turn.serviceTypeName}
            </p>
          </div>
        </div>
        {turn.preferential && <span className="chip medium">Preferencial</span>}
      </div>

      {!inService && (
        <>
          <p className="callout info">
            <Megaphone size={18} aria-hidden />
            Cliente llamado. Esperando que llegue a la ventanilla.
          </p>
          <div>
            <div className="spread tiny muted" style={{ marginBottom: 4 }}>
              <span>Ausente automático</span>
              <span className="num">{formatCountdown(Math.max(0, absentInSeconds))}</span>
            </div>
            <div className="meter">
              <span style={{ width: `${Math.min(100, (elapsedSeconds / (absentTimeoutMinutes * 60)) * 100)}%` }} />
            </div>
          </div>
          <div className="grid two">
            <button className="success" disabled={pending !== null} onClick={onStart}>
              <PlayCircle size={18} aria-hidden />
              {pending === 'start' ? 'Iniciando…' : 'Llegó: iniciar atención'}
            </button>
            <button className="danger" disabled={pending !== null} onClick={onAbsent}>
              <UserX size={18} aria-hidden /> Marcar ausente
            </button>
          </div>
        </>
      )}

      {inService && (
        <>
          <div className="grid two" style={{ alignItems: 'center' }}>
            <div style={{ display: 'grid', placeItems: 'center' }}>
              <ProgressRing progress={expectedSeconds ? elapsedSeconds / expectedSeconds : 0} size={150} stroke={11}>
                <span className="tiny muted" style={{ fontWeight: 700 }}>
                  EN ATENCIÓN
                </span>
                <span className="countdown" style={{ fontSize: '1.9rem' }}>
                  {formatCountdown(elapsedSeconds)}
                </span>
              </ProgressRing>
            </div>
            <div className="stack tight">
              <div className="kpi">
                <span className="icon-badge ai">
                  <BrainCircuit size={20} aria-hidden />
                </span>
                <div className="metric">
                  <span className="label">Restante (IA)</span>
                  <span className="value ai">{formatMinutes(turn.remainingMinutes)}</span>
                </div>
              </div>
              {turn.lowerMinutes !== null && turn.upperMinutes !== null && (
                <span className="tiny muted">
                  Rango: {formatMinutes(turn.lowerMinutes)} – {formatMinutes(turn.upperMinutes)}
                </span>
              )}
              <span className="tiny muted">Total esperado: {formatMinutes(turn.expectedTotalMinutes)}</span>
            </div>
          </div>

          <div>
            <div className="spread" style={{ marginBottom: 6 }}>
              <h3 style={{ margin: 0 }}>Pasos de la atención</h3>
              <span className="small ink-2 num">
                {completed.length}/{turn.steps.length}
              </span>
            </div>
            <div className="meter" style={{ marginBottom: 10 }}>
              <span style={{ width: `${stepShare * 100}%` }} />
            </div>
            <div className="steps">
              {turn.steps.map((step) => {
                const done = completed.includes(step.id);
                return (
                  <label key={step.id} className={`step ${done ? 'done' : ''}`}>
                    <input
                      type="checkbox"
                      checked={done}
                      onChange={() => toggleStep(step.id)}
                      style={{ width: 20, height: 20, accentColor: 'var(--success)' }}
                    />
                    <span>{step.name}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <label className="switch">
            Caso complejo
            <input
              type="checkbox"
              checked={isComplex}
              onChange={(e) => {
                setIsComplex(e.target.checked);
                void save({ isComplex: e.target.checked });
              }}
            />
          </label>

          <label>
            Notas de la atención
            <textarea
              value={notes}
              maxLength={2000}
              onChange={(e) => changeNotes(e.target.value)}
              placeholder="Lo que el cliente necesita, documentos pendientes…"
            />
          </label>

          <div className="grid two">
            <button disabled={pending !== null} onClick={() => onComplete(true)}>
              <SkipForward size={18} aria-hidden />
              {pending === 'complete-next' ? 'Finalizando…' : 'Finalizar y llamar siguiente'}
            </button>
            <button className="secondary" disabled={pending !== null} onClick={() => onComplete(false)}>
              <CheckCheck size={18} aria-hidden /> Solo finalizar
            </button>
          </div>
        </>
      )}
    </section>
  );
}

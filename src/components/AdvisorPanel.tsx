'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNow } from '../hooks/useNow';
import { useRoom, useSocket } from '../hooks/useSocket';
import { api, ApiError } from '../lib/api';
import { AGENT_STATUS_LABEL, CONGESTION_LABEL, formatCountdown, formatMinutes } from '../lib/format';
import type { AdvisorCurrentTurn, AdvisorView } from '../lib/types';
import { LogoutButton } from './LogoutButton';

const NOTES_DEBOUNCE_MS = 800;

export function AdvisorPanel() {
  const router = useRouter();
  const { socket, connected } = useSocket(true);
  const [view, setView] = useState<AdvisorView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
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

  async function run(label: string, action: () => Promise<unknown>) {
    setPending(label);
    setError(null);
    setInfo(null);
    try {
      await action();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo completar la acción.');
    } finally {
      setPending(null);
    }
  }

  async function callNext() {
    await run('call', async () => {
      const { turn } = await api.callNext();
      if (!turn) {
        setInfo('No hay turnos en espera para tus trámites.');
      }
    });
  }

  async function complete(callNextAfter: boolean) {
    const current = view?.currentTurn;
    if (!current) {
      return;
    }
    await run(callNextAfter ? 'complete-next' : 'complete', async () => {
      const { next } = await api.completeTurn(current.id, callNextAfter);
      if (callNextAfter && !next) {
        setInfo('Atención finalizada. No hay más turnos en espera.');
      }
    });
  }

  if (!view) {
    return error ? (
      <div className="stack">
        <p className="callout error" role="alert">
          {error}
        </p>
        <button onClick={() => void load()}>Reintentar</button>
      </div>
    ) : (
      <div className="stack" aria-busy>
        <div className="skeleton" />
        <div className="skeleton" style={{ minHeight: 220 }} />
      </div>
    );
  }

  const current = view.currentTurn;
  const canChangeStatus = !current;

  return (
    <div className="stack">
      <header className="topbar">
        <div>
          <h1 style={{ margin: 0 }}>Ventanilla {view.windowNumber}</h1>
          <p className="muted small">{view.fullName}</p>
        </div>
        <div className="row">
          <span className={`chip ${connected ? 'live' : 'down'}`}>{connected ? '● En vivo' : '○ Reconectando…'}</span>
          <LogoutButton />
        </div>
      </header>

      <section className="card">
        <div className="spread">
          <div>
            <p className="muted small">Tu estado</p>
            <span className={`chip ${view.status}`}>{AGENT_STATUS_LABEL[view.status]}</span>
          </div>
          <div className="row">
            <button
              className={view.status === 'available' ? 'teal' : 'secondary'}
              disabled={!canChangeStatus || pending !== null || view.status === 'available'}
              onClick={() => void run('status', () => api.setMyStatus('available'))}
            >
              Disponible
            </button>
            <button
              className="secondary"
              disabled={!canChangeStatus || pending !== null || view.status === 'on_break'}
              onClick={() => void run('status', () => api.setMyStatus('on_break'))}
            >
              En pausa
            </button>
          </div>
        </div>
        {!canChangeStatus && (
          <p className="muted small" style={{ marginTop: '0.5rem' }}>
            Finaliza la atención actual para cambiar tu estado.
          </p>
        )}
      </section>

      {error && (
        <p className="callout error" role="alert">
          {error}
        </p>
      )}
      {info && <p className="callout warn">{info}</p>}

      {current ? (
        <CurrentTurnCard
          key={current.id}
          turn={current}
          absentTimeoutMinutes={view.absentTimeoutMinutes}
          pending={pending}
          onStart={() => void run('start', () => api.startTurn(current.id))}
          onAbsent={() => void run('absent', () => api.markAbsent(current.id))}
          onComplete={(next) => void complete(next)}
          onError={setError}
        />
      ) : (
        <button
          className="big block"
          disabled={view.status !== 'available' || pending !== null}
          onClick={() => void callNext()}
        >
          {pending === 'call' ? 'Llamando…' : 'Llamar siguiente'}
        </button>
      )}
      {!current && view.status !== 'available' && (
        <p className="muted small">Ponte en Disponible para llamar al siguiente turno.</p>
      )}

      <section className="card">
        <h2>Tus filas</h2>
        {view.queues.length === 0 ? (
          <p className="muted small">Sin datos de filas por ahora.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Trámite</th>
                  <th>En fila</th>
                  <th>Espera nueva</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {view.queues.map((queue) => (
                  <tr key={queue.serviceTypeId}>
                    <td>{queue.name}</td>
                    <td>{queue.waiting}</td>
                    <td>{formatMinutes(queue.estimatedWaitMinutes)}</td>
                    <td>
                      <span className={`chip ${queue.congestionLevel}`}>{CONGESTION_LABEL[queue.congestionLevel]}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

  return (
    <section className="card accent stack">
      <div className="spread">
        <div>
          <p className="muted small">{turn.serviceTypeName}</p>
          <div className="ticket-code" style={{ fontSize: '2.4rem' }}>
            {turn.ticketCode}
          </div>
        </div>
        {turn.preferential && <span className="chip">Preferencial</span>}
      </div>

      {!inService && (
        <>
          <p className="callout go">Cliente llamado. Esperando que llegue a la ventanilla.</p>
          <p className="muted small">
            Se marcará ausente automáticamente en {formatCountdown(Math.max(0, absentInSeconds))}.
          </p>
          <div className="grid two">
            <button className="teal" disabled={pending !== null} onClick={onStart}>
              {pending === 'start' ? 'Iniciando…' : 'Cliente llegó: iniciar atención'}
            </button>
            <button className="danger" disabled={pending !== null} onClick={onAbsent}>
              Marcar ausente
            </button>
          </div>
        </>
      )}

      {inService && (
        <>
          <div className="grid two">
            <div className="metric">
              <span className="label">En atención</span>
              <span className="value">{formatCountdown(elapsedSeconds)}</span>
            </div>
            <div className="metric">
              <span className="label">Restante (IA)</span>
              <span className="value ai">{formatMinutes(turn.remainingMinutes)}</span>
              {turn.lowerMinutes !== null && turn.upperMinutes !== null && (
                <span className="muted small">
                  {formatMinutes(turn.lowerMinutes)} – {formatMinutes(turn.upperMinutes)}
                </span>
              )}
            </div>
          </div>

          <div>
            <h3 className="small muted">
              Pasos ({completed.length}/{turn.steps.length})
            </h3>
            <div className="steps">
              {turn.steps.map((step) => {
                const done = completed.includes(step.id);
                return (
                  <label key={step.id} className={`step ${done ? 'done' : ''}`}>
                    <input
                      type="checkbox"
                      checked={done}
                      onChange={() => toggleStep(step.id)}
                      style={{ width: 22, height: 22 }}
                    />
                    <span>{step.name}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <label className="check">
            <input
              type="checkbox"
              checked={isComplex}
              onChange={(e) => {
                setIsComplex(e.target.checked);
                void save({ isComplex: e.target.checked });
              }}
            />
            Caso complejo
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
              {pending === 'complete-next' ? 'Finalizando…' : 'Finalizar y llamar siguiente'}
            </button>
            <button className="secondary" disabled={pending !== null} onClick={() => onComplete(false)}>
              Solo finalizar
            </button>
          </div>
        </>
      )}
    </section>
  );
}

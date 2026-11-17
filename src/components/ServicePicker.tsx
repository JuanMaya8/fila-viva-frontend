'use client';

import { AlertCircle, ArrowRight, Clock3, Inbox, RotateCw, Ticket, Users } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSocket } from '../hooks/useSocket';
import { recallTurn, rememberTurn } from '../lib/active-turn';
import { api, ApiError, pickInstitution } from '../lib/api';
import { CONGESTION_LABEL, formatMinutes } from '../lib/format';
import type { Institution, PublicServiceType, QueueSummary } from '../lib/types';
import { ServiceIcon } from './ui/visuals';

interface Props {
  initialInstitution: Institution | null;
  initialServiceTypes: PublicServiceType[];
}

type SortMode = 'duration' | 'wait';

export function ServicePicker({ initialInstitution, initialServiceTypes }: Props) {
  const router = useRouter();
  const { socket } = useSocket();
  const [institution, setInstitution] = useState(initialInstitution);
  const [types, setTypes] = useState(initialServiceTypes);
  const [loading, setLoading] = useState(initialServiceTypes.length === 0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [preferential, setPreferential] = useState(false);
  const [sort, setSort] = useState<SortMode>('duration');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [activeTurnId, setActiveTurnId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const current = institution ?? pickInstitution(await api.institutions());
      if (!current) {
        setLoadError('No hay sucursales configuradas.');
        return;
      }
      setInstitution(current);
      setTypes(await api.publicServiceTypes(current.id));
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'No se pudieron cargar los trámites.');
    } finally {
      setLoading(false);
    }
  }, [institution]);

  useEffect(() => {
    setActiveTurnId(recallTurn());
    void refresh();
    // Only on mount: later updates arrive through the socket.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const typeIds = types.map((t) => t.id).join(',');
  useEffect(() => {
    if (!socket || !typeIds) {
      return;
    }
    const ids = typeIds.split(',');
    const handleUpdate = (summary: QueueSummary) =>
      setTypes((current) =>
        current.map((t) =>
          t.id === summary.serviceTypeId
            ? {
                ...t,
                waiting: summary.waiting,
                activeAdvisors: summary.activeAdvisors,
                estimatedWaitMinutes: summary.estimatedWaitMinutes,
                confidence: summary.confidence,
                congestionLevel: summary.congestionLevel,
              }
            : t,
        ),
      );
    const join = () => ids.forEach((id) => socket.emit('joinQueue', id));
    socket.on('queueUpdate', handleUpdate);
    socket.on('connect', join);
    if (socket.connected) {
      join();
    }
    return () => {
      socket.off('queueUpdate', handleUpdate);
      socket.off('connect', join);
      if (socket.connected) {
        ids.forEach((id) => socket.emit('leaveQueue', id));
      }
    };
  }, [socket, typeIds]);

  const sorted = useMemo(
    () =>
      [...types].sort((a, b) =>
        sort === 'wait'
          ? (a.estimatedWaitMinutes ?? Infinity) - (b.estimatedWaitMinutes ?? Infinity)
          : a.avgServiceTimeMinutes - b.avgServiceTimeMinutes,
      ),
    [types, sort],
  );

  async function takeTurn() {
    if (!institution || !selected) {
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const turn = await api.createTurn(institution.id, selected, preferential);
      rememberTurn(turn.id);
      router.push(`/turno/${turn.id}`);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'No se pudo tomar el turno.');
      setSubmitting(false);
    }
  }

  const chosen = types.find((t) => t.id === selected);

  return (
    <>
      {activeTurnId && (
        <Link href={`/turno/${activeTurnId}`} className="button secondary block" style={{ margin: '1rem 0 0' }}>
          <Ticket size={18} aria-hidden /> Ver mi turno activo
        </Link>
      )}

      <div className="spread" style={{ margin: '1.25rem 0 0.75rem' }}>
        <span className="small muted">{types.length} trámites disponibles</span>
        <div className="segmented" role="group" aria-label="Ordenar trámites">
          <button className={sort === 'duration' ? 'on' : ''} onClick={() => setSort('duration')}>
            Más rápidos
          </button>
          <button className={sort === 'wait' ? 'on' : ''} onClick={() => setSort('wait')}>
            Menor espera
          </button>
        </div>
      </div>

      {loading && (
        <div className="stack">
          <div className="skeleton" />
          <div className="skeleton" />
          <div className="skeleton" />
        </div>
      )}

      {!loading && loadError && (
        <div className="callout error" role="alert">
          <AlertCircle size={18} aria-hidden />
          <div className="stack tight">
            <span>{loadError}</span>
            <button className="secondary" onClick={() => void refresh()}>
              <RotateCw size={16} aria-hidden /> Reintentar
            </button>
          </div>
        </div>
      )}

      {!loading && !loadError && types.length === 0 && (
        <div className="card empty">
          <Inbox size={32} aria-hidden />
          <p>Por ahora no hay trámites disponibles en esta sucursal.</p>
        </div>
      )}

      <div className="stack" role="radiogroup" aria-label="Trámites">
        {sorted.map((type) => (
          <button
            key={type.id}
            type="button"
            role="radio"
            aria-checked={selected === type.id}
            className={`choice fade-in ${selected === type.id ? 'selected' : ''}`}
            onClick={() => setSelected(type.id)}
          >
            <span className="icon-badge">
              <ServiceIcon prefix={type.prefix} />
            </span>
            <span className="spread">
              <strong>{type.name}</strong>
              <span className="wait-pill" title="Espera estimada si tomas turno ahora">
                <Clock3 size={14} aria-hidden />~{formatMinutes(type.estimatedWaitMinutes)}
              </span>
            </span>
            <span className="muted small">{type.description}</span>
            <span className="row tiny ink-2">
              <span>Atención típica: {formatMinutes(type.avgServiceTimeMinutes)}</span>
              <span className="row" style={{ gap: 4 }}>
                <Users size={13} aria-hidden /> {type.waiting} en fila
              </span>
              {type.activeAdvisors === 0 ? (
                <span className="chip high">Sin asesores ahora</span>
              ) : (
                type.congestionLevel && (
                  <span className={`chip ${type.congestionLevel}`}>{CONGESTION_LABEL[type.congestionLevel]}</span>
                )
              )}
            </span>
          </button>
        ))}
      </div>

      {types.length > 0 && (
        <div className="sticky-bottom">
          <div className="stack tight">
            <label className="switch">
              Atención preferencial
              <input
                type="checkbox"
                checked={preferential}
                onChange={(e) => setPreferential(e.target.checked)}
                aria-describedby="preferential-help"
              />
            </label>
            <p id="preferential-help" className="tiny muted" style={{ margin: 0 }}>
              Adultos mayores, embarazo o discapacidad.
            </p>
            {submitError && (
              <p className="callout error" role="alert">
                <AlertCircle size={18} aria-hidden />
                {submitError}
              </p>
            )}
            <button className="big block" disabled={!chosen || submitting} onClick={() => void takeTurn()}>
              {submitting ? (
                'Tomando turno…'
              ) : chosen ? (
                <>
                  Tomar turno · {chosen.name} <ArrowRight size={20} aria-hidden />
                </>
              ) : (
                'Elige un trámite'
              )}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

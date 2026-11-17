'use client';

import {
  AlertCircle,
  BrainCircuit,
  Clock3,
  Hourglass,
  RefreshCw,
  Table2,
  TrendingDown,
  UserCheck,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { useRoom } from '../../hooks/useSocket';
import { api, ApiError } from '../../lib/api';
import { AGENT_STATUS_LABEL, CONGESTION_LABEL, formatMinutes, SOURCE_LABEL } from '../../lib/format';
import type { DashboardView, ModelInfo, ServiceType } from '../../lib/types';
import { initials } from '../../lib/visual';
import { useToast } from '../ui/Toaster';
import { GroupedColumnChart, HorizontalBarChart, type SeriesDef } from '../ui/charts';
import { ServiceIcon } from '../ui/visuals';

/** Validated categorical palette (see globals.css --series-*). */
const SERIES: SeriesDef[] = [
  { key: 'ai', label: 'IA', color: '#1E7FA8' },
  { key: 'traditional', label: 'Tradicional', color: '#B7791F' },
  { key: 'real', label: 'Real', color: '#B83A6B' },
];
const WAIT_BAR_COLOR = '#C2541F';

export function DashboardTab({ socket, serviceTypes }: { socket: Socket | null; serviceTypes: ServiceType[] }) {
  const toast = useToast();
  const [dashboard, setDashboard] = useState<DashboardView | null>(null);
  const [model, setModel] = useState<ModelInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retraining, setRetraining] = useState(false);
  const [showTable, setShowTable] = useState(false);

  const load = useCallback(async () => {
    try {
      setDashboard(await api.dashboard());
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cargar el tablero.');
    }
  }, []);

  useEffect(() => {
    void load();
    api
      .modelInfo()
      .then(({ model: info }) => setModel(info))
      .catch(() => setModel(null));
  }, [load]);

  useRoom<DashboardView>(socket, null, 'dashboardUpdate', setDashboard, () => void load());

  async function retrain() {
    setRetraining(true);
    setError(null);
    try {
      const { model: info } = await api.retrain();
      setModel(info);
      toast({ tone: 'success', title: 'Modelo reentrenado', body: info.modelVersion });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo reentrenar el modelo.');
    } finally {
      setRetraining(false);
    }
  }

  if (!dashboard) {
    return error ? (
      <p className="callout error" role="alert">
        <AlertCircle size={18} aria-hidden />
        {error}
      </p>
    ) : (
      <div className="grid four" aria-busy>
        <div className="skeleton" />
        <div className="skeleton" />
        <div className="skeleton" />
        <div className="skeleton" />
      </div>
    );
  }

  const prefixOf = new Map(serviceTypes.map((t) => [t.id, t.prefix]));
  const { accuracy } = dashboard;
  const recent = [...dashboard.recent].reverse();

  return (
    <div className="stack">
      {error && (
        <p className="callout error" role="alert">
          <AlertCircle size={18} aria-hidden />
          {error}
        </p>
      )}

      <div className="grid four">
        <Kpi icon={Users} label="Personas en fila" value={String(dashboard.waitingTotal)} />
        <Kpi icon={UserCheck} tone="success" label="Asesores activos" value={String(dashboard.activeAdvisors)} />
        <Kpi
          icon={Hourglass}
          tone="ai"
          label="Espera estimada prom."
          value={formatMinutes(dashboard.averageEstimatedWaitMinutes)}
        />
        <Kpi
          icon={Clock3}
          tone="honey"
          label="Espera real hoy"
          value={formatMinutes(dashboard.averageActualWaitMinutesToday)}
        />
      </div>

      <div className="grid wide-left">
        <section className="card ai">
          <div className="spread">
            <div className="card-title" style={{ margin: 0 }}>
              <span className="icon-badge ai">
                <BrainCircuit size={20} aria-hidden />
              </span>
              <div>
                <h2 style={{ margin: 0 }}>Error de la IA vs. tradicional</h2>
                <p className="tiny muted" style={{ margin: 0 }}>
                  Últimas {accuracy.samples} atenciones · {SOURCE_LABEL[dashboard.source]}
                </p>
              </div>
            </div>
            <button className="ghost" onClick={() => setShowTable((v) => !v)} aria-pressed={showTable}>
              <Table2 size={16} aria-hidden /> {showTable ? 'Ver gráfico' : 'Ver tabla'}
            </button>
          </div>

          {accuracy.samples === 0 ? (
            <div className="empty">
              <TrendingDown size={30} aria-hidden />
              <p>Finaliza la primera atención para comparar la IA con el método tradicional.</p>
            </div>
          ) : (
            <>
              <div className="grid three" style={{ margin: '1rem 0' }}>
                <div className="metric">
                  <span className="label">Error IA</span>
                  <span className="value ai">{formatMinutes(accuracy.aiMaeMinutes)}</span>
                </div>
                <div className="metric">
                  <span className="label">Error tradicional</span>
                  <span className="value">{formatMinutes(accuracy.traditionalMaeMinutes)}</span>
                </div>
                <div className="metric">
                  <span className="label">Mejora IA</span>
                  <span className="value" style={{ color: 'var(--success)' }}>
                    {accuracy.improvementPercent === null ? '—' : `${accuracy.improvementPercent}%`}
                  </span>
                </div>
              </div>
              {showTable || recent.length === 0 ? (
                <RecentTable dashboard={dashboard} />
              ) : (
                <GroupedColumnChart
                  series={SERIES}
                  data={recent.map((item) => ({
                    key: `${item.ticketCode}-${item.completedAt}`,
                    label: item.ticketCode,
                    values: {
                      ai: item.predictedWaitMinutes,
                      traditional: item.traditionalWaitMinutes,
                      real: item.actualWaitMinutes,
                    },
                  }))}
                />
              )}
              {accuracy.serviceSamples > 0 && (
                <p className="tiny muted" style={{ marginTop: '0.75rem' }}>
                  Duración de la atención: IA {formatMinutes(accuracy.serviceAiMaeMinutes)} de error vs.{' '}
                  {formatMinutes(accuracy.serviceBaselineMaeMinutes)} usando solo el promedio configurado.
                </p>
              )}
            </>
          )}
        </section>

        <section className="card">
          <div className="card-title">
            <span className="icon-badge success">
              <UserCheck size={20} aria-hidden />
            </span>
            <h2 style={{ margin: 0 }}>Asesores</h2>
          </div>
          {dashboard.advisors.length === 0 ? (
            <p className="muted small">Todavía no hay asesores. Créalos en la pestaña Asesores.</p>
          ) : (
            <div className="stack tight">
              {dashboard.advisors.map((advisor) => (
                <div key={advisor.id} className="spread" style={{ opacity: advisor.active ? 1 : 0.55 }}>
                  <div className="row nowrap" style={{ gap: '0.6rem' }}>
                    <span className="avatar" style={{ width: 36, height: 36, borderRadius: 11, fontSize: '0.8rem' }}>
                      {initials(advisor.fullName)}
                    </span>
                    <div>
                      <strong className="small">
                        V{advisor.windowNumber} · {advisor.fullName}
                      </strong>
                      <p className="tiny muted" style={{ margin: 0 }}>
                        {advisor.serviceTypeIds.map((id) => prefixOf.get(id) ?? '?').join(' ')}
                        {advisor.currentTicketCode ? ` · atendiendo ${advisor.currentTicketCode}` : ''}
                      </p>
                    </div>
                  </div>
                  <span className={`chip ${advisor.status}`}>
                    {advisor.connected && <span className="dot" />}
                    {advisor.active ? AGENT_STATUS_LABEL[advisor.status] : 'Inactivo'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="grid wide-left">
        <section className="card">
          <h2>Espera estimada por trámite</h2>
          <p className="tiny muted">Lo que esperaría alguien que tome turno ahora. Pasa el cursor por cada barra.</p>
          <div style={{ marginTop: '0.75rem' }}>
            <HorizontalBarChart
              color={WAIT_BAR_COLOR}
              data={dashboard.queues.map((queue) => ({
                key: queue.serviceTypeId,
                label: queue.name,
                value: queue.estimatedWaitMinutes,
                detail: `${queue.waiting} en fila · ${queue.activeAdvisors} asesores · ${queue.confidence}% confianza`,
              }))}
            />
          </div>
        </section>

        <section className="card">
          <h2>Filas en detalle</h2>
          <div className="stack tight" style={{ marginTop: '0.5rem' }}>
            {dashboard.queues.map((queue) => (
              <div key={queue.serviceTypeId} className="spread">
                <div className="row nowrap" style={{ gap: '0.55rem' }}>
                  <span className="icon-badge" style={{ width: 32, height: 32, borderRadius: 10 }}>
                    <ServiceIcon prefix={queue.prefix} size={16} />
                  </span>
                  <span className="small">
                    <strong>{queue.waiting}</strong> <span className="muted">en fila · {queue.name}</span>
                  </span>
                </div>
                <span className={`chip ${queue.congestionLevel}`}>{CONGESTION_LABEL[queue.congestionLevel]}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="card">
        <div className="spread">
          <div className="card-title" style={{ margin: 0 }}>
            <span className="icon-badge ai">
              <BrainCircuit size={20} aria-hidden />
            </span>
            <div>
              <h2 style={{ margin: 0 }}>Modelo de predicción</h2>
              <p className="tiny muted" style={{ margin: 0 }}>
                {model
                  ? `${model.modelVersion} · ${model.trainingSamples.toLocaleString('es-CO')} atenciones (${model.realSamples} reales)`
                  : 'El servicio de IA no responde; se usa la estimación de respaldo.'}
              </p>
            </div>
          </div>
          <button className="secondary" disabled={retraining} onClick={() => void retrain()}>
            <RefreshCw size={16} aria-hidden className={retraining ? 'spin' : ''} />
            {retraining ? 'Reentrenando…' : 'Reentrenar con datos reales'}
          </button>
        </div>
        {model?.metrics.waitMaeModel !== undefined && (
          <div className="grid three" style={{ marginTop: '1rem' }}>
            <div className="metric">
              <span className="label">Validación: error IA</span>
              <span className="value ai">{formatMinutes(model.metrics.waitMaeModel)}</span>
            </div>
            <div className="metric">
              <span className="label">Validación: tradicional</span>
              <span className="value">{formatMinutes(model.metrics.waitMaeTraditional)}</span>
            </div>
            <div className="metric">
              <span className="label">Cobertura del intervalo</span>
              <span className="value">{Math.round(model.metrics.waitCoverage)}%</span>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  tone = '',
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: '' | 'ai' | 'honey' | 'success';
}) {
  return (
    <div className="card kpi">
      <span className={`icon-badge ${tone}`}>
        <Icon size={20} aria-hidden />
      </span>
      <div className="metric">
        <span className="label">{label}</span>
        <span className={`value ${tone === 'ai' ? 'ai' : ''}`}>{value}</span>
      </div>
    </div>
  );
}

function RecentTable({ dashboard }: { dashboard: DashboardView }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Turno</th>
            <th>Trámite</th>
            <th>IA</th>
            <th>Tradicional</th>
            <th>Real</th>
          </tr>
        </thead>
        <tbody>
          {dashboard.recent.map((item) => (
            <tr key={`${item.ticketCode}-${item.completedAt}`}>
              <td>
                <strong>{item.ticketCode}</strong>
              </td>
              <td className="small">{item.serviceTypeName}</td>
              <td className="num">{formatMinutes(item.predictedWaitMinutes)}</td>
              <td className="num">{formatMinutes(item.traditionalWaitMinutes)}</td>
              <td className="num">{formatMinutes(item.actualWaitMinutes)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

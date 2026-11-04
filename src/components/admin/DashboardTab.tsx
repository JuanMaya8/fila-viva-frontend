'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { useRoom } from '../../hooks/useSocket';
import { api, ApiError } from '../../lib/api';
import { AGENT_STATUS_LABEL, CONGESTION_LABEL, formatMinutes, SOURCE_LABEL } from '../../lib/format';
import type { DashboardView, ModelInfo, ServiceType } from '../../lib/types';

export function DashboardTab({ socket, serviceTypes }: { socket: Socket | null; serviceTypes: ServiceType[] }) {
  const [dashboard, setDashboard] = useState<DashboardView | null>(null);
  const [model, setModel] = useState<ModelInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retraining, setRetraining] = useState(false);

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
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo reentrenar el modelo.');
    } finally {
      setRetraining(false);
    }
  }

  if (!dashboard) {
    return error ? (
      <p className="callout error" role="alert">
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

  const typeName = new Map(serviceTypes.map((t) => [t.id, t.prefix]));
  const { accuracy } = dashboard;

  return (
    <div className="stack">
      {error && (
        <p className="callout error" role="alert">
          {error}
        </p>
      )}
      <div className="grid four">
        <Metric label="Personas en fila" value={String(dashboard.waitingTotal)} />
        <Metric label="Asesores activos" value={String(dashboard.activeAdvisors)} />
        <Metric label="Espera promedio estimada" value={formatMinutes(dashboard.averageEstimatedWaitMinutes)} ai />
        <Metric label="Espera real promedio hoy" value={formatMinutes(dashboard.averageActualWaitMinutesToday)} />
      </div>

      <section className="card ai">
        <div className="spread">
          <h2>Error de la IA vs. método tradicional</h2>
          <span className="chip">{SOURCE_LABEL[dashboard.source]}</span>
        </div>
        <p className="muted small">
          Error absoluto medio (MAE) de la espera predicha al tomar el turno frente a la espera real, en las
          últimas {accuracy.samples} atenciones finalizadas.
        </p>
        {accuracy.samples === 0 ? (
          <p className="muted" style={{ marginTop: '0.75rem' }}>
            Aún no hay atenciones finalizadas. Finaliza la primera para ver la comparación.
          </p>
        ) : (
          <div className="grid three" style={{ marginTop: '0.75rem' }}>
            <Metric label="Error IA" value={formatMinutes(accuracy.aiMaeMinutes)} ai />
            <Metric label="Error tradicional" value={formatMinutes(accuracy.traditionalMaeMinutes)} />
            <Metric
              label="Mejora de la IA"
              value={accuracy.improvementPercent === null ? '—' : `${accuracy.improvementPercent}%`}
            />
          </div>
        )}
        {accuracy.serviceSamples > 0 && (
          <p className="muted small" style={{ marginTop: '0.75rem' }}>
            Duración de la atención: IA {formatMinutes(accuracy.serviceAiMaeMinutes)} de error vs.{' '}
            {formatMinutes(accuracy.serviceBaselineMaeMinutes)} usando solo el promedio configurado.
          </p>
        )}
      </section>

      <section className="card">
        <h2>Filas por trámite</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Trámite</th>
                <th>En fila</th>
                <th>Asesores</th>
                <th>Espera nueva</th>
                <th>Confianza</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.queues.map((queue) => (
                <tr key={queue.serviceTypeId}>
                  <td>
                    {queue.prefix} · {queue.name}
                  </td>
                  <td>{queue.waiting}</td>
                  <td>{queue.activeAdvisors}</td>
                  <td>{formatMinutes(queue.estimatedWaitMinutes)}</td>
                  <td>{queue.confidence}%</td>
                  <td>
                    <span className={`chip ${queue.congestionLevel}`}>{CONGESTION_LABEL[queue.congestionLevel]}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid two">
        <section className="card">
          <h2>Asesores</h2>
          {dashboard.advisors.length === 0 ? (
            <p className="muted small">Todavía no hay asesores. Créalos en la pestaña Asesores.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Ventanilla</th>
                    <th>Nombre</th>
                    <th>Estado</th>
                    <th>Turno</th>
                    <th>Trámites</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.advisors.map((advisor) => (
                    <tr key={advisor.id}>
                      <td>{advisor.windowNumber}</td>
                      <td>
                        {advisor.fullName}
                        {!advisor.active && <span className="muted small"> (inactivo)</span>}
                      </td>
                      <td>
                        <span className={`chip ${advisor.status}`}>{AGENT_STATUS_LABEL[advisor.status]}</span>
                        {advisor.connected && <span className="chip live" style={{ marginLeft: 4 }}>●</span>}
                      </td>
                      <td>{advisor.currentTicketCode ?? '—'}</td>
                      <td className="small">
                        {advisor.serviceTypeIds.map((id) => typeName.get(id) ?? '?').join(' ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card">
          <h2>Últimas atenciones</h2>
          {dashboard.recent.length === 0 ? (
            <p className="muted small">Sin atenciones finalizadas todavía.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Turno</th>
                    <th>IA</th>
                    <th>Tradicional</th>
                    <th>Real</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.recent.map((item) => (
                    <tr key={`${item.ticketCode}-${item.completedAt}`}>
                      <td>{item.ticketCode}</td>
                      <td>{formatMinutes(item.predictedWaitMinutes)}</td>
                      <td>{formatMinutes(item.traditionalWaitMinutes)}</td>
                      <td>{formatMinutes(item.actualWaitMinutes)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <section className="card">
        <div className="spread">
          <div>
            <h2>Modelo</h2>
            <p className="muted small">
              {model
                ? `${model.modelVersion} · ${model.trainingSamples.toLocaleString('es-CO')} atenciones (${model.realSamples} reales)`
                : 'El servicio de IA no responde; se usa la estimación de respaldo.'}
            </p>
            {model?.metrics.waitMaeModel !== undefined && (
              <p className="muted small">
                Validación: error de espera IA {formatMinutes(model.metrics.waitMaeModel)} vs. tradicional{' '}
                {formatMinutes(model.metrics.waitMaeTraditional)} · cobertura del intervalo{' '}
                {Math.round(model.metrics.waitCoverage)}%
              </p>
            )}
          </div>
          <button className="secondary" disabled={retraining} onClick={() => void retrain()}>
            {retraining ? 'Reentrenando…' : 'Reentrenar con datos reales'}
          </button>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value, ai }: { label: string; value: string; ai?: boolean }) {
  return (
    <div className="card metric">
      <span className="label">{label}</span>
      <span className={`value ${ai ? 'ai' : ''}`}>{value}</span>
    </div>
  );
}

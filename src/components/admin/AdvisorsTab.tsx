'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api, ApiError } from '../../lib/api';
import { AGENT_STATUS_LABEL } from '../../lib/format';
import type { AgentAdminView, ServiceType } from '../../lib/types';

interface FormState {
  fullName: string;
  email: string;
  password: string;
  windowNumber: string;
  serviceTypeIds: string[];
}

const EMPTY_FORM: FormState = {
  fullName: '',
  email: '',
  password: '',
  windowNumber: '',
  serviceTypeIds: [],
};

export function AdvisorsTab({ serviceTypes }: { serviceTypes: ServiceType[] }) {
  const [agents, setAgents] = useState<AgentAdminView[] | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setAgents(await api.agents());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudieron cargar los asesores.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function edit(agent: AgentAdminView) {
    setEditingId(agent.id);
    setForm({
      fullName: agent.fullName,
      email: agent.email,
      password: '',
      windowNumber: String(agent.windowNumber),
      serviceTypeIds: agent.serviceTypeIds,
    });
    setInfo(null);
    setError(null);
  }

  function reset() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function toggleType(id: string) {
    setForm((current) => ({
      ...current,
      serviceTypeIds: current.serviceTypeIds.includes(id)
        ? current.serviceTypeIds.filter((t) => t !== id)
        : [...current.serviceTypeIds, id],
    }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (form.serviceTypeIds.length === 0) {
      setError('Selecciona al menos un trámite que atienda el asesor.');
      return;
    }
    setSaving(true);
    setError(null);
    setInfo(null);
    try {
      const base = {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        windowNumber: Number(form.windowNumber),
        serviceTypeIds: form.serviceTypeIds,
      };
      if (editingId) {
        await api.updateAgent(editingId, base);
        setInfo('Asesor actualizado.');
      } else {
        await api.createAgent({ ...base, password: form.password });
        setInfo(`Asesor creado. Puede ingresar con ${base.email}.`);
      }
      reset();
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 409
          ? 'Ese correo o esa ventanilla ya están en uso.'
          : err instanceof ApiError
            ? err.message
            : 'No se pudo guardar el asesor.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(agent: AgentAdminView) {
    setError(null);
    setInfo(null);
    try {
      await api.updateAgent(agent.id, { active: !agent.active });
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 409
          ? 'El asesor está atendiendo un turno; espera a que lo finalice.'
          : err instanceof ApiError
            ? err.message
            : 'No se pudo cambiar el estado.',
      );
    }
  }

  async function resetPassword(agent: AgentAdminView) {
    const password = window.prompt(`Nueva contraseña para ${agent.fullName} (mínimo 8 caracteres):`);
    if (!password) {
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    try {
      await api.resetPassword(agent.id, password);
      setInfo(`Contraseña de ${agent.fullName} restablecida.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo restablecer la contraseña.');
    }
  }

  const prefixOf = new Map(serviceTypes.map((t) => [t.id, `${t.prefix} · ${t.name}`]));

  return (
    <div className="grid two">
      <section className="card">
        <h2>{editingId ? 'Editar asesor' : 'Nuevo asesor'}</h2>
        <form className="stack" onSubmit={submit}>
          <label>
            Nombre completo
            <input
              required
              maxLength={80}
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            />
          </label>
          <label>
            Correo
            <input
              type="email"
              required
              maxLength={120}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>
          {!editingId && (
            <label>
              Contraseña inicial (mínimo 8 caracteres)
              <input
                type="password"
                required
                minLength={8}
                maxLength={128}
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </label>
          )}
          <label>
            Ventanilla
            <input
              type="number"
              required
              min={1}
              max={99}
              value={form.windowNumber}
              onChange={(e) => setForm({ ...form, windowNumber: e.target.value })}
            />
          </label>
          <fieldset className="stack" style={{ border: 'none', padding: 0, margin: 0 }}>
            <legend className="muted small" style={{ marginBottom: '0.4rem' }}>
              Trámites que atiende
            </legend>
            <button
              type="button"
              className="secondary"
              onClick={() => setForm({ ...form, serviceTypeIds: serviceTypes.filter((t) => t.active).map((t) => t.id) })}
            >
              Marcar todos
            </button>
            {serviceTypes.map((type) => (
              <label key={type.id} className="check">
                <input
                  type="checkbox"
                  checked={form.serviceTypeIds.includes(type.id)}
                  onChange={() => toggleType(type.id)}
                />
                {type.prefix} · {type.name}
                {!type.active && <span className="muted small"> (inactivo)</span>}
              </label>
            ))}
          </fieldset>
          {error && (
            <p className="callout error" role="alert">
              {error}
            </p>
          )}
          {info && <p className="callout go">{info}</p>}
          <div className="row">
            <button type="submit" disabled={saving}>
              {saving ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Crear asesor'}
            </button>
            {editingId && (
              <button type="button" className="secondary" onClick={reset}>
                Cancelar
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="card">
        <h2>Asesores</h2>
        {agents === null ? (
          <div className="skeleton" />
        ) : agents.length === 0 ? (
          <p className="muted">Aún no hay asesores. Crea el primero con el formulario.</p>
        ) : (
          <div className="stack">
            {agents.map((agent) => (
              <article key={agent.id} className="card" style={{ margin: 0, opacity: agent.active ? 1 : 0.6 }}>
                <div className="spread">
                  <div>
                    <strong>
                      Ventanilla {agent.windowNumber} · {agent.fullName}
                    </strong>
                    <p className="muted small">{agent.email}</p>
                  </div>
                  <span className={`chip ${agent.status}`}>
                    {agent.active ? AGENT_STATUS_LABEL[agent.status] : 'Inactivo'}
                  </span>
                </div>
                <p className="small muted" style={{ margin: '0.5rem 0' }}>
                  {agent.serviceTypeIds.map((id) => prefixOf.get(id) ?? '?').join(', ')}
                </p>
                <div className="row">
                  <button className="secondary" onClick={() => edit(agent)}>
                    Editar
                  </button>
                  <button className="secondary" onClick={() => void resetPassword(agent)}>
                    Resetear contraseña
                  </button>
                  <button className={agent.active ? 'danger' : 'teal'} onClick={() => void toggleActive(agent)}>
                    {agent.active ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

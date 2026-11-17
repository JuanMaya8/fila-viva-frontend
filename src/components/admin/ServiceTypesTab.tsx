'use client';

import { AlertCircle, CheckCircle2, ListPlus, Pencil, Plus, Power, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { api, ApiError } from '../../lib/api';
import { formatMinutes } from '../../lib/format';
import type { ServiceType } from '../../lib/types';
import { ServiceIcon } from '../ui/visuals';

interface FormState {
  name: string;
  description: string;
  prefix: string;
  avgServiceTimeMinutes: string;
  steps: Array<{ id?: string; name: string }>;
}

const EMPTY_FORM: FormState = {
  name: '',
  description: '',
  prefix: '',
  avgServiceTimeMinutes: '',
  steps: [{ name: '' }],
};

interface Props {
  serviceTypes: ServiceType[];
  onChanged: () => Promise<void>;
}

export function ServiceTypesTab({ serviceTypes, onChanged }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  function edit(type: ServiceType) {
    setEditingId(type.id);
    setForm({
      name: type.name,
      description: type.description,
      prefix: type.prefix,
      avgServiceTimeMinutes: String(type.avgServiceTimeMinutes),
      steps: type.steps.map(({ id, name }) => ({ id, name })),
    });
    setError(null);
    setInfo(null);
  }

  function reset() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function setStep(index: number, name: string) {
    setForm((current) => ({
      ...current,
      steps: current.steps.map((step, i) => (i === index ? { ...step, name } : step)),
    }));
  }

  function removeStep(index: number) {
    setForm((current) => ({ ...current, steps: current.steps.filter((_, i) => i !== index) }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const steps = form.steps.map((s) => ({ ...s, name: s.name.trim() })).filter((s) => s.name);
    if (steps.length === 0) {
      setError('Agrega al menos un paso.');
      return;
    }
    setSaving(true);
    setError(null);
    setInfo(null);
    const input = {
      name: form.name.trim(),
      description: form.description.trim(),
      prefix: form.prefix.trim().toUpperCase(),
      avgServiceTimeMinutes: Number(form.avgServiceTimeMinutes),
      steps,
    };
    try {
      if (editingId) {
        await api.updateServiceType(editingId, input);
        setInfo('Trámite actualizado.');
      } else {
        await api.createServiceType(input);
        setInfo('Trámite creado.');
      }
      reset();
      await onChanged();
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 409
          ? 'Ese prefijo ya lo usa otro trámite.'
          : err instanceof ApiError
            ? err.message
            : 'No se pudo guardar el trámite.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(type: ServiceType) {
    setError(null);
    try {
      await api.updateServiceType(type.id, { active: !type.active });
      await onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cambiar el estado del trámite.');
    }
  }

  return (
    <div className="grid two">
      <section className="card">
        <div className="card-title">
          <span className="icon-badge honey">
            {editingId ? <Pencil size={20} aria-hidden /> : <ListPlus size={20} aria-hidden />}
          </span>
          <h2 style={{ margin: 0 }}>{editingId ? 'Editar trámite' : 'Nuevo trámite'}</h2>
        </div>
        <form className="stack" onSubmit={submit}>
          <label>
            Nombre
            <input
              required
              maxLength={80}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label>
            Descripción
            <input
              maxLength={200}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </label>
          <div className="grid two">
            <label>
              Prefijo del turno
              <input
                required
                pattern="[A-Za-z]{1,3}"
                maxLength={3}
                value={form.prefix}
                onChange={(e) => setForm({ ...form, prefix: e.target.value.toUpperCase() })}
              />
            </label>
            <label>
              Duración media (min)
              <input
                type="number"
                required
                min={0.5}
                max={240}
                step={0.5}
                value={form.avgServiceTimeMinutes}
                onChange={(e) => setForm({ ...form, avgServiceTimeMinutes: e.target.value })}
              />
            </label>
          </div>
          <fieldset className="stack" style={{ border: 'none', padding: 0, margin: 0 }}>
            <legend className="muted small" style={{ marginBottom: '0.4rem' }}>
              Pasos de la atención (en orden)
            </legend>
            {form.steps.map((step, index) => (
              <div key={step.id ?? `new-${index}`} className="row" style={{ flexWrap: 'nowrap' }}>
                <input
                  aria-label={`Paso ${index + 1}`}
                  maxLength={80}
                  value={step.name}
                  placeholder={`Paso ${index + 1}`}
                  onChange={(e) => setStep(index, e.target.value)}
                />
                <button
                  type="button"
                  className="secondary"
                  aria-label={`Quitar paso ${index + 1}`}
                  disabled={form.steps.length === 1}
                  onClick={() => removeStep(index)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <button
              type="button"
              className="secondary"
              disabled={form.steps.length >= 12}
              onClick={() => setForm({ ...form, steps: [...form.steps, { name: '' }] })}
            >
              <Plus size={16} aria-hidden /> Agregar paso
            </button>
          </fieldset>
          {error && (
            <p className="callout error" role="alert">
              <AlertCircle size={18} aria-hidden />
              {error}
            </p>
          )}
          {info && (
            <p className="callout go">
              <CheckCircle2 size={18} aria-hidden />
              {info}
            </p>
          )}
          <div className="row">
            <button type="submit" disabled={saving}>
              {saving ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Crear trámite'}
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
        <h2>Trámites</h2>
        {serviceTypes.length === 0 ? (
          <p className="muted">No hay trámites configurados.</p>
        ) : (
          <div className="stack">
            {serviceTypes.map((type) => (
              <article key={type.id} className="card flat" style={{ margin: 0, opacity: type.active ? 1 : 0.6 }}>
                <div className="spread">
                  <div className="row" style={{ gap: '0.6rem' }}>
                    <span className="icon-badge" style={{ width: 34, height: 34 }}>
                      <ServiceIcon prefix={type.prefix} size={17} />
                    </span>
                    <strong>
                      {type.prefix} · {type.name}
                    </strong>
                  </div>
                  <span className="chip">{formatMinutes(type.avgServiceTimeMinutes)}</span>
                </div>
                <p className="muted small">{type.steps.length} pasos · {type.description}</p>
                <div className="row" style={{ marginTop: '0.5rem' }}>
                  <button className="secondary" onClick={() => edit(type)}>
                    <Pencil size={16} aria-hidden /> Editar
                  </button>
                  <button className={type.active ? 'danger' : 'success'} onClick={() => void toggleActive(type)}>
                    <Power size={16} aria-hidden /> {type.active ? 'Desactivar' : 'Activar'}
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

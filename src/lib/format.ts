import type { AgentStatus, CongestionLevel, TurnStatus } from './types';

export function formatMinutes(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined || Number.isNaN(minutes)) {
    return '—';
  }
  if (minutes < 1) {
    return 'menos de 1 min';
  }
  if (minutes < 60) {
    return `${Math.round(minutes)} min`;
  }
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

export function formatCountdown(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export const CONGESTION_LABEL: Record<CongestionLevel, string> = {
  low: 'Fila fluida',
  medium: 'Fila moderada',
  high: 'Fila congestionada',
};

export const TURN_STATUS_LABEL: Record<TurnStatus, string> = {
  created: 'En espera',
  called: 'Llamado',
  in_service: 'En atención',
  completed: 'Atendido',
  absent: 'Ausente',
  cancelled: 'Cancelado',
};

export const AGENT_STATUS_LABEL: Record<AgentStatus, string> = {
  available: 'Disponible',
  busy: 'Atendiendo',
  on_break: 'En pausa',
  offline: 'Desconectado',
};

export const SOURCE_LABEL = {
  model: 'Modelo IA',
  baseline: 'Teoría de colas (M/M/c)',
  fallback: 'Estimación de respaldo',
} as const;

/**
 * Branch time zone. Fixed so the server render (UTC on Vercel) and the
 * browser show the same wall-clock time and date.
 */
export const BRANCH_TIME_ZONE = 'America/Bogota';

/** "14:05" in the branch time zone. */
export function formatBranchTime(epochMs: number): string {
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: BRANCH_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(epochMs);
}

/** "Martes, 17 de noviembre de 2026" in the branch time zone. */
export function formatBranchDate(epochMs: number): string {
  const text = new Intl.DateTimeFormat('es-CO', {
    timeZone: BRANCH_TIME_ZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(epochMs);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

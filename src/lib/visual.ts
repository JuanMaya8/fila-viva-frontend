import type { TurnStatus } from './types';

/** Fraction (0-1) of the wait already elapsed, for the countdown ring. */
export function waitProgress(remainingSeconds: number | null, initialSeconds: number | null): number {
  if (remainingSeconds === null || !initialSeconds || initialSeconds <= 0) {
    return 0;
  }
  return Math.min(1, Math.max(0, 1 - remainingSeconds / initialSeconds));
}

/** How many "people ahead" dots to draw and how many go into the "+N" label. */
export function queueDots(peopleAhead: number, max = 10): { shown: number; overflow: number } {
  const ahead = Math.max(0, Math.floor(peopleAhead));
  return ahead > max ? { shown: max, overflow: ahead - max } : { shown: ahead, overflow: 0 };
}

/** Round chart maxima up to a readable value (1, 2, 5 x 10^n). */
export function niceMax(values: number[]): number {
  const max = Math.max(0, ...values.filter((v) => Number.isFinite(v)));
  if (max <= 0) {
    return 1;
  }
  const magnitude = 10 ** Math.floor(Math.log10(max));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * magnitude >= max) ?? 10;
  return step * magnitude;
}

export const STATUS_STEPS: Array<{ status: TurnStatus; label: string }> = [
  { status: 'created', label: 'En fila' },
  { status: 'called', label: 'Llamado' },
  { status: 'in_service', label: 'En atención' },
  { status: 'completed', label: 'Listo' },
];

/** Index of the status in the happy path; closed-without-service returns -1. */
export function statusStepIndex(status: TurnStatus): number {
  return STATUS_STEPS.findIndex((step) => step.status === status);
}

export function initials(fullName: string): string {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

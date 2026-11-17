import {
  Banknote,
  BadgeHelp,
  Check,
  CreditCard,
  FileWarning,
  HandCoins,
  Landmark,
  Receipt,
  Search,
  User,
  type LucideIcon,
} from 'lucide-react';
import { formatMinutes } from '../../lib/format';
import type { TurnStatus } from '../../lib/types';
import { queueDots, STATUS_STEPS, statusStepIndex } from '../../lib/visual';

const ICON_BY_PREFIX: Record<string, LucideIcon> = {
  C: Search,
  D: Banknote,
  P: Receipt,
  T: CreditCard,
  R: FileWarning,
  A: Landmark,
  K: HandCoins,
};

/** Icon for a service type; admin-created types fall back to a generic one. */
export function ServiceIcon({ prefix, size = 20 }: { prefix: string; size?: number }) {
  const Icon = ICON_BY_PREFIX[prefix] ?? BadgeHelp;
  return <Icon size={size} aria-hidden />;
}

export function ProgressRing({
  progress,
  size = 168,
  stroke = 12,
  children,
}: {
  progress: number;
  size?: number;
  stroke?: number;
  children: React.ReactNode;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} aria-hidden>
        <circle className="track" cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} />
        <circle
          className="value"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - Math.min(1, Math.max(0, progress)))}
        />
      </svg>
      <div className="center">{children}</div>
    </div>
  );
}

export function StatusStepper({ status }: { status: TurnStatus }) {
  const current = statusStepIndex(status);
  return (
    <ol className="stepper" aria-label="Estado del turno">
      {STATUS_STEPS.map((step, index) => {
        const state =
          index < current || status === 'completed' ? 'done' : index === current ? 'current' : '';
        return (
          <li key={step.status} className={state} aria-current={state === 'current' ? 'step' : undefined}>
            <span className="bullet">{state === 'done' ? <Check size={15} strokeWidth={3} /> : index + 1}</span>
            {step.label}
          </li>
        );
      })}
    </ol>
  );
}

export function QueueDots({ peopleAhead }: { peopleAhead: number }) {
  const { shown, overflow } = queueDots(peopleAhead);
  return (
    <div className="queue-dots" aria-label={`${peopleAhead} personas delante de ti`}>
      {Array.from({ length: shown }, (_, i) => (
        <span key={i} className="person" style={{ animationDelay: `${i * 40}ms` }}>
          <User size={14} aria-hidden />
        </span>
      ))}
      {overflow > 0 && <span className="more">+{overflow}</span>}
      <span className="person you" title="Tú">
        <User size={14} aria-hidden />
      </span>
    </div>
  );
}

/** p10-p90 band with the median marked, on a 0..max minutes scale. */
export function IntervalBar({
  lower,
  value,
  upper,
}: {
  lower: number;
  value: number;
  upper: number;
}) {
  const max = Math.max(upper * 1.15, 1);
  const pct = (minutes: number) => `${(Math.max(0, minutes) / max) * 100}%`;
  return (
    <div>
      <div className="interval" role="img" aria-label={`Entre ${formatMinutes(lower)} y ${formatMinutes(upper)}`}>
        <span className="rail" />
        <span className="band" style={{ left: pct(lower), width: `calc(${pct(upper)} - ${pct(lower)})` }} />
        <span className="point" style={{ left: pct(value) }} />
      </div>
      <div className="spread tiny muted num">
        <span>{formatMinutes(lower)}</span>
        <span>Lo más probable: {formatMinutes(value)}</span>
        <span>{formatMinutes(upper)}</span>
      </div>
    </div>
  );
}

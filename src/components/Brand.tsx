import Link from 'next/link';
import { Logo } from './Logo';

export function Brand({ subtitle = 'Banco Demo · Sucursal Centro' }: { subtitle?: string }) {
  return (
    <Link href="/" className="brand" aria-label="Fila Viva, ir al inicio">
      <Logo className="brand-mark" />
      <span>
        <p className="brand-title">Fila Viva</p>
        <p className="muted small" style={{ margin: 0 }}>
          {subtitle}
        </p>
      </span>
    </Link>
  );
}

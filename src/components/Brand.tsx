import Link from 'next/link';

export function Brand({ subtitle = 'Banco Demo · Sucursal Centro' }: { subtitle?: string }) {
  return (
    <Link href="/" className="brand" aria-label="Fila Viva, ir al inicio">
      <span className="brand-mark" aria-hidden>
        FV
      </span>
      <span>
        <p className="brand-title">Fila Viva</p>
        <p className="muted small" style={{ margin: 0 }}>
          {subtitle}
        </p>
      </span>
    </Link>
  );
}

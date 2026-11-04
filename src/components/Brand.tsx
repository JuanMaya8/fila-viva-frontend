export function Brand({ subtitle = 'Banco Demo · Sucursal Centro' }: { subtitle?: string }) {
  return (
    <header className="brand">
      <div className="brand-mark" aria-hidden>
        FV
      </div>
      <div>
        <h1 style={{ margin: 0, fontSize: '1.3rem' }}>Fila Viva</h1>
        <p className="muted small">{subtitle}</p>
      </div>
    </header>
  );
}

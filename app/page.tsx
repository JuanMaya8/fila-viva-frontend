import Link from 'next/link';
import { Suspense } from 'react';
import { Brand } from '@/src/components/Brand';
import { LoginForm } from '@/src/components/LoginForm';

/** Rendering: static (SSG). Only the login form hydrates on the client. */
export default function HomePage() {
  return (
    <main className="page">
      <Brand />
      <div className="stack">
        <Link href="/turno" className="button big block">
          Soy cliente: tomar turno
        </Link>
        <p className="muted small" style={{ textAlign: 'center' }}>
          Sin registro. Elige tu trámite y mira en vivo cuánto vas a esperar.
        </p>
      </div>

      <section className="card" style={{ marginTop: '2rem' }}>
        <h2>Ingreso de personal</h2>
        <p className="muted small">Administradores y asesores del banco.</p>
        <Suspense fallback={<div className="skeleton" />}>
          <LoginForm />
        </Suspense>
      </section>

      <p className="muted small" style={{ marginTop: '1.5rem', textAlign: 'center' }}>
        <Link href="/display">Pantalla de sala</Link>
      </p>
    </main>
  );
}

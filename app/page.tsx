import { ArrowRight, BrainCircuit, Clock3, MonitorPlay, Radio, ShieldCheck, Ticket } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';
import { Brand } from '@/src/components/Brand';
import { BranchPulse } from '@/src/components/BranchPulse';
import { LoginForm } from '@/src/components/LoginForm';

const FEATURES = [
  {
    icon: Ticket,
    tone: '',
    title: 'Elige tu trámite',
    text: 'Ves la duración típica y la espera real de cada fila antes de tomar turno.',
  },
  {
    icon: BrainCircuit,
    tone: 'ai',
    title: 'La IA calcula tu espera',
    text: 'Combina teoría de colas y machine learning: no solo cuenta personas, mide cada atención.',
  },
  {
    icon: Radio,
    tone: 'success',
    title: 'Se actualiza sola',
    text: 'Tu ficha cambia en vivo y te avisa cuando faltan 5 minutos y cuando te llaman.',
  },
];

/** Rendering: static (SSG). The live pulse and the login form hydrate on the client. */
export default function HomePage() {
  return (
    <main className="page web home">
      <div className="topbar">
        <Brand />
        <Link href="/display" className="button secondary" style={{ minHeight: 40, padding: '0.5rem 0.9rem' }}>
          <MonitorPlay size={18} aria-hidden />
          <span className="small">Sala</span>
        </Link>
      </div>

      <section className="hero home-hero stack fade-in">
        <span className="eyebrow">
          <Clock3 size={15} aria-hidden /> Espera inteligente
        </span>
        <h1>Tu tiempo de espera real, en vivo.</h1>
        <p className="lead">
          Toma tu turno desde el celular y mira cuánto vas a esperar de verdad, no solo tu número.
        </p>
        <Link href="/turno" className="button big block">
          Soy cliente: tomar turno <ArrowRight size={20} aria-hidden />
        </Link>
        <p className="muted small" style={{ textAlign: 'center' }}>
          Sin registro y sin descargar nada.
        </p>
      </section>

      <div className="home-pulse">
        <BranchPulse />
      </div>

      <section className="card home-features">
        <h2>Cómo funciona</h2>
        <div className="feature-list" style={{ marginTop: '0.75rem' }}>
          {FEATURES.map(({ icon: Icon, tone, title, text }) => (
            <div key={title} className="feature">
              <span className={`icon-badge ${tone}`}>
                <Icon size={20} aria-hidden />
              </span>
              <div>
                <h3 style={{ margin: 0 }}>{title}</h3>
                <p className="small ink-2">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card home-login">
        <div className="card-title">
          <span className="icon-badge honey">
            <ShieldCheck size={20} aria-hidden />
          </span>
          <div>
            <h2 style={{ margin: 0 }}>Ingreso de personal</h2>
            <p className="muted small" style={{ margin: 0 }}>
              Administradores y asesores del banco.
            </p>
          </div>
        </div>
        <Suspense fallback={<div className="skeleton" />}>
          <LoginForm />
        </Suspense>
      </section>
    </main>
  );
}

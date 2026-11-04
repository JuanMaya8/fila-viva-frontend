'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { api, ApiError } from '../lib/api';

const HOME_BY_ROLE = { admin: '/admin', advisor: '/advisor' } as const;

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    params.get('error') === 'forbidden' ? 'Tu usuario no tiene acceso a esa sección.' : null,
  );

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { user } = await api.login(email, password);
      const home = HOME_BY_ROLE[user.role];
      const next = params.get('next');
      router.replace(next && next.startsWith(home) ? next : home);
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 401
          ? 'Correo o contraseña incorrectos.'
          : err instanceof ApiError
            ? err.message
            : 'No se pudo iniciar sesión.',
      );
      setLoading(false);
    }
  }

  return (
    <form className="stack" onSubmit={handleSubmit} style={{ marginTop: '0.75rem' }}>
      <label>
        Correo
        <input
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label>
        Contraseña
        <input
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      {error && (
        <p className="callout error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="secondary block" disabled={loading}>
        {loading ? 'Ingresando…' : 'Ingresar'}
      </button>
    </form>
  );
}

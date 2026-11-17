'use client';

import { AlertCircle, Eye, EyeOff, LogIn } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { api, ApiError } from '../lib/api';

const HOME_BY_ROLE = { admin: '/admin', advisor: '/advisor' } as const;

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    <form className="stack" onSubmit={handleSubmit} style={{ marginTop: '0.5rem' }}>
      <label>
        Correo
        <input
          type="email"
          autoComplete="username"
          placeholder="nombre@bancodemo.test"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label>
        Contraseña
        <span style={{ position: 'relative', display: 'block' }}>
          <input
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ paddingRight: '3rem' }}
          />
          <button
            type="button"
            className="ghost icon-only"
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            onClick={() => setShowPassword((v) => !v)}
            style={{ position: 'absolute', right: 4, top: 3 }}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </span>
      </label>
      {error && (
        <p className="callout error" role="alert">
          <AlertCircle size={18} aria-hidden />
          {error}
        </p>
      )}
      <button type="submit" className="secondary block" disabled={loading}>
        <LogIn size={18} aria-hidden />
        {loading ? 'Ingresando…' : 'Ingresar'}
      </button>
    </form>
  );
}

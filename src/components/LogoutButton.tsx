'use client';

import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '../lib/api';

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  return (
    <button
      className="secondary"
      disabled={loading}
      style={{ minHeight: 40, padding: '0.5rem 0.85rem' }}
      onClick={async () => {
        setLoading(true);
        await api.logout().catch(() => undefined);
        router.replace('/');
      }}
    >
      <LogOut size={16} aria-hidden />
      <span className="small">Salir</span>
    </button>
  );
}

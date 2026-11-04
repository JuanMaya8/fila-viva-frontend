'use client';

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
      onClick={async () => {
        setLoading(true);
        await api.logout().catch(() => undefined);
        router.replace('/');
      }}
    >
      Salir
    </button>
  );
}

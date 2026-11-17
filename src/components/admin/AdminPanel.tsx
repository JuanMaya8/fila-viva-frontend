'use client';

import { AlertCircle, LayoutDashboard, ListChecks, UsersRound } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useSocket } from '../../hooks/useSocket';
import { api, ApiError } from '../../lib/api';
import type { ServiceType } from '../../lib/types';
import { Brand } from '../Brand';
import { LogoutButton } from '../LogoutButton';
import { AdvisorsTab } from './AdvisorsTab';
import { DashboardTab } from './DashboardTab';
import { ServiceTypesTab } from './ServiceTypesTab';

type Tab = 'dashboard' | 'advisors' | 'services';

const TABS = [
  { id: 'dashboard' as const, label: 'Tablero', icon: LayoutDashboard },
  { id: 'advisors' as const, label: 'Asesores', icon: UsersRound },
  { id: 'services' as const, label: 'Trámites', icon: ListChecks },
];

export function AdminPanel() {
  const router = useRouter();
  const { socket, connected } = useSocket(true);
  const [tab, setTab] = useState<Tab>('dashboard');
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadServiceTypes = useCallback(async () => {
    try {
      setServiceTypes(await api.manageServiceTypes());
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace('/?next=/admin');
        return;
      }
      setError(err instanceof ApiError ? err.message : 'No se pudieron cargar los trámites.');
    }
  }, [router]);

  useEffect(() => {
    void loadServiceTypes();
  }, [loadServiceTypes]);

  return (
    <>
      <div className="topbar">
        <Brand subtitle="Panel de administración" />
        <div className="row">
          <span className={`chip ${connected ? 'live' : 'down'}`}>
            <span className="dot" />
            {connected ? 'En vivo' : 'Reconectando…'}
          </span>
          <LogoutButton />
        </div>
      </div>

      <nav className="tabs" aria-label="Secciones">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={tab === id ? 'active' : ''}
            aria-current={tab === id ? 'page' : undefined}
            onClick={() => setTab(id)}
          >
            <Icon size={17} aria-hidden /> {label}
          </button>
        ))}
      </nav>

      {error && (
        <p className="callout error" role="alert">
          <AlertCircle size={18} aria-hidden />
          {error}
        </p>
      )}

      <div className="fade-in" key={tab}>
        {tab === 'dashboard' && <DashboardTab socket={socket} serviceTypes={serviceTypes} />}
        {tab === 'advisors' && <AdvisorsTab serviceTypes={serviceTypes} />}
        {tab === 'services' && <ServiceTypesTab serviceTypes={serviceTypes} onChanged={loadServiceTypes} />}
      </div>
    </>
  );
}

import { AdminPanel } from '@/src/components/admin/AdminPanel';

/** Rendering: CSR behind the role middleware; the dashboard is pushed over an authenticated socket. */
export const metadata = { title: 'Administración · Fila Viva' };

export default function AdminPage() {
  return (
    <main className="page wide">
      <AdminPanel />
    </main>
  );
}

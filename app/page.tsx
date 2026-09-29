'use client';

import { useState } from 'react';
import { createTurn, TurnResponse } from '@/src/lib/api';

// TODO: replace with real ids once the institution / service-type
// selection screen exists. For now these must match records already
// created through fila-viva-backend's Swagger UI (POST /service-types).
const DEMO_INSTITUTION_ID = 'REPLACE_WITH_A_REAL_INSTITUTION_ID';
const DEMO_SERVICE_TYPE_ID = 'REPLACE_WITH_A_REAL_SERVICE_TYPE_ID';

export default function HomePage() {
  const [turn, setTurn] = useState<TurnResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleTakeTurn() {
    setLoading(true);
    setError(null);
    try {
      const result = await createTurn(DEMO_INSTITUTION_ID, DEMO_SERVICE_TYPE_ID);
      setTurn(result);
    } catch (err) {
      setError(
        'No se pudo conectar con el backend. Revisa que fila-viva-backend esté corriendo en NEXT_PUBLIC_API_URL.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="ticket-screen">
      <h1>Fila Viva</h1>
      <p>Avance de la interfaz del ciudadano (semana 3). Todavía sin diseño final.</p>

      <button onClick={handleTakeTurn} disabled={loading}>
        {loading ? 'Calculando...' : 'Tomar un turno'}
      </button>

      {error && <p className="error">{error}</p>}

      {turn && (
        <div className="ticket">
          <p>Turno: {turn.ticketNumber}</p>
          <p>Personas delante: {turn.peopleAhead}</p>
          <p>Tiempo estimado: {turn.estimatedWaitMinutes} min</p>
          <p>Confianza: {turn.confidence}%</p>
        </div>
      )}
    </main>
  );
}

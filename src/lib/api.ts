const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

/**
 * Mirrors fila-viva-backend's TurnResponseDto exactly (see that repo's
 * README.md). Keep both in sync if the contract changes.
 */
export interface TurnResponse {
  id: string;
  ticketNumber: number;
  status: string;
  peopleAhead: number;
  estimatedWaitMinutes: number | null;
  confidence: number | null;
  traditionalEstimateMinutes: number | null;
}

export async function createTurn(
  institutionId: string,
  serviceTypeId: string,
): Promise<TurnResponse> {
  const response = await fetch(`${API_URL}/turns`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ institutionId, serviceTypeId }),
  });

  if (!response.ok) {
    throw new Error('Could not create the turn');
  }

  return response.json();
}

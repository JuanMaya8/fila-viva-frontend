import type {
  AdvisorView,
  AgentAdminView,
  DashboardView,
  DisplayView,
  Institution,
  ModelInfo,
  PublicServiceType,
  ServiceType,
  SessionUser,
  TurnResponse,
} from './types';

/** Browser calls use the same-origin rewrite so the httpOnly cookie is sent. */
const BROWSER_BASE = '/api/backend';
/** Server components (ISR/SSR) talk to the backend directly. */
export const SERVER_API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000').replace(
  /\/+$/,
  '',
);

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const FRIENDLY_MESSAGES: Record<number, string> = {
  0: 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.',
  400: 'Algún dato no es válido. Revisa el formulario.',
  401: 'Tu sesión no es válida o expiró. Inicia sesión de nuevo.',
  403: 'No tienes permiso para hacer esto.',
  404: 'No encontramos lo que buscas.',
  409: 'La acción no es posible en el estado actual.',
  429: 'Demasiadas solicitudes. Espera un minuto e inténtalo de nuevo.',
  500: 'Ocurrió un error en el servidor. Inténtalo de nuevo en un momento.',
  503: 'El servicio no está disponible en este momento.',
};

/** Spanish message for the UI; never exposes server internals. */
export function friendlyMessage(status: number, fallback?: string): string {
  if (FRIENDLY_MESSAGES[status]) {
    return FRIENDLY_MESSAGES[status];
  }
  if (status >= 500) {
    return FRIENDLY_MESSAGES[500];
  }
  return fallback ?? FRIENDLY_MESSAGES[400];
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BROWSER_BASE}${path}`, {
      method,
      credentials: 'include',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
    });
  } catch {
    throw new ApiError(0, friendlyMessage(0));
  }
  if (!response.ok) {
    throw new ApiError(response.status, friendlyMessage(response.status));
  }
  return (await response.json()) as T;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ user: SessionUser }>('POST', '/auth/login', { email, password }),
  logout: () => request<{ ok: boolean }>('POST', '/auth/logout'),
  me: () => request<SessionUser>('GET', '/auth/me'),
  socketToken: () => request<{ token: string }>('POST', '/auth/socket-token'),

  institutions: () => request<Institution[]>('GET', '/institutions'),
  publicServiceTypes: (institutionId: string) =>
    request<PublicServiceType[]>('GET', `/service-types?institutionId=${institutionId}`),
  display: (institutionId: string) =>
    request<DisplayView>('GET', `/display?institutionId=${institutionId}`),

  createTurn: (institutionId: string, serviceTypeId: string, preferential: boolean) =>
    request<TurnResponse>('POST', '/turns', { institutionId, serviceTypeId, preferential }),
  turn: (id: string) => request<TurnResponse>('GET', `/turns/${id}`),
  cancelTurn: (id: string) => request<TurnResponse>('POST', `/turns/${id}/cancel`),

  advisorMe: () => request<AdvisorView>('GET', '/agents/me'),
  setMyStatus: (status: 'available' | 'on_break') =>
    request<{ status: string }>('PATCH', '/agents/me/status', { status }),
  callNext: () => request<{ turn: TurnResponse | null }>('POST', '/turns/call-next'),
  startTurn: (id: string) => request<TurnResponse>('POST', `/turns/${id}/start`),
  markAbsent: (id: string) => request<TurnResponse>('POST', `/turns/${id}/absent`),
  updateProgress: (
    id: string,
    progress: { completedStepIds?: string[]; notes?: string; isComplex?: boolean },
  ) => request<unknown>('PATCH', `/turns/${id}/progress`, progress),
  completeTurn: (id: string, callNext: boolean) =>
    request<{ completed: TurnResponse; next: TurnResponse | null }>(
      'POST',
      `/turns/${id}/complete`,
      { callNext },
    ),

  dashboard: () => request<DashboardView>('GET', '/dashboard'),
  modelInfo: () => request<{ model: ModelInfo | null }>('GET', '/dashboard/model'),
  retrain: () => request<{ model: ModelInfo }>('POST', '/dashboard/retrain'),
  agents: () => request<AgentAdminView[]>('GET', '/agents'),
  createAgent: (input: {
    fullName: string;
    email: string;
    password: string;
    windowNumber: number;
    serviceTypeIds: string[];
  }) => request<AgentAdminView>('POST', '/agents', input),
  updateAgent: (
    id: string,
    input: Partial<{
      fullName: string;
      email: string;
      windowNumber: number;
      serviceTypeIds: string[];
      active: boolean;
    }>,
  ) => request<AgentAdminView>('PATCH', `/agents/${id}`, input),
  resetPassword: (id: string, password: string) =>
    request<{ ok: boolean }>('POST', `/agents/${id}/reset-password`, { password }),
  manageServiceTypes: () => request<ServiceType[]>('GET', '/service-types/manage'),
  createServiceType: (input: ServiceTypeInput) =>
    request<ServiceType>('POST', '/service-types', input),
  updateServiceType: (id: string, input: Partial<ServiceTypeInput> & { active?: boolean }) =>
    request<ServiceType>('PATCH', `/service-types/${id}`, input),
};

export interface ServiceTypeInput {
  name: string;
  description: string;
  prefix: string;
  avgServiceTimeMinutes: number;
  steps: Array<{ id?: string; name: string }>;
}

/** Picks the configured institution (by code) or the first one. */
export function pickInstitution(institutions: Institution[]): Institution | null {
  const code = process.env.NEXT_PUBLIC_INSTITUTION_CODE;
  return institutions.find((i) => i.code === code) ?? institutions[0] ?? null;
}

import { pickInstitution, SERVER_API_URL } from './api';
import type { DisplayView, Institution, PublicServiceType } from './types';

/**
 * Server-side reads for ISR / SSR pages. They never throw: if the backend
 * is unreachable (for example at build time) the page renders an empty
 * state and the client fetches again after hydration.
 */
async function getJson<T>(path: string, init: RequestInit & { next?: { revalidate: number } }) {
  try {
    const response = await fetch(`${SERVER_API_URL}${path}`, {
      ...init,
      signal: AbortSignal.timeout(5000),
    });
    return response.ok ? ((await response.json()) as T) : null;
  } catch {
    return null;
  }
}

export async function loadCatalog(revalidate: number): Promise<{
  institution: Institution | null;
  serviceTypes: PublicServiceType[];
}> {
  const institutions = await getJson<Institution[]>('/institutions', { next: { revalidate } });
  const institution = institutions ? pickInstitution(institutions) : null;
  if (!institution) {
    return { institution: null, serviceTypes: [] };
  }
  const serviceTypes = await getJson<PublicServiceType[]>(
    `/service-types?institutionId=${institution.id}`,
    { next: { revalidate } },
  );
  return { institution, serviceTypes: serviceTypes ?? [] };
}

export async function loadDisplay(): Promise<DisplayView | null> {
  const institutions = await getJson<Institution[]>('/institutions', { cache: 'no-store' });
  const institution = institutions ? pickInstitution(institutions) : null;
  if (!institution) {
    return null;
  }
  return getJson<DisplayView>(`/display?institutionId=${institution.id}`, { cache: 'no-store' });
}

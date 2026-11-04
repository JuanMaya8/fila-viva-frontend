import { NextResponse, type NextRequest } from 'next/server';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000').replace(/\/+$/, '');
const SESSION_COOKIE = 'fv_token';
const REQUIRED_ROLE: Record<string, 'admin' | 'advisor'> = {
  '/admin': 'admin',
  '/advisor': 'advisor',
};

/**
 * Route protection by role. The session cookie is httpOnly and signed by
 * the backend, so instead of decoding it here we ask the backend who the
 * user is (GET /auth/me). Every API call is authorised again server-side.
 */
export async function middleware(request: NextRequest) {
  const section = Object.keys(REQUIRED_ROLE).find((prefix) =>
    request.nextUrl.pathname.startsWith(prefix),
  );
  if (!section) {
    return NextResponse.next();
  }
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const role = token ? await fetchRole(token) : null;
  if (role === REQUIRED_ROLE[section]) {
    return NextResponse.next();
  }
  const login = new URL('/', request.url);
  login.searchParams.set('next', request.nextUrl.pathname);
  if (token && role) {
    login.searchParams.set('error', 'forbidden');
  }
  return NextResponse.redirect(login);
}

async function fetchRole(token: string): Promise<string | null> {
  try {
    const response = await fetch(`${API_URL}/auth/me`, {
      headers: { cookie: `${SESSION_COOKIE}=${token}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      return null;
    }
    const user = (await response.json()) as { role?: string };
    return user.role ?? null;
  } catch {
    return null;
  }
}

export const config = {
  matcher: ['/admin/:path*', '/advisor/:path*'],
};

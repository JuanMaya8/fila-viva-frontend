/** Remembers the client's last turn so they can reopen it (per device). */
const KEY = 'fila-viva:active-turn';

export function rememberTurn(id: string): void {
  try {
    localStorage.setItem(KEY, id);
  } catch {
    // Storage may be unavailable (private mode); the URL still works.
  }
}

export function recallTurn(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function forgetTurn(id: string): void {
  try {
    if (localStorage.getItem(KEY) === id) {
      localStorage.removeItem(KEY);
    }
  } catch {
    // Ignore unavailable storage.
  }
}

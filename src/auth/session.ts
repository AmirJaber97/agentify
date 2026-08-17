import { useSyncExternalStore } from 'react';

export type SessionState =
  | { status: 'checking' }
  | { status: 'unauthenticated' }
  | { status: 'authenticated'; mock: boolean };

let state: SessionState = { status: 'checking' };
const listeners = new Set<() => void>();

function setState(next: SessionState): void {
  state = next;
  for (const l of listeners) l();
}

export function notifyUnauthorized(): void {
  if (state.status !== 'unauthenticated') setState({ status: 'unauthenticated' });
}

export function notifyAuthenticated(mock: boolean): void {
  setState({ status: 'authenticated', mock });
}

export async function checkSession(): Promise<void> {
  try {
    const res = await fetch('/auth/session', { credentials: 'same-origin' });
    if (res.ok) {
      const body = (await res.json()) as { mock?: boolean };
      setState({ status: 'authenticated', mock: body.mock === true });
    } else {
      setState({ status: 'unauthenticated' });
    }
  } catch {
    // BFF unreachable — treat as unauthenticated; the login screen will show
    // a connection error on submit.
    setState({ status: 'unauthenticated' });
  }
}

export async function login(password: string): Promise<{ ok: boolean; error?: string }> {
  let res: Response;
  try {
    res = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password }),
      credentials: 'same-origin',
    });
  } catch {
    return { ok: false, error: 'Cannot reach the dashboard server' };
  }
  if (!res.ok) {
    return { ok: false, error: res.status === 401 ? 'Incorrect password' : `Login failed (${res.status})` };
  }
  const body = (await res.json()) as { mock?: boolean };
  setState({ status: 'authenticated', mock: body.mock === true });
  return { ok: true };
}

export async function logout(): Promise<void> {
  try {
    await fetch('/auth/logout', { method: 'POST', credentials: 'same-origin' });
  } finally {
    setState({ status: 'unauthenticated' });
  }
}

export function useSession(): SessionState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
  );
}

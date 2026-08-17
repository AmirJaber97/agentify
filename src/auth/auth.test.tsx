import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import { render } from '@testing-library/react';
import { LoginPage } from './LoginPage';
import { checkSession, notifyAuthenticated, notifyUnauthorized, useSession } from './session';
import { renderHook, act, waitFor } from '@testing-library/react';

describe('authentication', () => {
  it('an unauthenticated session check flips the store to unauthenticated', async () => {
    server.use(http.get('/auth/session', () => HttpResponse.json({ detail: { error: 'unauthorized' } }, { status: 401 })));
    const { result } = renderHook(() => useSession());
    await act(() => checkSession());
    expect(result.current.status).toBe('unauthenticated');
  });

  it('login failure shows the error inline', async () => {
    server.use(http.post('/auth/login', () => HttpResponse.json({ detail: { error: 'invalid_password' } }, { status: 401 })));
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText('Password'), 'wrong');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect password');
  });

  it('login success authenticates the session store with the mock flag', async () => {
    server.use(http.post('/auth/login', () => HttpResponse.json({ authenticated: true, mock: true })));
    const user = userEvent.setup();
    const { result } = renderHook(() => useSession());
    render(<LoginPage />);

    await user.type(screen.getByLabelText('Password'), 'dev');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(result.current).toEqual({ status: 'authenticated', mock: true }));
  });

  it('a mid-session 401 flips an authenticated store to unauthenticated', () => {
    const { result } = renderHook(() => useSession());
    act(() => notifyAuthenticated(false));
    expect(result.current.status).toBe('authenticated');
    act(() => notifyUnauthorized());
    expect(result.current.status).toBe('unauthenticated');
  });
});

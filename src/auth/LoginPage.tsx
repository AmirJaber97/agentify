import { useState, type FormEvent } from 'react';
import { login } from './session';
import { Button } from '@/components/ui';

export function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setError(null);
    const result = await login(password);
    setBusy(false);
    if (!result.ok) setError(result.error ?? 'Login failed');
  }

  return (
    <div className="login">
      <form className="login__card" onSubmit={onSubmit}>
        <div className="login__brand">
          <span className="topbar__brand-mark" aria-hidden="true">⬡</span>
          Agentify
        </div>
        <p className="login__hint">Personal Agent OS command center. Enter the dashboard password to continue.</p>
        <div className="field">
          <label className="field__label" htmlFor="login-password">
            Password
          </label>
          <input
            id="login-password"
            className="input"
            type="password"
            autoComplete="current-password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && (
            <span className="field__error" role="alert">
              {error}
            </span>
          )}
        </div>
        <Button variant="accent" size="lg" busy={busy} disabled={!password} {...{ type: 'submit' }}>
          Sign in
        </Button>
      </form>
    </div>
  );
}

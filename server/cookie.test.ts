import { describe, expect, it } from 'vitest';
import { readCookie, signSession, verifySession } from './cookie';

const SECRET = 'test-secret-that-is-long-enough-000000';

describe('session cookie', () => {
  it('round-trips a valid session', () => {
    const token = signSession(SECRET, 3600);
    expect(verifySession(SECRET, token)).toBe(true);
  });

  it('rejects a tampered signature', () => {
    const token = signSession(SECRET, 3600);
    const [v, exp, sig] = token.split('.');
    const tampered = `${v}.${exp}.${sig!.slice(0, -2)}xx`;
    expect(verifySession(SECRET, tampered)).toBe(false);
  });

  it('rejects a tampered expiry', () => {
    const token = signSession(SECRET, 3600);
    const [v, , sig] = token.split('.');
    expect(verifySession(SECRET, `${v}.9999999999.${sig}`)).toBe(false);
  });

  it('rejects an expired session', () => {
    const token = signSession(SECRET, 10);
    const later = Date.now() + 11_000;
    expect(verifySession(SECRET, token, later)).toBe(false);
  });

  it('rejects a token signed with a different secret', () => {
    const token = signSession('another-secret-that-is-long-enough-1', 3600);
    expect(verifySession(SECRET, token)).toBe(false);
  });

  it('rejects garbage', () => {
    expect(verifySession(SECRET, undefined)).toBe(false);
    expect(verifySession(SECRET, '')).toBe(false);
    expect(verifySession(SECRET, 'v1.notanumber.sig')).toBe(false);
    expect(verifySession(SECRET, 'v2.123.sig')).toBe(false);
  });

  it('readCookie extracts by name', () => {
    expect(readCookie('a=1; paos_session=v1.2.3; b=2', 'paos_session')).toBe('v1.2.3');
    expect(readCookie('a=1', 'paos_session')).toBeUndefined();
    expect(readCookie(undefined, 'paos_session')).toBeUndefined();
  });
});

// Fixture timestamps are computed once at import so mock data always looks
// recent. Tests that need determinism can compare relative ordering, not
// absolute values.
const NOW = Date.now();

export function hoursAgo(h: number): string {
  return new Date(NOW - h * 3_600_000).toISOString().replace(/\.\d{3}Z$/, 'Z');
}

export function daysAgo(d: number): string {
  return hoursAgo(d * 24);
}

export function minutesAgo(m: number): string {
  return new Date(NOW - m * 60_000).toISOString().replace(/\.\d{3}Z$/, 'Z');
}

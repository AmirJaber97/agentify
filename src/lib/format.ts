export function formatRelative(iso: string): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return iso;
  const diffMs = Date.now() - then;
  const future = diffMs < 0;
  const abs = Math.abs(diffMs);

  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  // Beyond ~30 days, show the absolute date with no relative suffix.
  if (abs >= 30 * day) return new Date(then).toLocaleDateString();

  let text: string;
  if (abs < minute) text = 'just now';
  else if (abs < hour) text = `${Math.floor(abs / minute)}m`;
  else if (abs < day) text = `${Math.floor(abs / hour)}h`;
  else text = `${Math.floor(abs / day)}d`;

  if (text === 'just now') return future ? 'now' : text;
  return future ? `in ${text}` : `${text} ago`;
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`;
}

export function formatEuro(n: number): string {
  return new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}

import { useEffect, useState } from 'react';
import { formatRelative } from '@/lib/format';

/** "4m ago"-style timestamp that refreshes itself. */
export function RelativeTime({ iso }: { iso: string | null | undefined }) {
  const [, tick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(interval);
  }, []);

  if (!iso) return <span style={{ color: 'var(--text-3)' }}>never</span>;
  return (
    <time dateTime={iso} title={new Date(iso).toLocaleString()}>
      {formatRelative(iso)}
    </time>
  );
}

import { Link } from 'react-router-dom';
import type { Activity } from '@shared/types';
import { RelativeTime } from './RelativeTime';
import { StatusDot } from './status';
import { EmptyState } from './ui';

const LEVEL_COLOR: Record<string, string> = {
  info: 'var(--status-idle)',
  warning: 'var(--warn)',
  error: 'var(--danger)',
};

export function Timeline({
  items,
  showAgent = true,
  emptyTitle = 'No activity yet',
}: {
  items: Activity[];
  showAgent?: boolean;
  emptyTitle?: string;
}) {
  if (items.length === 0) {
    return <EmptyState icon="◷" title={emptyTitle} hint="Meaningful agent events will appear here as they happen." />;
  }
  return (
    <ol className="timeline">
      {items.map((item) => (
        <li key={item.id} className="timeline__item">
          <div className="timeline__marker">
            <StatusDot color={LEVEL_COLOR[item.level ?? 'info'] ?? LEVEL_COLOR.info!} />
            <div className="timeline__line" />
          </div>
          <div className="timeline__content">
            <div className="timeline__message">{item.message}</div>
            <div className="timeline__meta">
              {showAgent && item.agent_id && (
                <Link to={`/agents/${item.agent_id}`} className="mono">
                  {item.agent_id}
                </Link>
              )}
              {!item.agent_id && showAgent && <span className="mono">system</span>}
              <RelativeTime iso={item.created_at} />
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

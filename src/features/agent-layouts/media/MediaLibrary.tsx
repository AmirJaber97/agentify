import type { AgentState } from '@shared/types';
import { useSendAgentMessage } from '@/api/mutations';
import { Button, EmptyState, Spinner } from '@/components/ui';
import { toast } from '@/components/Toast';
import { asRecordArray, asString, asNumber, asRecord } from '@/lib/guards';
import { GenericStateView } from '../GenericStateView';
import { RelativeTime } from '@/components/RelativeTime';
import clsx from 'clsx';

const COLUMNS: Array<{ key: string; title: string }> = [
  { key: 'watching', title: 'Watching' },
  { key: 'paused', title: 'Paused' },
  { key: 'planned', title: 'Planned' },
  { key: 'completed', title: 'Completed' },
  { key: 'dropped', title: 'Dropped' },
];

interface MediaEntry {
  title: string;
  type: string;
  status: string;
  season: number | null;
  episode: number | null;
  rating: number | null;
  thoughts: string;
  updated_at: string;
}

function parseLibrary(state: AgentState): MediaEntry[] | null {
  const library = asRecord(state.structured_data).library;
  if (!Array.isArray(library)) return null;
  return asRecordArray(library).map((e) => ({
    title: asString(e.title, 'Untitled'),
    type: asString(e.type, 'media'),
    status: asString(e.status, 'planned').toLowerCase(),
    season: asNumber(e.season),
    episode: asNumber(e.episode),
    rating: asNumber(e.rating),
    thoughts: asString(e.thoughts),
    updated_at: asString(e.updated_at),
  }));
}

function QuickActions({ entry }: { entry: MediaEntry }) {
  const send = useSendAgentMessage('media');

  function act(message: string) {
    send.mutate(message, {
      onSuccess: () => toast('Media updated'),
      onError: (e) => toast(e instanceof Error ? e.message : 'Update failed', 'error'),
    });
  }

  if (send.isPending) return <Spinner />;

  // All quick actions go through the documented NL fast-path — no local logic.
  return (
    <div className="media-entry__actions">
      {(entry.status === 'watching' || entry.status === 'paused') && (
        <Button size="sm" variant="ghost" onClick={() => act(`I watched the next episode of ${entry.title}`)}>
          +1 ep
        </Button>
      )}
      {entry.status === 'watching' && (
        <Button size="sm" variant="ghost" onClick={() => act(`Pause ${entry.title}`)}>
          Pause
        </Button>
      )}
      {(entry.status === 'paused' || entry.status === 'planned') && (
        <Button size="sm" variant="ghost" onClick={() => act(`Resume ${entry.title}`)}>
          {entry.status === 'planned' ? 'Start' : 'Resume'}
        </Button>
      )}
      {entry.status !== 'completed' && entry.status !== 'dropped' && (
        <Button size="sm" variant="ghost" onClick={() => act(`I completed ${entry.title}`)}>
          Done
        </Button>
      )}
      {entry.rating === null && (entry.status === 'completed' || entry.status === 'dropped') && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            const rating = window.prompt(`Rate ${entry.title} out of 10:`);
            if (rating && /^\d{1,2}$/.test(rating.trim())) act(`Rate ${entry.title} ${rating.trim()}/10`);
          }}
        >
          Rate
        </Button>
      )}
    </div>
  );
}

export function MediaLibrary({ state }: { state: AgentState }) {
  const entries = parseLibrary(state);
  // Shape miss → degrade to the generic view rather than guessing.
  if (entries === null) return <GenericStateView state={state} />;
  if (entries.length === 0) {
    return <EmptyState icon="🎬" title="Library is empty" hint='Try "Tell media I started watching …" from the command bar.' />;
  }

  const byStatus = new Map<string, MediaEntry[]>();
  for (const e of entries) {
    const list = byStatus.get(e.status) ?? [];
    list.push(e);
    byStatus.set(e.status, list);
  }
  const knownKeys = new Set(COLUMNS.map((c) => c.key));
  const extras = entries.filter((e) => !knownKeys.has(e.status));

  return (
    <div className="media-columns">
      {COLUMNS.map((col) => {
        const list = byStatus.get(col.key) ?? [];
        if (list.length === 0 && col.key !== 'watching') return null;
        return (
          <div key={col.key} className="media-col">
            <div className="media-col__title">
              {col.title} <span className="mono">{list.length}</span>
            </div>
            {list.length === 0 && <div className="empty-state__hint">Nothing here.</div>}
            {list.map((entry) => (
              <div key={entry.title} className={clsx('media-entry', col.key === 'watching' && 'media-entry--active')}>
                <div className="media-entry__title">{entry.title}</div>
                <div className="media-entry__meta">
                  <span>{entry.type}</span>
                  {entry.season !== null && (
                    <span className="mono">
                      S{entry.season}
                      {entry.episode !== null ? `E${entry.episode}` : ''}
                    </span>
                  )}
                  {entry.rating !== null && <span className="mono">★ {entry.rating}/10</span>}
                  {entry.updated_at && <RelativeTime iso={entry.updated_at} />}
                </div>
                {entry.thoughts && <div className="media-entry__thoughts">{entry.thoughts}</div>}
                <QuickActions entry={entry} />
              </div>
            ))}
          </div>
        );
      })}
      {extras.length > 0 && (
        <div className="media-col">
          <div className="media-col__title">Other</div>
          {extras.map((entry) => (
            <div key={entry.title} className="media-entry">
              <div className="media-entry__title">{entry.title}</div>
              <div className="media-entry__meta">{entry.status}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

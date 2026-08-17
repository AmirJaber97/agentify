import { useMemo, useState } from 'react';
import clsx from 'clsx';
import type { ProjectSummary } from '@shared/types';
import { useProjectHistory, useProjectSummaries } from '@/api/queries';
import { Badge, Button, EmptyState, ErrorState, Panel, Skeleton } from '@/components/ui';
import { RelativeTime } from '@/components/RelativeTime';
import { Dialog } from '@/components/Dialog';
import { PrivacyBadge } from '@/components/status';

const STATUS_TONE: Record<string, 'ok' | 'warn' | 'danger' | undefined> = {
  active: 'ok',
  blocked: 'danger',
  paused: undefined,
  completed: undefined,
};

const SIGNAL_LABEL: Record<string, { label: string; tone?: 'ok' | 'warn' | 'danger' }> = {
  moved_forward: { label: '↗ moved forward', tone: 'ok' },
  neutral: { label: '→ neutral' },
  blocked: { label: '■ blocked', tone: 'danger' },
};

function latestPerAlias(rows: ProjectSummary[]): ProjectSummary[] {
  const byAlias = new Map<string, ProjectSummary>();
  for (const p of rows) {
    const existing = byAlias.get(p.project_alias);
    if (!existing || (p.generated_at ?? '') > (existing.generated_at ?? '')) byAlias.set(p.project_alias, p);
  }
  // Blocked + follow-up projects first: they answer "what do I resume?"
  return [...byAlias.values()].sort((a, b) => {
    const score = (p: ProjectSummary) =>
      (p.status === 'blocked' ? 2 : 0) + (p.needs_followup ? 1 : 0) + (p.status === 'active' ? 0.5 : 0);
    return score(b) - score(a) || (b.generated_at ?? '').localeCompare(a.generated_at ?? '');
  });
}

function ProjectCard({ project, onHistory }: { project: ProjectSummary; onHistory: () => void }) {
  const signal = SIGNAL_LABEL[project.progress_signal ?? 'neutral'];
  return (
    <article className={clsx('project-card', project.status === 'blocked' && 'project-card--blocked')}>
      <div className="project-card__head">
        <span className="project-card__alias">{project.project_alias}</span>
        <Badge tone={STATUS_TONE[project.status ?? '']}>{project.status}</Badge>
        {signal && <Badge tone={signal.tone}>{signal.label}</Badge>}
        {project.needs_followup && <Badge tone="warn">follow-up</Badge>}
        <Badge mono>{project.project_type}</Badge>
      </div>
      {project.session_summary && <p className="project-card__summary">{project.session_summary}</p>}

      {(project.blockers ?? []).length > 0 && (
        <div className="project-card__section">
          <span className="project-card__section-title" style={{ color: 'var(--danger)' }}>
            Blockers
          </span>
          <ul className="project-card__list">
            {project.blockers!.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </div>
      )}
      {(project.accomplishments ?? []).length > 0 && (
        <div className="project-card__section">
          <span className="project-card__section-title">Accomplished</span>
          <ul className="project-card__list">
            {project.accomplishments!.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </div>
      )}
      {(project.next_actions ?? []).length > 0 && (
        <div className="project-card__section">
          <span className="project-card__section-title">Next actions</span>
          <ul className="project-card__list">
            {project.next_actions!.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </div>
      )}
      {project.attention_next_session && (
        <div className="project-card__attention">▲ Next session: {project.attention_next_session}</div>
      )}
      <div className="project-card__foot">
        <span>
          updated <RelativeTime iso={project.generated_at} />
        </span>
        <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <PrivacyBadge privacy={project.privacy_class ?? 'WORK_RESTRICTED'} />
          <Button size="sm" variant="ghost" onClick={onHistory}>
            History
          </Button>
        </span>
      </div>
    </article>
  );
}

export function ProjectsPage() {
  const projects = useProjectSummaries();
  const [historyAlias, setHistoryAlias] = useState<string | null>(null);
  const history = useProjectHistory(historyAlias);

  const latest = useMemo(() => latestPerAlias(projects.data ?? []), [projects.data]);
  const blocked = latest.filter((p) => p.status === 'blocked');
  const resumable = latest.filter((p) => p.status === 'active');

  return (
    <>
      <div className="page-header">
        <h1>Projects</h1>
        <span className="page-header__hint">Sanitized session summaries only — the dashboard has no access to code or repositories.</span>
      </div>

      {projects.isPending && (
        <div className="project-grid">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="project-card" style={{ minHeight: 180 }}>
              <Skeleton height={20} width={140} />
              <Skeleton height={14} />
              <Skeleton height={14} width="70%" />
            </div>
          ))}
        </div>
      )}
      {projects.isError && (
        <Panel>
          <ErrorState error={projects.error} onRetry={() => void projects.refetch()} />
        </Panel>
      )}

      {projects.data && latest.length === 0 && (
        <Panel>
          <EmptyState
            icon="▤"
            title="No project summaries yet"
            hint="Summaries arrive automatically when project sessions end and are ingested by Hermes."
          />
        </Panel>
      )}

      {latest.length > 0 && (
        <>
          {(blocked.length > 0 || resumable.length > 0) && (
            <div className="system-strip">
              {blocked.length > 0 && (
                <span className="system-strip__item">
                  ■ Blocked <span className="system-strip__value">{blocked.map((p) => p.project_alias).join(', ')}</span>
                </span>
              )}
              {resumable.length > 0 && (
                <span className="system-strip__item">
                  ▶ Resume <span className="system-strip__value">{resumable.map((p) => p.project_alias).join(', ')}</span>
                </span>
              )}
            </div>
          )}
          <div className="project-grid">
            {latest.map((p) => (
              <ProjectCard key={p.project_alias} project={p} onHistory={() => setHistoryAlias(p.project_alias)} />
            ))}
          </div>
        </>
      )}

      <Dialog open={historyAlias !== null} onClose={() => setHistoryAlias(null)} title={`${historyAlias ?? ''} — session history`} wide>
        {history.isPending && <Skeleton height={120} />}
        {history.isError && <ErrorState error={history.error} />}
        {history.data && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[...history.data]
              .sort((a, b) => (b.generated_at ?? '').localeCompare(a.generated_at ?? ''))
              .map((p) => (
                <div key={`${p.id ?? p.generated_at}`} style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
                    <Badge tone={STATUS_TONE[p.status ?? '']}>{p.status}</Badge>
                    <Badge>{SIGNAL_LABEL[p.progress_signal ?? 'neutral']?.label}</Badge>
                    <span className="attention-item__meta">
                      <RelativeTime iso={p.generated_at} />
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-2)' }}>{p.session_summary}</p>
                </div>
              ))}
          </div>
        )}
      </Dialog>
    </>
  );
}

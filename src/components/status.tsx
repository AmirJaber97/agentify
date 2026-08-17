import clsx from 'clsx';
import type { AgentStatus, ModelPolicy, PrivacyClass, TaskStatus } from '@shared/types';
import { Badge } from './ui';

export const AGENT_STATUS_COLOR: Record<AgentStatus, string> = {
  IDLE: 'var(--status-idle)',
  WORKING: 'var(--status-working)',
  WAITING: 'var(--status-waiting)',
  BLOCKED: 'var(--status-blocked)',
  ERROR: 'var(--status-error)',
  DISABLED: 'var(--status-disabled)',
};

export const TASK_STATUS_COLOR: Record<TaskStatus, string> = {
  QUEUED: 'var(--status-idle)',
  RUNNING: 'var(--status-working)',
  WAITING_FOR_USER: 'var(--status-waiting)',
  SUCCEEDED: 'var(--ok)',
  FAILED: 'var(--status-error)',
  CANCELLED: 'var(--status-disabled)',
  OPEN: 'var(--status-idle)',
  COMPLETED: 'var(--ok)',
};

export function StatusDot({ color, pulse = false }: { color: string; pulse?: boolean }) {
  return (
    <span
      className={clsx('status-dot', pulse && 'status-dot--pulse')}
      style={{ background: color }}
      aria-hidden="true"
    />
  );
}

export function AgentStatusBadge({ status }: { status: AgentStatus }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-2)' }}>
      <StatusDot color={AGENT_STATUS_COLOR[status]} pulse={status === 'WORKING'} />
      {status}
    </span>
  );
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const tone =
    status === 'FAILED' ? 'danger' : status === 'SUCCEEDED' || status === 'COMPLETED' ? 'ok' : status === 'RUNNING' ? 'accent' : undefined;
  return (
    <Badge tone={tone} mono>
      {status.replace(/_/g, ' ')}
    </Badge>
  );
}

export function AgentAvatar({
  icon,
  status,
  size,
}: {
  icon: string;
  status?: AgentStatus;
  size?: 'sm' | 'lg';
}) {
  return (
    <span className={clsx('avatar', size && `avatar--${size}`)} aria-hidden="true">
      {icon || '⬡'}
      {status && (
        <span
          className="avatar__status"
          style={{ background: AGENT_STATUS_COLOR[status] }}
          title={status}
        />
      )}
    </span>
  );
}

const POLICY_LABEL: Record<ModelPolicy, string> = {
  LOCAL_ONLY: 'Local only',
  CHEAP_FAST: 'Cheap · fast',
  BALANCED: 'Balanced',
  DEEP_REASONING: 'Deep reasoning',
  CODING: 'Coding',
  CUSTOM: 'Custom',
};

export function ModelPolicyBadge({ policy }: { policy: ModelPolicy }) {
  return <Badge mono title="Model policy">{POLICY_LABEL[policy]}</Badge>;
}

const PRIVACY_LABEL: Record<PrivacyClass, { label: string; tone?: 'warn' | 'danger' }> = {
  PUBLIC_OR_GENERAL: { label: 'Public' },
  PERSONAL: { label: 'Personal' },
  PRIVATE: { label: 'Private', tone: 'warn' },
  WORK_RESTRICTED: { label: 'Work-restricted', tone: 'danger' },
};

export function PrivacyBadge({ privacy }: { privacy: PrivacyClass }) {
  const { label, tone } = PRIVACY_LABEL[privacy];
  return (
    <Badge tone={tone} title="Privacy class">
      {label}
    </Badge>
  );
}

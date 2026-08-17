import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { useSystemStatus } from '@/api/queries';
import { useStreamStatus, type StreamStatus } from '@/api/sse';
import { useSession } from '@/auth/session';
import { StatusDot } from '@/components/status';
import { Kbd } from '@/components/ui';
import { ToastRegion } from '@/components/Toast';
import { CommandBar } from '@/features/command-bar/CommandBar';

const NAV_ITEMS = [
  { to: '/', icon: '⌂', label: 'Overview', end: true },
  { to: '/agents', icon: '⬡', label: 'Agents' },
  { to: '/projects', icon: '▤', label: 'Projects' },
  { to: '/tasks', icon: '☰', label: 'Tasks' },
  { to: '/activity', icon: '◷', label: 'Activity' },
  { to: '/models', icon: '⚙', label: 'Models' },
  { to: '/settings', icon: '⋯', label: 'Settings' },
];

function ConnectionIndicator({ status, offline }: { status: StreamStatus; offline: boolean }) {
  if (offline) {
    return (
      <span className="conn conn--down">
        <StatusDot color="var(--danger)" /> offline — data may be stale
      </span>
    );
  }
  switch (status) {
    case 'open':
      return (
        <span className="conn">
          <StatusDot color="var(--ok)" /> live
        </span>
      );
    case 'connecting':
    case 'reconnecting':
      return (
        <span className="conn conn--reconnecting">
          <StatusDot color="var(--warn)" pulse /> reconnecting
        </span>
      );
    default:
      return (
        <span className="conn conn--down">
          <StatusDot color="var(--danger)" /> stream down — data may be stale
        </span>
      );
  }
}

function useOnlineFlag(): boolean {
  const [online, setOnline] = useState(navigator.onLine !== false);
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);
  return online;
}

export function AppShell() {
  const session = useSession();
  const system = useSystemStatus();
  const streamStatus = useStreamStatus();
  const online = useOnlineFlag();
  const [commandOpen, setCommandOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandOpen((v) => !v);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const agentsByStatus = (system.data?.agents_by_status ?? {}) as Record<string, number>;
  const enabledAgents = Object.entries(agentsByStatus)
    .filter(([status]) => status !== 'DISABLED')
    .reduce((sum, [, n]) => sum + n, 0);
  const systemHealthy = system.data?.status === 'ok';

  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar__brand">
          <span className="topbar__brand-mark" aria-hidden="true">⬡</span>
          Agentify
          <span className="topbar__sub">hermes</span>
        </div>
        {session.status === 'authenticated' && session.mock && (
          <span className="mock-badge" title="Serving development fixtures — not connected to PAOS">
            ◈ MOCK
          </span>
        )}
        <div className="topbar__spacer" />
        <div className="topbar__stats">
          <span className="topbar__stat" title="Hermes system status">
            <StatusDot color={system.isError ? 'var(--danger)' : systemHealthy ? 'var(--ok)' : 'var(--warn)'} />
            {system.isError ? 'unreachable' : systemHealthy ? 'healthy' : (system.data?.status ?? '…')}
          </span>
          <span className="topbar__stat" title="Enabled agents">
            <span className="mono">{enabledAgents}</span> agents
          </span>
          <ConnectionIndicator status={streamStatus} offline={!online} />
        </div>
        <button type="button" className="topbar__search" onClick={() => setCommandOpen(true)}>
          <span style={{ flex: 1, textAlign: 'left' }}>Command…</span>
          <Kbd>⌘K</Kbd>
        </button>
      </header>

      <nav className="nav" aria-label="Main navigation">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => clsx('nav__link', isActive && 'nav__link--active')}
          >
            <span className="nav__icon" aria-hidden="true">
              {item.icon}
            </span>
            {item.label}
          </NavLink>
        ))}
        <div className="nav__footer">
          <button type="button" className="btn btn--accent nav__create" onClick={() => navigate('/agents/new')}>
            ✚ Create Agent
          </button>
        </div>
      </nav>

      <main className="main">
        <div className="main__inner">
          <Outlet />
        </div>
      </main>

      <CommandBar open={commandOpen} onClose={() => setCommandOpen(false)} />
      <ToastRegion />
    </div>
  );
}

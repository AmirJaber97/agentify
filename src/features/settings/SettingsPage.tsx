import { useSystemStatus } from '@/api/queries';
import { logout, useSession } from '@/auth/session';
import { useStreamStatus } from '@/api/sse';
import { Badge, Button, KeyValueList, Panel } from '@/components/ui';
import { RelativeTime } from '@/components/RelativeTime';

export function SettingsPage() {
  const session = useSession();
  const system = useSystemStatus();
  const streamStatus = useStreamStatus();
  const mock = session.status === 'authenticated' && session.mock;

  return (
    <>
      <div className="page-header">
        <h1>Settings</h1>
      </div>

      <Panel title="Connection">
        <KeyValueList
          entries={[
            ['Data source', mock ? <Badge key="m" tone="warn">MOCK fixtures — not connected to PAOS</Badge> : <Badge key="m" tone="ok">Personal Agent OS via server-side proxy</Badge>],
            ['Hermes status', system.isError ? 'unreachable' : String(system.data?.status ?? '…')],
            ['Service', String(system.data?.service ?? '—')],
            ['Event stream', streamStatus],
            ['Last status check', system.data?.time ? <RelativeTime key="t" iso={system.data.time} /> : '—'],
          ]}
        />
      </Panel>

      <Panel title="Security model">
        <p style={{ fontSize: 13, color: 'var(--text-2)', maxWidth: 640 }}>
          The browser only ever talks to this dashboard's own server, which holds the PAOS credentials and proxies
          requests to the localhost-only Personal Agent OS API. No backend token exists in this page, its bundle, or
          browser storage. Your session is an HttpOnly signed cookie.
        </p>
      </Panel>

      <Panel title="Session">
        <Button variant="danger" onClick={() => void logout()}>
          Sign out
        </Button>
      </Panel>
    </>
  );
}

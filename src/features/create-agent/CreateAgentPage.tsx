import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { AgentCreate, DerivedAgentManifest, ModelPolicy, PrivacyClass } from '@shared/types';
import { MODEL_POLICIES, PRIVACY_CLASSES } from '@shared/types';
import { useCreateAgent, useDeriveAgent } from '@/api/mutations';
import { Button, Panel, Spinner } from '@/components/ui';
import { JsonTree } from '@/components/JsonTree';
import { toast } from '@/components/Toast';
import { ApiError } from '@/api/errors';

const EXAMPLE =
  'Create an agent that tracks restaurants and cafés I visit, remembers what I ordered and whether I liked it, and recommends places I should revisit.';

export function CreateAgentPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const derive = useDeriveAgent();
  const create = useCreateAgent();

  const seeded = (location.state as { manifest?: DerivedAgentManifest } | null)?.manifest ?? null;
  const [description, setDescription] = useState('');
  const [manifest, setManifest] = useState<DerivedAgentManifest | null>(seeded);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [permissionsApproved, setPermissionsApproved] = useState(false);

  const hasPowerfulPermissions = manifest != null && Object.keys(manifest.permissions ?? {}).length > 0;

  function onDerive() {
    const message = description.trim();
    if (!message || derive.isPending) return;
    derive.mutate(message, {
      onSuccess: (m) => {
        setManifest(m);
        setPermissionsApproved(false);
      },
    });
  }

  function update<K extends keyof DerivedAgentManifest>(key: K, value: DerivedAgentManifest[K]) {
    if (manifest) setManifest({ ...manifest, [key]: value });
  }

  function onCreate() {
    if (!manifest || create.isPending) return;
    if (hasPowerfulPermissions && !permissionsApproved) return;
    create.mutate(manifest as AgentCreate, {
      onSuccess: (agent) => {
        toast(`Agent ${agent.name} created`);
        navigate(`/agents/${agent.id}`);
      },
    });
  }

  return (
    <div className="create-flow">
      <div className="page-header">
        <h1>Create Agent</h1>
        <span className="page-header__hint">Describe what you want — Hermes proposes the configuration.</span>
      </div>

      <Panel title="1 · Describe the agent">
        <div className="composer">
          <textarea
            className="textarea"
            rows={3}
            placeholder={EXAMPLE}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            aria-label="Agent description"
          />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Button variant="accent" busy={derive.isPending} disabled={!description.trim()} onClick={onDerive}>
              Propose configuration
            </Button>
            {!description && (
              <Button variant="ghost" size="sm" onClick={() => setDescription(EXAMPLE)}>
                Use example
              </Button>
            )}
          </div>
          {derive.isPending && (
            <div className="in-flight">
              <Spinner /> Hermes is deriving an agent manifest…
            </div>
          )}
          {derive.isError && (
            <div className="confirm-banner" role="alert">
              <strong>Derivation failed</strong>
              {derive.error instanceof Error ? derive.error.message : 'Could not derive an agent'}
            </div>
          )}
        </div>
      </Panel>

      {manifest && (
        <Panel title="2 · Review & adjust">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="manifest-grid">
              <div className="field">
                <label className="field__label" htmlFor="ca-name">Name</label>
                <input id="ca-name" className="input" value={manifest.name} onChange={(e) => update('name', e.target.value)} />
              </div>
              <div className="field">
                <label className="field__label" htmlFor="ca-icon">Icon</label>
                <input id="ca-icon" className="input" value={manifest.icon ?? ''} onChange={(e) => update('icon', e.target.value)} />
              </div>
              <div className="field field--full">
                <label className="field__label" htmlFor="ca-desc">Description</label>
                <textarea
                  id="ca-desc"
                  className="textarea"
                  value={manifest.description ?? ''}
                  onChange={(e) => update('description', e.target.value)}
                />
              </div>
              <div className="field">
                <label className="field__label" htmlFor="ca-id">ID</label>
                <input id="ca-id" className="input mono" value={manifest.id ?? ''} onChange={(e) => update('id', e.target.value)} />
              </div>
              <div className="field">
                <label className="field__label" htmlFor="ca-category">Category</label>
                <input
                  id="ca-category"
                  className="input"
                  value={manifest.category ?? ''}
                  onChange={(e) => update('category', e.target.value)}
                />
              </div>
              <div className="field">
                <label className="field__label" htmlFor="ca-privacy">Privacy class</label>
                <select
                  id="ca-privacy"
                  className="select"
                  value={manifest.privacy_class ?? 'PERSONAL'}
                  onChange={(e) => update('privacy_class', e.target.value as PrivacyClass)}
                >
                  {PRIVACY_CLASSES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="field__label" htmlFor="ca-policy">Model policy</label>
                <select
                  id="ca-policy"
                  className="select"
                  value={manifest.model_policy ?? 'BALANCED'}
                  onChange={(e) => update('model_policy', e.target.value as ModelPolicy)}
                >
                  {MODEL_POLICIES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>

            <button type="button" className="advanced-toggle" onClick={() => setShowAdvanced(!showAdvanced)} aria-expanded={showAdvanced}>
              {showAdvanced ? '▾' : '▸'} Advanced configuration
            </button>

            {showAdvanced && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="field">
                  <label className="field__label" htmlFor="ca-instructions">System instructions</label>
                  <textarea
                    id="ca-instructions"
                    className="textarea"
                    rows={4}
                    value={manifest.system_instructions ?? ''}
                    onChange={(e) => update('system_instructions', e.target.value)}
                  />
                </div>
                <div>
                  <div className="project-card__section-title">Tools</div>
                  <JsonTree data={manifest.allowed_tools ?? []} />
                </div>
                <div>
                  <div className="project-card__section-title">Triggers & schedules</div>
                  <JsonTree data={{ triggers: manifest.triggers ?? [], schedules: manifest.schedules ?? [] }} />
                </div>
                <div>
                  <div className="project-card__section-title">State schema</div>
                  <JsonTree data={manifest.state_schema ?? {}} />
                </div>
                <div>
                  <div className="project-card__section-title">Permissions</div>
                  <JsonTree data={manifest.permissions ?? {}} />
                </div>
              </div>
            )}

            {hasPowerfulPermissions && (
              <div className="permission-warning">
                <input
                  type="checkbox"
                  id="ca-permissions-ok"
                  checked={permissionsApproved}
                  onChange={(e) => setPermissionsApproved(e.target.checked)}
                  style={{ marginTop: 3 }}
                />
                <label htmlFor="ca-permissions-ok">
                  This agent requests non-default permissions (see Advanced). I have reviewed them and approve.
                </label>
              </div>
            )}

            {create.isError && (
              <div className="confirm-banner" role="alert">
                <strong>Creation failed</strong>
                {create.error instanceof ApiError && create.error.fieldErrors.length > 0
                  ? create.error.fieldErrors.map((f) => `${f.field}: ${f.message}`).join('; ')
                  : create.error instanceof Error
                    ? create.error.message
                    : 'Could not create the agent'}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <Button
                variant="accent"
                size="lg"
                busy={create.isPending}
                disabled={!manifest.name || (hasPowerfulPermissions && !permissionsApproved)}
                onClick={onCreate}
              >
                Create {manifest.icon} {manifest.name}
              </Button>
              <Button variant="ghost" onClick={() => setManifest(null)}>
                Start over
              </Button>
            </div>
          </div>
        </Panel>
      )}
    </div>
  );
}

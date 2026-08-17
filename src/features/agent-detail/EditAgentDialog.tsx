import { useState } from 'react';
import type { Agent, AgentPatch, ModelPolicy, PrivacyClass } from '@shared/types';
import { MODEL_POLICIES, PRIVACY_CLASSES } from '@shared/types';
import { usePatchAgent } from '@/api/mutations';
import { Dialog } from '@/components/Dialog';
import { Button } from '@/components/ui';
import { toast } from '@/components/Toast';

/**
 * PATCH sends only dirty fields — PAOS rejects unknown fields and a full
 * Agent spread would include non-patchable ones (e.g. memory_namespace).
 */
export function EditAgentDialog({ agent, open, onClose }: { agent: Agent; open: boolean; onClose: () => void }) {
  const patchAgent = usePatchAgent(agent.id);
  const [form, setForm] = useState({
    name: agent.name,
    description: agent.description ?? '',
    icon: agent.icon ?? '',
    category: agent.category ?? '',
    privacy_class: (agent.privacy_class ?? 'PERSONAL') as PrivacyClass,
    model_policy: (agent.model_policy ?? 'BALANCED') as ModelPolicy,
    system_instructions: agent.system_instructions ?? '',
  });

  function save() {
    const patch: AgentPatch = {};
    if (form.name !== agent.name) patch.name = form.name;
    if (form.description !== (agent.description ?? '')) patch.description = form.description;
    if (form.icon !== (agent.icon ?? '')) patch.icon = form.icon;
    if (form.category !== (agent.category ?? '')) patch.category = form.category;
    if (form.privacy_class !== agent.privacy_class) patch.privacy_class = form.privacy_class;
    if (form.model_policy !== agent.model_policy) patch.model_policy = form.model_policy;
    if (form.system_instructions !== (agent.system_instructions ?? '')) patch.system_instructions = form.system_instructions;

    if (Object.keys(patch).length === 0) {
      onClose();
      return;
    }
    patchAgent.mutate(patch, {
      onSuccess: () => {
        toast(`${form.name} updated`);
        onClose();
      },
      onError: (e) => toast(e instanceof Error ? e.message : 'Update failed', 'error'),
    });
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Edit ${agent.name}`}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="accent" busy={patchAgent.isPending} onClick={save}>
            Save changes
          </Button>
        </>
      }
    >
      <div className="manifest-grid">
        <div className="field">
          <label className="field__label" htmlFor="edit-name">Name</label>
          <input id="edit-name" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="edit-icon">Icon</label>
          <input id="edit-icon" className="input" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} />
        </div>
        <div className="field field--full">
          <label className="field__label" htmlFor="edit-desc">Description</label>
          <textarea id="edit-desc" className="textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="edit-category">Category</label>
          <input id="edit-category" className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="edit-privacy">Privacy class</label>
          <select
            id="edit-privacy"
            className="select"
            value={form.privacy_class}
            onChange={(e) => setForm({ ...form, privacy_class: e.target.value as PrivacyClass })}
          >
            {PRIVACY_CLASSES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="field__label" htmlFor="edit-policy">Model policy</label>
          <select
            id="edit-policy"
            className="select"
            value={form.model_policy}
            onChange={(e) => setForm({ ...form, model_policy: e.target.value as ModelPolicy })}
          >
            {MODEL_POLICIES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div className="field field--full">
          <label className="field__label" htmlFor="edit-instructions">System instructions</label>
          <textarea
            id="edit-instructions"
            className="textarea"
            rows={4}
            value={form.system_instructions}
            onChange={(e) => setForm({ ...form, system_instructions: e.target.value })}
          />
        </div>
      </div>
      {patchAgent.isError && (
        <div className="field__error" role="alert">
          {patchAgent.error instanceof Error ? patchAgent.error.message : 'Update failed'}
        </div>
      )}
    </Dialog>
  );
}

import { EventEmitter } from 'node:events';
import type { MockStore } from './store';

export interface MockFrame {
  type: string;
  agent_id?: string | null;
  summary?: string;
  payload?: Record<string, unknown>;
  refresh: string[];
}

export class MockStream extends EventEmitter {
  private nextEventId = 1000;
  private ambientTimer: ReturnType<typeof setInterval> | null = null;
  private ambientStep = 0;

  emitFrame(frame: MockFrame): void {
    this.emit('frame', {
      event_id: this.nextEventId++,
      created_at: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
      ...frame,
    });
  }

  /** Scripted ambient events so the dev UI visibly lives without input. */
  startAmbient(store: MockStore): void {
    if (this.ambientTimer) return;
    this.ambientTimer = setInterval(() => {
      this.ambientStep += 1;
      const step = this.ambientStep % 4;
      if (step === 1) {
        store.setAgentStatus('health', 'WORKING');
        this.emitFrame({
          type: 'agent.status_changed',
          agent_id: 'health',
          summary: 'Health started reviewing todays plan.',
          refresh: ['agents', 'agent:health', 'dashboard'],
        });
      } else if (step === 2) {
        store.setAgentStatus('health', 'IDLE');
        const a = store.addActivity('health', 'Reviewed training plan — push day still due', 'info', 'agent.state_updated');
        this.emitFrame({
          type: 'agent.state_updated',
          agent_id: 'health',
          summary: a.message,
          refresh: ['agents', 'agent:health', 'activity', 'dashboard'],
        });
      } else if (step === 3) {
        const a = store.addActivity('media', 'Nightly check: Severance still paused at S2E4', 'info', 'activity.created');
        this.emitFrame({
          type: 'activity.created',
          agent_id: 'media',
          summary: a.message,
          refresh: ['activity', 'dashboard'],
        });
      } else {
        const a = store.addActivity(null, 'Model registry heartbeat: all providers responding', 'info', 'activity.created');
        this.emitFrame({
          type: 'activity.created',
          agent_id: null,
          summary: a.message,
          refresh: ['activity', 'dashboard'],
        });
      }
    }, 20_000);
    this.ambientTimer.unref?.();
  }
}

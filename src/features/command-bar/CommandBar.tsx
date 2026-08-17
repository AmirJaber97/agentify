import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { MessageResponse } from '@shared/types';
import { useSendMessage } from '@/api/mutations';
import { ApiError } from '@/api/errors';
import { Spinner } from '@/components/ui';
import { MessageResponseView } from './MessageResponseView';
import { searchRecords } from './recordSearch';
import { EnumBadge } from '@/components/workbench/cells';

const EXAMPLES = [
  'Ask media what I am watching',
  "Tell health I did today's workout",
  "What's blocking my projects?",
  'Create an agent that tracks the cafés I visit',
];

export function CommandBar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');
  const [response, setResponse] = useState<MessageResponse | null>(null);
  const send = useSendMessage();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const recordHits = useMemo(() => (response ? [] : searchRecords(qc, text)), [text, response, qc]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      setResponse(null);
      send.reset();
      setTimeout(() => inputRef.current?.focus(), 0);
    }
    if (!open && dialog.open) dialog.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function submit(e?: FormEvent) {
    e?.preventDefault();
    const message = text.trim();
    if (!message || send.isPending) return;
    setResponse(null);
    send.mutate(message, {
      onSuccess: (res) => {
        setResponse(res);
        setText('');
      },
    });
  }

  return (
    <dialog
      ref={ref}
      className="command-bar"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-label="Command bar"
    >
      <form className="command-bar__input-row" onSubmit={submit}>
        <span className="command-bar__prompt" aria-hidden="true">
          ❯
        </span>
        <input
          ref={inputRef}
          className="command-bar__input"
          placeholder="Message Hermes — route to any agent…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              submit();
            }
          }}
          aria-label="Natural language command"
          role="combobox"
          aria-expanded={!!response}
        />
        {send.isPending && <Spinner />}
      </form>
      <div className="command-bar__body">
        {send.isPending && (
          <div className="in-flight">
            <Spinner />
            Hermes is working on it — long tasks can take a while…
          </div>
        )}
        {send.isError && (
          <div className="confirm-banner" role="alert">
            <strong>{send.error instanceof ApiError && send.error.kind === 'timeout' ? 'Timed out' : 'Failed'}</strong>
            {send.error instanceof Error ? send.error.message : 'Request failed'}
          </div>
        )}
        {response && (
          <MessageResponseView
            response={response}
            onUseProposedAgent={(manifest) => {
              onClose();
              navigate('/agents/new', { state: { manifest } });
            }}
          />
        )}
        {!response && !send.isPending && recordHits.length > 0 && (
          <div className="command-bar__records">
            <div className="command-bar__section-label">Records</div>
            {recordHits.map((hit, i) => (
              <button
                key={`${hit.agentId}-${hit.primary}-${i}`}
                type="button"
                className="command-bar__record"
                onClick={() => {
                  onClose();
                  navigate(`/agents/${hit.agentId}`);
                }}
              >
                <span className="command-bar__record-main">
                  <span className="command-bar__record-agent mono">{hit.agentLabel}</span>
                  <span aria-hidden="true">→</span>
                  <span>{hit.primary}</span>
                </span>
                <EnumBadge value={hit.secondary} />
              </button>
            ))}
          </div>
        )}
        {!response && !send.isPending && !send.isError && (
          <div className="command-bar__hints">
            {recordHits.length === 0 && text.trim().length >= 2 && (
              <div className="command-bar__section-label">Press Enter to ask Hermes</div>
            )}
            {EXAMPLES.map((ex) => (
              <button key={ex} type="button" className="command-bar__hint" onClick={() => setText(ex)}>
                ❯ {ex}
              </button>
            ))}
          </div>
        )}
      </div>
    </dialog>
  );
}

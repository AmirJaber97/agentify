import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import type { MessageResponse } from '@shared/types';
import { useSendAgentMessage } from '@/api/mutations';
import { ApiError } from '@/api/errors';
import { Button, Spinner } from '@/components/ui';
import { MessageResponseView } from '@/features/command-bar/MessageResponseView';

/** Conversational input to one agent. Chat is an input method, not the UI. */
export function MessageComposer({ agentId, agentName }: { agentId: string; agentName: string }) {
  const [text, setText] = useState('');
  const [response, setResponse] = useState<MessageResponse | null>(null);
  const send = useSendAgentMessage(agentId);
  const navigate = useNavigate();

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

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="composer">
      <form className="composer__row" onSubmit={submit}>
        <textarea
          className="textarea"
          placeholder={`Message ${agentName}… (Enter to send)`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          aria-label={`Message ${agentName}`}
          rows={2}
        />
        <Button variant="accent" busy={send.isPending} disabled={!text.trim()} {...{ type: 'submit' }}>
          Send
        </Button>
      </form>
      {send.isPending && (
        <div className="in-flight">
          <Spinner />
          {agentName} is working — synchronous runs can take a while. Leaving this page will not cancel it.
        </div>
      )}
      {send.isError && (
        <div className="confirm-banner" role="alert">
          <strong>
            {send.error instanceof ApiError && send.error.kind === 'timeout' ? 'Timed out' : 'Failed'}
          </strong>
          {send.error instanceof Error ? send.error.message : 'Message failed'}
        </div>
      )}
      {response && (
        <MessageResponseView
          response={response}
          onUseProposedAgent={(manifest) => navigate('/agents/new', { state: { manifest } })}
        />
      )}
    </div>
  );
}

import type { Handler } from 'hono';
import { Agent as UndiciAgent, fetch as upstreamFetch } from 'undici';
import type { Config } from './config';

// The SSE stream may legitimately sit idle far longer than undici's default
// 300s bodyTimeout — disable it for this route only.
const sseDispatcher = new UndiciAgent({
  headersTimeout: 30_000,
  bodyTimeout: 0,
});

const HEARTBEAT_MS = 25_000;

export const SSE_HEADERS = {
  'content-type': 'text/event-stream',
  'cache-control': 'no-cache, no-transform',
  connection: 'keep-alive',
  'x-accel-buffering': 'no',
} as const;

/**
 * Extract complete SSE frames from a buffer. Frames end with a blank line;
 * the spec allows LF or CRLF line endings (sse-starlette emits CRLF), so both
 * delimiters must be handled. Returns the complete frames and the remainder.
 */
export function splitFrames(buffer: string): { frames: string[]; rest: string } {
  const frames: string[] = [];
  let rest = buffer;
  for (;;) {
    const lf = rest.indexOf('\n\n');
    const crlf = rest.indexOf('\r\n\r\n');
    let end = -1;
    let delim = 0;
    if (lf !== -1 && (crlf === -1 || lf < crlf)) {
      end = lf;
      delim = 2;
    } else if (crlf !== -1) {
      end = crlf;
      delim = 4;
    }
    if (end === -1) break;
    frames.push(rest.slice(0, end + delim));
    rest = rest.slice(end + delim);
  }
  return { frames, rest };
}

export function sseBridge(config: Config): Handler {
  return async (c) => {
    const upstreamAbort = new AbortController();

    let upstream: Awaited<ReturnType<typeof upstreamFetch>>;
    try {
      upstream = await upstreamFetch(`${config.paosBaseUrl}/api/v1/stream`, {
        headers: {
          authorization: `Bearer ${config.paosToken}`,
          accept: 'text/event-stream',
        },
        signal: upstreamAbort.signal,
        dispatcher: sseDispatcher,
      });
    } catch {
      return c.json({ detail: { error: 'paos_unreachable' } }, 502);
    }
    if (!upstream.ok || !upstream.body) {
      upstreamAbort.abort();
      return c.json({ detail: { error: 'paos_stream_error' } }, 502);
    }

    // Browser disconnects must not leak upstream connections.
    c.req.raw.signal.addEventListener('abort', () => upstreamAbort.abort());

    const encoder = new TextEncoder();
    const upstreamBody = upstream.body;

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        // Only complete frames are ever enqueued, so the heartbeat comment
        // can never split an upstream frame mid-line.
        // A named event rather than a comment: comments are invisible to
        // EventSource listeners, so the client could never detect a silently
        // dead upstream. The 'hb' event feeds the client's staleness watchdog.
        const heartbeat = setInterval(() => {
          try {
            controller.enqueue(encoder.encode('event: hb\ndata: {}\n\n'));
          } catch {
            clearInterval(heartbeat);
          }
        }, HEARTBEAT_MS);

        controller.enqueue(encoder.encode('retry: 3000\n\n'));

        const reader = upstreamBody.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        try {
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const { frames, rest } = splitFrames(buffer);
            buffer = rest;
            for (const frame of frames) controller.enqueue(encoder.encode(frame));
          }
        } catch {
          // Upstream died or was aborted — fall through and end the response
          // so the browser's EventSource reconnects.
        } finally {
          clearInterval(heartbeat);
          try {
            controller.close();
          } catch {
            // already closed
          }
        }
      },
      cancel() {
        upstreamAbort.abort();
      },
    });

    return new Response(stream, { status: 200, headers: SSE_HEADERS });
  };
}

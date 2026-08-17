import { describe, expect, it } from 'vitest';
import { splitFrames } from './sse';

describe('splitFrames', () => {
  it('extracts complete LF-delimited frames and keeps the remainder', () => {
    const { frames, rest } = splitFrames('id: 1\nevent: a\ndata: {}\n\nid: 2\ndata: par');
    expect(frames).toEqual(['id: 1\nevent: a\ndata: {}\n\n']);
    expect(rest).toBe('id: 2\ndata: par');
  });

  it('handles CRLF frames (sse-starlette style)', () => {
    const { frames, rest } = splitFrames('id: 1\r\ndata: {}\r\n\r\nid: 2');
    expect(frames).toEqual(['id: 1\r\ndata: {}\r\n\r\n']);
    expect(rest).toBe('id: 2');
  });

  it('handles multiple frames and mixed delimiters in order', () => {
    const { frames, rest } = splitFrames('data: a\n\ndata: b\r\n\r\ndata: c\n\n');
    expect(frames).toEqual(['data: a\n\n', 'data: b\r\n\r\n', 'data: c\n\n']);
    expect(rest).toBe('');
  });

  it('returns nothing for an incomplete frame', () => {
    const { frames, rest } = splitFrames('data: {"partial": tr');
    expect(frames).toEqual([]);
    expect(rest).toBe('data: {"partial": tr');
  });
});

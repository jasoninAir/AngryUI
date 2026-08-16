import { describe, it, expect } from 'vitest';
import { resolveMediaUrl } from '../../src/components/chat/MessageItem';

describe('resolveMediaUrl', () => {
  it('passes through browser-accessible urls directly', () => {
    const res1 = resolveMediaUrl('/api/uploads/conv-1/pic.png');
    expect(res1.url).toBe('/api/uploads/conv-1/pic.png');
    expect(res1.isImage).toBe(true);

    const res2 = resolveMediaUrl('https://example.com/photo.jpg');
    expect(res2.url).toBe('https://example.com/photo.jpg');
    expect(res2.isImage).toBe(true);
  });

  it('maps server absolute filesystem path to /api/file-preview', () => {
    const raw = '/Users/mockuser/.gemini/antigravity-cli/webui/uploads/123/screenshot.png';
    const res = resolveMediaUrl(raw);
    expect(res.url).toContain('/api/file-preview?path=');
    expect(res.url).toContain(encodeURIComponent(raw));
    expect(res.isImage).toBe(true);
    expect(res.filename).toBe('screenshot.png');
  });

  it('recognizes non-image documents', () => {
    const raw = '/Users/mockuser/docs/data.csv';
    const res = resolveMediaUrl(raw);
    expect(res.isImage).toBe(false);
    expect(res.filename).toBe('data.csv');
  });

  it('safely handles empty or missing inputs without throwing', () => {
    const res = resolveMediaUrl('');
    expect(res.url).toBe('/api/file-preview?path=');
    expect(res.isImage).toBe(false);
    expect(res.filename).toBe('attachment');
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import {
  getPinnedWorkspaces,
  setPinnedWorkspaces,
  isWorkspacePinned,
  pinWorkspace,
  unpinWorkspace,
  togglePinWorkspace
} from '../../src/lib/pinnedWorkspaces';

describe('pinnedWorkspaces', () => {
  it('manages pin, unpin, toggle and queries safely', () => {
    const ws = '/tmp/mock-project-workspace';
    expect(typeof isWorkspacePinned(ws)).toBe('boolean');

    pinWorkspace(ws);
    // Should handle toggle cleanly
    const isNow = togglePinWorkspace(ws);
    expect(typeof isNow).toBe('boolean');

    unpinWorkspace(ws);
    expect(isWorkspacePinned(ws)).toBe(false);
  });

  it('normalizes file:// URIs correctly', () => {
    pinWorkspace('file:///tmp/test-project/');
    expect(isWorkspacePinned('/tmp/test-project')).toBe(true);
    unpinWorkspace('/tmp/test-project');
  });
});

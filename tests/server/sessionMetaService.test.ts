import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { getConfig } from '../../server/config';
import {
  readArchivedIds,
  setConversationArchived,
  isConversationArchived,
  deleteLocalSessionFiles
} from '../../server/services/sessionMetaService';

describe('sessionMetaService', () => {
  const testId = 'test-archive-conv-uuid';

  beforeEach(() => {
    setConversationArchived(testId, false);
  });

  it('can archive and unarchive conversations', () => {
    expect(isConversationArchived(testId)).toBe(false);

    setConversationArchived(testId, true);
    expect(isConversationArchived(testId)).toBe(true);

    const ids = readArchivedIds();
    expect(ids.has(testId)).toBe(true);

    setConversationArchived(testId, false);
    expect(isConversationArchived(testId)).toBe(false);
  });

  it('deleteLocalSessionFiles cleans up files and history entries', () => {
    const agyHome = getConfig().agyHome;
    const dummyConvId = 'dummy-test-conv-delete-12345';

    // Create dummy files
    const dbFile = path.join(agyHome, 'conversations', `${dummyConvId}.db`);
    const brainDir = path.join(agyHome, 'brain', dummyConvId);
    fs.mkdirSync(path.dirname(dbFile), { recursive: true });
    fs.mkdirSync(brainDir, { recursive: true });
    fs.writeFileSync(dbFile, 'dummy db');
    fs.writeFileSync(path.join(brainDir, 'test.txt'), 'dummy brain file');

    expect(fs.existsSync(dbFile)).toBe(true);
    expect(fs.existsSync(brainDir)).toBe(true);

    deleteLocalSessionFiles(dummyConvId);

    expect(fs.existsSync(dbFile)).toBe(false);
    expect(fs.existsSync(brainDir)).toBe(false);
  });
});

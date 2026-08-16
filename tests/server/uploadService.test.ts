import { describe, it, expect } from 'vitest';
import fs from 'fs';
import { saveUploadedFiles, getUploadFilePath } from '../../server/services/uploadService';

describe('uploadService', () => {
  it('saves base64 uploaded files and returns path and url', () => {
    const testConvId = 'test-upload-conv';
    const sampleBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    const results = saveUploadedFiles(testConvId, [
      { name: 'dot.png', type: 'image/png', data: sampleBase64 }
    ]);

    expect(results.length).toBe(1);
    expect(results[0].name).toBe('dot.png');
    expect(results[0].url).toContain('/api/uploads/test-upload-conv/');
    expect(fs.existsSync(results[0].path)).toBe(true);

    const retrieved = getUploadFilePath(testConvId, results[0].path.split('/').pop()!);
    expect(retrieved).toBe(results[0].path);
  });
});

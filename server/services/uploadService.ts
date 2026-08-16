import fs from 'fs';
import path from 'path';
import { getConfig } from '../config';

export interface UploadFilePayload {
  name: string;
  type: string;
  data: string; // Base64 data URL (e.g. data:image/png;base64,...) or raw base64 string
}

export interface UploadedFileResult {
  name: string;
  path: string;
  url: string;
  type: string;
  size: number;
}

export function saveUploadedFiles(conversationId: string, files: UploadFilePayload[]): UploadedFileResult[] {
  const cleanConvId = (conversationId || 'default').replace(/[^a-zA-Z0-9_-]/g, '');
  const uploadDir = path.join(getConfig().webuiHome, 'uploads', cleanConvId);

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const results: UploadedFileResult[] = [];

  for (const file of files) {
    if (!file.data) continue;

    // Sanitize filename
    const baseName = path.basename(file.name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
    const timestamp = Date.now();
    const storedName = `${timestamp}-${baseName}`;
    const filePath = path.join(uploadDir, storedName);

    // Extract base64 payload
    let base64Data = file.data;
    const commaIdx = base64Data.indexOf(',');
    if (commaIdx !== -1 && base64Data.startsWith('data:')) {
      base64Data = base64Data.slice(commaIdx + 1);
    }

    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(filePath, buffer);

    results.push({
      name: file.name,
      path: filePath,
      url: `/api/uploads/${cleanConvId}/${storedName}`,
      type: file.type || 'application/octet-stream',
      size: buffer.length
    });
  }

  return results;
}

export function getUploadFilePath(conversationId: string, filename: string): string | null {
  const cleanConvId = conversationId.replace(/[^a-zA-Z0-9_-]/g, '');
  const cleanFileName = path.basename(filename);
  const filePath = path.join(getConfig().webuiHome, 'uploads', cleanConvId, cleanFileName);

  if (fs.existsSync(filePath)) {
    return filePath;
  }
  return null;
}

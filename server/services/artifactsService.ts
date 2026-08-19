import fs from 'fs';
import path from 'path';
import os from 'os';
import { logger } from '../utils/logger';

export interface ArtifactSummary {
  filename: string;
  title: string;
  summary?: string;
  path: string;
  size: number;
  mtime: string;
  slideCount: number;
  hasMermaid: boolean;
  hasDiff: boolean;
}

export interface ArtifactDetail extends ArtifactSummary {
  content: string;
  slides: string[];
}

function getBrainDir(): string {
  return path.join(os.homedir(), '.gemini/antigravity-cli/brain');
}

/**
 * List all markdown artifacts for a given conversation
 */
export function listConversationArtifacts(conversationId: string): ArtifactSummary[] {
  const brainDir = getBrainDir();
  const sessionDir = path.join(brainDir, conversationId);

  if (!fs.existsSync(sessionDir)) {
    return [];
  }

  const artifacts: ArtifactSummary[] = [];

  try {
    const entries = fs.readdirSync(sessionDir, { withFileTypes: true });

    for (const ent of entries) {
      if (ent.isFile() && ent.name.endsWith('.md')) {
        const fullPath = path.join(sessionDir, ent.name);
        try {
          const stat = fs.statSync(fullPath);
          const rawContent = fs.readFileSync(fullPath, 'utf-8');

          // Extract title (first # Heading or filename)
          const titleMatch = rawContent.match(/^#\s+(.+)$/m);
          const title = titleMatch ? titleMatch[1].trim() : ent.name.replace(/\.md$/, '').replace(/[_-]/g, ' ');

          // Extract summary from metadata or first paragraph
          let summary = '';
          const summaryMatch = rawContent.match(/Summary:\s*(.+)/i) || rawContent.match(/^([A-Z0-9][^\n]+)/m);
          if (summaryMatch) {
            summary = summaryMatch[1].trim().slice(0, 150);
          }

          // Count slides (split by <!-- slide --> or ````carousel)
          const slideParts = rawContent.split(/<!--\s*slide\s*-->/i);
          const slideCount = slideParts.length > 1 ? slideParts.length : 1;

          const hasMermaid = /```mermaid/i.test(rawContent);
          const hasDiff = /```diff/i.test(rawContent);

          artifacts.push({
            filename: ent.name,
            title,
            summary,
            path: fullPath,
            size: stat.size,
            mtime: stat.mtime.toISOString(),
            slideCount,
            hasMermaid,
            hasDiff
          });
        } catch {}
      }
    }
  } catch (err) {
    logger.error({ err, conversationId }, 'Error listing artifacts for conversation');
  }

  // Sort by mtime descending (newest first)
  artifacts.sort((a, b) => new Date(b.mtime).getTime() - new Date(a.mtime).getTime());
  return artifacts;
}

/**
 * Get artifact content and parsed slides
 */
export function getArtifactDetail(conversationId: string, filename: string): ArtifactDetail | null {
  const brainDir = getBrainDir();
  // Protect against directory traversal
  const cleanFilename = path.basename(filename);
  const fullPath = path.join(brainDir, conversationId, cleanFilename);

  if (!fs.existsSync(fullPath)) {
    return null;
  }

  try {
    const stat = fs.statSync(fullPath);
    const content = fs.readFileSync(fullPath, 'utf-8');

    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : cleanFilename.replace(/\.md$/, '').replace(/[_-]/g, ' ');

    let summary = '';
    const summaryMatch = content.match(/Summary:\s*(.+)/i) || content.match(/^([A-Z0-9][^\n]+)/m);
    if (summaryMatch) {
      summary = summaryMatch[1].trim().slice(0, 150);
    }

    // Split slides by `<!-- slide -->`
    const rawSlides = content.split(/<!--\s*slide\s*-->/i);
    const slides = rawSlides.map((s) => s.trim()).filter(Boolean);

    const hasMermaid = /```mermaid/i.test(content);
    const hasDiff = /```diff/i.test(content);

    return {
      filename: cleanFilename,
      title,
      summary,
      path: fullPath,
      size: stat.size,
      mtime: stat.mtime.toISOString(),
      slideCount: Math.max(1, slides.length),
      hasMermaid,
      hasDiff,
      content,
      slides: slides.length > 0 ? slides : [content]
    };
  } catch (err) {
    logger.error({ err, conversationId, filename }, 'Error reading artifact');
    return null;
  }
}

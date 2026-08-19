import { describe, it, expect } from 'vitest';
import type { ArtifactSummary, ArtifactDetail } from '../../src/lib/api';

describe('Artifacts API Types and Slide Parsing', () => {
  it('parses multi-slide presentation chunks correctly', () => {
    const rawMarkdown = `# Project Pitch\n\nIntroduction slide\n\n<!-- slide -->\n\n## Architecture\n\nDetails\n\n<!-- slide -->\n\n## Next Steps\n\nAction items`;
    const parts = rawMarkdown.split(/<!--\s*slide\s*-->/i).map((s) => s.trim());

    expect(parts.length).toBe(3);
    expect(parts[0]).toContain('# Project Pitch');
    expect(parts[1]).toContain('## Architecture');
    expect(parts[2]).toContain('## Next Steps');
  });

  it('validates ArtifactSummary structure', () => {
    const summary: ArtifactSummary = {
      filename: 'spec.md',
      title: 'Technical Specification',
      summary: 'High level system design',
      path: '/path/to/spec.md',
      size: 4096,
      mtime: '2026-08-20T00:00:00Z',
      slideCount: 3,
      hasMermaid: true,
      hasDiff: false
    };

    expect(summary.filename).toBe('spec.md');
    expect(summary.slideCount).toBe(3);
    expect(summary.hasMermaid).toBe(true);
  });
});

import { describe, it, expect } from 'vitest';
import type { SkillItem, RuleItem, McpServerInfo } from '../../src/lib/api';

describe('Skills and MCP API Data Contracts', () => {
  it('validates SkillItem format', () => {
    const skill: SkillItem = {
      id: 'custom-ecom-image-translator',
      name: 'ecom-image-translator',
      description: 'Translates product description texts',
      category: 'custom',
      path: '/path/to/skill',
      enabled: true,
      triggers: ['translate', 'ocr']
    };

    expect(skill.name).toBe('ecom-image-translator');
    expect(skill.enabled).toBe(true);
    expect(skill.triggers?.length).toBe(2);
  });

  it('validates McpServerInfo format', () => {
    const server: McpServerInfo = {
      name: 'codegraph',
      command: '/usr/local/bin/codegraph',
      args: ['serve', '--mcp'],
      mode: 'lazy',
      tools: [
        { name: 'codegraph_search', description: 'Search graph nodes' }
      ],
      status: 'active'
    };

    expect(server.name).toBe('codegraph');
    expect(server.mode).toBe('lazy');
    expect(server.tools[0].name).toBe('codegraph_search');
  });
});

import fs from 'fs';
import path from 'path';
import os from 'os';
import { logger } from '../utils/logger';

export interface SkillItem {
  id: string;
  name: string;
  description: string;
  category: 'builtin' | 'plugin' | 'custom';
  sourcePlugin?: string;
  path: string;
  enabled: boolean;
  triggers?: string[];
  systemPromptSnippet?: string;
}

export interface RuleItem {
  id: string;
  name: string;
  scope: 'global' | 'project' | 'user';
  description?: string;
  content: string;
  path?: string;
  enabled: boolean;
}

export interface SkillsAndRulesResult {
  skills: SkillItem[];
  rules: RuleItem[];
}

const DISABLED_SKILLS_FILE = path.join(os.homedir(), '.gemini/config/disabled_skills.json');

function getDisabledSkills(): Set<string> {
  try {
    if (fs.existsSync(DISABLED_SKILLS_FILE)) {
      const list = JSON.parse(fs.readFileSync(DISABLED_SKILLS_FILE, 'utf-8'));
      if (Array.isArray(list)) return new Set(list);
    }
  } catch {}
  return new Set();
}

function saveDisabledSkills(set: Set<string>): void {
  try {
    const parentDir = path.dirname(DISABLED_SKILLS_FILE);
    if (!fs.existsSync(parentDir)) fs.mkdirSync(parentDir, { recursive: true });
    fs.writeFileSync(DISABLED_SKILLS_FILE, JSON.stringify(Array.from(set), null, 2), 'utf-8');
  } catch (err) {
    logger.error({ err }, 'Failed to save disabled skills');
  }
}

export function toggleSkillStatus(skillName: string, enabled?: boolean): boolean {
  const disabled = getDisabledSkills();
  const isCurrentlyDisabled = disabled.has(skillName);
  const nextEnabled = enabled !== undefined ? enabled : isCurrentlyDisabled;

  if (nextEnabled) {
    disabled.delete(skillName);
  } else {
    disabled.add(skillName);
  }

  saveDisabledSkills(disabled);
  return nextEnabled;
}

/**
 * Scan system for all available skills and rules
 */
export function getSkillsAndRules(): SkillsAndRulesResult {
  const home = os.homedir();
  const disabledSkills = getDisabledSkills();
  const skillsMap = new Map<string, SkillItem>();
  const rulesList: RuleItem[] = [];

  // 1. Builtin skills
  const builtinDir = path.join(home, '.gemini/antigravity-cli/builtin/skills');
  if (fs.existsSync(builtinDir)) {
    scanSkillsDirectory(builtinDir, 'builtin', undefined, skillsMap, disabledSkills);
  }

  // 2. User custom skills
  const userSkillsDir = path.join(home, '.gemini/config/skills');
  if (fs.existsSync(userSkillsDir)) {
    scanSkillsDirectory(userSkillsDir, 'custom', undefined, skillsMap, disabledSkills);
  }

  // 3. Plugin skills
  const pluginsDir = path.join(home, '.gemini/config/plugins');
  if (fs.existsSync(pluginsDir)) {
    try {
      const plugins = fs.readdirSync(pluginsDir, { withFileTypes: true });
      for (const p of plugins) {
        if (p.isDirectory()) {
          const pluginSkillsDir = path.join(pluginsDir, p.name, 'skills');
          if (fs.existsSync(pluginSkillsDir)) {
            scanSkillsDirectory(pluginSkillsDir, 'plugin', p.name, skillsMap, disabledSkills);
          }
        }
      }
    } catch {}
  }

  // 4. Discover Rules
  // a. Global user rules
  try {
    const configPath = path.join(home, '.gemini/config/config.json');
    if (fs.existsSync(configPath)) {
      const raw = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (raw.rules && typeof raw.rules === 'object') {
        for (const [k, v] of Object.entries(raw.rules)) {
          rulesList.push({
            id: `config-${k}`,
            name: k,
            scope: 'global',
            content: typeof v === 'string' ? v : JSON.stringify(v, null, 2),
            path: configPath,
            enabled: true
          });
        }
      }
    }
  } catch {}

  // b. Local rules in project or ~/.gemini/rules
  const rulesDirs = [
    path.join(home, '.gemini/rules'),
    path.join(process.cwd(), '.gemini/rules'),
    path.join(process.cwd(), '.cursorrules')
  ];

  for (const rDir of rulesDirs) {
    if (fs.existsSync(rDir)) {
      try {
        const stat = fs.statSync(rDir);
        if (stat.isFile()) {
          rulesList.push({
            id: path.basename(rDir),
            name: path.basename(rDir),
            scope: 'project',
            content: fs.readFileSync(rDir, 'utf-8'),
            path: rDir,
            enabled: true
          });
        } else if (stat.isDirectory()) {
          const files = fs.readdirSync(rDir);
          for (const f of files) {
            const fPath = path.join(rDir, f);
            if (fs.statSync(fPath).isFile()) {
              rulesList.push({
                id: f,
                name: f.replace(/\.md$/, ''),
                scope: rDir.includes(process.cwd()) ? 'project' : 'global',
                content: fs.readFileSync(fPath, 'utf-8'),
                path: fPath,
                enabled: true
              });
            }
          }
        }
      } catch {}
    }
  }

  return {
    skills: Array.from(skillsMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
    rules: rulesList
  };
}

function scanSkillsDirectory(
  baseDir: string,
  category: 'builtin' | 'plugin' | 'custom',
  sourcePlugin: string | undefined,
  map: Map<string, SkillItem>,
  disabledSet: Set<string>
): void {
  try {
    const entries = fs.readdirSync(baseDir, { withFileTypes: true });

    for (const ent of entries) {
      const skillPath = path.join(baseDir, ent.name);
      let skillFile = '';

      if (ent.isDirectory() || ent.isSymbolicLink()) {
        const candidate = path.join(skillPath, 'SKILL.md');
        if (fs.existsSync(candidate)) {
          skillFile = candidate;
        }
      } else if (ent.isFile() && ent.name.endsWith('.md')) {
        skillFile = skillPath;
      }

      if (skillFile) {
        try {
          const content = fs.readFileSync(skillFile, 'utf-8');
          const parsed = parseSkillMetadata(ent.name.replace(/\.md$/, ''), content, skillFile);
          const enabled = !disabledSet.has(parsed.name);

          map.set(parsed.name, {
            id: `${category}-${parsed.name}`,
            name: parsed.name,
            description: parsed.description,
            category,
            sourcePlugin,
            path: skillFile,
            enabled,
            triggers: parsed.triggers,
            systemPromptSnippet: parsed.systemPromptSnippet
          });
        } catch {}
      }
    }
  } catch (err) {
    logger.error({ err, baseDir }, 'Error scanning skills directory');
  }
}

function parseSkillMetadata(folderName: string, content: string, filePath: string) {
  let name = folderName;
  let description = '';
  let triggers: string[] = [];

  // Parse YAML Frontmatter if present
  const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (fmMatch) {
    const fmLines = fmMatch[1].split('\n');
    for (const line of fmLines) {
      const nameMatch = line.match(/^name:\s*(.+)/i);
      if (nameMatch) name = nameMatch[1].trim();

      const descMatch = line.match(/^description:\s*(.+)/i);
      if (descMatch) description = descMatch[1].trim();
    }
  }

  if (!description) {
    // Look for first paragraph or summary
    const pMatch = content.replace(/^---\s*\n[\s\S]*?\n---/, '').match(/^#+\s*.+\n+([^\n#]+)/m);
    if (pMatch) {
      description = pMatch[1].trim().slice(0, 180);
    } else {
      description = 'Custom Antigravity skill';
    }
  }

  // Extract triggers / keywords
  const triggerMatches = content.match(/(?:Triggers on|Use when|When to use)[:\s]*([^\n.]+)/i);
  if (triggerMatches) {
    triggers = triggerMatches[1]
      .split(/[,;]/)
      .map((t) => t.replace(/["'`]/g, '').trim())
      .filter((t) => t.length > 2)
      .slice(0, 5);
  }

  const cleanBody = content.replace(/^---\s*\n[\s\S]*?\n---/, '').trim();
  const systemPromptSnippet = cleanBody.slice(0, 300);

  return { name, description, triggers, systemPromptSnippet };
}

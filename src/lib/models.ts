export type EffortLevel = 'low' | 'medium' | 'high';

export interface ModelOption {
  id: string;
  name: string;
  efforts: EffortLevel[];
  defaultEffort?: EffortLevel;
}

export const SUPPORTED_MODELS: ModelOption[] = [
  {
    id: 'Gemini 3.7 Flash',
    name: 'Gemini 3.7 Flash',
    efforts: ['low', 'medium', 'high'],
    defaultEffort: 'high'
  },
  {
    id: 'Gemini 3.1 Pro',
    name: 'Gemini 3.1 Pro',
    efforts: ['low', 'high'],
    defaultEffort: 'high'
  },
  {
    id: 'Gemini 2.5 Pro',
    name: 'Gemini 2.5 Pro',
    efforts: ['low', 'medium', 'high'],
    defaultEffort: 'high'
  },
  {
    id: 'Gemini 2.5 Flash',
    name: 'Gemini 2.5 Flash',
    efforts: ['low', 'medium', 'high'],
    defaultEffort: 'medium'
  },
  {
    id: 'Claude Sonnet 4.6 (Thinking)',
    name: 'Claude Sonnet 4.6 (Thinking)',
    efforts: []
  },
  {
    id: 'Claude Opus 4.6 (Thinking)',
    name: 'Claude Opus 4.6 (Thinking)',
    efforts: []
  },
  {
    id: 'GPT-OSS 120B (Medium)',
    name: 'GPT-OSS 120B (Medium)',
    efforts: []
  }
];

export function getModelConfig(modelName: string): ModelOption {
  const found = SUPPORTED_MODELS.find(
    (m) => m.id === modelName || m.name === modelName
  );
  if (found) return found;

  // Fallback heuristic: If name contains "3.1 Pro", only low & high
  if (modelName.toLowerCase().includes('3.1') && modelName.toLowerCase().includes('pro')) {
    return { id: modelName, name: modelName, efforts: ['low', 'high'], defaultEffort: 'high' };
  }
  // If Claude or GPT, no effort choice
  if (
    modelName.toLowerCase().includes('claude') ||
    modelName.toLowerCase().includes('gpt') ||
    modelName.toLowerCase().includes('opus') ||
    modelName.toLowerCase().includes('sonnet')
  ) {
    return { id: modelName, name: modelName, efforts: [] };
  }
  // Default for Gemini models
  return { id: modelName, name: modelName, efforts: ['low', 'medium', 'high'], defaultEffort: 'high' };
}

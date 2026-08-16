import { describe, it, expect } from 'vitest';
import { SUPPORTED_MODELS, getModelConfig } from '../../src/lib/models';

describe('models and effort options', () => {
  it('defines Gemini 3.1 Pro with Low and High efforts only', () => {
    const cfg = getModelConfig('Gemini 3.1 Pro');
    expect(cfg.efforts).toEqual(['low', 'high']);
  });

  it('defines Claude and GPT models with empty effort options', () => {
    const sonnet = getModelConfig('Claude Sonnet 4.6 (Thinking)');
    const opus = getModelConfig('Claude Opus 4.6 (Thinking)');
    const gpt = getModelConfig('GPT-OSS 120B (Medium)');

    expect(sonnet.efforts).toEqual([]);
    expect(opus.efforts).toEqual([]);
    expect(gpt.efforts).toEqual([]);
  });

  it('defines Gemini 3.7 Flash with Low, Medium, and High efforts', () => {
    const flash = getModelConfig('Gemini 3.7 Flash');
    expect(flash.efforts).toEqual(['low', 'medium', 'high']);
  });
});

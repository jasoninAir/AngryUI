/**
 * Web Audio API synthesizer for instant zero-dependency notification sounds.
 * Generates synthesized chimes for task completion and interactive authorization.
 */
class SoundManager {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;

  constructor() {
    try {
      const stored = localStorage.getItem('agy_sound_enabled');
      if (stored !== null) {
        this.enabled = stored === 'true';
      }
    } catch {}

    if (typeof window !== 'undefined') {
      const unlockAudio = () => {
        this.getOrCreateContext();
        window.removeEventListener('click', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
        window.removeEventListener('touchstart', unlockAudio);
      };
      window.addEventListener('click', unlockAudio, { once: true });
      window.addEventListener('keydown', unlockAudio, { once: true });
      window.addEventListener('touchstart', unlockAudio, { once: true });
    }
  }

  private getOrCreateContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(val: boolean): void {
    this.enabled = val;
    try {
      localStorage.setItem('agy_sound_enabled', String(val));
    } catch {}
  }

  /**
   * Ascending pleasant chime for task completion: C5 (523Hz) -> E5 (659Hz) -> G5 (784Hz)
   */
  public playTaskComplete(): void {
    if (!this.enabled) return;
    try {
      const ctx = this.getOrCreateContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99];
      const noteDuration = 0.12;

      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);

        gain.gain.setValueAtTime(0.0001, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.18, now + i * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.08 + noteDuration + 0.15);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + noteDuration + 0.2);
      });
    } catch (e) {
      console.warn('Failed to play complete sound:', e);
    }
  }

  /**
   * Alert double-tone chime for Attention / User Authorization required (A5 -> D6)
   */
  public playAttentionRequired(): void {
    if (!this.enabled) return;
    try {
      const ctx = this.getOrCreateContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const notes = [
        { freq: 880, start: 0, duration: 0.1 },
        { freq: 1174.66, start: 0.12, duration: 0.22 }
      ];

      notes.forEach(({ freq, start, duration }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + start);

        gain.gain.setValueAtTime(0.0001, now + start);
        gain.gain.exponentialRampToValueAtTime(0.22, now + start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + start);
        osc.stop(now + start + duration + 0.05);
      });
    } catch (e) {
      console.warn('Failed to play attention sound:', e);
    }
  }
}

export const soundManager = new SoundManager();

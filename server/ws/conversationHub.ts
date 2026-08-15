import { EventEmitter } from 'events';
import type { AgyEvent } from '../utils/streamParser';

/**
 * Per-conversation event hub. Multiple WebSocket connections can subscribe to
 * the same conversation, which is what enables:
 *   - Cross-device live sync (desktop + phone)
 *   - Browser-side reconnect without losing the in-flight stream
 *
 * The hub keeps a small ring buffer of recent events so a freshly connected
 * client can replay the tail of the current turn.
 *
 * Lifecycle:
 *   - Hub is created lazily on first subscribe for a given conversationId.
 *   - chatHandler calls `publish(event)` for every AgyEvent it forwards.
 *   - chatHandler and clients call `subscribe(convId, listener)` to receive events.
 *   - When a turn ends with `result`, the hub stays alive (in case more turns follow).
 *   - Idled hubs are garbage collected after CONVERSATION_TTL_MS.
 */

const BUFFER_SIZE = 100;
const CONVERSATION_TTL_MS = 30 * 60 * 1000; // 30 minutes

export type ConversationListener = (event: AgyEvent) => void;

export class ConversationHub {
  private emitters = new Map<string, EventEmitter>();
  private buffers = new Map<string, AgyEvent[]>();
  private lastActivity = new Map<string, number>();

  private getOrCreate(convId: string): EventEmitter {
    let em = this.emitters.get(convId);
    if (!em) {
      em = new EventEmitter();
      em.setMaxListeners(50);
      this.emitters.set(convId, em);
      this.buffers.set(convId, []);
    }
    this.lastActivity.set(convId, Date.now());
    return em;
  }

  /**
   * Subscribe to a conversation's events. The listener is called synchronously
   * with replayed recent events first, then live events as they arrive.
   */
  subscribe(convId: string, listener: ConversationListener): () => void {
    const em = this.getOrCreate(convId);
    // Replay buffered tail
    const buf = this.buffers.get(convId) ?? [];
    for (const evt of buf) listener(evt);

    em.on('event', listener);
    return () => {
      em.off('event', listener);
    };
  }

  publish(convId: string, event: AgyEvent): void {
    const em = this.getOrCreate(convId);
    this.lastActivity.set(convId, Date.now());

    // Buffer (ring-style)
    const buf = this.buffers.get(convId) ?? [];
    buf.push(event);
    if (buf.length > BUFFER_SIZE) buf.shift();
    this.buffers.set(convId, buf);

    em.emit('event', event);
  }

  /**
   * Garbage-collect idle conversations. Call periodically.
   */
  gc(): void {
    const now = Date.now();
    for (const [convId, last] of this.lastActivity) {
      if (now - last > CONVERSATION_TTL_MS) {
        const em = this.emitters.get(convId);
        em?.removeAllListeners();
        this.emitters.delete(convId);
        this.buffers.delete(convId);
        this.lastActivity.delete(convId);
      }
    }
  }

  /**
   * For testing / diagnostics.
   */
  size(): number {
    return this.emitters.size;
  }
}

// Singleton per process
export const conversationHub = new ConversationHub();

// Periodic GC
setInterval(() => conversationHub.gc(), 5 * 60 * 1000).unref();

import { EventEmitter } from 'events';
import type { AgyEvent } from '../utils/streamParser';

export type SessionState = 'IDLE' | 'RUNNING' | 'WAITING_INPUT';
export type ConversationListener = (event: AgyEvent) => void;
export type StatusListener = (convId: string, status: SessionState) => void;

const BUFFER_SIZE = 100;
const CONVERSATION_TTL_MS = 30 * 60 * 1000; // 30 minutes

export class ConversationHub {
  private emitters = new Map<string, EventEmitter>();
  private buffers = new Map<string, AgyEvent[]>();
  private lastActivity = new Map<string, number>();
  private statuses = new Map<string, SessionState>();
  private globalEmitter = new EventEmitter();

  constructor() {
    this.globalEmitter.setMaxListeners(200);
  }

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

  subscribe(convId: string, listener: ConversationListener): () => void {
    const em = this.getOrCreate(convId);
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

    const buf = this.buffers.get(convId) ?? [];
    buf.push(event);
    if (buf.length > BUFFER_SIZE) buf.shift();
    this.buffers.set(convId, buf);

    em.emit('event', event);
  }

  setStatus(convId: string, status: SessionState): void {
    if (status === 'IDLE') {
      this.statuses.delete(convId);
    } else {
      this.statuses.set(convId, status);
    }
    this.lastActivity.set(convId, Date.now());
    this.globalEmitter.emit('status_change', convId, status);
  }

  getStatus(convId: string): SessionState {
    return this.statuses.get(convId) || 'IDLE';
  }

  getAllStatuses(): Record<string, SessionState> {
    const res: Record<string, SessionState> = {};
    for (const [k, v] of this.statuses) {
      res[k] = v;
    }
    return res;
  }

  onGlobalStatusChange(listener: StatusListener): () => void {
    this.globalEmitter.on('status_change', listener);
    return () => {
      this.globalEmitter.off('status_change', listener);
    };
  }

  gc(): void {
    const now = Date.now();
    for (const [convId, last] of this.lastActivity) {
      if (now - last > CONVERSATION_TTL_MS && !this.statuses.has(convId)) {
        const em = this.emitters.get(convId);
        em?.removeAllListeners();
        this.emitters.delete(convId);
        this.buffers.delete(convId);
        this.lastActivity.delete(convId);
      }
    }
  }

  size(): number {
    return this.emitters.size;
  }
}

// Singleton per process
export const conversationHub = new ConversationHub();

// Periodic GC
setInterval(() => conversationHub.gc(), 5 * 60 * 1000).unref();

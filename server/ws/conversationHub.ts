import { EventEmitter } from 'events';
import type { AgyEvent } from '../utils/streamParser';

export type SessionState = 'IDLE' | 'RUNNING' | 'WAITING_INPUT';
export type ConversationListener = (event: AgyEvent, seq: number) => void;
export type StatusListener = (convId: string, status: SessionState) => void;

export interface HubEvent {
  seq: number;
  event: AgyEvent;
  timestamp: number;
}

export interface TurnBuffer {
  turnId: string;
  createdAt: number;
  events: HubEvent[];
}

export interface SubscriptionHandle {
  (): void;
  unsubscribe: () => void;
  isTruncated: boolean;
  minSeq: number;
  currentSeq: number;
  replayedCount: number;
}

// 5 turns * 200 events per turn = up to 1000 events in memory
export const MAX_EVENTS_PER_TURN = 200;
export const MAX_TURNS_IN_MEMORY = 5;
const CONVERSATION_TTL_MS = 30 * 60 * 1000; // 30 minutes

export class ConversationHub {
  private emitters = new Map<string, EventEmitter>();
  private turnBuffers = new Map<string, TurnBuffer[]>();
  private seqCounters = new Map<string, number>();
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
      this.turnBuffers.set(convId, []);
      this.seqCounters.set(convId, 0);
    }
    this.lastActivity.set(convId, Date.now());
    return em;
  }

  getCurrentSeq(convId: string): number {
    return this.seqCounters.get(convId) || 0;
  }

  /**
   * Returns all retained events across all turn buffers in chronological sequence.
   */
  getAllEvents(convId: string): HubEvent[] {
    const turns = this.turnBuffers.get(convId) ?? [];
    const all: HubEvent[] = [];
    for (const t of turns) {
      for (const e of t.events) {
        all.push(e);
      }
    }
    return all;
  }

  getMinSeq(convId: string): number {
    const all = this.getAllEvents(convId);
    if (all.length === 0) return (this.seqCounters.get(convId) || 0) + 1;
    return all[0].seq;
  }

  getTurnBuffers(convId: string): TurnBuffer[] {
    return this.turnBuffers.get(convId) ?? [];
  }

  subscribe(convId: string, listener: ConversationListener, lastSeq?: number): SubscriptionHandle {
    const em = this.getOrCreate(convId);
    const allEvents = this.getAllEvents(convId);
    const currentSeq = this.getCurrentSeq(convId);
    const minSeq = this.getMinSeq(convId);

    let isTruncated = false;
    let replayedCount = 0;

    if (lastSeq !== undefined && lastSeq > 0) {
      // Client requested events after lastSeq
      if (allEvents.length > 0 && lastSeq < minSeq) {
        // Earliest events requested by client have been evicted from turn ring buffers
        isTruncated = true;
      }
      for (const item of allEvents) {
        if (item.seq > lastSeq) {
          listener(item.event, item.seq);
          replayedCount++;
        }
      }
    } else {
      // Initial subscribe without lastSeq: replay all events currently in buffer
      for (const item of allEvents) {
        listener(item.event, item.seq);
        replayedCount++;
      }
    }

    em.on('event', listener);

    const unsubscribe = () => {
      em.off('event', listener);
    };

    const handle = unsubscribe as SubscriptionHandle;
    handle.unsubscribe = unsubscribe;
    handle.isTruncated = isTruncated;
    handle.minSeq = minSeq;
    handle.currentSeq = currentSeq;
    handle.replayedCount = replayedCount;

    return handle;
  }

  getEventsSince(convId: string, lastSeq: number): {
    events: Array<{ seq: number; event: AgyEvent }>;
    isTruncated: boolean;
    minSeq: number;
    currentSeq: number;
  } {
    const allEvents = this.getAllEvents(convId);
    const currentSeq = this.getCurrentSeq(convId);
    const minSeq = this.getMinSeq(convId);
    const isTruncated = allEvents.length > 0 && lastSeq > 0 && lastSeq < minSeq;
    const events = allEvents
      .filter((item) => item.seq > lastSeq)
      .map((item) => ({ seq: item.seq, event: item.event }));

    return { events, isTruncated, minSeq, currentSeq };
  }

  publish(convId: string, event: AgyEvent, turnId?: string): { seq: number; event: AgyEvent } {
    const em = this.getOrCreate(convId);
    this.lastActivity.set(convId, Date.now());

    const nextSeq = (this.seqCounters.get(convId) || 0) + 1;
    this.seqCounters.set(convId, nextSeq);

    const hubEvent: HubEvent = {
      seq: nextSeq,
      event,
      timestamp: Date.now()
    };

    let turns = this.turnBuffers.get(convId);
    if (!turns) {
      turns = [];
      this.turnBuffers.set(convId, turns);
    }

    // Determine current turn buffer
    let currentTurn = turns[turns.length - 1];
    const isNewTurnStart = event.type === 'init' || (turnId && currentTurn && currentTurn.turnId !== turnId);

    if (!currentTurn || isNewTurnStart) {
      currentTurn = {
        turnId: turnId || `turn-${Date.now()}-${turns.length + 1}`,
        createdAt: Date.now(),
        events: []
      };
      turns.push(currentTurn);

      // Keep only up to MAX_TURNS_IN_MEMORY turns
      if (turns.length > MAX_TURNS_IN_MEMORY) {
        turns.shift();
      }
    }

    // Push event to current turn buffer
    currentTurn.events.push(hubEvent);
    // Keep only up to MAX_EVENTS_PER_TURN per turn
    if (currentTurn.events.length > MAX_EVENTS_PER_TURN) {
      currentTurn.events.shift();
    }

    em.emit('event', event, nextSeq);
    return { seq: nextSeq, event };
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
        this.turnBuffers.delete(convId);
        this.seqCounters.delete(convId);
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

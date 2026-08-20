import { TurnHandle } from './turnRunner';

export interface ActiveTurn {
  conversationId: string;
  handle: TurnHandle;
  abort: () => void;
  startedAt: number;
  lastActivityAt: number;
  cwd?: string;
  dangerouslySkipPermissions?: boolean;
}

export class ActiveTurnManager {
  private activeTurns = new Map<string, ActiveTurn>();

  register(convId: string, turn: ActiveTurn): void {
    const existing = this.activeTurns.get(convId);
    if (existing) {
      try {
        existing.abort();
      } catch {}
    }
    this.activeTurns.set(convId, turn);
  }

  get(convId: string): ActiveTurn | undefined {
    return this.activeTurns.get(convId);
  }

  has(convId: string): boolean {
    return this.activeTurns.has(convId);
  }

  updateActivity(convId: string): void {
    const turn = this.activeTurns.get(convId);
    if (turn) {
      turn.lastActivityAt = Date.now();
    }
  }

  abort(convId: string): boolean {
    const turn = this.activeTurns.get(convId);
    if (turn) {
      try {
        turn.abort();
      } catch {}
      this.activeTurns.delete(convId);
      return true;
    }
    return false;
  }

  remove(convId: string): void {
    this.activeTurns.delete(convId);
  }

  getAll(): Map<string, ActiveTurn> {
    return new Map(this.activeTurns);
  }

  count(): number {
    return this.activeTurns.size;
  }
}

export const activeTurnManager = new ActiveTurnManager();

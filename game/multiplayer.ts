// Pure TypeScript — no React, no RN imports

export interface GameEvent {
  type: string;
  timestamp: number;
  payload: Record<string, unknown>;
}

export interface SyncState {
  sessionId: string;
  role: 'a' | 'b';
  lastSyncedIndex: number;
  pendingEvents: GameEvent[];
}

export function createSyncState(sessionId: string, role: 'a' | 'b'): SyncState {
  console.log(`[Multiplayer] createSyncState sessionId=${sessionId} role=${role}`);
  return { sessionId, role, lastSyncedIndex: 0, pendingEvents: [] };
}

export function encodeEvent(type: string, payload: Record<string, unknown>): GameEvent {
  return { type, timestamp: Date.now(), payload };
}

export function decodeEvents(rawEvents: unknown[]): GameEvent[] {
  return rawEvents.filter(e => e && typeof e === 'object') as GameEvent[];
}

export function actionToEvent(actionType: string, payload: Record<string, unknown>): GameEvent {
  return encodeEvent(actionType, payload);
}

export function appendEvent(sync: SyncState, event: GameEvent): SyncState {
  return { ...sync, pendingEvents: [...sync.pendingEvents, event] };
}

export function flushEvents(sync: SyncState): { sync: SyncState; events: GameEvent[] } {
  return {
    sync: { ...sync, pendingEvents: [], lastSyncedIndex: sync.lastSyncedIndex + sync.pendingEvents.length },
    events: sync.pendingEvents,
  };
}

export function getNewEvents(allEvents: GameEvent[], lastIndex: number): GameEvent[] {
  return allEvents.slice(lastIndex);
}

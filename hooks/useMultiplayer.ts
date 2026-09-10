import { useEffect, useRef, useCallback } from 'react';
import { GameEvent, SyncState, createSyncState, encodeEvent } from '@/game/multiplayer';

interface UseMultiplayerOptions {
  sessionId: string;
  role: 'a' | 'b';
  onRemoteEvent: (event: GameEvent) => void;
  onOpponentDisconnect: () => void;
}

export function useMultiplayer({ sessionId, role, onRemoteEvent, onOpponentDisconnect }: UseMultiplayerOptions) {
  const syncRef = useRef<SyncState>(createSyncState(sessionId, role));
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastOpponentHeartbeatRef = useRef<number>(0);
  if (lastOpponentHeartbeatRef.current === 0) lastOpponentHeartbeatRef.current = Date.now();
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sendEvent = useCallback((type: string, payload: Record<string, unknown>) => {
    const event = encodeEvent(type, payload);
    syncRef.current.pendingEvents.push(event);
    // TODO: append to events_a or events_b via backend SDK
    console.log('[Multiplayer] Sending event', { type, payload, sessionId, role });
  }, [sessionId, role]);

  const startHeartbeat = useCallback(() => {
    console.log('[Multiplayer] Starting heartbeat', { sessionId, role });

    // Send heartbeat every 5s
    heartbeatTimerRef.current = setInterval(() => {
      sendEvent('heartbeat', { timestamp: Date.now() });
    }, 5000);

    // Check opponent heartbeat every 3s
    const checkTimer = setInterval(() => {
      const elapsed = Date.now() - lastOpponentHeartbeatRef.current;
      if (elapsed > 15000) {
        console.log('[Multiplayer] Opponent disconnected (no heartbeat for 15s)', { sessionId });
        clearInterval(checkTimer);
        onOpponentDisconnect();
      }
    }, 3000);

    return () => {
      if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
      clearInterval(checkTimer);
    };
  }, [sessionId, role, sendEvent, onOpponentDisconnect]);

  // Poll for opponent events every 100ms (mock)
  useEffect(() => {
    console.log('[Multiplayer] Starting event poll', { sessionId, role });

    pollTimerRef.current = setInterval(() => {
      // TODO: fetch events_a or events_b from backend SDK
      // const newEvents = getNewEvents(allEvents, syncRef.current.lastSyncedIndex);
      // newEvents.forEach(onRemoteEvent);
      // syncRef.current.lastSyncedIndex += newEvents.length;
    }, 100);

    return () => {
      console.log('[Multiplayer] Stopping event poll', { sessionId });
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
    };
  }, [sessionId, role]);

  return { sendEvent, startHeartbeat };
}

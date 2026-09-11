import { useRef, useEffect, useCallback, useState } from 'react';
import { GameState, MatchMode } from '@/game/engine-types';
import { update } from '@/game/engine';
import { computeAiAction } from '@/game/ai';

interface UseGameLoopOptions {
  initialState: GameState;
  mode: MatchMode;
  onGameEnd: (state: GameState) => void;
}

export function useGameLoop({ initialState, mode, onGameEnd }: UseGameLoopOptions) {
  const stateRef = useRef<GameState>(initialState);
  const [hudState, setHudState] = useState<GameState>(initialState);
  const lastTimeRef = useRef<number>(0);
  const pausedRef = useRef<boolean>(false);
  const endedRef = useRef<boolean>(false);
  const frameCountRef = useRef<number>(0);
  const onGameEndRef = useRef(onGameEnd);
  const modeRef = useRef(mode);

  useEffect(() => { onGameEndRef.current = onGameEnd; }, [onGameEnd]);
  useEffect(() => { modeRef.current = mode; }, [mode]);

  const dispatch = useCallback((action: (state: GameState) => GameState) => {
    stateRef.current = action(stateRef.current);
  }, []);

  const pause = useCallback(() => {
    console.log('[GameLoop] Paused');
    pausedRef.current = true;
  }, []);

  const resume = useCallback(() => {
    console.log('[GameLoop] Resumed');
    pausedRef.current = false;
  }, []);

  // Called on JS thread to update HUD state
  const handleHudUpdate = useCallback((state: GameState) => {
    setHudState(state);
  }, []);

  const handleGameEnd = useCallback((state: GameState) => {
    console.log('[GameLoop] Game ended', { winner: state.winner });
    onGameEndRef.current(state);
  }, []);

  useEffect(() => {
    let rafId: number;
    let lastTime = 0;

    const loop = (now: number) => {
      rafId = requestAnimationFrame(loop);

      if (endedRef.current || pausedRef.current) {
        lastTime = now;
        return;
      }

      const dt = lastTime === 0 ? 16 : Math.min(now - lastTime, 50);
      lastTime = now;

      let newState = update(stateRef.current, dt);

      if (modeRef.current.startsWith('ai_')) {
        const difficulty = modeRef.current.replace('ai_', '') as 'easy' | 'normal' | 'hard';
        const aiAction = computeAiAction(newState, difficulty);
        if (aiAction.type !== 'none') {
          newState = update(newState, 0, aiAction);
        }
      }

      stateRef.current = newState;
      frameCountRef.current += 1;

      if (frameCountRef.current % 6 === 0) {
        handleHudUpdate(newState);
      }

      if (newState.status === 'finished' && !endedRef.current) {
        endedRef.current = true;
        handleGameEnd(newState);
      }
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset state when mode changes (new game)
  useEffect(() => {
    console.log('[GameLoop] Starting loop', { mode });
    stateRef.current = { ...stateRef.current, status: 'playing' };
    endedRef.current = false;
    frameCountRef.current = 0;
    lastTimeRef.current = 0;
  }, [mode]);

  return { hudState, stateRef, dispatch, pause, resume };
}

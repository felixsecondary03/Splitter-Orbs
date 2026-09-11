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
  const rafRef = useRef<number>(0);
  const pausedRef = useRef<boolean>(false);
  const endedRef = useRef<boolean>(false);
  const frameCountRef = useRef<number>(0);
  const onGameEndRef = useRef(onGameEnd);

  useEffect(() => {
    onGameEndRef.current = onGameEnd;
  }, [onGameEnd]);

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

  useEffect(() => {
    console.log('[GameLoop] Starting loop', { mode });
    stateRef.current = { ...stateRef.current, status: 'playing' };
    endedRef.current = false;

    const loop = (timestamp: number) => {
      if (endedRef.current) return;

      if (!pausedRef.current) {
        const dt = lastTimeRef.current === 0
          ? 16
          : Math.min(timestamp - lastTimeRef.current, 50);
        lastTimeRef.current = timestamp;

        let newState = update(stateRef.current, dt);

        // Apply AI action if vs AI mode
        if (mode.startsWith('ai_')) {
          const difficulty = mode.replace('ai_', '') as 'easy' | 'normal' | 'hard';
          const aiAction = computeAiAction(newState, difficulty);
          if (aiAction.type !== 'none') {
            newState = update(newState, 0, aiAction);
          }
        }

        stateRef.current = newState;

        frameCountRef.current += 1;
        if (frameCountRef.current % 2 === 0) {
          setHudState(newState); // ~30fps for HUD
        }

        if (newState.status === 'finished') {
          endedRef.current = true;
          console.log('[GameLoop] Game ended', { winner: newState.winner, mode });
          onGameEndRef.current(newState);
          return;
        }
      } else {
        lastTimeRef.current = timestamp;
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      console.log('[GameLoop] Stopping loop');
      cancelAnimationFrame(rafRef.current);
      endedRef.current = true;
    };
  }, [mode]);

  return { hudState, stateRef, dispatch, pause, resume };
}

import React from 'react';
import { GameCanvasInner, type GameCanvasProps } from './GameCanvasInner';

export type { GameCanvasProps };

export function GameCanvas(props: GameCanvasProps) {
  return <GameCanvasInner {...props} />;
}

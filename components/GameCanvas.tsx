import React, { Suspense } from 'react';
import { View } from 'react-native';
import type { GameCanvasProps } from './GameCanvasInner';

export type { GameCanvasProps };

const LazyGameCanvasInner = React.lazy(() => import('./GameCanvasInner'));

export function GameCanvas(props: GameCanvasProps) {
  return (
    <Suspense fallback={<View style={{ width: props.width, height: props.height, backgroundColor: '#0A0E1A' }} />}>
      <LazyGameCanvasInner {...props} />
    </Suspense>
  );
}

import React, { useState, useEffect } from 'react';
import { Platform, View } from 'react-native';
import { GameCanvasInner } from './GameCanvasInner';
import type { GameCanvasProps } from './GameCanvasInner';

export type { GameCanvasProps };

export function GameCanvas(props: GameCanvasProps) {
  const [skiaReady, setSkiaReady] = useState(Platform.OS !== 'web');

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    let cancelled = false;
    function probe() {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { Skia } = require('@shopify/react-native-skia');
        Skia.Path.Make().close();
        if (!cancelled) setSkiaReady(true);
      } catch {
        if (!cancelled) setTimeout(probe, 100);
      }
    }
    probe();
    return () => { cancelled = true; };
  }, []);

  if (!skiaReady) {
    return (
      <View style={{ width: props.width, height: props.height, backgroundColor: '#0A0E1A' }} />
    );
  }

  return <GameCanvasInner {...props} />;
}

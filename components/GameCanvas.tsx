import React, { useState, useEffect, Suspense } from 'react';
import { Platform, View } from 'react-native';
import type { GameCanvasProps } from './GameCanvasInner';

export type { GameCanvasProps };

const LazyGameCanvasInner = React.lazy(() => import('./GameCanvasInner'));

export function GameCanvas(props: GameCanvasProps) {
  const [skiaReady, setSkiaReady] = useState(Platform.OS !== 'web');

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    let cancelled = false;
    function probe() {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { Skia } = require('@shopify/react-native-skia');
        // Test PictureRecorder specifically — it initializes AFTER Path.Make
        const rec = Skia.PictureRecorder();
        rec.beginRecording({ x: 0, y: 0, width: 1, height: 1 });
        rec.finishRecordingAsPicture();
        if (!cancelled) setSkiaReady(true);
      } catch {
        if (!cancelled) setTimeout(probe, 200);
      }
    }
    probe();
    return () => { cancelled = true; };
  }, []);

  if (!skiaReady) {
    return <View style={{ width: props.width, height: props.height, backgroundColor: '#0A0E1A' }} />;
  }

  return (
    <Suspense fallback={<View style={{ width: props.width, height: props.height, backgroundColor: '#0A0E1A' }} />}>
      <LazyGameCanvasInner {...props} />
    </Suspense>
  );
}

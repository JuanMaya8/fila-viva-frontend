'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Smoothed countdown (in seconds) computed off the main thread by
 * src/workers/countdown.worker.ts. The worker is terminated on unmount.
 */
export function useCountdown(minutes: number | null): number | null {
  const workerRef = useRef<Worker | null>(null);
  const [seconds, setSeconds] = useState<number | null>(
    minutes === null ? null : minutes * 60,
  );

  useEffect(() => {
    if (typeof Worker === 'undefined') {
      return;
    }
    const worker = new Worker(new URL('../workers/countdown.worker.ts', import.meta.url));
    worker.onmessage = (event: MessageEvent<{ seconds: number }>) => setSeconds(event.data.seconds);
    workerRef.current = worker;
    return () => {
      worker.postMessage({ type: 'stop' });
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (minutes === null) {
      setSeconds(null);
      return;
    }
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'target', minutes });
    } else {
      setSeconds(minutes * 60);
    }
  }, [minutes]);

  return seconds;
}

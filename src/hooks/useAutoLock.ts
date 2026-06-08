import { useCallback, useEffect, useRef } from 'react';

export function useAutoLock(minutes: number) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ping = useCallback(() => {
    window.vaultAPI.activityPing().catch(() => {});
  }, []);

  const resetTimer = useCallback(() => {
    ping();
  }, [ping]);

  useEffect(() => {
    const events: (keyof DocumentEventMap)[] = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((event) => {
      document.addEventListener(event, resetTimer);
    });
    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, resetTimer);
      });
    };
  }, [resetTimer]);
}

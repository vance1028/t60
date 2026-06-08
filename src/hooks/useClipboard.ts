import { useCallback, useRef } from 'react';

export function useClipboard(clearAfterSeconds: number) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copyWithClear = useCallback(async (text: string) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    await window.vaultAPI.clipboardWrite(text);
    timerRef.current = setTimeout(async () => {
      await window.vaultAPI.clipboardClear();
      timerRef.current = null;
    }, clearAfterSeconds * 1000);
  }, [clearAfterSeconds]);

  return copyWithClear;
}

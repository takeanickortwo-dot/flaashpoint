import { useState, useEffect, useCallback, useRef } from 'react';

interface SyncState {
  serverTime: number;
  nextRefresh: number;
  countdownMs: number;
  isSynced: boolean;
}

export function useGlobalSync(intervalMs: number = 60000) {
  const [sync, setSync] = useState<SyncState>({
    serverTime: 0,
    nextRefresh: 0,
    countdownMs: intervalMs,
    isSynced: false
  });

  const timerRef = useRef<number>();

  const fetchSync = useCallback(async () => {
    try {
      const res = await fetch('/.netlify/functions/global-sync');
      const data = await res.json();
      const localNow = Date.now();
      const latency = localNow - data.serverTimestamp; // rough one-way delay
      const adjustedNext = data.nextRefreshAt + latency / 2; // compensate

      setSync({
        serverTime: data.serverTimestamp,
        nextRefresh: adjustedNext,
        countdownMs: Math.max(0, adjustedNext - localNow),
        isSynced: true
      });
    } catch (err) {
      // Fallback: use local clock aligned to the same interval
      console.warn('Global sync failed, using local fallback', err);
      const localNow = Date.now();
      const next = Math.ceil(localNow / intervalMs) * intervalMs;
      setSync({
        serverTime: localNow,
        nextRefresh: next,
        countdownMs: next - localNow,
        isSynced: false
      });
    }
  }, [intervalMs]);

  // Initial sync and periodic re-sync
  useEffect(() => {
    fetchSync();
    const syncInterval = setInterval(fetchSync, 300000); // re-sync every 5 min
    return () => clearInterval(syncInterval);
  }, [fetchSync]);

  // Countdown ticker + trigger refresh when it hits 0
  useEffect(() => {
    const tick = () => {
      const remaining = Math.max(0, sync.nextRefresh - Date.now());
      setSync(prev => ({ ...prev, countdownMs: remaining }));

      if (remaining <= 0) {
        // Fire global refresh event — all your data-fetching components will listen for this
        window.dispatchEvent(new CustomEvent('globalrefresh'));
        fetchSync(); // reset for next cycle
      }
    };

    timerRef.current = window.setInterval(tick, 100); // update every 100ms
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [sync.nextRefresh, fetchSync]);

  return sync;
}
/**
 * useRefreshCountdown — seconds remaining in the shared 60s GDELT cycle.
 * Drives the navbar countdown ring (design.md §8.12).
 */

import { useEffect, useState } from "react";
import {
  getRefreshCycleState,
  requestManualRefresh,
  subscribeRefreshCycle,
} from "@/lib/refreshCycle";
import type { RefreshCycleState } from "@/lib/refreshCycle";

export function useRefreshCountdown(): RefreshCycleState & {
  refreshNow: () => void;
} {
  const [state, setState] = useState<RefreshCycleState>(() => getRefreshCycleState());

  useEffect(() => {
    return subscribeRefreshCycle(() => setState(getRefreshCycleState()));
  }, []);

  return { ...state, refreshNow: requestManualRefresh };
}

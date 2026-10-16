import { useCallback, useEffect, useRef, useState } from "react";
import { backend, DEMO_STORAGE_KEY, type Session } from "../data/backend";
import type { DashboardState } from "../types/dashboard";

const VERSION_POLL_MS = 3000;
const FULL_REFRESH_MS = 30000;

export interface Dashboard {
  state: DashboardState | null;
  error: string | null;
  lastSync: Date | null;
  refresh: () => Promise<void>;
  /** Runs a change, then reloads so every page shows the new state. Throws the backend's message on failure. */
  run: (change: () => Promise<unknown>) => Promise<void>;
}

/**
 * Keeps the dashboard state in sync for all users: polls a cheap version number and
 * reloads the full state only when something changed (plus a slow safety refresh).
 */
export function useDashboard(session: Session | null): Dashboard {
  const [state, setState] = useState<DashboardState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const versionRef = useRef<number>(0);
  const loadingRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!session || loadingRef.current) return;
    loadingRef.current = true;
    try {
      const next = await backend.getState(session);
      versionRef.current = next.version;
      setState(next);
      setError(null);
      setLastSync(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Laden mislukt.");
    } finally {
      loadingRef.current = false;
    }
  }, [session]);

  useEffect(() => {
    if (!session) {
      setState(null);
      return;
    }
    void refresh();

    let stopped = false;
    const poll = window.setInterval(async () => {
      if (stopped || document.hidden) return;
      try {
        const version = await backend.getVersion(session);
        if (version !== versionRef.current) await refresh();
        else setLastSync(new Date());
      } catch {
        // Next tick tries again; a persistent problem shows up through refresh().
      }
    }, VERSION_POLL_MS);
    const full = window.setInterval(() => {
      if (!document.hidden) void refresh();
    }, FULL_REFRESH_MS);
    const onStorage = (event: StorageEvent) => {
      if (event.key === DEMO_STORAGE_KEY) void refresh();
    };
    const onVisible = () => {
      if (!document.hidden) void refresh();
    };
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      window.clearInterval(poll);
      window.clearInterval(full);
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [session, refresh]);

  const run = useCallback(
    async (change: () => Promise<unknown>) => {
      try {
        await change();
      } finally {
        loadingRef.current = false;
        await refresh();
      }
    },
    [refresh]
  );

  return { state, error, lastSync, refresh, run };
}

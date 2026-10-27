import { useCallback, useEffect, useRef, useState } from "react";
import { backend, DEMO_STORAGE_KEY, type Session } from "../data/backend";
import type { DashboardState } from "../types/dashboard";

const POLL_MS = 3000;
/** Safety net next to the version check; cheap now that the script caches the state. */
const FULL_REFRESH_MS = 60000;
/** Last known state per person, so the platform opens instantly and updates in the background. */
const SNAPSHOT_PREFIX = "omacoby-stand:";

function snapshotKey(session: Session): string {
  return `${SNAPSHOT_PREFIX}${session.role}:${session.name.trim().toLowerCase()}`;
}

function loadSnapshot(session: Session | null): DashboardState | null {
  // Demo mode keeps everything in this browser already.
  if (!session || backend.kind !== "apps-script") return null;
  try {
    const raw = localStorage.getItem(snapshotKey(session));
    return raw ? (JSON.parse(raw) as DashboardState) : null;
  } catch {
    return null;
  }
}

function saveSnapshot(session: Session, state: DashboardState) {
  if (backend.kind !== "apps-script") return;
  try {
    localStorage.setItem(snapshotKey(session), JSON.stringify(state));
  } catch {
    // Full or blocked storage: the platform just loads from the Sheet next time.
  }
}

/** On logout: remove the saved states (they contain names and addresses). */
export function clearSnapshots() {
  try {
    for (const key of Object.keys(localStorage)) if (key.startsWith(SNAPSHOT_PREFIX)) localStorage.removeItem(key);
  } catch {
    // Nothing saved, or storage blocked.
  }
}

export interface Dashboard {
  state: DashboardState | null;
  error: string | null;
  lastSync: Date | null;
  refresh: () => Promise<void>;
  /** Runs a change, then reloads so every page shows the new state. Throws the backend's message on failure. */
  run: (change: () => Promise<unknown>) => Promise<void>;
}

/**
 * Keeps the dashboard state in sync for all users. Opens with the last known state from this
 * browser, then asks the script every few seconds "anything new since version X?": a tiny answer
 * when nothing changed, the whole new state in the same request when something did.
 */
export function useDashboard(session: Session | null): Dashboard {
  const [state, setState] = useState<DashboardState | null>(() => loadSnapshot(session));
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const versionRef = useRef<number>(0);
  const loadingRef = useRef(false);

  const accept = useCallback(
    (next: DashboardState) => {
      versionRef.current = next.version;
      setState(next);
      setError(null);
      setLastSync(new Date());
      if (session) saveSnapshot(session, next);
    },
    [session]
  );

  const refresh = useCallback(async () => {
    if (!session || loadingRef.current) return;
    loadingRef.current = true;
    try {
      const next = await backend.getState(session);
      if (next) accept(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Laden mislukt.");
    } finally {
      loadingRef.current = false;
    }
  }, [session, accept]);

  useEffect(() => {
    if (!session) {
      setState(null);
      return;
    }
    // Another person on this device, or a fresh login: start from their own saved state.
    const saved = loadSnapshot(session);
    setState(saved);
    versionRef.current = 0;
    setLastSync(null);
    void refresh();

    let stopped = false;
    const poll = window.setInterval(async () => {
      if (stopped || document.hidden || loadingRef.current || !versionRef.current) return;
      loadingRef.current = true;
      try {
        const next = await backend.getState(session, versionRef.current);
        if (next) accept(next);
        else setLastSync(new Date());
      } catch {
        // Next tick tries again; a persistent problem shows up through refresh().
      } finally {
        loadingRef.current = false;
      }
    }, POLL_MS);
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
  }, [session, refresh, accept]);

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

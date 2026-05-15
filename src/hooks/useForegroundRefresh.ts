import { useEffect, useEffectEvent, useRef } from "react";

export function useForegroundRefresh(onRefresh: () => void | Promise<void>, enabled = true, minIntervalMs = 15_000) {
  const runRefresh = useEffectEvent(async () => {
    await onRefresh();
  });
  const lastRunRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const maybeRefresh = () => {
      const now = Date.now();
      if (now - lastRunRef.current < minIntervalMs) {
        return;
      }
      lastRunRef.current = now;
      void runRefresh();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        maybeRefresh();
      }
    };

    const handleFocus = () => {
      maybeRefresh();
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("pageshow", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("pageshow", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, minIntervalMs, runRefresh]);
}

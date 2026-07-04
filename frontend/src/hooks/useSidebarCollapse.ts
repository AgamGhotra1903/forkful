// hooks/useSidebarCollapse.ts
// Tiny persisted boolean for "is this dashboard's desktop sidebar minimised".
// Purely additive — new hook only, touches no existing state or routes.

import { useEffect, useState } from "react";

export function useSidebarCollapse(storageKey: string) {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(storageKey) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, collapsed ? "1" : "0");
    } catch {
      /* ignore (private browsing / storage disabled) */
    }
  }, [storageKey, collapsed]);

  return [collapsed, setCollapsed] as const;
}

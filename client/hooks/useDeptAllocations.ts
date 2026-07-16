import { useState, useCallback } from "react";

export const DEFAULT_ALLOC: Record<string, number> = {
  Marketing:  0.25,
  Sales:      0.12,
  Finance:    0.06,
  HR:         0.21,
  Tech:       0.16,
  Ops:        0.10,
  Management: 0.10,
};

const STORAGE_KEY = "mis_dept_allocations";

function load(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? JSON.stringify(DEFAULT_ALLOC));
  } catch {
    return { ...DEFAULT_ALLOC };
  }
}

export function useDeptAllocations() {
  const [allocations, setAllocations] = useState<Record<string, number>>(load);

  const update = useCallback((dept: string, pct: number) => {
    setAllocations((prev) => {
      const next = { ...prev, [dept]: Math.max(0, pct) / 100 };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setAllocations({ ...DEFAULT_ALLOC });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_ALLOC));
  }, []);

  const totalPct = Object.values(allocations).reduce((s, v) => s + v, 0);

  return { allocations, update, reset, totalPct };
}

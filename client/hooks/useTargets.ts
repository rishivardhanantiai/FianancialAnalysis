import { useState, useCallback } from "react";

export interface MonthlyTarget {
  revenue: number;
  expenses: number;
}

const STORAGE_KEY = "mis_monthly_targets";

function loadTargets(): Record<string, MonthlyTarget> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

/**
 * Stores user-defined monthly targets in localStorage.
 * Key format: "YYYY-MM"  e.g. "2026-05"
 */
export function useTargets() {
  const [targets, setTargets] = useState<Record<string, MonthlyTarget>>(loadTargets);

  const setTarget = useCallback(
    (month: string, data: Partial<MonthlyTarget>) => {
      setTargets((prev) => {
        const next = {
          ...prev,
          [month]: { revenue: 0, expenses: 0, ...prev[month], ...data },
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    },
    []
  );

  const getTarget = useCallback(
    (month: string): MonthlyTarget =>
      targets[month] ?? { revenue: 0, expenses: 0 },
    [targets]
  );

  return { targets, setTarget, getTarget };
}

import type { TransactionRecord } from "@shared/api";

// ---------------------------------------------------------------------------
// Period Filter Types
// ---------------------------------------------------------------------------

export type FilterPeriod =
  | { type: "all" }
  | { type: "monthly"; year: number; month: number }
  | { type: "quarterly"; year: number; quarter: 1 | 2 | 3 | 4 }
  | { type: "yearly"; year: number }
  | { type: "financial-year"; fy: string }       // e.g. "2025-26"
  | { type: "multi-fy"; fys: string[] }
  | { type: "custom"; start: string; end: string }; // "YYYY-MM-DD"

// ---------------------------------------------------------------------------
// Financial Year Helpers (Apr–Mar cycle, as per report §5)
// ---------------------------------------------------------------------------

/**
 * Returns the ISO date range for an Indian Financial Year.
 * e.g. "2025-26" → { start: "2025-04-01", end: "2026-03-31" }
 */
export function getFYRange(fy: string): { start: string; end: string } {
  const startYear = parseInt(fy.split("-")[0], 10);
  return {
    start: `${startYear}-04-01`,
    end: `${startYear + 1}-03-31`,
  };
}

/**
 * Derives the current Financial Year from system date.
 * e.g. if today is May 2026 → "2026-27"
 *      if today is Feb 2026 → "2025-26"
 */
export function getCurrentFY(): string {
  const now = new Date();
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const nextYear = String(year + 1).slice(-2);
  return `${year}-${nextYear}`;
}

/**
 * Get which FY a given date string ("YYYY-MM-DD") belongs to.
 */
export function getFYForDate(dateStr: string): string {
  const d = new Date(dateStr);
  const year = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  const nextYear = String(year + 1).slice(-2);
  return `${year}-${nextYear}`;
}

/**
 * Derive all unique FY strings from a list of transactions,
 * always including the current FY even if no data exists yet.
 */
export function getAvailableFYs(transactions: TransactionRecord[]): string[] {
  const fySet = new Set<string>([getCurrentFY()]);
  for (const t of transactions) {
    fySet.add(getFYForDate(t.date));
  }
  return Array.from(fySet).sort().reverse(); // most recent first
}

// ---------------------------------------------------------------------------
// Quarter Helpers
// ---------------------------------------------------------------------------

/**
 * Returns the start/end "YYYY-MM-DD" for a calendar quarter.
 * Q1 = Jan–Mar, Q2 = Apr–Jun, Q3 = Jul–Sep, Q4 = Oct–Dec
 */
export function getQuarterRange(
  year: number,
  quarter: 1 | 2 | 3 | 4
): { start: string; end: string } {
  const quarterMap: Record<number, { startMonth: number; endMonth: number; endDay: number }> = {
    1: { startMonth: 1,  endMonth: 3,  endDay: 31 },
    2: { startMonth: 4,  endMonth: 6,  endDay: 30 },
    3: { startMonth: 7,  endMonth: 9,  endDay: 30 },
    4: { startMonth: 10, endMonth: 12, endDay: 31 },
  };
  const { startMonth, endMonth, endDay } = quarterMap[quarter];
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    start: `${year}-${pad(startMonth)}-01`,
    end: `${year}-${pad(endMonth)}-${endDay}`,
  };
}

/**
 * Returns current quarter (1–4) derived from system date.
 */
export function getCurrentQuarter(): { year: number; quarter: 1 | 2 | 3 | 4 } {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-indexed
  const quarter = Math.ceil(month / 3) as 1 | 2 | 3 | 4;
  return { year: now.getFullYear(), quarter };
}

// ---------------------------------------------------------------------------
// Default Period — always derived from system date
// ---------------------------------------------------------------------------

export function getDefaultPeriod(): FilterPeriod {
  return { type: "financial-year", fy: getCurrentFY() };
}

// ---------------------------------------------------------------------------
// Core Filter Function
// ---------------------------------------------------------------------------

/**
 * Filters a transactions array to only include rows within the given period.
 * All period boundaries are computed dynamically — no hardcoded dates.
 */
export function filterByPeriod(
  transactions: TransactionRecord[],
  period: FilterPeriod
): TransactionRecord[] {
  if (period.type === "all") return transactions;

  const inRange = (date: string, start: string, end: string) =>
    date >= start && date <= end;

  switch (period.type) {
    case "monthly": {
      const pad = (n: number) => String(n).padStart(2, "0");
      const prefix = `${period.year}-${pad(period.month)}`;
      return transactions.filter((t) => t.date.startsWith(prefix));
    }

    case "quarterly": {
      const { start, end } = getQuarterRange(period.year, period.quarter);
      return transactions.filter((t) => inRange(t.date, start, end));
    }

    case "yearly": {
      const prefix = `${period.year}`;
      return transactions.filter((t) => t.date.startsWith(prefix));
    }

    case "financial-year": {
      const { start, end } = getFYRange(period.fy);
      return transactions.filter((t) => inRange(t.date, start, end));
    }

    case "multi-fy": {
      const ranges = period.fys.map((fy) => getFYRange(fy));
      return transactions.filter((t) =>
        ranges.some(({ start, end }) => inRange(t.date, start, end))
      );
    }

    case "custom": {
      return transactions.filter((t) =>
        inRange(t.date, period.start, period.end)
      );
    }

    default:
      return transactions;
  }
}

// ---------------------------------------------------------------------------
// Label Helpers
// ---------------------------------------------------------------------------

const MONTH_NAMES = [
  "", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function periodLabel(period: FilterPeriod): string {
  switch (period.type) {
    case "all":
      return "All Time";
    case "monthly":
      return `${MONTH_NAMES[period.month]} ${period.year}`;
    case "quarterly":
      return `Q${period.quarter} ${period.year}`;
    case "yearly":
      return `Year ${period.year}`;
    case "financial-year":
      return `FY ${period.fy}`;
    case "multi-fy":
      return `FY ${period.fys.join(", ")}`;
    case "custom":
      return `${period.start} → ${period.end}`;
    default:
      return "—";
  }
}

/**
 * Derive all years present in transactions (for year/month pickers).
 */
export function getAvailableYears(transactions: TransactionRecord[]): number[] {
  const now = new Date().getFullYear();
  const yearSet = new Set<number>([now]);
  for (const t of transactions) {
    yearSet.add(parseInt(t.date.slice(0, 4), 10));
  }
  return Array.from(yearSet).sort().reverse();
}

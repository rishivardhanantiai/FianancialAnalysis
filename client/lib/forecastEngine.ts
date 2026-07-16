import type { TransactionRecord } from "@shared/api";

// ---------------------------------------------------------------------------
// Exponential Smoothing Engine
// Formula: F(t+1) = α1·A(t) + α2·A(t-1) + α3·A(t-2)
// Constraint: α1 + α2 + α3 = 1.0
// ---------------------------------------------------------------------------

export type AlphaTriplet = [number, number, number];

/** Default alpha weights — higher weight on recent month */
export const DEFAULT_REVENUE_ALPHAS: AlphaTriplet = [0.6, 0.3, 0.1];
export const DEFAULT_EXPENSE_ALPHAS: AlphaTriplet = [0.5, 0.3, 0.2];

/**
 * Compute one-step-ahead forecast using weighted exponential smoothing.
 * actuals[0] = most recent month (A_t)
 * actuals[1] = one month prior  (A_{t-1})
 * actuals[2] = two months prior (A_{t-2})
 */
export function exponentialSmoothing(
  actuals: AlphaTriplet,
  alphas: AlphaTriplet
): number {
  return alphas[0] * actuals[0] + alphas[1] * actuals[1] + alphas[2] * actuals[2];
}

/** Validate that alphas sum to 1.0 (within floating-point tolerance) */
export function alphasValid(alphas: AlphaTriplet): boolean {
  const sum = alphas[0] + alphas[1] + alphas[2];
  return Math.abs(sum - 1.0) < 0.001;
}

/**
 * Given a monthly totals map and the reference month (YYYY-MM),
 * return the last N month values as an array (most-recent first).
 */
export function getRollingActuals(
  monthlyTotals: Record<string, number>,
  referenceMonth: string,
  n: number = 3
): number[] {
  // Build rolling actuals strictly relative to the reference month
  // so missing months (e.g. April/May) become zeros instead of
  // falling back to the last available month.
  const result: number[] = [];
  let [yearStr, monthStr] = referenceMonth.split("-").map((s) => s);
  let year = parseInt(yearStr, 10);
  let month = parseInt(monthStr, 10);

  for (let i = 0; i < n; i++) {
    const key = `${year}-${String(month).padStart(2, "0")}`;
    result.push(monthlyTotals[key] ?? 0);
    // move back one month
    month -= 1;
    if (month === 0) {
      month = 12;
      year -= 1;
    }
  }

  return result; // [A_t, A_{t-1}, A_{t-2}] (zeros when months missing)
}

/**
 * Build a monthly totals map from transactions for a given type.
 * Returns: { "2026-03": 250000, "2026-04": 310000, ... }
 */
export function buildMonthlyTotals(
  transactions: TransactionRecord[],
  type: "Revenue" | "Expense"
): Record<string, number> {
  const map: Record<string, number> = {};
  for (const t of transactions) {
    if (t.type !== type) continue;
    const month = t.date.slice(0, 7); // "YYYY-MM"
    map[month] = (map[month] ?? 0) + t.amount;
  }
  return map;
}

/** Get current month as "YYYY-MM" string — always derived from system date */
export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Add N months to a "YYYY-MM" string. Returns new "YYYY-MM".
 */
export function addMonths(yyyyMm: string, n: number): string {
  const [year, month] = yyyyMm.split("-").map(Number);
  const d = new Date(year, month - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Format "YYYY-MM" to human label e.g. "Jun 2026" */
export function formatMonthLabel(yyyyMm: string): string {
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const [year, month] = yyyyMm.split("-").map(Number);
  return `${MONTHS[month - 1]} ${year}`;
}

// ---------------------------------------------------------------------------
// Full 3-Month Forecast Generator
// ---------------------------------------------------------------------------

export interface ForecastMonth {
  month: string;       // "YYYY-MM"
  label: string;       // "Jun 2026"
  revenue: number;
  expense: number;
  netCF: number;
}

export interface ForecastResult {
  months: ForecastMonth[];
  /** Last 3 actual revenue values used [A_t, A_{t-1}, A_{t-2}] */
  revenueActuals: AlphaTriplet;
  /** Last 3 actual expense values used */
  expenseActuals: AlphaTriplet;
}

/**
 * Generate N-month forward forecast using exponential smoothing.
 * Uses rolling actuals derived dynamically from transaction data.
 * All month labels are derived from current system date — never hardcoded.
 */
export function generateForecast(
  transactions: TransactionRecord[],
  revAlphas: AlphaTriplet = DEFAULT_REVENUE_ALPHAS,
  expAlphas: AlphaTriplet = DEFAULT_EXPENSE_ALPHAS,
  horizonMonths: number = 3
): ForecastResult {
  const currentMonth = getCurrentMonth();

  const revTotals = buildMonthlyTotals(transactions, "Revenue");
  const expTotals = buildMonthlyTotals(transactions, "Expense");

  // Seed actuals from last 3 months of real data
  let revActuals = getRollingActuals(revTotals, currentMonth) as [number, number, number];
  let expActuals = getRollingActuals(expTotals, currentMonth) as [number, number, number];

  const months: ForecastMonth[] = [];

  for (let i = 1; i <= horizonMonths; i++) {
    const monthKey = addMonths(currentMonth, i);
    const revenue = Math.max(0, exponentialSmoothing(revActuals, revAlphas));
    const expense = Math.max(0, exponentialSmoothing(expActuals, expAlphas));

    months.push({
      month: monthKey,
      label: formatMonthLabel(monthKey),
      revenue,
      expense,
      netCF: revenue - expense,
    });

    // Roll forward: new forecast becomes the "current" actual for next iteration
    revActuals = [revenue, revActuals[0], revActuals[1]];
    expActuals = [expense, expActuals[0], expActuals[1]];
  }

  // Re-derive original actuals for display
  const origRevActuals = getRollingActuals(revTotals, currentMonth) as AlphaTriplet;
  const origExpActuals = getRollingActuals(expTotals, currentMonth) as AlphaTriplet;

  return {
    months,
    revenueActuals: origRevActuals,
    expenseActuals: origExpActuals,
  };
}

/**
 * Get next-month forecast for a single metric (used by Dept Tracker).
 * Returns the forecasted value for the coming month.
 */
export function getNextMonthForecast(
  transactions: TransactionRecord[],
  type: "Revenue" | "Expense",
  alphas: AlphaTriplet
): number {
  const currentMonth = getCurrentMonth();
  const totals = buildMonthlyTotals(transactions, type);
  const actuals = getRollingActuals(totals, currentMonth) as AlphaTriplet;
  return Math.max(0, exponentialSmoothing(actuals, alphas));
}

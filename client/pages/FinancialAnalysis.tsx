import { useState, useMemo } from "react";
import Layout from "@/components/Layout";
import PeriodFilter from "@/components/PeriodFilter";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, LineChart, Line,
} from "recharts";
import { useTransactions } from "@/hooks/useTransactions";
import { useTargets } from "@/hooks/useTargets";
import { filterByPeriod, getDefaultPeriod, periodLabel } from "@/lib/dateFilters";
import { generateForecast, DEFAULT_REVENUE_ALPHAS, DEFAULT_EXPENSE_ALPHAS } from "@/lib/forecastEngine";
import type { FilterPeriod } from "@/lib/dateFilters";
import type { TransactionRecord } from "@shared/api";

const MONTH_NAMES = ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function friendlyMonth(yyyyMm: string) {
  const [y, m] = yyyyMm.split("-");
  return `${MONTH_NAMES[+m]} ${y}`;
}
function formatCurrency(n: number) {
  if (n >= 100000) return "₹" + (n / 100000).toFixed(2) + "L";
  if (n >= 1000)   return "₹" + (n / 1000).toFixed(1) + "K";
  return "₹" + Math.round(n).toLocaleString("en-IN");
}
function formatPercent(v: number) { return (v * 100).toFixed(1) + "%"; }

function getSignal(actual: number, target: number): "green" | "orange" | "red" {
  if (target <= 0) return "green";
  const pct = (actual - target) / target;
  if (pct >= 0) return "green";
  if (pct >= -0.1) return "orange";
  return "red";
}
const SIGNAL_STYLE: Record<string, string> = {
  green:  "bg-success-bg text-success",
  orange: "bg-warning-bg text-warning",
  red:    "bg-danger-bg text-danger",
};
const SIGNAL_LABEL: Record<string, string> = {
  green: "▲ Above", orange: "~ Near", red: "▼ Below",
};

function computeMonthly(transactions: TransactionRecord[]) {
  const map: Record<string, { rev: number; exp: number; fixed: number; variable: number }> = {};
  for (const t of transactions) {
    const m = t.date.slice(0, 7);
    if (!map[m]) map[m] = { rev: 0, exp: 0, fixed: 0, variable: 0 };
    if (t.type === "Revenue") { map[m].rev += t.amount; }
    else {
      map[m].exp += t.amount;
      if (t.costt === "Fixed") map[m].fixed += t.amount;
      else if (t.costt === "Variable") map[m].variable += t.amount;
      else map[m].fixed += t.amount;
    }
  }
  return map;
}

interface EditableTargetCellProps {
  value: number;
  onSave: (v: number) => void;
}
function EditableTargetCell({ value, onSave }: EditableTargetCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  if (editing) {
    return (
      <input
        autoFocus
        type="number"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => { onSave(parseFloat(draft) || 0); setEditing(false); }}
        onKeyDown={(e) => { if (e.key === "Enter") { onSave(parseFloat(draft) || 0); setEditing(false); } }}
        className="w-24 px-2 py-1 border-2 border-navy rounded text-xs font-bold text-center focus:outline-none"
      />
    );
  }
  return (
    <span
      onClick={() => { setDraft(String(value)); setEditing(true); }}
      className="cursor-pointer underline decoration-dotted text-navy font-bold hover:text-blue-mid"
      title="Click to edit target"
    >
      {value > 0 ? formatCurrency(value) : "Set target"}
    </span>
  );
}

export default function FinancialAnalysis() {
  const { transactions, loading, error } = useTransactions();
  const { getTarget, setTarget } = useTargets();
  const [period, setPeriod] = useState<FilterPeriod>(getDefaultPeriod());

  const filtered = useMemo(() => filterByPeriod(transactions, period), [transactions, period]);

  const monthly = useMemo(() => computeMonthly(filtered), [filtered]);
  const months  = useMemo(() => Object.keys(monthly).sort(), [monthly]);

  const totalRev = months.reduce((s, m) => s + monthly[m].rev, 0);
  const totalExp = months.reduce((s, m) => s + monthly[m].exp, 0);
  const totalProfit = totalRev - totalExp;

  // Forecast for entire dataset (3 months ahead)
  const forecast = useMemo(
    () => generateForecast(transactions, DEFAULT_REVENUE_ALPHAS, DEFAULT_EXPENSE_ALPHAS),
    [transactions]
  );
  const forecastRev = forecast.months[0]?.revenue ?? 0;
  const forecastExp = forecast.months[0]?.expense ?? 0;
  const forecastProfit = forecastRev - forecastExp;

  // Aggregate targets for period
  const targetRev    = months.reduce((s, m) => s + getTarget(m).revenue,  0);
  const targetExp    = months.reduce((s, m) => s + getTarget(m).expenses, 0);
  const targetProfit = targetRev - targetExp;

  const currentMonth = new Date().toISOString().slice(0, 7);
  const visibleTargetMonths = months.length > 0 ? months : [currentMonth];

  const savePeriodTarget = (label: "Revenue" | "Expenses", value: number) => {
    const perMonthTarget = value / visibleTargetMonths.length;
    for (const month of visibleTargetMonths) {
      setTarget(month, label === "Revenue" ? { revenue: perMonthTarget } : { expenses: perMonthTarget });
    }
  };

  const chartData = months.map((m) => ({
    month: friendlyMonth(m),
    Revenue: monthly[m].rev,
    Expenses: monthly[m].exp,
  }));
  const profitData = months.map((m) => ({
    month: friendlyMonth(m),
    Profit: monthly[m].rev - monthly[m].exp,
  }));

  // Customer breakdown
  const customerRev: Record<string, number> = {};
  for (const t of filtered.filter((t) => t.type === "Revenue")) {
    if (t.customer) customerRev[t.customer] = (customerRev[t.customer] ?? 0) + t.amount;
  }
  const customers = Object.entries(customerRev).sort((a,b)=>b[1]-a[1]).slice(0,10);

  return (
    <Layout
      title="Financial Analysis"
      subtitle={`Auto-aggregated from Daily Log · ${periodLabel(period)}`}
    >
      {loading && <div className="text-center py-8 text-blue-mid text-sm">Loading…</div>}
      {error   && <div className="alert red" style={{ marginBottom: "12px" }}>{error}</div>}

      {/* Period Filter */}
      <PeriodFilter value={period} onChange={setPeriod} transactions={transactions} showAllOption />

      {/* ── Actual vs Forecast vs Target ─────────────────────────── */}
      <div className="box mb-16">
        <div className="box-title">
          <span>Actual vs Forecast vs Target</span>
          <span style={{ fontSize: "10px", fontWeight: 500, color: "var(--muted)" }}>
            Click any Target cell to edit
          </span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Metric</th>
                <th>Actual</th>
                <th>Forecast (next mo.)</th>
                <th>Target</th>
                <th>Variance (Act−Tgt)</th>
                <th>Forecast Gap (Fcst−Tgt)</th>
                <th style={{ textAlign: "center" }}>Signal</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: "Revenue",  actual: totalRev,    fcst: forecastRev,    tgt: targetRev,    type: "rev"  },
                { label: "Expenses", actual: totalExp,    fcst: forecastExp,    tgt: targetExp,    type: "exp"  },
                { label: "Profit",   actual: totalProfit, fcst: forecastProfit, tgt: targetProfit, type: "profit" },
              ].map((row) => {
                const variance    = row.actual - row.tgt;
                const fcstGap     = row.fcst - row.tgt;
                const signal      = getSignal(row.actual, row.tgt);
                
                let actualColor = "var(--text)";
                if (row.type === "rev") actualColor = "var(--green)";
                else if (row.type === "exp") actualColor = "var(--red)";
                else if (row.type === "profit") actualColor = "var(--navy)";

                let varColor = "var(--text)";
                if (row.type === "rev" || row.type === "profit") varColor = variance >= 0 ? "var(--green)" : "var(--red)";
                else if (row.type === "exp") varColor = variance <= 0 ? "var(--green)" : "var(--red)"; // Lower expense is good

                let gapColor = "var(--text)";
                if (row.type === "rev" || row.type === "profit") gapColor = fcstGap >= 0 ? "var(--green)" : "var(--red)";
                else if (row.type === "exp") gapColor = fcstGap <= 0 ? "var(--green)" : "var(--red)";

                return (
                  <tr key={row.label}>
                    <td className="fw-bold">{row.label}</td>
                    <td className="fw-bold" style={{ color: actualColor }}>
                      {formatCurrency(row.actual)}
                    </td>
                    <td className="fw-bold" style={{ color: "var(--navy)" }}>{formatCurrency(row.fcst)}</td>
                    <td>
                      {row.label !== "Profit" ? (
                        <EditableTargetCell
                          value={row.label === "Revenue" ? targetRev : targetExp}
                          onSave={(v) => savePeriodTarget(row.label as "Revenue" | "Expenses", v)}
                        />
                      ) : (
                        <span className="fw-bold" style={{ color: "var(--navy)" }}>{formatCurrency(targetProfit)}</span>
                      )}
                    </td>
                    <td className="fw-bold" style={{ color: varColor }}>
                      {variance >= 0 ? "+" : ""}{formatCurrency(variance)}
                    </td>
                    <td className="fw-bold" style={{ color: gapColor }}>
                      {fcstGap >= 0 ? "+" : ""}{formatCurrency(fcstGap)}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span className={`tag ${signal}`}>
                        {SIGNAL_LABEL[signal]} Target
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Charts Row ───────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>
        <div className="box">
          <div className="box-title">Revenue & Expense Trend</div>
          <div style={{ padding: "16px" }}>
            {chartData.length === 0 ? (
              <div className="empty" style={{ height: "250px" }}>No data for period</div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 6 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2eaf3" />
                  <XAxis dataKey="month" stroke="#5a718a" style={{ fontSize: 11 }} />
                  <YAxis stroke="#5a718a" style={{ fontSize: 11 }} tickFormatter={formatCurrency} />
                  <Tooltip formatter={(v) => formatCurrency(v as number)} contentStyle={{ background: "#fff", border: "1px solid #e2eaf3" }} />
                  <Legend />
                  <Bar dataKey="Revenue" fill="#2E7D32" radius={4} />
                  <Bar dataKey="Expenses" fill="#C62828" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="box">
          <div className="box-title">Profit Trend</div>
          <div style={{ padding: "16px" }}>
            {profitData.length === 0 ? (
              <div className="empty" style={{ height: "250px" }}>No data for period</div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={profitData} margin={{ top: 8, right: 12, left: 0, bottom: 6 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2eaf3" />
                  <XAxis dataKey="month" stroke="#5a718a" style={{ fontSize: 11 }} />
                  <YAxis stroke="#5a718a" style={{ fontSize: 11 }} tickFormatter={formatCurrency} />
                  <Tooltip formatter={(v) => formatCurrency(v as number)} contentStyle={{ background: "#fff", border: "1px solid #e2eaf3" }} />
                  <Line type="monotone" dataKey="Profit" stroke="#1F3A5F" strokeWidth={2} dot={{ fill: "#1F3A5F" }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* ── Monthly Performance Table ─────────────────────────────── */}
      <div className="box mb-16">
        <div className="box-title">Monthly Performance Table</div>
        {months.length === 0 ? (
          <div className="empty" style={{ padding: "40px" }}>No transactions for selected period</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Revenue</th>
                  <th>Expenses</th>
                  <th>Net Profit</th>
                  <th>Margin</th>
                  <th>Fixed Cost</th>
                  <th>Variable Cost</th>
                  <th style={{ textAlign: "center" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {months.map((m) => {
                  const row = monthly[m];
                  const net = row.rev - row.exp;
                  const margin = row.rev > 0 ? net / row.rev : 0;
                  return (
                    <tr key={m}>
                      <td className="fw-bold">{friendlyMonth(m)}</td>
                      <td className="fw-bold" style={{ color: "var(--green)" }}>{formatCurrency(row.rev)}</td>
                      <td className="fw-bold" style={{ color: "var(--red)" }}>{formatCurrency(row.exp)}</td>
                      <td className="fw-bold" style={{ color: "var(--navy)" }}>{formatCurrency(net)}</td>
                      <td>{formatPercent(margin)}</td>
                      <td>{formatCurrency(row.fixed)}</td>
                      <td>{formatCurrency(row.variable)}</td>
                      <td style={{ textAlign: "center" }}>
                        <span className={`tag ${net >= 0 ? "green" : "red"}`}>
                          {net >= 0 ? "Profitable" : "Loss"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Top Customers ─────────────────────────────────────────── */}
      <div className="box">
        <div className="box-title">Top Customers by Revenue</div>
        {customers.length === 0 ? (
          <div className="empty" style={{ padding: "40px" }}>No customer revenue data for period</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Revenue</th>
                  <th>% Share</th>
                </tr>
              </thead>
              <tbody>
                {customers.map(([name, rev]) => (
                  <tr key={name}>
                    <td className="fw-bold">{name}</td>
                    <td className="fw-bold" style={{ color: "var(--green)" }}>{formatCurrency(rev)}</td>
                    <td>{totalRev > 0 ? formatPercent(rev / totalRev) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}


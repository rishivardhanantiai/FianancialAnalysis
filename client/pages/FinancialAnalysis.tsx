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
      {error   && <div className="mb-4 px-3 py-2 bg-danger-bg text-danger text-xs rounded-lg">{error}</div>}

      {/* Period Filter */}
      <PeriodFilter value={period} onChange={setPeriod} transactions={transactions} showAllOption />

      {/* ── Actual vs Forecast vs Target ─────────────────────────── */}
      <div className="bg-white border border-blue-pale rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold text-navy uppercase tracking-wider">
            Actual vs Forecast vs Target
          </h3>
          <span className="text-xs text-blue-mid">Click any Target cell to edit</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-blue-pale border-b border-blue-pale">
                <th className="px-4 py-2 text-left font-bold text-navy">Metric</th>
                <th className="px-4 py-2 text-left font-bold text-navy">Actual</th>
                <th className="px-4 py-2 text-left font-bold text-navy">Forecast (next mo.)</th>
                <th className="px-4 py-2 text-left font-bold text-navy">Target</th>
                <th className="px-4 py-2 text-left font-bold text-navy">Variance (Act−Tgt)</th>
                <th className="px-4 py-2 text-left font-bold text-navy">Forecast Gap (Fcst−Tgt)</th>
                <th className="px-4 py-2 text-left font-bold text-navy">Signal</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: "Revenue",  actual: totalRev,    fcst: forecastRev,    tgt: targetRev,    isRev: true  },
                { label: "Expenses", actual: totalExp,    fcst: forecastExp,    tgt: targetExp,    isRev: false },
                { label: "Profit",   actual: totalProfit, fcst: forecastProfit, tgt: targetProfit, isRev: true  },
              ].map((row) => {
                const variance    = row.actual - row.tgt;
                const fcstGap     = row.fcst - row.tgt;
                const signal      = getSignal(row.actual, row.tgt);
                return (
                  <tr key={row.label} className="border-b border-blue-pale hover:bg-blue-pale/20">
                    <td className="px-4 py-3 font-bold text-navy">{row.label}</td>
                    <td className="px-4 py-3 font-bold" style={{ color: row.actual >= 0 ? "#2E7D32" : "#C62828" }}>
                      {formatCurrency(row.actual)}
                    </td>
                    <td className="px-4 py-3 text-blue-mid font-semibold">{formatCurrency(row.fcst)}</td>
                    <td className="px-4 py-3">
                      {row.label !== "Profit" ? (
                        <EditableTargetCell
                          value={row.label === "Revenue" ? targetRev : targetExp}
                          onSave={(v) =>
                            setTarget(currentMonth, row.label === "Revenue" ? { revenue: v } : { expenses: v })
                          }
                        />
                      ) : (
                        <span className="text-navy font-bold">{formatCurrency(targetProfit)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-bold" style={{ color: variance >= 0 ? "#2E7D32" : "#C62828" }}>
                      {variance >= 0 ? "+" : ""}{formatCurrency(variance)}
                    </td>
                    <td className="px-4 py-3 font-bold" style={{ color: fcstGap >= 0 ? "#2E7D32" : "#C62828" }}>
                      {fcstGap >= 0 ? "+" : ""}{formatCurrency(fcstGap)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${SIGNAL_STYLE[signal]}`}>
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
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-white border border-blue-pale rounded-lg p-4">
          <h3 className="text-xs font-bold text-navy uppercase tracking-wider mb-4">Revenue & Expense Trend</h3>
          {chartData.length === 0 ? (
            <div className="flex items-center justify-center h-[250px] text-blue-mid text-xs">No data for period</div>
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

        <div className="bg-white border border-blue-pale rounded-lg p-4">
          <h3 className="text-xs font-bold text-navy uppercase tracking-wider mb-4">Profit Trend</h3>
          {profitData.length === 0 ? (
            <div className="flex items-center justify-center h-[250px] text-blue-mid text-xs">No data for period</div>
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

      {/* ── Monthly Performance Table ─────────────────────────────── */}
      <div className="bg-white border border-blue-pale rounded-lg p-4 mb-6">
        <h3 className="text-xs font-bold text-navy uppercase tracking-wider mb-4">Monthly Performance Table</h3>
        {months.length === 0 ? (
          <p className="text-blue-mid text-xs py-4 text-center">No transactions for selected period</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-blue-pale border-b border-blue-pale">
                  <th className="px-4 py-2 text-left font-bold text-navy">Month</th>
                  <th className="px-4 py-2 text-left font-bold text-navy">Revenue</th>
                  <th className="px-4 py-2 text-left font-bold text-navy">Expenses</th>
                  <th className="px-4 py-2 text-left font-bold text-navy">Net Profit</th>
                  <th className="px-4 py-2 text-left font-bold text-navy">Margin</th>
                  <th className="px-4 py-2 text-left font-bold text-navy">Fixed Cost</th>
                  <th className="px-4 py-2 text-left font-bold text-navy">Variable Cost</th>
                  <th className="px-4 py-2 text-left font-bold text-navy">Status</th>
                </tr>
              </thead>
              <tbody>
                {months.map((m) => {
                  const row = monthly[m];
                  const net = row.rev - row.exp;
                  const margin = row.rev > 0 ? net / row.rev : 0;
                  return (
                    <tr key={m} className="border-b border-blue-pale hover:bg-blue-pale/20 transition">
                      <td className="px-4 py-2 font-bold">{friendlyMonth(m)}</td>
                      <td className="px-4 py-2 text-success font-bold">{formatCurrency(row.rev)}</td>
                      <td className="px-4 py-2 text-danger">{formatCurrency(row.exp)}</td>
                      <td className="px-4 py-2 font-bold" style={{ color: net >= 0 ? "#2E7D32" : "#C62828" }}>{formatCurrency(net)}</td>
                      <td className="px-4 py-2">{formatPercent(margin)}</td>
                      <td className="px-4 py-2">{formatCurrency(row.fixed)}</td>
                      <td className="px-4 py-2">{formatCurrency(row.variable)}</td>
                      <td className="px-4 py-2">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${net >= 0 ? "bg-success-bg text-success" : "bg-danger-bg text-danger"}`}>
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
      <div className="bg-white border border-blue-pale rounded-lg p-4">
        <h3 className="text-xs font-bold text-navy uppercase tracking-wider mb-4">Top Customers by Revenue</h3>
        {customers.length === 0 ? (
          <p className="text-blue-mid text-xs py-4 text-center">No customer revenue data for period</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-blue-pale border-b border-blue-pale">
                  <th className="px-4 py-2 text-left font-bold text-navy">Customer</th>
                  <th className="px-4 py-2 text-left font-bold text-navy">Revenue</th>
                  <th className="px-4 py-2 text-left font-bold text-navy">% Share</th>
                </tr>
              </thead>
              <tbody>
                {customers.map(([name, rev]) => (
                  <tr key={name} className="border-b border-blue-pale hover:bg-blue-pale/20">
                    <td className="px-4 py-2 font-bold">{name}</td>
                    <td className="px-4 py-2 text-success font-bold">{formatCurrency(rev)}</td>
                    <td className="px-4 py-2">{totalRev > 0 ? formatPercent(rev / totalRev) : "—"}</td>
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

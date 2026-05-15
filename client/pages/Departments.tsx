import { useState, useMemo } from "react";
import Layout from "@/components/Layout";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { useTransactions } from "@/hooks/useTransactions";
import { useDeptAllocations } from "@/hooks/useDeptAllocations";
import { getNextMonthForecast, DEFAULT_EXPENSE_ALPHAS } from "@/lib/forecastEngine";
import type { TransactionRecord } from "@shared/api";

function formatCurrency(n: number) {
  if (n >= 100000) return "₹" + (n / 100000).toFixed(2) + "L";
  if (n >= 1000)   return "₹" + (n / 1000).toFixed(1) + "K";
  return "₹" + Math.round(n).toLocaleString("en-IN");
}
function formatPercent(v: number) { return (v * 100).toFixed(1) + "%"; }

const ALL_DEPTS = ["Marketing","Sales","Finance","HR","Tech","Ops","Management"];

function computeDeptData(
  transactions: TransactionRecord[],
  allocations: Record<string, number>,
  budgetBase: number
) {
  const deptSpend: Record<string, number> = {};
  for (const t of transactions.filter((t) => t.type === "Expense")) {
    const d = t.dept || "Other";
    deptSpend[d] = (deptSpend[d] ?? 0) + t.amount;
  }

  return ALL_DEPTS.map((name) => {
    const alloc       = allocations[name] ?? 0;
    const budget      = budgetBase * alloc;
    const actual      = deptSpend[name] ?? 0;
    const variance    = budget - actual;
    const utilization = budget > 0 ? actual / budget : 0;
    let status = "On Track"; let statusVariant = "green";
    if (utilization > 1)         { status = "⚠ Overspend";  statusVariant = "red"; }
    else if (utilization >= 0.8) { status = "▲ Near Limit"; statusVariant = "warning"; }
    return { name, alloc, budget, actual, variance, utilization, status, statusVariant };
  });
}

export default function Departments() {
  const { transactions, loading, error } = useTransactions();
  const { allocations, update, reset, totalPct } = useDeptAllocations();
  const [useForecasted, setUseForecasted] = useState(true);

  const forecastedExpense = useMemo(
    () => getNextMonthForecast(transactions, "Expense", DEFAULT_EXPENSE_ALPHAS),
    [transactions]
  );
  const totalRevenue = useMemo(
    () => transactions.filter((t) => t.type === "Revenue").reduce((s, t) => s + t.amount, 0),
    [transactions]
  );
  const totalActualExp = useMemo(
    () => transactions.filter((t) => t.type === "Expense").reduce((s, t) => s + t.amount, 0),
    [transactions]
  );

  const budgetBase = useForecasted ? forecastedExpense : (totalRevenue || totalActualExp || 1);

  const depts = useMemo(
    () => computeDeptData(transactions, allocations, budgetBase),
    [transactions, allocations, budgetBase]
  );

  const totalSpend = depts.reduce((s, d) => s + d.actual, 0);
  const overcount  = depts.filter((d) => d.utilization > 1).length;
  const nearcount  = depts.filter((d) => d.utilization >= 0.8 && d.utilization <= 1).length;
  const okcount    = depts.filter((d) => d.utilization < 0.8).length;

  const pctOff = Math.abs(totalPct - 1.0) > 0.005;

  const chartData = depts.map((d) => ({ name: d.name, "Actual Spend": d.actual, Budget: d.budget }));

  return (
    <Layout
      title="Department Tracker"
      subtitle="Budget vs Actual · Dynamic allocation · Auto from Daily Log"
    >
      {loading && <div className="text-center py-8 text-blue-mid text-sm">Loading…</div>}
      {error   && <div className="mb-4 px-3 py-2 bg-danger-bg text-danger text-xs rounded-lg">{error}</div>}

      {/* Budget Base Toggle */}
      <div className="bg-white border border-blue-pale rounded-lg p-4 mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs font-bold text-navy uppercase tracking-wider mb-1">Budget Base</p>
          <p className="text-xs text-blue-mid">
            {useForecasted
              ? `Forecasted Expense (next month): ${formatCurrency(forecastedExpense)}`
              : `Actual Total Revenue: ${formatCurrency(totalRevenue)}`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setUseForecasted(true)}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${useForecasted ? "bg-navy text-white" : "bg-blue-pale text-navy hover:bg-blue-mid hover:text-white"}`}
          >
            Forecasted Expense
          </button>
          <button
            onClick={() => setUseForecasted(false)}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${!useForecasted ? "bg-navy text-white" : "bg-blue-pale text-navy hover:bg-blue-mid hover:text-white"}`}
          >
            Actual Revenue
          </button>
          <button
            onClick={reset}
            className="px-3 py-1.5 text-xs font-bold rounded-lg border border-blue-pale text-blue-mid hover:bg-blue-pale transition"
          >
            Reset Defaults
          </button>
        </div>
      </div>

      {/* Allocation warning */}
      {pctOff && (
        <div className="mb-4 px-4 py-3 bg-warning-bg border border-warning-light text-warning text-xs rounded-lg font-semibold">
          ⚠ Allocations sum to {formatPercent(totalPct)} — adjust to reach 100%
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-blue-pale rounded-lg p-4">
          <div className="text-xs font-bold text-blue-mid uppercase tracking-wider mb-2">Overspending</div>
          <div className="text-2xl font-bold text-danger">{overcount}</div>
          <div className="text-xs text-blue-mid">Departments over budget</div>
        </div>
        <div className="bg-white border border-blue-pale rounded-lg p-4">
          <div className="text-xs font-bold text-blue-mid uppercase tracking-wider mb-2">Near Limit</div>
          <div className="text-2xl font-bold text-warning">{nearcount}</div>
          <div className="text-xs text-blue-mid">80–100% utilized</div>
        </div>
        <div className="bg-white border border-blue-pale rounded-lg p-4">
          <div className="text-xs font-bold text-blue-mid uppercase tracking-wider mb-2">On Track</div>
          <div className="text-2xl font-bold text-success">{okcount}</div>
          <div className="text-xs text-blue-mid">Under 80% utilized</div>
        </div>
        <div className="bg-white border border-blue-pale rounded-lg p-4">
          <div className="text-xs font-bold text-blue-mid uppercase tracking-wider mb-2">Forecast Base</div>
          <div className="text-2xl font-bold text-navy">{formatCurrency(budgetBase)}</div>
          <div className="text-xs text-blue-mid">{useForecasted ? "Next mo. forecast" : "Total revenue"}</div>
        </div>
      </div>

      {/* Budget vs Actual Table with editable allocation */}
      <div className="bg-white border border-blue-pale rounded-lg p-6 mb-6">
        <h3 className="text-xs font-bold text-navy uppercase tracking-wider mb-1">
          Department Budget vs Actual
        </h3>
        <p className="text-xs text-blue-mid mb-4">Edit the Alloc % column to redistribute budget dynamically.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-blue-pale border-b border-blue-pale">
                <th className="px-4 py-2 text-left font-bold text-navy">Department</th>
                <th className="px-4 py-2 text-left font-bold text-navy">Alloc %</th>
                <th className="px-4 py-2 text-left font-bold text-navy">Budget</th>
                <th className="px-4 py-2 text-left font-bold text-navy">Actual Spend</th>
                <th className="px-4 py-2 text-left font-bold text-navy">Variance</th>
                <th className="px-4 py-2 text-left font-bold text-navy">Utilized %</th>
                <th className="px-4 py-2 text-left font-bold text-navy">Status</th>
              </tr>
            </thead>
            <tbody>
              {depts.map((dept) => (
                <tr key={dept.name} className="border-b border-blue-pale hover:bg-blue-pale/20 transition">
                  <td className="px-4 py-2 font-bold">{dept.name}</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        value={Math.round(dept.alloc * 100)}
                        onChange={(e) => update(dept.name, parseFloat(e.target.value) || 0)}
                        className="w-16 px-2 py-1 border-2 border-blue-pale rounded text-xs font-bold text-center focus:outline-none focus:border-navy"
                      />
                      <span className="text-blue-mid">%</span>
                    </div>
                  </td>
                  <td className="px-4 py-2">{formatCurrency(dept.budget)}</td>
                  <td className="px-4 py-2 font-bold">{formatCurrency(dept.actual)}</td>
                  <td className="px-4 py-2 font-bold" style={{ color: dept.variance >= 0 ? "#2E7D32" : "#C62828" }}>
                    {dept.variance >= 0 ? "+" : ""}{formatCurrency(dept.variance)}
                  </td>
                  <td className="px-4 py-2">
                    {formatPercent(dept.utilization)}
                    <div className="h-1.5 bg-blue-pale rounded-full overflow-hidden mt-1">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: Math.min(dept.utilization, 1) * 100 + "%",
                          backgroundColor: dept.utilization > 1 ? "#C62828" : dept.utilization >= 0.8 ? "#E65100" : "#2E7D32",
                        }}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                      dept.statusVariant === "red"     ? "bg-danger-bg text-danger"
                    : dept.statusVariant === "warning" ? "bg-warning-bg text-warning"
                    :                                    "bg-success-bg text-success"
                    }`}>
                      {dept.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-blue-pale border-t-2 border-blue-mid">
                <td className="px-4 py-2 font-bold text-navy">TOTAL</td>
                <td className="px-4 py-2 font-bold" style={{ color: pctOff ? "#C62828" : "#2E7D32" }}>
                  {formatPercent(totalPct)}
                </td>
                <td className="px-4 py-2 font-bold">{formatCurrency(depts.reduce((s,d)=>s+d.budget,0))}</td>
                <td className="px-4 py-2 font-bold">{formatCurrency(totalSpend)}</td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white border border-blue-pale rounded-lg p-6">
        <h3 className="text-xs font-bold text-navy uppercase tracking-wider mb-4">Budget vs Actual Spend</h3>
        {totalSpend === 0 ? (
          <div className="flex items-center justify-center h-[300px] text-blue-mid text-xs">
            No expense transactions yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 6 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2eaf3" />
              <XAxis dataKey="name" stroke="#5a718a" style={{ fontSize: 12 }} />
              <YAxis stroke="#5a718a" style={{ fontSize: 12 }} tickFormatter={formatCurrency} />
              <Tooltip formatter={(v) => formatCurrency(v as number)} contentStyle={{ background: "#fff", border: "1px solid #e2eaf3" }} />
              <Legend />
              <Bar dataKey="Budget" fill="#1F3A5F" radius={4} opacity={0.5} />
              <Bar dataKey="Actual Spend" fill="#C62828" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Layout>
  );
}

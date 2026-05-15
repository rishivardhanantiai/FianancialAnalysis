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
      {error   && <div className="alert red" style={{ marginBottom: "12px" }}>{error}</div>}

      {/* Budget Base Toggle */}
      <div className="box mb-16" style={{ padding: "16px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--navy)", textTransform: "uppercase", marginBottom: "4px" }}>Budget Base</p>
          <p style={{ fontSize: "11px", color: "var(--muted)" }}>
            {useForecasted
              ? `Forecasted Expense (next month): ${formatCurrency(forecastedExpense)}`
              : `Actual Total Revenue: ${formatCurrency(totalRevenue)}`}
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => setUseForecasted(true)}
            className={`btn-ui ${useForecasted ? "btn-primary" : "btn-outline"}`}
            style={{ fontSize: "11px", padding: "6px 12px" }}
          >
            Forecasted Expense
          </button>
          <button
            onClick={() => setUseForecasted(false)}
            className={`btn-ui ${!useForecasted ? "btn-primary" : "btn-outline"}`}
            style={{ fontSize: "11px", padding: "6px 12px" }}
          >
            Actual Revenue
          </button>
          <button
            onClick={reset}
            className="btn-ui btn-outline"
            style={{ fontSize: "11px", padding: "6px 12px" }}
          >
            Reset Defaults
          </button>
        </div>
      </div>

      {/* Allocation warning */}
      {pctOff && (
        <div className="alert red" style={{ marginBottom: "16px" }}>
          ⚠ Allocations sum to {formatPercent(totalPct)} — adjust to reach 100%
        </div>
      )}

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>
        <div className="box" style={{ padding: "16px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Overspending</div>
          <div style={{ fontSize: "24px", fontWeight: 800, color: "var(--red)" }}>{overcount}</div>
          <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "4px" }}>Departments over budget</div>
        </div>
        <div className="box" style={{ padding: "16px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Near Limit</div>
          <div style={{ fontSize: "24px", fontWeight: 800, color: "var(--orange)" }}>{nearcount}</div>
          <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "4px" }}>80–100% utilized</div>
        </div>
        <div className="box" style={{ padding: "16px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>On Track</div>
          <div style={{ fontSize: "24px", fontWeight: 800, color: "var(--green)" }}>{okcount}</div>
          <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "4px" }}>Under 80% utilized</div>
        </div>
        <div className="box" style={{ padding: "16px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Forecast Base</div>
          <div style={{ fontSize: "24px", fontWeight: 800, color: "var(--navy)" }}>{formatCurrency(budgetBase)}</div>
          <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "4px" }}>{useForecasted ? "Next mo. forecast" : "Total revenue"}</div>
        </div>
      </div>

      {/* Budget vs Actual Table with editable allocation */}
      <div className="box mb-16">
        <div className="box-title">
          <span>Department Budget vs Actual</span>
          <span style={{ fontSize: "10px", fontWeight: 500, color: "var(--muted)", marginLeft: "8px" }}>
            Edit Alloc % to redistribute budget
          </span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Department</th>
                <th>Alloc %</th>
                <th>Budget</th>
                <th>Actual Spend</th>
                <th>Variance</th>
                <th>Utilized %</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {depts.map((dept) => (
                <tr key={dept.name}>
                  <td className="fw-bold">{dept.name}</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        value={Math.round(dept.alloc * 100)}
                        onChange={(e) => update(dept.name, parseFloat(e.target.value) || 0)}
                        style={{
                          width: "50px",
                          padding: "4px",
                          border: "1.5px solid var(--f-border)",
                          borderRadius: "4px",
                          textAlign: "center",
                          fontSize: "11px",
                          fontWeight: 700,
                        }}
                      />
                      <span style={{ color: "var(--muted)", fontSize: "11px" }}>%</span>
                    </div>
                  </td>
                  <td>{formatCurrency(dept.budget)}</td>
                  <td className="fw-bold">{formatCurrency(dept.actual)}</td>
                  <td className="fw-bold" style={{ color: dept.variance >= 0 ? "var(--green)" : "var(--red)" }}>
                    {dept.variance >= 0 ? "+" : ""}{formatCurrency(dept.variance)}
                  </td>
                  <td>
                    <div style={{ fontSize: "11px", marginBottom: "4px" }}>{formatPercent(dept.utilization)}</div>
                    <div className="h-1.5 bg-blue-pale rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: Math.min(dept.utilization, 1) * 100 + "%",
                          backgroundColor: dept.utilization > 1 ? "var(--red)" : dept.utilization >= 0.8 ? "var(--orange)" : "var(--green)",
                        }}
                      />
                    </div>
                  </td>
                  <td>
                    <span className={`tag ${dept.statusVariant}`}>
                      {dept.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: "var(--blue-pale)", fontWeight: 800 }}>
                <td style={{ color: "var(--navy)" }}>TOTAL</td>
                <td style={{ color: pctOff ? "var(--red)" : "var(--green)" }}>
                  {formatPercent(totalPct)}
                </td>
                <td>{formatCurrency(depts.reduce((s,d)=>s+d.budget,0))}</td>
                <td>{formatCurrency(totalSpend)}</td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Chart */}
      <div className="box">
        <div className="box-title">Budget vs Actual Spend</div>
        <div style={{ padding: "16px" }}>
          {totalSpend === 0 ? (
            <div className="empty" style={{ height: "300px" }}>No expense transactions yet</div>
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
      </div>
    </Layout>
  );
}


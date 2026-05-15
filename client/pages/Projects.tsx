import { useState, useMemo } from "react";
import Layout from "@/components/Layout";
import PeriodFilter from "@/components/PeriodFilter";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { useTransactions } from "@/hooks/useTransactions";
import { filterByPeriod, getDefaultPeriod, periodLabel } from "@/lib/dateFilters";
import type { FilterPeriod } from "@/lib/dateFilters";
import type { TransactionRecord } from "@shared/api";

function formatCurrency(amount: number): string {
  if (amount >= 100000) return "₹" + (amount / 100000).toFixed(2) + "L";
  if (amount >= 1000)   return "₹" + (amount / 1000).toFixed(1) + "K";
  return "₹" + Math.round(amount).toLocaleString("en-IN");
}

function formatPercent(value: number): string {
  return (value * 100).toFixed(1) + "%";
}

interface ProjectRow {
  name: string;
  revenue: number;
  expenses: number;
  profit: number;
  margin: number;
  txns: number;
}

function computeProjectData(transactions: TransactionRecord[]): ProjectRow[] {
  const map: Record<string, { revenue: number; expenses: number; txns: number }> = {};

  for (const t of transactions) {
    const key = t.project?.trim() || "Unassigned";
    if (!map[key]) map[key] = { revenue: 0, expenses: 0, txns: 0 };
    if (t.type === "Revenue") map[key].revenue += t.amount;
    else map[key].expenses += t.amount;
    map[key].txns++;
  }

  return Object.entries(map)
    .map(([name, d]) => ({
      name,
      revenue: d.revenue,
      expenses: d.expenses,
      profit: d.revenue - d.expenses,
      margin: d.revenue > 0 ? (d.revenue - d.expenses) / d.revenue : 0,
      txns: d.txns,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

export default function Projects() {
  const { transactions, loading, error } = useTransactions();
  const [period, setPeriod] = useState<FilterPeriod>(getDefaultPeriod());

  const filtered = useMemo(
    () => filterByPeriod(transactions, period),
    [transactions, period]
  );

  const projects = useMemo(() => computeProjectData(filtered), [filtered]);

  const totalRevenue  = projects.reduce((s, p) => s + p.revenue, 0);
  const totalExpenses = projects.reduce((s, p) => s + p.expenses, 0);
  const totalProfit   = totalRevenue - totalExpenses;
  const overallMargin = totalRevenue > 0 ? totalProfit / totalRevenue : 0;

  const chartData = projects
    .filter((p) => p.revenue > 0 || p.expenses > 0)
    .map((p) => ({ name: p.name, Revenue: p.revenue, Expenses: p.expenses }));

  return (
    <Layout
      title="Project Tracker"
      subtitle={`Auto P&L per project · ${periodLabel(period)}`}
    >
      {/* Period Filter */}
      <PeriodFilter
        value={period}
        onChange={setPeriod}
        transactions={transactions}
        showAllOption
      />

      {loading && (
        <div className="text-center py-8 text-blue-mid text-sm">Loading project data…</div>
      )}
      {error && (
        <div className="alert red" style={{ marginBottom: "12px" }}>{error}</div>
      )}

      {/* KPI Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>
        <div className="box" style={{ padding: "16px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Total Revenue</div>
          <div style={{ fontSize: "24px", fontWeight: 800, color: "var(--green)" }}>{formatCurrency(totalRevenue)}</div>
          <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "4px" }}>{projects.length} project(s)</div>
        </div>
        <div className="box" style={{ padding: "16px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Total Expenses</div>
          <div style={{ fontSize: "24px", fontWeight: 800, color: "var(--red)" }}>{formatCurrency(totalExpenses)}</div>
        </div>
        <div className="box" style={{ padding: "16px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Net Profit</div>
          <div style={{ fontSize: "24px", fontWeight: 800, color: totalProfit >= 0 ? "var(--green)" : "var(--red)" }}>
            {formatCurrency(totalProfit)}
          </div>
        </div>
        <div className="box" style={{ padding: "16px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Overall Margin</div>
          <div style={{ fontSize: "24px", fontWeight: 800, color: overallMargin >= 0 ? "var(--navy)" : "var(--red)" }}>
            {totalRevenue > 0 ? formatPercent(overallMargin) : "—"}
          </div>
        </div>
      </div>

      {/* Project P&L Table */}
      <div className="box mb-16">
        <div className="box-title">
          <span>Project P&L Summary</span>
          <span style={{ fontSize: "10px", fontWeight: 500, color: "var(--muted)" }}>— {periodLabel(period)}</span>
        </div>
        {projects.length === 0 ? (
          <div className="empty" style={{ padding: "40px" }}>No transactions found for the selected period.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Revenue</th>
                  <th>Expenses</th>
                  <th>Gross Profit</th>
                  <th>Margin %</th>
                  <th>Transactions</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((proj) => {
                  const statusVariant =
                    proj.profit > 0 ? "green" : proj.revenue === 0 ? "grey" : "red";
                  const statusText =
                    proj.profit > 0 ? "✓ Profitable" : proj.revenue === 0 ? "Cost Only" : "⚠ Loss";

                  return (
                    <tr key={proj.name}>
                      <td className="fw-bold">{proj.name}</td>
                      <td className="fw-bold" style={{ color: "var(--green)" }}>
                        {proj.revenue > 0 ? formatCurrency(proj.revenue) : "—"}
                      </td>
                      <td className="fw-bold" style={{ color: "var(--red)" }}>
                        {proj.expenses > 0 ? formatCurrency(proj.expenses) : "—"}
                      </td>
                      <td
                        className="fw-bold"
                        style={{ color: proj.profit >= 0 ? "var(--green)" : "var(--red)" }}
                      >
                        {proj.revenue > 0 ? formatCurrency(proj.profit) : "—"}
                      </td>
                      <td>
                        {proj.revenue > 0 ? formatPercent(proj.margin) : "—"}
                      </td>
                      <td>{proj.txns} txns</td>
                      <td>
                        <span className={`tag ${statusVariant}`}>
                          {statusText}
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

      {/* Chart */}
      <div className="box">
        <div className="box-title">Revenue vs Expenses by Project</div>
        <div style={{ padding: "16px" }}>
          {chartData.length === 0 ? (
            <div className="empty" style={{ height: "300px" }}>No data for selected period</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 6 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2eaf3" />
                <XAxis dataKey="name" stroke="#5a718a" style={{ fontSize: 12 }} />
                <YAxis stroke="#5a718a" style={{ fontSize: 12 }} tickFormatter={formatCurrency} />
                <Tooltip
                  formatter={(value) => formatCurrency(value as number)}
                  contentStyle={{ background: "#fff", border: "1px solid #e2eaf3" }}
                />
                <Legend />
                <Bar dataKey="Revenue" fill="#2E7D32" radius={4} />
                <Bar dataKey="Expenses" fill="#C62828" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </Layout>
  );
}


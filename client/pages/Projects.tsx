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
        <div className="mb-4 px-3 py-2 bg-danger-bg text-danger text-xs rounded-lg">{error}</div>
      )}

      {/* KPI Summary */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-blue-pale rounded-lg p-4">
          <div className="text-xs font-bold text-blue-mid uppercase tracking-wider mb-2">Total Revenue</div>
          <div className="text-2xl font-bold text-success">{formatCurrency(totalRevenue)}</div>
          <div className="text-xs text-blue-mid">{projects.length} project(s)</div>
        </div>
        <div className="bg-white border border-blue-pale rounded-lg p-4">
          <div className="text-xs font-bold text-blue-mid uppercase tracking-wider mb-2">Total Expenses</div>
          <div className="text-2xl font-bold text-danger">{formatCurrency(totalExpenses)}</div>
        </div>
        <div className="bg-white border border-blue-pale rounded-lg p-4">
          <div className="text-xs font-bold text-blue-mid uppercase tracking-wider mb-2">Net Profit</div>
          <div className={`text-2xl font-bold ${totalProfit >= 0 ? "text-success" : "text-danger"}`}>
            {formatCurrency(totalProfit)}
          </div>
        </div>
        <div className="bg-white border border-blue-pale rounded-lg p-4">
          <div className="text-xs font-bold text-blue-mid uppercase tracking-wider mb-2">Overall Margin</div>
          <div className={`text-2xl font-bold ${overallMargin >= 0 ? "text-navy" : "text-danger"}`}>
            {totalRevenue > 0 ? formatPercent(overallMargin) : "—"}
          </div>
        </div>
      </div>

      {/* Project P&L Table */}
      <div className="bg-white border border-blue-pale rounded-lg p-6 mb-6">
        <h3 className="text-xs font-bold text-navy uppercase tracking-wider mb-4">
          Project P&L Summary
          <span className="text-blue-mid font-normal ml-2">— {periodLabel(period)}</span>
        </h3>
        {projects.length === 0 ? (
          <p className="text-blue-mid text-xs py-8 text-center">
            No transactions found for the selected period.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-blue-pale border-b border-blue-pale">
                  <th className="px-4 py-2 text-left font-bold text-navy">Project</th>
                  <th className="px-4 py-2 text-left font-bold text-navy">Revenue</th>
                  <th className="px-4 py-2 text-left font-bold text-navy">Expenses</th>
                  <th className="px-4 py-2 text-left font-bold text-navy">Gross Profit</th>
                  <th className="px-4 py-2 text-left font-bold text-navy">Margin %</th>
                  <th className="px-4 py-2 text-left font-bold text-navy">Transactions</th>
                  <th className="px-4 py-2 text-left font-bold text-navy">Status</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((proj) => {
                  const statusVariant =
                    proj.profit > 0 ? "green" : proj.revenue === 0 ? "grey" : "red";
                  const statusText =
                    proj.profit > 0 ? "✓ Profitable" : proj.revenue === 0 ? "Cost Only" : "⚠ Loss";

                  return (
                    <tr
                      key={proj.name}
                      className="border-b border-blue-pale hover:bg-blue-pale/20 transition"
                    >
                      <td className="px-4 py-2 font-bold">{proj.name}</td>
                      <td className="px-4 py-2 text-success font-bold">
                        {proj.revenue > 0 ? formatCurrency(proj.revenue) : "—"}
                      </td>
                      <td className="px-4 py-2 text-danger">
                        {proj.expenses > 0 ? formatCurrency(proj.expenses) : "—"}
                      </td>
                      <td
                        className="px-4 py-2 font-bold"
                        style={{ color: proj.profit >= 0 ? "#2E7D32" : "#C62828" }}
                      >
                        {proj.revenue > 0 ? formatCurrency(proj.profit) : "—"}
                      </td>
                      <td className="px-4 py-2">
                        {proj.revenue > 0 ? formatPercent(proj.margin) : "—"}
                      </td>
                      <td className="px-4 py-2">{proj.txns} txns</td>
                      <td className="px-4 py-2">
                        <span
                          className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                            statusVariant === "green"
                              ? "bg-success-bg text-success"
                              : statusVariant === "grey"
                              ? "bg-gray-200 text-gray-700"
                              : "bg-danger-bg text-danger"
                          }`}
                        >
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
      <div className="bg-white border border-blue-pale rounded-lg p-6">
        <h3 className="text-xs font-bold text-navy uppercase tracking-wider mb-4">
          Revenue vs Expenses by Project
        </h3>
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-[300px] text-blue-mid text-xs">
            No data for selected period
          </div>
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
    </Layout>
  );
}

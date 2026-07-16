import { useMemo } from "react";
import Layout from "@/components/Layout";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useTransactions } from "@/hooks/useTransactions";
import type { TransactionRecord } from "@shared/api";

function formatCurrency(amount: number): string {
  if (amount >= 100000) {
    return "₹" + (amount / 100000).toFixed(2) + "L";
  } else if (amount >= 1000) {
    return "₹" + (amount / 1000).toFixed(1) + "K";
  }
  return "₹" + Math.round(amount).toLocaleString("en-IN");
}

function formatPercent(value: number): string {
  return (value * 100).toFixed(1) + "%";
}

function computeMetrics(transactions: TransactionRecord[]) {
  const revenue = transactions.filter((t) => t.type === "Revenue");
  const expenses = transactions.filter((t) => t.type === "Expense");

  const totalRev = revenue.reduce((s, t) => s + t.amount, 0);
  const totalExp = expenses.reduce((s, t) => s + t.amount, 0);
  const profit = totalRev - totalExp;
  const margin = totalRev > 0 ? profit / totalRev : 0;

  // Unique customers from revenue rows
  const uniqueCustomers = new Set(
    revenue.filter((t) => t.customer).map((t) => t.customer)
  );

  // CAC: total expenses / number of new customers
  const newCustomers = revenue.filter((t) => t.ctype === "New").length;
  const cac = newCustomers > 0 ? totalExp / newCustomers : 0;
  const ltv = uniqueCustomers.size > 0 ? totalRev / uniqueCustomers.size : 0;

  // Monthly breakdown: group by YYYY-MM
  const monthly: Record<string, { rev: number; exp: number }> = {};
  for (const t of transactions) {
    const month = t.date.slice(0, 7); // "YYYY-MM"
    if (!monthly[month]) monthly[month] = { rev: 0, exp: 0 };
    if (t.type === "Revenue") monthly[month].rev += t.amount;
    else monthly[month].exp += t.amount;
  }

  const months = Object.keys(monthly).sort();

  // Monthly burn = average monthly expense
  const monthCount = months.length || 1;
  const monthlyBurn = totalExp / monthCount;
  // Runway: assume ₹5L cash reserve as baseline
  const runway = monthlyBurn > 0 ? 500000 / monthlyBurn : 999;

  // Fixed vs Variable cost split from costt field
  const fixedCost = expenses
    .filter((t) => t.costt === "Fixed")
    .reduce((s, t) => s + t.amount, 0);
  const varCost = expenses
    .filter((t) => t.costt === "Variable")
    .reduce((s, t) => s + t.amount, 0);
  // Untagged expenses go into fixed by default
  const untaggedExp = totalExp - fixedCost - varCost;

  // Dept spend for pie chart
  const deptSpend: Record<string, number> = {};
  for (const t of expenses) {
    const d = t.dept || "Other";
    deptSpend[d] = (deptSpend[d] ?? 0) + t.amount;
  }

  return {
    totalRev,
    totalExp,
    profit,
    margin,
    cac,
    ltv,
    monthlyBurn,
    runway,
    fixedCost: fixedCost + untaggedExp,
    varCost,
    monthly,
    months,
    deptSpend,
  };
}

function KPICard({
  label,
  value,
  sub,
  icon,
  variant = "default",
}: {
  label: string;
  value: string;
  sub: string;
  icon: string;
  variant?: "default" | "success" | "danger" | "warning";
}) {
  const variantClasses = {
    default: "text-navy",
    success: "text-success",
    danger: "text-danger",
    warning: "text-warning",
  };

  return (
    <div className="bg-white border border-blue-pale rounded-lg p-4 hover:shadow-md transition">
      <div className="flex items-start justify-between mb-2">
        <label className="text-xs font-bold text-blue-mid uppercase tracking-wider">
          {label}
        </label>
        <span className="text-lg">{icon}</span>
      </div>
      <div className={`text-2xl font-bold ${variantClasses[variant]} mb-1`}>
        {value}
      </div>
      <div className="text-xs text-blue-mid">{sub}</div>
    </div>
  );
}

const DEPT_COLORS = [
  "#1F3A5F",
  "#C62828",
  "#E65100",
  "#2E7D32",
  "#6A1B9A",
  "#0277BD",
  "#4E342E",
];

export default function Dashboard() {
  const { transactions, loading, error } = useTransactions();

  const metrics = useMemo(() => computeMetrics(transactions), [transactions]);

  const chartData = metrics.months.map((month) => ({
    month: month.slice(5), // "MM"
    revenue: metrics.monthly[month].rev,
    expenses: metrics.monthly[month].exp,
  }));

  const deptChartData = Object.entries(metrics.deptSpend).map(([name, value]) => ({
    name,
    value,
  }));

  return (
    <Layout
      title="Financial Command Center"
      subtitle="All KPIs auto-calculated from Daily Log · ANTI AI Private Limited"
    >
      {/* Loading / Error */}
      {loading && (
        <div className="text-center py-8 text-blue-mid text-sm">
          Loading financial data…
        </div>
      )}
      {error && (
        <div className="mb-4 px-3 py-2 bg-danger-bg text-danger text-xs rounded-lg">
          {error}
        </div>
      )}

      {/* KPI Row 1 */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <KPICard
          label="Total Revenue"
          value={formatCurrency(metrics.totalRev)}
          sub="From all transactions"
          icon="💰"
          variant="success"
        />
        <KPICard
          label="Total Expenses"
          value={formatCurrency(metrics.totalExp)}
          sub="All departments"
          icon="💸"
          variant="danger"
        />
        <KPICard
          label="Net Profit"
          value={formatCurrency(metrics.profit)}
          sub="Revenue minus expenses"
          icon="📊"
          variant={metrics.profit >= 0 ? "success" : "danger"}
        />
        <KPICard
          label="Gross Margin"
          value={formatPercent(metrics.margin)}
          sub="Target: >60%"
          icon="📐"
          variant={
            metrics.margin >= 0.6
              ? "success"
              : metrics.margin >= 0.4
                ? "warning"
                : "danger"
          }
        />
      </div>

      {/* KPI Row 2 */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <KPICard
          label="CAC"
          value={formatCurrency(metrics.cac)}
          sub="Total Expenses / New Customers"
          icon="🎯"
        />
        <KPICard
          label="LTV"
          value={formatCurrency(metrics.ltv)}
          sub="Total Rev / Unique Customers"
          icon="♾️"
        />
        <KPICard
          label="Runway"
          value={
            metrics.runway > 100
              ? "Positive"
              : metrics.runway.toFixed(1) + " mo"
          }
          sub="Monthly burn rate"
          icon="🛣️"
          variant={
            metrics.runway > 6
              ? "success"
              : metrics.runway > 3
                ? "warning"
                : "danger"
          }
        />
        <KPICard
          label="Monthly Burn"
          value={formatCurrency(metrics.monthlyBurn)}
          sub="Average monthly expenses"
          icon="🔥"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Revenue vs Expenses Chart */}
        <div className="bg-white border border-blue-pale rounded-lg p-4">
          <h3 className="text-xs font-bold text-navy uppercase tracking-wider mb-4">
            Revenue vs Expenses (Monthly)
          </h3>
          {chartData.length === 0 ? (
            <div className="flex items-center justify-center h-[300px] text-blue-mid text-xs">
              No data yet — add transactions in Daily Log
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2eaf3" />
                <XAxis dataKey="month" stroke="#5a718a" style={{ fontSize: 12 }} />
                <YAxis stroke="#5a718a" style={{ fontSize: 12 }} tickFormatter={formatCurrency} />
                <Tooltip
                  formatter={(value) => formatCurrency(value as number)}
                  contentStyle={{ background: "#fff", border: "1px solid #e2eaf3" }}
                />
                <Legend />
                <Bar dataKey="revenue" fill="#2E7D32" radius={4} />
                <Bar dataKey="expenses" fill="#C62828" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Department Spend Pie */}
        <div className="bg-white border border-blue-pale rounded-lg p-4">
          <h3 className="text-xs font-bold text-navy uppercase tracking-wider mb-4">
            Department Expense Distribution
          </h3>
          {deptChartData.length === 0 ? (
            <div className="flex items-center justify-center h-[300px] text-blue-mid text-xs">
              No expense data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={deptChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                  outerRadius={80}
                  dataKey="value"
                >
                  {deptChartData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={DEPT_COLORS[index % DEPT_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Cost Mix */}
      <div className="bg-white border border-blue-pale rounded-lg p-4">
        <h3 className="text-xs font-bold text-navy uppercase tracking-wider mb-4">
          Cost Mix
        </h3>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-xs font-semibold text-blue-mid">Fixed Costs</span>
              <span className="text-sm font-bold text-navy">
                {formatCurrency(metrics.fixedCost)}
              </span>
            </div>
            <div className="h-4 bg-blue-pale rounded-full overflow-hidden">
              <div
                className="h-full bg-navy rounded-full transition-all"
                style={{
                  width:
                    metrics.totalExp > 0
                      ? (metrics.fixedCost / metrics.totalExp) * 100 + "%"
                      : "0%",
                }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-xs font-semibold text-blue-mid">Variable Costs</span>
              <span className="text-sm font-bold text-navy">
                {formatCurrency(metrics.varCost)}
              </span>
            </div>
            <div className="h-4 bg-blue-pale rounded-full overflow-hidden">
              <div
                className="h-full bg-warning rounded-full transition-all"
                style={{
                  width:
                    metrics.totalExp > 0
                      ? (metrics.varCost / metrics.totalExp) * 100 + "%"
                      : "0%",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

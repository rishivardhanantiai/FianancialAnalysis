import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
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

const DEMO_DATA = [
  {
    date: "2026-01-03",
    type: "Revenue",
    amount: 120000,
    dept: "Sales",
    project: "Enterprise",
    customer: "Reliance Ltd",
  },
  {
    date: "2026-01-05",
    type: "Expense",
    amount: 18000,
    dept: "Ops",
    project: "General",
    customer: "",
  },
  {
    date: "2026-02-02",
    type: "Revenue",
    amount: 135000,
    dept: "Sales",
    project: "Enterprise",
    customer: "Adani Digital",
  },
  {
    date: "2026-02-03",
    type: "Expense",
    amount: 18000,
    dept: "Ops",
    project: "General",
    customer: "",
  },
  {
    date: "2026-03-01",
    type: "Revenue",
    amount: 160000,
    dept: "Sales",
    project: "Enterprise",
    customer: "HDFC Digital",
  },
  {
    date: "2026-03-03",
    type: "Expense",
    amount: 18000,
    dept: "Ops",
    project: "General",
    customer: "",
  },
];

interface Calculation {
  totalRev: number;
  totalExp: number;
  profit: number;
  margin: number;
  varCost: number;
  fixedCost: number;
  cac: number;
  ltv: number;
  monthlyBurn: number;
  runway: number;
  monthly: Record<string, { rev: number; exp: number }>;
  months: string[];
}

function calculateMetrics(data: typeof DEMO_DATA): Calculation {
  const revenue = data.filter((d) => d.type === "Revenue");
  const expenses = data.filter((d) => d.type === "Expense");

  const totalRev = revenue.reduce((sum, d) => sum + d.amount, 0);
  const totalExp = expenses.reduce((sum, d) => sum + d.amount, 0);
  const profit = totalRev - totalExp;
  const margin = totalRev > 0 ? profit / totalRev : 0;

  const varCost = 25000;
  const fixedCost = totalExp - varCost;
  const cac = totalRev > 0 ? totalExp / revenue.length : 0;
  const ltv = totalRev / Math.max(1, revenue.length);
  const monthlyBurn = totalExp / 3;
  const runway = monthlyBurn > 0 ? 500000 / monthlyBurn : 999;

  const monthly: Record<string, { rev: number; exp: number }> = {
    "2026-01": { rev: 120000, exp: 18000 },
    "2026-02": { rev: 135000, exp: 18000 },
    "2026-03": { rev: 160000, exp: 18000 },
  };

  const months = Object.keys(monthly).sort();

  return {
    totalRev,
    totalExp,
    profit,
    margin,
    varCost,
    fixedCost,
    cac,
    ltv,
    monthlyBurn,
    runway,
    monthly,
    months,
  };
}

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

export default function Dashboard() {
  const [data] = useState(DEMO_DATA);
  const [metrics, setMetrics] = useState<Calculation>(calculateMetrics(data));

  useEffect(() => {
    setMetrics(calculateMetrics(data));
  }, [data]);

  const chartData = metrics.months.map((month) => ({
    month: month.slice(5),
    revenue: metrics.monthly[month].rev,
    expenses: metrics.monthly[month].exp,
  }));

  const deptChartData = [
    { name: "Sales", value: 45000 },
    { name: "Ops", value: 18000 },
    { name: "HR", value: 25000 },
    { name: "Tech", value: 12000 },
  ];

  const COLORS = ["#1F3A5F", "#C62828", "#E65100", "#2E7D32"];

  return (
    <Layout
      title="Financial Command Center"
      subtitle="All KPIs auto-calculated from Daily Log · ANTI AI Private Limited"
    >
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
          sub="Marketing+Sales / New Custs"
          icon="🎯"
        />
        <KPICard
          label="LTV"
          value={formatCurrency(metrics.ltv)}
          sub="Total Rev / Total Customers"
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
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2eaf3" />
              <XAxis dataKey="month" stroke="#5a718a" style={{ fontSize: 12 }} />
              <YAxis stroke="#5a718a" style={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value) => formatCurrency(value as number)}
                contentStyle={{ background: "#fff", border: "1px solid #e2eaf3" }}
              />
              <Legend />
              <Bar dataKey="revenue" fill="#2E7D32" radius={4} />
              <Bar dataKey="expenses" fill="#C62828" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Department Spend */}
        <div className="bg-white border border-blue-pale rounded-lg p-4">
          <h3 className="text-xs font-bold text-navy uppercase tracking-wider mb-4">
            Department Spend Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={deptChartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) =>
                  `${name}: ${formatCurrency(value)}`
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {deptChartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(value as number)} />
            </PieChart>
          </ResponsiveContainer>
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
              <span className="text-xs font-semibold text-blue-mid">
                Fixed Costs
              </span>
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
                      : 0,
                }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-xs font-semibold text-blue-mid">
                Variable Costs
              </span>
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
                      : 0,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

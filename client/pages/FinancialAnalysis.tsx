import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
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
    customer: "Reliance Ltd",
  },
  {
    date: "2026-01-05",
    type: "Expense",
    amount: 18000,
    dept: "Ops",
    customer: "",
  },
  {
    date: "2026-02-02",
    type: "Revenue",
    amount: 135000,
    dept: "Sales",
    customer: "Adani Digital",
  },
  {
    date: "2026-02-03",
    type: "Expense",
    amount: 18000,
    dept: "Ops",
    customer: "",
  },
  {
    date: "2026-03-01",
    type: "Revenue",
    amount: 160000,
    dept: "Sales",
    customer: "HDFC Digital",
  },
  {
    date: "2026-03-03",
    type: "Expense",
    amount: 18000,
    dept: "Ops",
    customer: "",
  },
];

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

export default function FinancialAnalysis() {
  const [data] = useState(DEMO_DATA);

  const monthlyData = {
    "2026-01": { rev: 120000, exp: 18000, fixed: 18000, variable: 0 },
    "2026-02": { rev: 135000, exp: 18000, fixed: 18000, variable: 0 },
    "2026-03": { rev: 160000, exp: 18000, fixed: 18000, variable: 0 },
  };

  const months = Object.keys(monthlyData).sort();
  const chartData = months.map((month) => ({
    month: month.slice(5),
    revenue: monthlyData[month as keyof typeof monthlyData].rev,
    expenses: monthlyData[month as keyof typeof monthlyData].exp,
  }));

  const profitData = months.map((month) => ({
    month: month.slice(5),
    profit:
      monthlyData[month as keyof typeof monthlyData].rev -
      monthlyData[month as keyof typeof monthlyData].exp,
  }));

  const totalRev = 415000;
  const totalExp = 54000;

  const customers = [
    { name: "Reliance Ltd", revenue: 120000, type: "New" },
    { name: "Adani Digital", revenue: 135000, type: "New" },
    { name: "HDFC Digital", revenue: 160000, type: "New" },
  ];

  const marketingData = [
    { month: "Jan", spend: 12000, revenue: 120000 },
    { month: "Feb", spend: 21000, revenue: 135000 },
    { month: "Mar", spend: 38500, revenue: 160000 },
  ];

  return (
    <Layout
      title="Financial Analysis"
      subtitle="Auto-aggregated from Daily Log · Month-by-month performance"
    >
      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Revenue & Expense Trend */}
        <div className="bg-white border border-blue-pale rounded-lg p-4">
          <h3 className="text-xs font-bold text-navy uppercase tracking-wider mb-4">
            Monthly Revenue & Expense Trend
          </h3>
          <ResponsiveContainer width="100%" height={250}>
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

        {/* Profit Trend */}
        <div className="bg-white border border-blue-pale rounded-lg p-4">
          <h3 className="text-xs font-bold text-navy uppercase tracking-wider mb-4">
            Profit Trend
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={profitData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2eaf3" />
              <XAxis dataKey="month" stroke="#5a718a" style={{ fontSize: 12 }} />
              <YAxis stroke="#5a718a" style={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value) => formatCurrency(value as number)}
                contentStyle={{ background: "#fff", border: "1px solid #e2eaf3" }}
              />
              <Line
                type="monotone"
                dataKey="profit"
                stroke="#1F3A5F"
                strokeWidth={2}
                dot={{ fill: "#1F3A5F" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly Performance Table */}
      <div className="bg-white border border-blue-pale rounded-lg p-4 mb-6">
        <h3 className="text-xs font-bold text-navy uppercase tracking-wider mb-4">
          Monthly Performance Table
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-blue-pale border-b border-blue-pale">
                <th className="px-4 py-2 text-left font-bold text-navy">
                  Month
                </th>
                <th className="px-4 py-2 text-left font-bold text-navy">
                  Revenue
                </th>
                <th className="px-4 py-2 text-left font-bold text-navy">
                  Expenses
                </th>
                <th className="px-4 py-2 text-left font-bold text-navy">
                  Net Profit
                </th>
                <th className="px-4 py-2 text-left font-bold text-navy">
                  Margin
                </th>
                <th className="px-4 py-2 text-left font-bold text-navy">
                  Fixed Cost
                </th>
                <th className="px-4 py-2 text-left font-bold text-navy">
                  Variable Cost
                </th>
                <th className="px-4 py-2 text-left font-bold text-navy">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {months.map((month) => {
                const m = monthlyData[month as keyof typeof monthlyData];
                const net = m.rev - m.exp;
                const margin = m.rev > 0 ? net / m.rev : 0;
                const monthLabel = `${[
                  "",
                  "Jan",
                  "Feb",
                  "Mar",
                  "Apr",
                  "May",
                  "Jun",
                ][parseInt(month.slice(5))]} ${month.slice(0, 4)}`;

                return (
                  <tr
                    key={month}
                    className="border-b border-blue-pale hover:bg-blue-pale/20 transition"
                  >
                    <td className="px-4 py-2 font-bold">{monthLabel}</td>
                    <td className="px-4 py-2 text-success font-bold">
                      {formatCurrency(m.rev)}
                    </td>
                    <td className="px-4 py-2 text-danger">
                      {formatCurrency(m.exp)}
                    </td>
                    <td
                      className="px-4 py-2 font-bold"
                      style={{
                        color: net >= 0 ? "#2E7D32" : "#C62828",
                      }}
                    >
                      {formatCurrency(net)}
                    </td>
                    <td className="px-4 py-2">{formatPercent(margin)}</td>
                    <td className="px-4 py-2">{formatCurrency(m.fixed)}</td>
                    <td className="px-4 py-2">{formatCurrency(m.variable)}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                          net >= 0
                            ? "bg-success-bg text-success"
                            : "bg-danger-bg text-danger"
                        }`}
                      >
                        {net >= 0 ? "Profitable" : "Loss"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-2 gap-6">
        {/* Top Customers */}
        <div className="bg-white border border-blue-pale rounded-lg p-4">
          <h3 className="text-xs font-bold text-navy uppercase tracking-wider mb-4">
            Top Customers by Revenue
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-blue-pale border-b border-blue-pale">
                  <th className="px-4 py-2 text-left font-bold text-navy">
                    Customer
                  </th>
                  <th className="px-4 py-2 text-left font-bold text-navy">
                    Revenue
                  </th>
                  <th className="px-4 py-2 text-left font-bold text-navy">
                    % Share
                  </th>
                  <th className="px-4 py-2 text-left font-bold text-navy">
                    Type
                  </th>
                </tr>
              </thead>
              <tbody>
                {customers.map((cust) => (
                  <tr
                    key={cust.name}
                    className="border-b border-blue-pale hover:bg-blue-pale/20"
                  >
                    <td className="px-4 py-2 font-bold">{cust.name}</td>
                    <td className="px-4 py-2 text-success font-bold">
                      {formatCurrency(cust.revenue)}
                    </td>
                    <td className="px-4 py-2">
                      {formatPercent(cust.revenue / totalRev)}
                    </td>
                    <td className="px-4 py-2">
                      <span className="inline-block px-2 py-1 rounded-full text-xs font-semibold bg-blue-pale text-navy">
                        {cust.type}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Marketing ROI Analysis */}
        <div className="bg-white border border-blue-pale rounded-lg p-4">
          <h3 className="text-xs font-bold text-navy uppercase tracking-wider mb-4">
            Marketing ROI Analysis
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-blue-pale border-b border-blue-pale">
                  <th className="px-4 py-2 text-left font-bold text-navy">
                    Month
                  </th>
                  <th className="px-4 py-2 text-left font-bold text-navy">
                    Mkt Spend
                  </th>
                  <th className="px-4 py-2 text-left font-bold text-navy">
                    Revenue
                  </th>
                  <th className="px-4 py-2 text-left font-bold text-navy">
                    ROI
                  </th>
                  <th className="px-4 py-2 text-left font-bold text-navy">
                    Signal
                  </th>
                </tr>
              </thead>
              <tbody>
                {marketingData.map((row) => {
                  const roi =
                    row.spend > 0 ? row.revenue / row.spend : 0;
                  let signalVariant = "grey";
                  if (roi > 15) signalVariant = "green";
                  else if (roi > 10) signalVariant = "blue";
                  else if (roi > 5) signalVariant = "warning";
                  else signalVariant = "red";

                  const signalText =
                    roi > 15
                      ? "Excellent"
                      : roi > 10
                        ? "Good"
                        : roi > 5
                          ? "Watch"
                          : "Poor";

                  return (
                    <tr
                      key={row.month}
                      className="border-b border-blue-pale hover:bg-blue-pale/20"
                    >
                      <td className="px-4 py-2">{row.month}</td>
                      <td className="px-4 py-2">
                        {formatCurrency(row.spend)}
                      </td>
                      <td className="px-4 py-2">
                        {formatCurrency(row.revenue)}
                      </td>
                      <td className="px-4 py-2 font-bold">{roi.toFixed(1)}×</td>
                      <td className="px-4 py-2">
                        <span
                          className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                            signalVariant === "green"
                              ? "bg-success-bg text-success"
                              : signalVariant === "blue"
                                ? "bg-blue-pale text-navy"
                                : signalVariant === "warning"
                                  ? "bg-warning-bg text-warning"
                                  : "bg-danger-bg text-danger"
                          }`}
                        >
                          {signalText}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}

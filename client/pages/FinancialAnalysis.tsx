import { useMemo } from "react";
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

const MONTH_NAMES = [
  "", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function friendlyMonth(yyyyMm: string): string {
  const [year, month] = yyyyMm.split("-");
  return `${MONTH_NAMES[parseInt(month)]} ${year}`;
}

function computeAnalysis(transactions: TransactionRecord[]) {
  const revenue = transactions.filter((t) => t.type === "Revenue");
  const expenses = transactions.filter((t) => t.type === "Expense");

  const totalRev = revenue.reduce((s, t) => s + t.amount, 0);
  const totalExp = expenses.reduce((s, t) => s + t.amount, 0);

  // Monthly breakdown
  const monthly: Record<string, { rev: number; exp: number; fixed: number; variable: number }> = {};
  for (const t of transactions) {
    const m = t.date.slice(0, 7);
    if (!monthly[m]) monthly[m] = { rev: 0, exp: 0, fixed: 0, variable: 0 };
    if (t.type === "Revenue") {
      monthly[m].rev += t.amount;
    } else {
      monthly[m].exp += t.amount;
      if (t.costt === "Fixed") monthly[m].fixed += t.amount;
      else if (t.costt === "Variable") monthly[m].variable += t.amount;
      else monthly[m].fixed += t.amount; // untagged → fixed
    }
  }
  const months = Object.keys(monthly).sort();

  // Top customers by total revenue
  const customerRev: Record<string, number> = {};
  for (const t of revenue) {
    if (t.customer) {
      customerRev[t.customer] = (customerRev[t.customer] ?? 0) + t.amount;
    }
  }
  const customers = Object.entries(customerRev)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, rev]) => ({ name, revenue: rev }));

  // Marketing ROI: Marketing dept expenses vs total revenue per month
  const mktByMonth: Record<string, number> = {};
  for (const t of expenses.filter((t) => t.dept === "Marketing")) {
    const m = t.date.slice(0, 7);
    mktByMonth[m] = (mktByMonth[m] ?? 0) + t.amount;
  }
  const marketingData = months
    .filter((m) => mktByMonth[m] != null)
    .map((m) => ({
      month: friendlyMonth(m),
      spend: mktByMonth[m],
      revenue: monthly[m].rev,
    }));

  return { totalRev, totalExp, monthly, months, customers, marketingData };
}

export default function FinancialAnalysis() {
  const { transactions, loading, error } = useTransactions();
  const { totalRev, totalExp, monthly, months, customers, marketingData } = useMemo(
    () => computeAnalysis(transactions),
    [transactions]
  );

  const chartData = months.map((m) => ({
    month: friendlyMonth(m),
    revenue: monthly[m].rev,
    expenses: monthly[m].exp,
  }));

  const profitData = months.map((m) => ({
    month: friendlyMonth(m),
    profit: monthly[m].rev - monthly[m].exp,
  }));

  return (
    <Layout
      title="Financial Analysis"
      subtitle="Auto-aggregated from Daily Log · Month-by-month performance"
    >
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

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Revenue & Expense Trend */}
        <div className="bg-white border border-blue-pale rounded-lg p-4">
          <h3 className="text-xs font-bold text-navy uppercase tracking-wider mb-4">
            Monthly Revenue &amp; Expense Trend
          </h3>
          {chartData.length === 0 ? (
            <div className="flex items-center justify-center h-[250px] text-blue-mid text-xs">
              No data yet — add transactions in Daily Log
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 6 }}>
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

        {/* Profit Trend */}
        <div className="bg-white border border-blue-pale rounded-lg p-4">
          <h3 className="text-xs font-bold text-navy uppercase tracking-wider mb-4">
            Profit Trend
          </h3>
          {profitData.length === 0 ? (
            <div className="flex items-center justify-center h-[250px] text-blue-mid text-xs">
              No data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={profitData} margin={{ top: 8, right: 12, left: 0, bottom: 6 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2eaf3" />
                <XAxis dataKey="month" stroke="#5a718a" style={{ fontSize: 12 }} />
                <YAxis stroke="#5a718a" style={{ fontSize: 12 }} tickFormatter={formatCurrency} />
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
          )}
        </div>
      </div>

      {/* Monthly Performance Table */}
      <div className="bg-white border border-blue-pale rounded-lg p-4 mb-6">
        <h3 className="text-xs font-bold text-navy uppercase tracking-wider mb-4">
          Monthly Performance Table
        </h3>
        {months.length === 0 ? (
          <p className="text-blue-mid text-xs py-4 text-center">No transactions yet</p>
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
                    <tr
                      key={m}
                      className="border-b border-blue-pale hover:bg-blue-pale/20 transition"
                    >
                      <td className="px-4 py-2 font-bold">{friendlyMonth(m)}</td>
                      <td className="px-4 py-2 text-success font-bold">
                        {formatCurrency(row.rev)}
                      </td>
                      <td className="px-4 py-2 text-danger">{formatCurrency(row.exp)}</td>
                      <td
                        className="px-4 py-2 font-bold"
                        style={{ color: net >= 0 ? "#2E7D32" : "#C62828" }}
                      >
                        {formatCurrency(net)}
                      </td>
                      <td className="px-4 py-2">{formatPercent(margin)}</td>
                      <td className="px-4 py-2">{formatCurrency(row.fixed)}</td>
                      <td className="px-4 py-2">{formatCurrency(row.variable)}</td>
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
        )}
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-2 gap-6">
        {/* Top Customers */}
        <div className="bg-white border border-blue-pale rounded-lg p-4">
          <h3 className="text-xs font-bold text-navy uppercase tracking-wider mb-4">
            Top Customers by Revenue
          </h3>
          {customers.length === 0 ? (
            <p className="text-blue-mid text-xs py-4 text-center">
              No customer revenue data yet
            </p>
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
                        {totalRev > 0 ? formatPercent(cust.revenue / totalRev) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Marketing ROI Analysis */}
        <div className="bg-white border border-blue-pale rounded-lg p-4">
          <h3 className="text-xs font-bold text-navy uppercase tracking-wider mb-4">
            Marketing ROI Analysis
          </h3>
          {marketingData.length === 0 ? (
            <p className="text-blue-mid text-xs py-4 text-center">
              No Marketing dept expenses found
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-blue-pale border-b border-blue-pale">
                    <th className="px-4 py-2 text-left font-bold text-navy">Month</th>
                    <th className="px-4 py-2 text-left font-bold text-navy">Mkt Spend</th>
                    <th className="px-4 py-2 text-left font-bold text-navy">Revenue</th>
                    <th className="px-4 py-2 text-left font-bold text-navy">ROI</th>
                    <th className="px-4 py-2 text-left font-bold text-navy">Signal</th>
                  </tr>
                </thead>
                <tbody>
                  {marketingData.map((row) => {
                    const roi = row.spend > 0 ? row.revenue / row.spend : 0;
                    const signalVariant =
                      roi > 15 ? "green" : roi > 10 ? "blue" : roi > 5 ? "warning" : "red";
                    const signalText =
                      roi > 15 ? "Excellent" : roi > 10 ? "Good" : roi > 5 ? "Watch" : "Poor";

                    return (
                      <tr
                        key={row.month}
                        className="border-b border-blue-pale hover:bg-blue-pale/20"
                      >
                        <td className="px-4 py-2">{row.month}</td>
                        <td className="px-4 py-2">{formatCurrency(row.spend)}</td>
                        <td className="px-4 py-2">{formatCurrency(row.revenue)}</td>
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
          )}
        </div>
      </div>
    </Layout>
  );
}

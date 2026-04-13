import { useState } from "react";
import Layout from "@/components/Layout";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

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

export default function Forecast() {
  const [revGrowth, setRevGrowth] = useState(15);
  const [expansion, setExpansion] = useState(5);
  const [churn, setChurn] = useState(6);
  const [expGrowth, setExpGrowth] = useState(8);
  const [openingCash, setOpeningCash] = useState(500000);

  const MONTHS = ["Apr 2026", "May 2026", "Jun 2026"];
  let openRev = 368000;
  let openExp = 213500;
  let currentCash = openingCash;

  const revRows = [];
  const cfRows = [];
  const chartData = [];

  MONTHS.forEach((month, i) => {
    const newRev = openRev * (revGrowth / 100);
    const expRev = openRev * (expansion / 100);
    const churnRev = openRev * (churn / 100);
    const netGrowth = newRev + expRev - churnRev;
    const closeRev = openRev + netGrowth;
    const expenses = openExp * Math.pow(1 + expGrowth / 100, i);
    const netCF = closeRev - expenses;
    const closeCash = currentCash + netCF;
    const runway =
      expenses > closeRev
        ? (closeCash / (expenses - closeRev)).toFixed(1) + " mo"
        : "∞ Positive";

    revRows.push({ month, openRev, newRev, expRev, churnRev, closeRev });
    cfRows.push({
      month,
      expenses,
      netCF,
      openCash: currentCash,
      closeCash,
      runway,
    });

    chartData.push({
      month: month.split(" ")[0],
      revenue: closeRev,
      expenses: expenses,
      cash: closeCash,
    });

    openRev = closeRev;
    currentCash = closeCash;
  });

  const lastCF = cfRows[cfRows.length - 1];
  const revGrowthOutpaces = revGrowth > expGrowth;

  return (
    <Layout
      title="3-Month Revenue Projection"
      subtitle="Base auto-pulled from Daily Log · Only assumptions are editable below"
    >
      {/* Assumption Inputs */}
      <div className="bg-navy text-white px-6 py-3 rounded-lg mb-4 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider">
          ⚙ ASSUMPTION INPUTS — Edit only these cells
        </span>
        <span className="text-xs opacity-70">All projections update instantly</span>
      </div>

      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="bg-blue-pale border-2 border-blue-mid rounded-lg p-3">
          <label className="block text-xs font-bold text-navy uppercase tracking-wider mb-2">
            Revenue Growth %
          </label>
          <input
            type="number"
            value={revGrowth}
            onChange={(e) => setRevGrowth(parseFloat(e.target.value))}
            className="w-full px-2 py-1 border border-blue-mid rounded-lg text-center font-bold text-navy bg-white focus:outline-none focus:ring-2 focus:ring-navy"
          />
          <div className="text-xs text-navy mt-1">%</div>
        </div>

        <div className="bg-blue-pale border-2 border-blue-mid rounded-lg p-3">
          <label className="block text-xs font-bold text-navy uppercase tracking-wider mb-2">
            Expansion Rate %
          </label>
          <input
            type="number"
            value={expansion}
            onChange={(e) => setExpansion(parseFloat(e.target.value))}
            className="w-full px-2 py-1 border border-blue-mid rounded-lg text-center font-bold text-navy bg-white focus:outline-none focus:ring-2 focus:ring-navy"
          />
          <div className="text-xs text-navy mt-1">%</div>
        </div>

        <div className="bg-blue-pale border-2 border-blue-mid rounded-lg p-3">
          <label className="block text-xs font-bold text-navy uppercase tracking-wider mb-2">
            Churn Rate %
          </label>
          <input
            type="number"
            value={churn}
            onChange={(e) => setChurn(parseFloat(e.target.value))}
            className="w-full px-2 py-1 border border-blue-mid rounded-lg text-center font-bold text-navy bg-white focus:outline-none focus:ring-2 focus:ring-navy"
          />
          <div className="text-xs text-navy mt-1">%</div>
        </div>

        <div className="bg-blue-pale border-2 border-blue-mid rounded-lg p-3">
          <label className="block text-xs font-bold text-navy uppercase tracking-wider mb-2">
            Expense Growth %
          </label>
          <input
            type="number"
            value={expGrowth}
            onChange={(e) => setExpGrowth(parseFloat(e.target.value))}
            className="w-full px-2 py-1 border border-blue-mid rounded-lg text-center font-bold text-navy bg-white focus:outline-none focus:ring-2 focus:ring-navy"
          />
          <div className="text-xs text-navy mt-1">%</div>
        </div>

        <div className="bg-blue-pale border-2 border-blue-mid rounded-lg p-3">
          <label className="block text-xs font-bold text-navy uppercase tracking-wider mb-2">
            Opening Cash (₹)
          </label>
          <input
            type="number"
            value={openingCash}
            onChange={(e) => setOpeningCash(parseFloat(e.target.value))}
            className="w-full px-2 py-1 border border-blue-mid rounded-lg text-center font-bold text-navy bg-white focus:outline-none focus:ring-2 focus:ring-navy"
          />
        </div>
      </div>

      {/* Projection Tables */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Revenue Table */}
        <div className="bg-white border border-blue-pale rounded-lg p-4">
          <h3 className="text-xs font-bold text-navy uppercase tracking-wider mb-4">
            Revenue Waterfall (Bottom-Up)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-navy text-white">
                  <th className="px-3 py-2 text-center font-bold">Month</th>
                  <th className="px-3 py-2 text-center font-bold">Opening</th>
                  <th className="px-3 py-2 text-center font-bold">+New</th>
                  <th className="px-3 py-2 text-center font-bold">+Expansion</th>
                  <th className="px-3 py-2 text-center font-bold">−Churn</th>
                  <th className="px-3 py-2 text-center font-bold">Closing</th>
                </tr>
              </thead>
              <tbody>
                {revRows.map((row) => (
                  <tr
                    key={row.month}
                    className="border-b border-blue-pale text-center hover:bg-blue-pale/20"
                  >
                    <td className="px-3 py-2 font-bold">{row.month}</td>
                    <td className="px-3 py-2">{formatCurrency(row.openRev)}</td>
                    <td className="px-3 py-2 text-success font-bold">
                      +{formatCurrency(row.newRev)}
                    </td>
                    <td className="px-3 py-2 text-success font-bold">
                      +{formatCurrency(row.expRev)}
                    </td>
                    <td className="px-3 py-2 text-danger font-bold">
                      −{formatCurrency(row.churnRev)}
                    </td>
                    <td className="px-3 py-2 font-bold text-success">
                      {formatCurrency(row.closeRev)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cash Flow Table */}
        <div className="bg-white border border-blue-pale rounded-lg p-4">
          <h3 className="text-xs font-bold text-navy uppercase tracking-wider mb-4">
            Expense & Cash Flow
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-navy text-white">
                  <th className="px-3 py-2 text-center font-bold">Month</th>
                  <th className="px-3 py-2 text-center font-bold">Expenses</th>
                  <th className="px-3 py-2 text-center font-bold">Net CF</th>
                  <th className="px-3 py-2 text-center font-bold">Opening Cash</th>
                  <th className="px-3 py-2 text-center font-bold">Closing Cash</th>
                  <th className="px-3 py-2 text-center font-bold">Runway</th>
                </tr>
              </thead>
              <tbody>
                {cfRows.map((row) => (
                  <tr
                    key={row.month}
                    className="border-b border-blue-pale text-center hover:bg-blue-pale/20"
                  >
                    <td className="px-3 py-2 font-bold">{row.month}</td>
                    <td className="px-3 py-2 text-danger">
                      {formatCurrency(row.expenses)}
                    </td>
                    <td
                      className="px-3 py-2 font-bold"
                      style={{
                        color: row.netCF >= 0 ? "#2E7D32" : "#C62828",
                      }}
                    >
                      {row.netCF >= 0 ? "+" : ""}
                      {formatCurrency(row.netCF)}
                    </td>
                    <td className="px-3 py-2">
                      {formatCurrency(row.openCash)}
                    </td>
                    <td className="px-3 py-2 font-bold">
                      {formatCurrency(row.closeCash)}
                    </td>
                    <td className="px-3 py-2">{row.runway}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Projection Chart */}
      <div className="bg-white border border-blue-pale rounded-lg p-4 mb-6">
        <h3 className="text-xs font-bold text-navy uppercase tracking-wider mb-4">
          Projection Chart — Revenue · Expenses · Cash
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2eaf3" />
            <XAxis dataKey="month" stroke="#5a718a" style={{ fontSize: 12 }} />
            <YAxis stroke="#5a718a" style={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value) => formatCurrency(value as number)}
              contentStyle={{ background: "#fff", border: "1px solid #e2eaf3" }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#2E7D32"
              strokeWidth={2}
              dot={{ fill: "#2E7D32" }}
            />
            <Line
              type="monotone"
              dataKey="expenses"
              stroke="#C62828"
              strokeWidth={2}
              dot={{ fill: "#C62828" }}
            />
            <Line
              type="monotone"
              dataKey="cash"
              stroke="#1F3A5F"
              strokeWidth={2}
              dot={{ fill: "#1F3A5F" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Insights */}
      <div className="space-y-3">
        {revGrowthOutpaces ? (
          <div className="border border-success-light bg-success-bg rounded-lg p-4 flex gap-3">
            <span className="text-lg">✅</span>
            <div>
              <p className="text-xs font-bold text-navy mb-1">
                Revenue growth ({formatPercent(revGrowth / 100)}) outpaces
                expense growth ({formatPercent(expGrowth / 100)})
              </p>
              <p className="text-xs text-blue-mid">
                Improving margins projected.
              </p>
            </div>
          </div>
        ) : (
          <div className="border border-danger-light bg-danger-bg rounded-lg p-4 flex gap-3">
            <span className="text-lg">⚠️</span>
            <div>
              <p className="text-xs font-bold text-navy mb-1">
                Expense growth ({formatPercent(expGrowth / 100)}) exceeds
                revenue growth ({formatPercent(revGrowth / 100)})
              </p>
              <p className="text-xs text-blue-mid">Margin compression risk.</p>
            </div>
          </div>
        )}

        {parseFloat(lastCF.runway) < 3 ? (
          <div className="border border-danger-light bg-danger-bg rounded-lg p-4 flex gap-3">
            <span className="text-lg">🚨</span>
            <div>
              <p className="text-xs font-bold text-navy mb-1">
                Runway below 3 months by Jun
              </p>
              <p className="text-xs text-blue-mid">
                Take immediate cash action.
              </p>
            </div>
          </div>
        ) : lastCF.netCF < 0 ? (
          <div className="border border-warning-light bg-warning-bg rounded-lg p-4 flex gap-3">
            <span className="text-lg">⚠</span>
            <div>
              <p className="text-xs font-bold text-navy mb-1">
                Negative monthly cash flow projected
              </p>
              <p className="text-xs text-blue-mid">Monitor burn rate.</p>
            </div>
          </div>
        ) : (
          <div className="border border-success-light bg-success-bg rounded-lg p-4 flex gap-3">
            <span className="text-lg">🟢</span>
            <div>
              <p className="text-xs font-bold text-navy mb-1">
                Cash position growing
              </p>
              <p className="text-xs text-blue-mid">
                Revenue exceeds expenses in projection period.
              </p>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

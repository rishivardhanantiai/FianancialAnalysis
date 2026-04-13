import Layout from "@/components/Layout";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const projectData = {
  Enterprise: { revenue: 415000, expenses: 42000 },
  SMB: { revenue: 218000, expenses: 12000 },
  General: { revenue: 0, expenses: 18000 },
};

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

export default function Projects() {
  const projects = Object.entries(projectData).map(([name, data]) => ({
    name,
    revenue: data.revenue,
    expenses: data.expenses,
    profit: data.revenue - data.expenses,
    margin: data.revenue > 0 ? (data.revenue - data.expenses) / data.revenue : 0,
  }));

  const chartData = projects.map((p) => ({
    name: p.name,
    revenue: p.revenue,
    expenses: p.expenses,
  }));

  return (
    <Layout
      title="Project Tracker"
      subtitle="Auto P&L per project from Daily Log"
    >
      {/* Project P&L Table */}
      <div className="bg-white border border-blue-pale rounded-lg p-6 mb-6">
        <h3 className="text-xs font-bold text-navy uppercase tracking-wider mb-4">
          Project P&L Summary
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-blue-pale border-b border-blue-pale">
                <th className="px-4 py-2 text-left font-bold text-navy">
                  Project
                </th>
                <th className="px-4 py-2 text-left font-bold text-navy">
                  Revenue
                </th>
                <th className="px-4 py-2 text-left font-bold text-navy">
                  Expenses
                </th>
                <th className="px-4 py-2 text-left font-bold text-navy">
                  Gross Profit
                </th>
                <th className="px-4 py-2 text-left font-bold text-navy">
                  Margin %
                </th>
                <th className="px-4 py-2 text-left font-bold text-navy">
                  Transactions
                </th>
                <th className="px-4 py-2 text-left font-bold text-navy">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {projects.map((proj) => {
                const txnCount = proj.revenue > 0 ? 6 : 3;
                const statusVariant =
                  proj.profit > 0
                    ? "green"
                    : proj.revenue === 0
                      ? "grey"
                      : "red";
                const statusText =
                  proj.profit > 0
                    ? "✓ Profitable"
                    : proj.revenue === 0
                      ? "Cost Only"
                      : "⚠ Loss";

                return (
                  <tr
                    key={proj.name}
                    className="border-b border-blue-pale hover:bg-blue-pale/20 transition"
                  >
                    <td className="px-4 py-2 font-bold">{proj.name}</td>
                    <td className="px-4 py-2 text-success">
                      {proj.revenue > 0 ? formatCurrency(proj.revenue) : "—"}
                    </td>
                    <td className="px-4 py-2 text-danger">
                      {formatCurrency(proj.expenses)}
                    </td>
                    <td
                      className="px-4 py-2 font-bold"
                      style={{
                        color: proj.profit >= 0 ? "#2E7D32" : "#C62828",
                      }}
                    >
                      {proj.revenue > 0 ? formatCurrency(proj.profit) : "—"}
                    </td>
                    <td className="px-4 py-2">
                      {proj.revenue > 0 ? formatPercent(proj.margin) : "—"}
                    </td>
                    <td className="px-4 py-2">{txnCount} txns</td>
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
      </div>

      {/* Project Chart */}
      <div className="bg-white border border-blue-pale rounded-lg p-6">
        <h3 className="text-xs font-bold text-navy uppercase tracking-wider mb-4">
          Revenue vs Expenses by Project
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2eaf3" />
            <XAxis dataKey="name" stroke="#5a718a" style={{ fontSize: 12 }} />
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
    </Layout>
  );
}

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

const DEPT_ALLOC = {
  Marketing: 0.25,
  Sales: 0.12,
  Finance: 0.06,
  HR: 0.21,
  Tech: 0.16,
  Ops: 0.1,
  Management: 0.1,
};

const deptSpend = {
  Marketing: 38500,
  Sales: 0,
  Finance: 12000,
  HR: 295000,
  Tech: 22200,
  Ops: 54000,
  Management: 75000,
};

const totalRev = 633000;
const totalBudget = totalRev;

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

export default function Departments() {
  const depts = Object.entries(DEPT_ALLOC).map(([name, alloc]) => {
    const budget = totalBudget * alloc;
    const actual = deptSpend[name as keyof typeof deptSpend] || 0;
    const variance = budget - actual;
    const utilization = budget > 0 ? actual / budget : 0;

    let status = "On Track";
    let statusVariant = "green";
    if (utilization > 1) {
      status = "⚠ Overspend";
      statusVariant = "red";
    } else if (utilization >= 0.8) {
      status = "▲ Near Limit";
      statusVariant = "warning";
    }

    return {
      name,
      alloc,
      budget,
      actual,
      variance,
      utilization,
      status,
      statusVariant,
    };
  });

  const overcount = depts.filter((d) => d.utilization > 1).length;
  const nearcount = depts.filter(
    (d) => d.utilization >= 0.8 && d.utilization <= 1
  ).length;
  const okcount = depts.filter((d) => d.utilization < 0.8).length;
  const totalSpend = Object.values(deptSpend).reduce((sum, v) => sum + v, 0);

  const chartData = depts.map((d) => ({
    name: d.name,
    "Actual Spend": d.actual,
  }));

  return (
    <Layout
      title="Department Tracker"
      subtitle="Budget vs Actual · Efficiency flags · Auto from Daily Log"
    >
      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-blue-pale rounded-lg p-4 hover:shadow-md transition">
          <div className="text-xs font-bold text-blue-mid uppercase tracking-wider mb-2">
            Overspending
          </div>
          <div className="text-2xl font-bold text-danger">{overcount}</div>
          <div className="text-xs text-blue-mid">Departments over budget</div>
        </div>
        <div className="bg-white border border-blue-pale rounded-lg p-4 hover:shadow-md transition">
          <div className="text-xs font-bold text-blue-mid uppercase tracking-wider mb-2">
            Near Limit
          </div>
          <div className="text-2xl font-bold text-warning">{nearcount}</div>
          <div className="text-xs text-blue-mid">80–100% utilized</div>
        </div>
        <div className="bg-white border border-blue-pale rounded-lg p-4 hover:shadow-md transition">
          <div className="text-xs font-bold text-blue-mid uppercase tracking-wider mb-2">
            On Track
          </div>
          <div className="text-2xl font-bold text-success">{okcount}</div>
          <div className="text-xs text-blue-mid">Under 80% utilized</div>
        </div>
        <div className="bg-white border border-blue-pale rounded-lg p-4 hover:shadow-md transition">
          <div className="text-xs font-bold text-blue-mid uppercase tracking-wider mb-2">
            Total Dept Spend
          </div>
          <div className="text-2xl font-bold text-navy">
            {formatCurrency(totalSpend)}
          </div>
          <div className="text-xs text-blue-mid">All departments</div>
        </div>
      </div>

      {/* Budget vs Actual Table */}
      <div className="bg-white border border-blue-pale rounded-lg p-6 mb-6">
        <h3 className="text-xs font-bold text-navy uppercase tracking-wider mb-4">
          Department Budget vs Actual
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-blue-pale border-b border-blue-pale">
                <th className="px-4 py-2 text-left font-bold text-navy">
                  Department
                </th>
                <th className="px-4 py-2 text-left font-bold text-navy">
                  Alloc %
                </th>
                <th className="px-4 py-2 text-left font-bold text-navy">
                  Budget
                </th>
                <th className="px-4 py-2 text-left font-bold text-navy">
                  Actual Spend
                </th>
                <th className="px-4 py-2 text-left font-bold text-navy">
                  Variance
                </th>
                <th className="px-4 py-2 text-left font-bold text-navy">
                  Utilized %
                </th>
                <th className="px-4 py-2 text-left font-bold text-navy">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {depts.map((dept) => (
                <tr
                  key={dept.name}
                  className="border-b border-blue-pale hover:bg-blue-pale/20 transition"
                >
                  <td className="px-4 py-2 font-bold">{dept.name}</td>
                  <td className="px-4 py-2">{formatPercent(dept.alloc)}</td>
                  <td className="px-4 py-2">{formatCurrency(dept.budget)}</td>
                  <td className="px-4 py-2 font-bold">
                    {formatCurrency(dept.actual)}
                  </td>
                  <td
                    className="px-4 py-2 font-bold"
                    style={{
                      color: dept.variance >= 0 ? "#2E7D32" : "#C62828",
                    }}
                  >
                    {dept.variance >= 0 ? "+" : ""}
                    {formatCurrency(dept.variance)}
                  </td>
                  <td className="px-4 py-2">
                    {formatPercent(dept.utilization)}
                    <div className="h-1.5 bg-blue-pale rounded-full overflow-hidden mt-1">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: Math.min(dept.utilization, 1) * 100 + "%",
                          backgroundColor:
                            dept.utilization > 1
                              ? "#C62828"
                              : dept.utilization >= 0.8
                                ? "#E65100"
                                : "#2E7D32",
                        }}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                        dept.statusVariant === "red"
                          ? "bg-danger-bg text-danger"
                          : dept.statusVariant === "warning"
                            ? "bg-warning-bg text-warning"
                            : "bg-success-bg text-success"
                      }`}
                    >
                      {dept.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Spend Distribution Chart */}
      <div className="bg-white border border-blue-pale rounded-lg p-6">
        <h3 className="text-xs font-bold text-navy uppercase tracking-wider mb-4">
          Spend Distribution
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 6 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2eaf3" />
            <XAxis dataKey="name" stroke="#5a718a" style={{ fontSize: 12 }} />
            <YAxis stroke="#5a718a" style={{ fontSize: 12 }} tickFormatter={formatCurrency} />
            <Tooltip
              formatter={(value) => formatCurrency(value as number)}
              contentStyle={{ background: "#fff", border: "1px solid #e2eaf3" }}
            />
            <Bar dataKey="Actual Spend" fill="#C62828" radius={4} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Layout>
  );
}

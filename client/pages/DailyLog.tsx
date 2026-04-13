import { useState } from "react";
import Layout from "@/components/Layout";
import { Trash2 } from "lucide-react";

interface Transaction {
  date: string;
  type: "Revenue" | "Expense";
  amount: number;
  dept: string;
  project: string;
  customer: string;
  ctype?: string;
  costt?: string;
  owner: string;
  notes: string;
}

const INITIAL_DATA: Transaction[] = [
  {
    date: "2026-03-01",
    type: "Revenue",
    amount: 160000,
    dept: "Sales",
    project: "Enterprise",
    customer: "HDFC Digital",
    ctype: "New",
    owner: "Ankit",
    notes: "Q1 close - large deal",
  },
  {
    date: "2026-03-03",
    type: "Expense",
    amount: 18000,
    dept: "Ops",
    project: "General",
    customer: "",
    costt: "Fixed",
    owner: "Admin",
    notes: "Office rent Mar",
  },
  {
    date: "2026-02-02",
    type: "Revenue",
    amount: 135000,
    dept: "Sales",
    project: "Enterprise",
    customer: "Adani Digital",
    ctype: "New",
    owner: "Ankit",
    notes: "Enterprise Q1 deal",
  },
  {
    date: "2026-02-03",
    type: "Expense",
    amount: 18000,
    dept: "Ops",
    project: "General",
    customer: "",
    costt: "Fixed",
    owner: "Admin",
    notes: "Office rent Feb",
  },
  {
    date: "2026-01-03",
    type: "Revenue",
    amount: 120000,
    dept: "Sales",
    project: "Enterprise",
    customer: "Reliance Ltd",
    ctype: "New",
    owner: "Ankit",
    notes: "Enterprise annual deal",
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

function Tag({
  variant,
  children,
}: {
  variant: "green" | "red" | "blue" | "grey";
  children: React.ReactNode;
}) {
  const variantClasses = {
    green: "bg-success-bg text-success",
    red: "bg-danger-bg text-danger",
    blue: "bg-blue-pale text-navy",
    grey: "bg-gray-200 text-gray-700",
  };

  return (
    <span
      className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${variantClasses[variant]}`}
    >
      {children}
    </span>
  );
}

export default function DailyLog() {
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_DATA);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"" | "Revenue" | "Expense">("");
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    type: "Revenue" as "Revenue" | "Expense",
    amount: "",
    dept: "",
    project: "",
    customer: "",
    ctype: "",
    costt: "",
    owner: "",
    notes: "",
  });

  const filteredTransactions = transactions
    .filter((t) => {
      const searchLower = search.toLowerCase();
      return (
        t.date.includes(searchLower) ||
        t.type.toLowerCase().includes(searchLower) ||
        t.dept.toLowerCase().includes(searchLower) ||
        t.project.toLowerCase().includes(searchLower) ||
        t.customer.toLowerCase().includes(searchLower) ||
        t.owner.toLowerCase().includes(searchLower) ||
        t.notes.toLowerCase().includes(searchLower)
      );
    })
    .filter((t) => (filterType ? t.type === filterType : true))
    .sort((a, b) => b.date.localeCompare(a.date));

  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.date || !formData.amount) {
      alert("Date and Amount are required");
      return;
    }

    const newTransaction: Transaction = {
      date: formData.date,
      type: formData.type,
      amount: parseFloat(formData.amount),
      dept: formData.dept,
      project: formData.project,
      customer: formData.customer,
      ctype: formData.ctype,
      costt: formData.costt,
      owner: formData.owner,
      notes: formData.notes,
    };

    setTransactions([newTransaction, ...transactions]);
    setFormData({
      date: new Date().toISOString().split("T")[0],
      type: "Revenue",
      amount: "",
      dept: "",
      project: "",
      customer: "",
      ctype: "",
      costt: "",
      owner: "",
      notes: "",
    });
  };

  const handleDelete = (index: number) => {
    if (confirm("Remove this transaction?")) {
      setTransactions(transactions.filter((_, i) => i !== index));
    }
  };

  return (
    <Layout
      title="Daily Transaction Log"
      subtitle="Single source of truth · Every row instantly updates all dashboards"
    >
      {/* Quick Add Form */}
      <div className="bg-white border border-blue-pale rounded-lg p-6 mb-6">
        <h3 className="text-xs font-bold text-navy uppercase tracking-wider mb-4">
          Quick Add Transaction
        </h3>
        <form onSubmit={handleAddTransaction} className="space-y-4">
          <div className="grid grid-cols-5 gap-3">
            <div>
              <label className="block text-xs font-bold text-blue-mid uppercase mb-1">
                Date
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                className="w-full px-3 py-2 border border-blue-pale rounded-lg text-xs bg-background focus:outline-none focus:ring-2 focus:ring-navy"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-blue-mid uppercase mb-1">
                Type
              </label>
              <select
                value={formData.type}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    type: e.target.value as "Revenue" | "Expense",
                  })
                }
                className="w-full px-3 py-2 border border-blue-pale rounded-lg text-xs bg-background focus:outline-none focus:ring-2 focus:ring-navy"
              >
                <option>Revenue</option>
                <option>Expense</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-blue-mid uppercase mb-1">
                Amount (₹)
              </label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: e.target.value })
                }
                placeholder="0"
                min="0"
                className="w-full px-3 py-2 border border-blue-pale rounded-lg text-xs bg-background focus:outline-none focus:ring-2 focus:ring-navy"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-blue-mid uppercase mb-1">
                Department
              </label>
              <select
                value={formData.dept}
                onChange={(e) =>
                  setFormData({ ...formData, dept: e.target.value })
                }
                className="w-full px-3 py-2 border border-blue-pale rounded-lg text-xs bg-background focus:outline-none focus:ring-2 focus:ring-navy"
              >
                <option value="">— Select —</option>
                <option>Marketing</option>
                <option>Sales</option>
                <option>Finance</option>
                <option>HR</option>
                <option>Tech</option>
                <option>Ops</option>
                <option>Management</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-blue-mid uppercase mb-1">
                Project
              </label>
              <input
                type="text"
                value={formData.project}
                onChange={(e) =>
                  setFormData({ ...formData, project: e.target.value })
                }
                placeholder="e.g. Platform"
                className="w-full px-3 py-2 border border-blue-pale rounded-lg text-xs bg-background focus:outline-none focus:ring-2 focus:ring-navy"
              />
            </div>
          </div>

          <div className="grid grid-cols-5 gap-3">
            <div>
              <label className="block text-xs font-bold text-blue-mid uppercase mb-1">
                Customer
              </label>
              <input
                type="text"
                value={formData.customer}
                onChange={(e) =>
                  setFormData({ ...formData, customer: e.target.value })
                }
                placeholder="Customer name"
                className="w-full px-3 py-2 border border-blue-pale rounded-lg text-xs bg-background focus:outline-none focus:ring-2 focus:ring-navy"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-blue-mid uppercase mb-1">
                Cust. Type
              </label>
              <select
                value={formData.ctype}
                onChange={(e) =>
                  setFormData({ ...formData, ctype: e.target.value })
                }
                className="w-full px-3 py-2 border border-blue-pale rounded-lg text-xs bg-background focus:outline-none focus:ring-2 focus:ring-navy"
              >
                <option value="">—</option>
                <option>New</option>
                <option>Existing</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-blue-mid uppercase mb-1">
                Cost Type
              </label>
              <select
                value={formData.costt}
                onChange={(e) =>
                  setFormData({ ...formData, costt: e.target.value })
                }
                className="w-full px-3 py-2 border border-blue-pale rounded-lg text-xs bg-background focus:outline-none focus:ring-2 focus:ring-navy"
              >
                <option value="">—</option>
                <option>Fixed</option>
                <option>Variable</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-blue-mid uppercase mb-1">
                Owner
              </label>
              <input
                type="text"
                value={formData.owner}
                onChange={(e) =>
                  setFormData({ ...formData, owner: e.target.value })
                }
                placeholder="Owner"
                className="w-full px-3 py-2 border border-blue-pale rounded-lg text-xs bg-background focus:outline-none focus:ring-2 focus:ring-navy"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-blue-mid uppercase mb-1">
                Notes
              </label>
              <input
                type="text"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Notes"
                className="w-full px-3 py-2 border border-blue-pale rounded-lg text-xs bg-background focus:outline-none focus:ring-2 focus:ring-navy"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-4 py-2 bg-navy text-white text-xs font-bold rounded-lg hover:bg-navy-light transition"
            >
              + Add Transaction
            </button>
          </div>
        </form>
      </div>

      {/* Transaction Log */}
      <div className="bg-white border border-blue-pale rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xs font-bold text-navy uppercase tracking-wider">
              Transaction Log
              <span className="text-blue-mid font-normal ml-2">
                ({filteredTransactions.length} of {transactions.length})
              </span>
            </h3>
          </div>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="🔍 Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-3 py-2 border border-blue-pale rounded-lg text-xs bg-background focus:outline-none focus:ring-2 focus:ring-navy w-40"
            />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-3 py-2 border border-blue-pale rounded-lg text-xs bg-background focus:outline-none focus:ring-2 focus:ring-navy"
            >
              <option value="">All Types</option>
              <option value="Revenue">Revenue</option>
              <option value="Expense">Expense</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-blue-pale border-b border-blue-pale">
                <th className="px-4 py-2 text-left font-bold text-navy">
                  Date
                </th>
                <th className="px-4 py-2 text-left font-bold text-navy">
                  Type
                </th>
                <th className="px-4 py-2 text-left font-bold text-navy">
                  Amount
                </th>
                <th className="px-4 py-2 text-left font-bold text-navy">
                  Department
                </th>
                <th className="px-4 py-2 text-left font-bold text-navy">
                  Project
                </th>
                <th className="px-4 py-2 text-left font-bold text-navy">
                  Customer
                </th>
                <th className="px-4 py-2 text-left font-bold text-navy">
                  Cust. Type
                </th>
                <th className="px-4 py-2 text-left font-bold text-navy">
                  Cost Type
                </th>
                <th className="px-4 py-2 text-left font-bold text-navy">
                  Owner
                </th>
                <th className="px-4 py-2 text-left font-bold text-navy">
                  Notes
                </th>
                <th className="px-4 py-2 text-left font-bold text-navy">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((txn, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-blue-pale hover:bg-blue-pale/20 transition"
                  >
                    <td className="px-4 py-2">{txn.date}</td>
                    <td className="px-4 py-2">
                      <Tag variant={txn.type === "Revenue" ? "green" : "red"}>
                        {txn.type}
                      </Tag>
                    </td>
                    <td
                      className={`px-4 py-2 font-bold ${
                        txn.type === "Revenue"
                          ? "text-success"
                          : "text-danger"
                      }`}
                    >
                      {formatCurrency(txn.amount)}
                    </td>
                    <td className="px-4 py-2">{txn.dept || "-"}</td>
                    <td className="px-4 py-2">{txn.project || "-"}</td>
                    <td className="px-4 py-2">{txn.customer || "-"}</td>
                    <td className="px-4 py-2">
                      {txn.ctype ? (
                        <Tag variant="blue">{txn.ctype}</Tag>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {txn.costt ? (
                        <Tag variant="grey">{txn.costt}</Tag>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-4 py-2">{txn.owner || "-"}</td>
                    <td className="px-4 py-2 truncate max-w-xs">
                      {txn.notes || "-"}
                    </td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => {
                          const idx = transactions.indexOf(txn);
                          handleDelete(idx);
                        }}
                        className="text-danger hover:bg-danger-bg p-1 rounded transition"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={11}
                    className="px-4 py-8 text-center text-blue-mid"
                  >
                    No transactions found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}

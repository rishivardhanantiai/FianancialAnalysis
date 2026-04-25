import { useState } from "react";
import Layout from "@/components/Layout";
import { Trash2, RefreshCw } from "lucide-react";
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

const EMPTY_FORM = {
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
};

export default function DailyLog() {
  const { transactions, loading, error, addTransaction, deleteTransaction, refetch } =
    useTransactions();

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"" | "Revenue" | "Expense">("");
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

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
    .filter((t) => (filterType ? t.type === filterType : true));

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!formData.date || !formData.amount) {
      setSubmitError("Date and Amount are required");
      return;
    }

    setSubmitting(true);
    try {
      await addTransaction({
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
      });
      setFormData({ ...EMPTY_FORM, date: new Date().toISOString().split("T")[0] });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to add transaction");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (txn: TransactionRecord) => {
    if (!confirm("Remove this transaction?")) return;
    try {
      await deleteTransaction(txn.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete transaction");
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
        {submitError && (
          <div className="mb-3 px-3 py-2 bg-danger-bg text-danger text-xs rounded-lg">
            {submitError}
          </div>
        )}
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
              disabled={submitting}
              className="px-4 py-2 bg-navy text-white text-xs font-bold rounded-lg hover:bg-navy-light transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Saving…" : "+ Add Transaction"}
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
          <div className="flex gap-3 items-center">
            <button
              onClick={() => refetch()}
              title="Refresh"
              className="text-blue-mid hover:text-navy transition p-1 rounded"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
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

        {/* Error banner */}
        {error && (
          <div className="mb-4 px-3 py-2 bg-danger-bg text-danger text-xs rounded-lg">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-blue-pale border-b border-blue-pale">
                <th className="px-4 py-2 text-left font-bold text-navy">Date</th>
                <th className="px-4 py-2 text-left font-bold text-navy">Type</th>
                <th className="px-4 py-2 text-left font-bold text-navy">Amount</th>
                <th className="px-4 py-2 text-left font-bold text-navy">Department</th>
                <th className="px-4 py-2 text-left font-bold text-navy">Project</th>
                <th className="px-4 py-2 text-left font-bold text-navy">Customer</th>
                <th className="px-4 py-2 text-left font-bold text-navy">Cust. Type</th>
                <th className="px-4 py-2 text-left font-bold text-navy">Cost Type</th>
                <th className="px-4 py-2 text-left font-bold text-navy">Owner</th>
                <th className="px-4 py-2 text-left font-bold text-navy">Notes</th>
                <th className="px-4 py-2 text-left font-bold text-navy">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-blue-mid">
                    Loading transactions…
                  </td>
                </tr>
              ) : filteredTransactions.length > 0 ? (
                filteredTransactions.map((txn) => (
                  <tr
                    key={txn.id}
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
                        txn.type === "Revenue" ? "text-success" : "text-danger"
                      }`}
                    >
                      {formatCurrency(txn.amount)}
                    </td>
                    <td className="px-4 py-2">{txn.dept || "-"}</td>
                    <td className="px-4 py-2">{txn.project || "-"}</td>
                    <td className="px-4 py-2">{txn.customer || "-"}</td>
                    <td className="px-4 py-2">
                      {txn.ctype ? <Tag variant="blue">{txn.ctype}</Tag> : "-"}
                    </td>
                    <td className="px-4 py-2">
                      {txn.costt ? <Tag variant="grey">{txn.costt}</Tag> : "-"}
                    </td>
                    <td className="px-4 py-2">{txn.owner || "-"}</td>
                    <td className="px-4 py-2 truncate max-w-xs">{txn.notes || "-"}</td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => handleDelete(txn)}
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
                  <td colSpan={11} className="px-4 py-8 text-center text-blue-mid">
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

import { useState, useRef } from "react";
import Layout from "@/components/Layout";
import { Trash2, RefreshCw, Upload, FileText, Download, ExternalLink, X } from "lucide-react";
import { useTransactions } from "@/hooks/useTransactions";
import { useInvoiceUpload } from "@/hooks/useInvoiceUpload";
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
  business_unit: "India",
  invoice_number: "",
  invoice_url: "",
};

export default function DailyLog() {
  const { transactions, loading, error, addTransaction, deleteTransaction, refetch } =
    useTransactions();
  const { uploadInvoice, uploading: uploadInProgress, error: uploadError } = useInvoiceUpload();

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"" | "Revenue" | "Expense">("");
  const [filterBU, setFilterBU] = useState("");
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        t.notes.toLowerCase().includes(searchLower) ||
        t.business_unit?.toLowerCase().includes(searchLower) ||
        t.invoice_number?.toLowerCase().includes(searchLower)
      );
    })
    .filter((t) => (filterType ? t.type === filterType : true))
    .filter((t) => (filterBU ? t.business_unit === filterBU : true));

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = await uploadInvoice(file);
    if (result) {
      setFormData({ ...formData, invoice_url: result.url });
    }
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!formData.date || !formData.amount) {
      setSubmitError("Date and Amount are required");
      return;
    }

    if (formData.type === "Expense") {
      const missingFields = [];
      if (!formData.dept) missingFields.push("Department");
      if (!formData.project) missingFields.push("Project");
      if (!formData.costt) missingFields.push("Cost Type");
      if (!formData.owner) missingFields.push("Owner");

      if (missingFields.length > 0) {
        setSubmitError(`For Expense, required: ${missingFields.join(", ")}`);
        return;
      }
    }

    if (formData.type === "Revenue") {
      const missingFields = [];
      if (!formData.project) missingFields.push("Project");
      if (!formData.customer) missingFields.push("Customer");
      if (!formData.ctype) missingFields.push("Customer Type");
      if (!formData.owner) missingFields.push("Owner");

      if (missingFields.length > 0) {
        setSubmitError(`For Revenue, required: ${missingFields.join(", ")}`);
        return;
      }
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
        business_unit: formData.business_unit,
        invoice_number: formData.invoice_number,
        invoice_url: formData.invoice_url,
      });
      setFormData({ ...EMPTY_FORM, date: new Date().toISOString().split("T")[0] });
      if (fileInputRef.current) fileInputRef.current.value = "";
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

  const handleBulkDownload = () => {
    window.location.href = "/api/invoices/download";
  };

  return (
    <Layout
      title="Daily Transaction Log"
      subtitle="Single source of truth · Phase 1: Business Unit & Invoice Tracking"
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
        {uploadError && (
          <div className="mb-3 px-3 py-2 bg-danger-bg text-danger text-xs rounded-lg">
            Upload Error: {uploadError}
          </div>
        )}
        <form onSubmit={handleAddTransaction} className="flex flex-col gap-4">
          <div className="w-full grid grid-cols-6 gap-3">
            <div>
              <label className="block text-xs font-bold text-blue-mid uppercase mb-1">Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 border border-blue-pale rounded-lg text-xs bg-background focus:outline-none focus:ring-2 focus:ring-navy"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-blue-mid uppercase mb-1">BU</label>
              <select
                value={formData.business_unit}
                onChange={(e) => setFormData({ ...formData, business_unit: e.target.value })}
                className="w-full px-3 py-2 border border-blue-pale rounded-lg text-xs bg-background focus:outline-none focus:ring-2 focus:ring-navy"
              >
                <option>India</option>
                <option>UAE</option>
                <option>UK</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-blue-mid uppercase mb-1">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full px-3 py-2 border border-blue-pale rounded-lg text-xs bg-background focus:outline-none focus:ring-2 focus:ring-navy"
              >
                <option>Revenue</option>
                <option>Expense</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-blue-mid uppercase mb-1">Amount (₹)</label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0"
                className="w-full px-3 py-2 border border-blue-pale rounded-lg text-xs bg-background focus:outline-none focus:ring-2 focus:ring-navy"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-blue-mid uppercase mb-1">Dept</label>
              <select
                value={formData.dept}
                onChange={(e) => setFormData({ ...formData, dept: e.target.value })}
                className="w-full px-3 py-2 border border-blue-pale rounded-lg text-xs bg-background focus:outline-none focus:ring-2 focus:ring-navy"
              >
                <option value="">—</option>
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
              <label className="block text-xs font-bold text-blue-mid uppercase mb-1">Project</label>
              <input
                type="text"
                value={formData.project}
                onChange={(e) => setFormData({ ...formData, project: e.target.value })}
                placeholder="e.g. Platform"
                className="w-full px-3 py-2 border border-blue-pale rounded-lg text-xs bg-background focus:outline-none focus:ring-2 focus:ring-navy"
              />
            </div>
          </div>

          <div className="w-full grid grid-cols-6 gap-3">
            <div>
              <label className="block text-xs font-bold text-blue-mid uppercase mb-1">Inv #</label>
              <input
                type="text"
                value={formData.invoice_number}
                onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                placeholder="INV-001"
                className="w-full px-3 py-2 border border-blue-pale rounded-lg text-xs bg-background focus:outline-none focus:ring-2 focus:ring-navy"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-bold text-blue-mid uppercase mb-1">Invoice Attachment</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadInProgress}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-blue-mid rounded-lg text-xs text-blue-mid hover:bg-blue-pale transition"
                  >
                    {uploadInProgress ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    {formData.invoice_url ? "Change Invoice" : "Upload Invoice (PDF/Img)"}
                  </button>
                </div>
                {formData.invoice_url && (
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, invoice_url: "" })}
                    className="p-2 text-danger hover:bg-danger-bg rounded-lg transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {formData.invoice_url && (
                <p className="text-[10px] text-success font-bold mt-1 flex items-center gap-1">
                  <FileText className="w-3 h-3" /> File attached successfully
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-blue-mid uppercase mb-1">Customer</label>
              <input
                type="text"
                value={formData.customer}
                onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
                placeholder="Customer"
                className="w-full px-3 py-2 border border-blue-pale rounded-lg text-xs bg-background focus:outline-none focus:ring-2 focus:ring-navy"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-blue-mid uppercase mb-1">Owner</label>
              <input
                type="text"
                value={formData.owner}
                onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                placeholder="Owner"
                className="w-full px-3 py-2 border border-blue-pale rounded-lg text-xs bg-background focus:outline-none focus:ring-2 focus:ring-navy"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={submitting || uploadInProgress}
                className="w-full px-4 py-2 bg-navy text-white text-xs font-bold rounded-lg hover:bg-navy-light transition disabled:opacity-50"
              >
                {submitting ? "Saving…" : "+ Save"}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Transaction Log */}
      <div className="bg-white border border-blue-pale rounded-lg p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
          <div>
            <h3 className="text-xs font-bold text-navy uppercase tracking-wider">
              Transaction Log
              <span className="text-blue-mid font-normal ml-2">({filteredTransactions.length})</span>
            </h3>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <button
              onClick={handleBulkDownload}
              className="flex items-center gap-2 px-3 py-2 bg-blue-pale text-navy text-xs font-bold rounded-lg hover:bg-blue-mid hover:text-white transition"
            >
              <Download className="w-4 h-4" /> Export All Invoices
            </button>
            <button
              onClick={() => refetch()}
              className="text-blue-mid hover:text-navy transition p-2 bg-background border border-blue-pale rounded-lg"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <input
              type="text"
              placeholder="🔍 Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-3 py-2 border border-blue-pale rounded-lg text-xs bg-background focus:outline-none focus:ring-2 focus:ring-navy w-32"
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
            <select
              value={filterBU}
              onChange={(e) => setFilterBU(e.target.value)}
              className="px-3 py-2 border border-blue-pale rounded-lg text-xs bg-background focus:outline-none focus:ring-2 focus:ring-navy"
            >
              <option value="">All BUs</option>
              <option>India</option>
              <option>UAE</option>
              <option>UK</option>
            </select>
          </div>
        </div>

        {error && <div className="mb-4 px-3 py-2 bg-danger-bg text-danger text-xs rounded-lg">{error}</div>}

        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="bg-blue-pale border-b border-blue-pale">
                <th className="px-3 py-2 text-left font-bold text-navy">Date</th>
                <th className="px-3 py-2 text-left font-bold text-navy">BU</th>
                <th className="px-3 py-2 text-left font-bold text-navy">Type</th>
                <th className="px-3 py-2 text-left font-bold text-navy">Inv #</th>
                <th className="px-3 py-2 text-left font-bold text-navy">Amount</th>
                <th className="px-3 py-2 text-left font-bold text-navy">Dept / Project</th>
                <th className="px-3 py-2 text-left font-bold text-navy">Customer / Owner</th>
                <th className="px-3 py-2 text-left font-bold text-navy">Invoice</th>
                <th className="px-3 py-2 text-left font-bold text-navy">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-blue-mid">Loading...</td></tr>
              ) : filteredTransactions.length > 0 ? (
                filteredTransactions.map((txn) => (
                  <tr key={txn.id} className="border-b border-blue-pale hover:bg-blue-pale/20 transition">
                    <td className="px-3 py-2 whitespace-nowrap">{txn.date}</td>
                    <td className="px-3 py-2 font-bold">{txn.business_unit || "India"}</td>
                    <td className="px-3 py-2">
                      <Tag variant={txn.type === "Revenue" ? "green" : "red"}>{txn.type}</Tag>
                    </td>
                    <td className="px-3 py-2 font-mono text-blue-mid">{txn.invoice_number || "—"}</td>
                    <td className={`px-3 py-2 font-bold ${txn.type === "Revenue" ? "text-success" : "text-danger"}`}>
                      {formatCurrency(txn.amount)}
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-bold">{txn.project}</div>
                      <div className="text-[10px] text-blue-mid">{txn.dept}</div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-bold">{txn.customer || "—"}</div>
                      <div className="text-[10px] text-blue-mid">{txn.owner}</div>
                    </td>
                    <td className="px-3 py-2">
                      {txn.invoice_url ? (
                        <a
                          href={txn.invoice_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-navy font-bold hover:underline"
                        >
                          <FileText className="w-3 h-3" /> View <ExternalLink className="w-2 h-2" />
                        </a>
                      ) : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => handleDelete(txn)}
                        className="text-danger hover:bg-danger-bg p-1 rounded transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-blue-mid">No records found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}

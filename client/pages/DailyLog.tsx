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
  business_unit: "",
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
      <div className="box mb-16">
        <div className="box-title">Quick Add Transaction</div>
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
        <form onSubmit={handleAddTransaction}>
          <div className="form-row-4">
            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>BU</label>
              {formData.type === "Revenue" ? (
                <select
                  value={formData.business_unit}
                  onChange={(e) => setFormData({ ...formData, business_unit: e.target.value })}
                >
                  <option value="">— Select —</option>
                  <option>CFB</option>
                  <option>B2B</option>
                  <option>D2C</option>
                  <option>SS</option>
                </select>
              ) : (
                <select
                  value={formData.business_unit}
                  onChange={(e) => setFormData({ ...formData, business_unit: e.target.value })}
                >
                  <option value="">—</option>
                </select>
              )}
            </div>
            <div className="form-group">
              <label>Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              >
                <option>Revenue</option>
                <option>Expense</option>
              </select>
            </div>
            <div className="form-group">
              <label>Amount (₹)</label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>

          <div className="form-row-4" style={{ marginTop: "12px" }}>
            <div className="form-group">
              <label>Dept</label>
              <select
                value={formData.dept}
                onChange={(e) => setFormData({ ...formData, dept: e.target.value })}
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
            <div className="form-group">
              <label>Project</label>
              <input
                type="text"
                value={formData.project}
                onChange={(e) => setFormData({ ...formData, project: e.target.value })}
                placeholder="Project Name"
              />
            </div>
            <div className="form-group">
              <label>Inv #</label>
              <input
                type="text"
                value={formData.invoice_number}
                onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                placeholder="INV-001"
              />
            </div>
            <div className="form-group">
              <label>Owner</label>
              <input
                type="text"
                value={formData.owner}
                onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                placeholder="Owner"
              />
            </div>
          </div>

          <div className="form-row-4" style={{ marginTop: "12px" }}>
            <div className="form-group">
              {formData.type === "Revenue" ? (
                <>
                  <label>Customer Type</label>
                  <select
                    value={formData.ctype}
                    onChange={(e) => setFormData({ ...formData, ctype: e.target.value })}
                  >
                    <option value="">— Select —</option>
                    <option>New</option>
                    <option>Existing</option>
                  </select>
                </>
              ) : (
                <>
                  <label>Cost Type</label>
                  <select
                    value={formData.costt}
                    onChange={(e) => setFormData({ ...formData, costt: e.target.value })}
                  >
                    <option value="">— Select —</option>
                    <option>Fixed</option>
                    <option>Variable</option>
                  </select>
                </>
              )}
            </div>
            <div className="form-group">
              <label>{formData.type === "Revenue" ? "Customer" : "Vendor"}</label>
              <input
                type="text"
                value={formData.customer}
                onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
                placeholder={formData.type === "Revenue" ? "Customer" : "Vendor"}
              />
            </div>
            <div className="form-group">
              <label>Notes</label>
              <input
                type="text"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Optional notes"
              />
            </div>
            <div className="form-group">
              <label>Invoice Attachment</label>
              <div style={{ display: "flex", gap: "8px" }}>
                <div style={{ flex: 1, position: "relative" }}>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    style={{ display: "none" }}
                    accept=".pdf,.jpg,.jpeg,.png"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadInProgress}
                    className="btn-ui btn-outline"
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      borderStyle: "dashed",
                    }}
                  >
                    {uploadInProgress ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <Upload className="w-3 h-3" />
                    )}
                    {formData.invoice_url ? "Change" : "Upload"}
                  </button>
                </div>
                {formData.invoice_url && (
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, invoice_url: "" })}
                    className="btn-ui btn-danger"
                    style={{ padding: "4px 8px" }}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <button
                type="submit"
                disabled={submitting || uploadInProgress}
                className="btn-ui btn-primary"
                style={{ width: "100%" }}
              >
                {submitting ? "Saving…" : "+ Save"}
              </button>
            </div>
          </div>
        </form>

      </div>

      {/* Transaction Log */}
      <div className="box">
        <div className="box-title">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span>Transaction Log</span>
            <span style={{ fontSize: "10px", fontWeight: 500, color: "var(--muted)" }}>
              ({filteredTransactions.length})
            </span>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={handleBulkDownload}
              className="btn-ui btn-outline"
              style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px" }}
            >
              <Download className="w-3 h-3" /> Export All Invoices
            </button>
            <button
              onClick={() => refetch()}
              className="btn-ui btn-outline"
              style={{ padding: "4px 8px" }}
            >
              <RefreshCw className="w-3 h-3" />
            </button>
            <input
              type="text"
              placeholder="🔍 Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                border: "1.5px solid var(--f-border)",
                borderRadius: "8px",
                padding: "5px 10px",
                fontSize: "12px",
                width: "120px",
                background: "var(--background)",
              }}
            />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              style={{
                border: "1.5px solid var(--f-border)",
                borderRadius: "8px",
                padding: "5px 10px",
                fontSize: "12px",
                background: "var(--background)",
              }}
            >
              <option value="">All Types</option>
              <option value="Revenue">Revenue</option>
              <option value="Expense">Expense</option>
            </select>
            <select
              value={filterBU}
              onChange={(e) => setFilterBU(e.target.value)}
              style={{
                border: "1.5px solid var(--f-border)",
                borderRadius: "8px",
                padding: "5px 10px",
                fontSize: "12px",
                background: "var(--background)",
              }}
            >
              <option value="">All BUs</option>
              <option>CFB</option>
              <option>B2B</option>
              <option>D2C</option>
              <option>SS</option>
            </select>
          </div>
        </div>

        {error && <div className="alert red" style={{ marginBottom: "12px" }}>{error}</div>}

        <div style={{ overflowX: "auto" }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Date</th>
                <th>BU</th>
                <th>Type</th>
                <th>Inv #</th>
                <th>Amount</th>
                <th>Department & Project</th>
                <th>Customer or Vendor & Owner</th>
                <th>Notes</th>
                <th>Invoice</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="empty">Loading...</td></tr>
              ) : filteredTransactions.length > 0 ? (
                filteredTransactions.map((txn) => (
                  <tr key={txn.id}>
                    <td>{txn.date}</td>
                    <td className="fw-bold">{txn.business_unit || "—"}</td>
                    <td>
                      <span className={`tag ${txn.type === "Revenue" ? "green" : "red"}`}>
                        {txn.type}
                      </span>
                    </td>
                    <td className="mono" style={{ color: "var(--navy)" }}>{txn.invoice_number || "—"}</td>
                    <td className="fw-bold" style={{ color: txn.type === "Revenue" ? "var(--green)" : "var(--red)" }}>
                      {formatCurrency(txn.amount)}
                    </td>
                    <td>
                      <div className="fw-bold">{txn.project}</div>
                      <div style={{ fontSize: "10px", color: "var(--muted)" }}>{txn.dept}</div>
                    </td>
                    <td>
                      <div className="fw-bold">{txn.customer || "—"}</div>
                      <div style={{ fontSize: "10px", color: "var(--muted)" }}>{txn.owner}</div>
                    </td>
                    <td>
                      <div
                        title={txn.notes || ""}
                        style={{
                          maxWidth: "180px",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {txn.notes || "—"}
                      </div>
                    </td>
                    <td>
                      {txn.invoice_url ? (
                        <a
                          href={txn.invoice_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="tag blue"
                          style={{ textDecoration: "none", display: "inline-flex", gap: "4px" }}
                        >
                          <FileText className="w-3 h-3" /> View <ExternalLink className="w-2 h-2" />
                        </a>
                      ) : "—"}
                    </td>
                    <td>
                      <button
                        onClick={() => handleDelete(txn)}
                        className="btn-ui btn-danger"
                        style={{ padding: "4px 8px" }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={10} className="empty">No records found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}


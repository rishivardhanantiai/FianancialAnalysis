import React, { useState, useEffect, useMemo } from "react";
import Layout from "@/components/Layout";
import { fetchWithAuth } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { 
  Download, 
  Search, 
  RefreshCw, 
  FileText, 
  Calendar, 
  Filter, 
  ShieldCheck, 
  AlertTriangle,
  Layers,
  FileSpreadsheet
} from "lucide-react";
import type { TransactionRecord } from "@shared/api";

interface AuditLog {
  id: string;
  action: string;
  transaction_id: string;
  details: any;
  performed_by_email: string;
  performed_by_role: string;
  created_at: string;
}

export default function CAPortal() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"ledger" | "logs">("ledger");

  // --- DATA STATES ---
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // --- FILTER STATES ---
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"" | "Revenue" | "Expense">("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // --- DOWNLOAD STATES ---
  const [exportingLedger, setExportingLedger] = useState(false);
  const [exportingLogs, setExportingLogs] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);

  // --- LOAD DATA ---
  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      // Fetch transactions
      const txRes = await fetchWithAuth("/api/transactions");
      if (!txRes.ok) throw new Error("Failed to load transactions.");
      const txData = await txRes.json();
      setTransactions(txData.transactions ?? []);

      // Fetch audit logs
      const logRes = await fetchWithAuth("/api/logs");
      if (!logRes.ok) throw new Error("Failed to load audit logs.");
      const logData = await logRes.json();
      setLogs(logData.logs ?? []);

      if (isRefresh) {
        toast({
          title: "Data Refreshed",
          description: "Ledger and audit trails synced successfully.",
          variant: "success",
        });
      }
    } catch (error) {
      toast({
        title: "Sync Error",
        description: error instanceof Error ? error.message : "Failed to load audit registry.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // --- FILTERED TRANSACTIONS ---
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const query = search.toLowerCase();
      const matchesSearch = 
        t.project.toLowerCase().includes(query) ||
        t.dept.toLowerCase().includes(query) ||
        t.customer.toLowerCase().includes(query) ||
        t.owner.toLowerCase().includes(query) ||
        t.notes.toLowerCase().includes(query) ||
        (t.business_unit?.toLowerCase().includes(query)) ||
        (t.invoice_number?.toLowerCase().includes(query));

      const matchesType = typeFilter ? t.type === typeFilter : true;
      
      let matchesDates = true;
      if (startDate) {
        matchesDates = matchesDates && (t.date >= startDate);
      }
      if (endDate) {
        matchesDates = matchesDates && (t.date <= endDate);
      }

      return matchesSearch && matchesType && matchesDates;
    });
  }, [transactions, search, typeFilter, startDate, endDate]);

  // --- FILTERED LOGS ---
  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      const query = search.toLowerCase();
      const actionMatches = l.action.toLowerCase().includes(query);
      const emailMatches = l.performed_by_email.toLowerCase().includes(query);
      const roleMatches = l.performed_by_role.toLowerCase().includes(query);
      
      const details = l.details || {};
      const amountMatches = String(details.amount ?? "").includes(query);
      const projectMatches = String(details.project ?? "").toLowerCase().includes(query);
      const notesMatches = String(details.notes ?? "").toLowerCase().includes(query);

      const matchesSearch = 
        actionMatches || 
        emailMatches || 
        roleMatches || 
        amountMatches || 
        projectMatches || 
        notesMatches;

      let matchesDates = true;
      const logDate = l.created_at.split("T")[0];
      if (startDate) {
        matchesDates = matchesDates && (logDate >= startDate);
      }
      if (endDate) {
        matchesDates = matchesDates && (logDate <= endDate);
      }

      return matchesSearch && matchesDates;
    });
  }, [logs, search, startDate, endDate]);

  // --- CSV DOWNLOAD HANDLERS ---
  const handleExportLedger = async () => {
    setExportingLedger(true);
    try {
      const res = await fetchWithAuth("/api/exports/transactions");
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `MIS_Ledger_Audit_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast({
        title: "Export Success",
        description: "CSV ledger exported successfully.",
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Could not download the ledger dataset.",
        variant: "destructive",
      });
    } finally {
      setExportingLedger(false);
    }
  };

  const handleExportLogs = async () => {
    setExportingLogs(true);
    try {
      const res = await fetchWithAuth("/api/exports/logs");
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Audit_Logs_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast({
        title: "Export Success",
        description: "CSV audit logs exported successfully.",
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Could not download the audit log dataset.",
        variant: "destructive",
      });
    } finally {
      setExportingLogs(false);
    }
  };

  const handleExportExcel = async () => {
    setExportingExcel(true);
    try {
      const res = await fetchWithAuth("/api/invoices/download");
      if (!res.ok) throw new Error("Export failed");

      const data = await res.json();

      // Decode the Base64 string back into raw binary characters
      const byteCharacters = atob(data.fileData);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);

      // Create a blob from the raw binary array
      const blob = new Blob([byteArray], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });

      // Force browser download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.fileName || `MIS_Ledger_Export_${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      toast({
        title: "Export Success",
        description: "Excel workbook compiled and downloaded successfully.",
        variant: "success",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Export Failed",
        description: "Could not compile the Excel download.",
        variant: "destructive",
      });
    } finally {
      setExportingExcel(false);
    }
  };

  // --- RENDER ACTION LOG DETAILS SUMMARY ---
  const renderLogDetails = (details: any) => {
    if (!details) return "—";
    const typeLabel = details.type === "Revenue" ? "🟢 Rev" : "🔴 Exp";
    return (
      <span className="text-xs">
        <strong>{typeLabel}</strong>: ₹{Number(details.amount || 0).toLocaleString("en-IN")} |{" "}
        <strong>Proj</strong>: {details.project || "—"} |{" "}
        <strong>Dept</strong>: {details.dept || details.business_unit || "—"}
      </span>
    );
  };

  return (
    <Layout 
      title="CA Audit & Compliance Portal" 
      subtitle="Verify daily ledger statements, inspect security audit trails, and export compliant CSV records."
    >
      <div className="space-y-6">
        
        {/* ==========================================
            1. ACTION PANELS & STATISTICS
           ========================================== */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card-stat p-6 bg-white rounded-xl border border-blue-pale shadow-sm flex flex-col justify-between">
            <div>
              <p className="text-xs font-bold text-blue-muted uppercase tracking-wider">Total Ledger Entries</p>
              <h3 className="text-3xl font-extrabold text-navy mt-1">{loading ? "..." : transactions.length}</h3>
            </div>
            <p className="text-xs text-blue-muted mt-2">Active records synchronized from Supabase</p>
          </div>

          <div className="card-stat p-6 bg-white rounded-xl border border-blue-pale shadow-sm flex flex-col justify-between">
            <div>
              <p className="text-xs font-bold text-blue-muted uppercase tracking-wider">Recorded Operations</p>
              <h3 className="text-3xl font-extrabold text-navy mt-1">{loading ? "..." : logs.length}</h3>
            </div>
            <p className="text-xs text-blue-muted mt-2">Chronological events tracked in audit trail</p>
          </div>

          {/* Export Controls */}
          <div 
            className="p-6 text-white rounded-xl shadow-sm flex flex-col justify-between"
            style={{ background: "linear-gradient(135deg, var(--navy) 0%, var(--navy-dark) 100%)" }}
          >
            <div>
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--blue-pale)" }}>
                Compliance Export Tools
              </p>
              <h4 className="text-sm font-semibold mt-1">Download secure datasets (XLS / CSV)</h4>
            </div>
            <div className="flex flex-col gap-2 mt-4">
              <button 
                onClick={handleExportExcel} 
                disabled={exportingExcel || loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                {exportingExcel ? "Generating Excel..." : "Export Invoices & Ledger (Excel)"}
              </button>
              <div className="flex gap-2">
                <button 
                  onClick={handleExportLedger} 
                  disabled={exportingLedger || loading}
                  className="flex-1 bg-white hover:bg-blue-pale font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                  style={{ color: "var(--navy)" }}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" style={{ stroke: "var(--navy)" }} />
                  {exportingLedger ? "CSV Ledger" : "CSV Ledger"}
                </button>
                <button 
                  onClick={handleExportLogs} 
                  disabled={exportingLogs || loading}
                  className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition border border-white/20 disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  {exportingLogs ? "CSV Logs" : "CSV Logs"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ==========================================
            2. INTERACTIVE FILTERS BAR
           ========================================== */}
        <div className="bg-white p-4 rounded-xl border border-blue-pale shadow-sm flex flex-wrap gap-4 items-end justify-between">
          <div className="flex flex-wrap gap-3 items-center flex-1">
            {/* Search */}
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-blue-muted" />
              <input 
                type="text" 
                placeholder="Search ledger/logs..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-blue-pale rounded-lg text-sm bg-background focus:outline-none focus:ring-1 focus:ring-navy"
              />
            </div>

            {/* Type selector (only for Ledger tab) */}
            {activeTab === "ledger" && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-blue-mid">Type:</span>
                <select 
                  value={typeFilter} 
                  onChange={(e) => setTypeFilter(e.target.value as any)}
                  className="px-3 py-1.5 border border-blue-pale rounded-lg text-sm bg-background focus:outline-none"
                >
                  <option value="">All Types</option>
                  <option value="Revenue">Revenue</option>
                  <option value="Expense">Expense</option>
                </select>
              </div>
            )}

            {/* Date Range picker */}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-muted" />
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2 py-1.5 border border-blue-pale rounded-lg text-sm bg-background text-xs"
              />
              <span className="text-xs text-blue-muted">to</span>
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2 py-1.5 border border-blue-pale rounded-lg text-sm bg-background text-xs"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button 
              onClick={() => {
                setSearch("");
                setTypeFilter("");
                setStartDate("");
                setEndDate("");
              }}
              className="px-3 py-1.5 border border-blue-pale text-blue-mid font-semibold text-xs hover:bg-blue-pale rounded-lg transition"
            >
              Reset Filters
            </button>
            <button 
              onClick={() => loadData(true)} 
              disabled={refreshing || loading}
              className="px-3 py-1.5 bg-blue-pale text-navy font-bold text-xs hover:bg-blue-pale-dark rounded-lg flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Sync
            </button>
          </div>
        </div>

        {/* ==========================================
            3. TAB TOGGLES
           ========================================== */}
        <div className="flex border-b border-blue-pale">
          <button 
            onClick={() => setActiveTab("ledger")}
            className={`py-3 px-6 text-sm font-bold border-b-2 transition flex items-center gap-2 ${
              activeTab === "ledger" 
                ? "border-navy text-navy" 
                : "border-transparent text-blue-muted hover:text-blue-mid"
            }`}
          >
            <FileText className="w-4 h-4" />
            Financial Ledger ({filteredTransactions.length})
          </button>
          <button 
            onClick={() => setActiveTab("logs")}
            className={`py-3 px-6 text-sm font-bold border-b-2 transition flex items-center gap-2 ${
              activeTab === "logs" 
                ? "border-navy text-navy" 
                : "border-transparent text-blue-muted hover:text-blue-mid"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Transaction Audit Logs ({filteredLogs.length})
          </button>
        </div>

        {/* ==========================================
            4. TABS CONTENT VIEW
           ========================================== */}
        {loading ? (
          <div className="p-12 text-center bg-white rounded-xl border border-blue-pale shadow-sm">
            <RefreshCw className="w-8 h-8 text-blue-mid animate-spin mx-auto mb-3" />
            <p className="text-sm text-blue-mid font-semibold">Synchronizing audit registry...</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-blue-pale shadow-sm overflow-hidden">
            
            {/* TAB 1: LEDGER VIEW */}
            {activeTab === "ledger" && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-blue-pale border-b border-blue-pale text-xs font-bold text-navy uppercase tracking-wider">
                      <th className="p-3">Date</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">BU</th>
                      <th className="p-3">Project / Dept</th>
                      <th className="p-3">Customer / Owner</th>
                      <th className="p-3">Inv #</th>
                      <th className="p-3 text-right">Amount (₹)</th>
                      <th className="p-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-pale text-sm">
                    {filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-blue-muted italic">
                          No ledger records match the current filters.
                        </td>
                      </tr>
                    ) : (
                      filteredTransactions.map((t) => (
                        <tr key={t.id} className="hover:bg-blue-pale/20 transition-colors">
                          <td className="p-3 font-semibold text-navy whitespace-nowrap">{t.date}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                              t.type === "Revenue" 
                                ? "bg-success-bg text-success" 
                                : "bg-danger-bg text-danger"
                            }`}>
                              {t.type}
                            </span>
                          </td>
                          <td className="p-3 font-medium text-blue-mid">{t.business_unit || "—"}</td>
                          <td className="p-3">
                            <div className="font-semibold text-navy">{t.project || "—"}</div>
                            <div className="text-xs text-blue-muted">{t.dept || "—"}</div>
                          </td>
                          <td className="p-3">
                            <div className="font-semibold text-navy">{t.customer || "—"}</div>
                            <div className="text-xs text-blue-muted">{t.owner || "—"}</div>
                          </td>
                          <td className="p-3 font-mono text-xs">{t.invoice_number || "—"}</td>
                          <td className="p-3 text-right font-bold text-navy">
                            {Number(t.amount || 0).toLocaleString("en-IN", {
                              style: "currency",
                              currency: "INR",
                              maximumFractionDigits: 2
                            })}
                          </td>
                          <td className="p-3 text-blue-mid text-xs max-w-xs truncate" title={t.notes}>
                            {t.notes || "—"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 2: AUDIT LOGS VIEW */}
            {activeTab === "logs" && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-blue-pale border-b border-blue-pale text-xs font-bold text-navy uppercase tracking-wider">
                      <th className="p-3">Timestamp</th>
                      <th className="p-3">Action</th>
                      <th className="p-3">Transaction ID</th>
                      <th className="p-3">Details Summary</th>
                      <th className="p-3">Performed By</th>
                      <th className="p-3">User Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-pale text-sm">
                    {filteredLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-blue-muted italic">
                          No audit trail records match the search.
                        </td>
                      </tr>
                    ) : (
                      filteredLogs.map((l) => (
                        <tr key={l.id} className="hover:bg-blue-pale/20 transition-colors">
                          <td className="p-3 text-xs text-blue-muted whitespace-nowrap">
                            {new Date(l.created_at).toLocaleString("en-IN")}
                          </td>
                          <td className="p-3">
                            <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold ${
                              l.action === "CREATE" 
                                ? "bg-green-100 text-green-800" 
                                : l.action === "DELETE"
                                ? "bg-red-100 text-red-800"
                                : "bg-blue-100 text-blue-800"
                            }`}>
                              {l.action}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-xs text-blue-mid truncate max-w-[120px]" title={l.transaction_id}>
                            {l.transaction_id || "—"}
                          </td>
                          <td className="p-3 text-navy font-medium">
                            {renderLogDetails(l.details)}
                          </td>
                          <td className="p-3 text-xs font-mono font-medium text-navy">
                            {l.performed_by_email}
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs font-bold uppercase">
                              {l.performed_by_role}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
            
          </div>
        )}

      </div>
    </Layout>
  );
}

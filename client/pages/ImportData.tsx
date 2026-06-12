import Layout from "@/components/Layout";
import { useBankImport } from "@/hooks/useBankImport";
import { fetchWithAuth } from "@/lib/api";
import { StagingGrid, StagedTransaction, getMissingFields } from "@/components/ui/StagingGrid";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { Eye, AlertCircle, Hand, ZoomIn, ZoomOut, Maximize, MousePointer2, CheckCircle2, AlertTriangle, Plus } from "lucide-react";
import crypto from "crypto";
import ConfirmDialog from "@/components/ConfirmDialog";

// --- Interactive PDF Viewer ---
function InteractivePDFViewer({ pdfUrl, statementName }: { pdfUrl: string; statementName: string }) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isInteractiveMode, setIsInteractiveMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = () => setScale((s) => Math.min(s + 0.25, 4));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.25, 0.5));
  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isInteractiveMode) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !isInteractiveMode) return;
    setPosition({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Keyboard shortcut zooming in interactive mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isInteractiveMode) return;
      
      // Check if user is typing in an input/textarea
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA")) {
        return;
      }

      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        handleZoomIn();
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        handleZoomOut();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isInteractiveMode]);

  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;

    const handleWheel = (e: WheelEvent) => {
      if (!isInteractiveMode) return;
      // Completely stops browser from panning or scrolling the page
      e.preventDefault(); 
      e.stopPropagation();

      // Only listen to deltaY, preventing trackpad diagonal bleed
      const zoomSensitivity = 0.0015;
      const delta = e.deltaY * -zoomSensitivity;
      setScale((s) => Math.min(Math.max(0.5, s + delta), 4));
    };

    overlay.addEventListener("wheel", handleWheel, { passive: false });
    return () => overlay.removeEventListener("wheel", handleWheel);
  }, [isInteractiveMode]);

  return (
    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col h-[calc(100vh-8rem)] sticky top-6">
      <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-100">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Eye size={14} className="text-blue-500" /> Source Document
          </span>
          <span className="text-[10px] text-slate-500 font-medium truncate max-w-[180px]">
            {statementName}
          </span>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-50 border border-slate-200 rounded-lg shadow-sm z-20">
          <button
            onClick={() => setIsInteractiveMode(false)}
            className={`p-1.5 rounded-md transition-colors flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide ${
              !isInteractiveMode ? "bg-white shadow-sm text-slate-800" : "text-slate-500 hover:bg-slate-200/50"
            }`}
          >
            <MousePointer2 size={13} /> Select
          </button>
          <button
            onClick={() => setIsInteractiveMode(true)}
            className={`p-1.5 rounded-md transition-colors flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide ${
              isInteractiveMode ? "bg-blue-100 text-blue-700 shadow-sm" : "text-slate-500 hover:bg-slate-200/50"
            }`}
          >
            <Hand size={13} /> Pan
          </button>
          <div className="w-px h-4 bg-slate-300 mx-0.5" />
          <button onClick={handleZoomOut} className="p-1.5 text-slate-500 hover:bg-white rounded-md transition"><ZoomOut size={13} /></button>
          <span className="text-[10px] font-bold text-slate-500 w-7 text-center">{Math.round(scale * 100)}%</span>
          <button onClick={handleZoomIn} className="p-1.5 text-slate-500 hover:bg-white rounded-md transition"><ZoomIn size={13} /></button>
          <button onClick={handleReset} className="p-1.5 text-slate-500 hover:bg-white rounded-md transition"><Maximize size={13} /></button>
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden bg-slate-100/80 rounded-lg border border-slate-200">
        <div
          className="absolute top-0 left-0 origin-top-left flex items-start justify-start"
          style={{
            width: "200%",
            height: "200%",
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale * 0.5})`,
            transition: isDragging ? "none" : "all 0.15s ease-out",
          }}
        >
          <iframe 
            src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`} 
            className="w-full h-full border-0 pointer-events-auto" 
            title="Statement Preview"
          />
        </div>

        {isInteractiveMode && (
          <div
            ref={overlayRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className={`absolute inset-0 z-10 ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
          />
        )}
      </div>
    </div>
  );
}

// --- Main Page Component ---
export default function ImportData() {
  const { isUploading, stagedData: hookStagedData, uploadStatement, clearData } = useBankImport();
  const { toast } = useToast();
  
  const [dragActive, setDragActive] = useState(false);
  const [isSavingLocal, setIsSavingLocal] = useState(false);
  
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [statementName, setStatementName] = useState<string | null>(() => {
    if (typeof window !== "undefined") return sessionStorage.getItem("anti_ai_active_statement_name");
    return null;
  });

  const [stagedTransactions, setStagedTransactions] = useState<StagedTransaction[]>(() => {
    if (typeof window !== "undefined") {
      const savedDraft = localStorage.getItem("anti_ai_bank_staging_draft");
      return savedDraft ? JSON.parse(savedDraft) : [];
    }
    return [];
  });
  const [showErrors, setShowErrors] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const summary = useMemo(() => {
    const invalid = stagedTransactions.filter((row) => getMissingFields(row).length > 0).length;
    return { valid: stagedTransactions.length - invalid, invalid };
  }, [stagedTransactions]);

  useEffect(() => {
    localStorage.setItem("anti_ai_bank_staging_draft", JSON.stringify(stagedTransactions));
  }, [stagedTransactions]);

  useEffect(() => {
    if (hookStagedData && hookStagedData.length > 0) {
      setStagedTransactions((prev) => [...prev, ...hookStagedData]);
      clearData();
    }
  }, [hookStagedData, clearData]);

  useEffect(() => {
    return () => {
      if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
    };
  }, [pdfPreviewUrl]);

  const handleUpdateRow = useCallback((id: string, field: keyof StagedTransaction, value: string | number) => {
    setStagedTransactions((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const updated = { ...row, [field]: value };
        if (field === "type") {
          if (value === "Revenue") { updated.dept = ""; updated.costt = ""; }
          else { updated.business_unit = ""; updated.ctype = ""; }
        }
        return updated;
      })
    );
  }, []);

  const handleRemoveRow = useCallback((id: string) => {
    setStagedTransactions((prev) => prev.filter((row) => row.id !== id));
  }, []);

  const handleClearGrid = (force = false) => {
    if (force) {
      executeClearGrid();
    } else {
      setShowClearConfirm(true);
    }
  };

  const executeClearGrid = () => {
    localStorage.removeItem("anti_ai_bank_staging_draft");
    sessionStorage.removeItem("anti_ai_active_statement_name");
    setStagedTransactions([]);
    setStatementName(null);
    setShowErrors(false);
    if (pdfPreviewUrl) { URL.revokeObjectURL(pdfPreviewUrl); setPdfPreviewUrl(null); }
    setShowClearConfirm(false);
    toast({ title: "Cleared", description: "Staging grid draft has been cleared." });
  };

  const handleAddManualRow = useCallback(() => {
    const manualRow: StagedTransaction = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().split("T")[0],
      amount: 0,
      type: "Expense",
      notes: "Manual Entry",
      dept: "", project: "", customer: "", business_unit: "", invoice_number: "", owner: "", ctype: "", costt: "",
    };
    setStagedTransactions((prev) => [manualRow, ...prev]);
  }, []);

  const handleCommitToDailyLog = async () => {
    if (summary.invalid > 0) {
      setShowErrors(true);
      toast({ 
        title: "Validation Error", 
        description: `Please fill in all missing fields for the ${summary.invalid} highlighted rows before committing.`, 
        variant: "destructive" 
      });
      return;
    }

    setIsSavingLocal(true);
    try {
      const response = await fetchWithAuth("/api/transactions/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactions: stagedTransactions }),
      });

      if (!response.ok) throw new Error("Bulk save failed");

      handleClearGrid(true);
      toast({ title: "Success!", description: "Successfully committed items to Daily Log.", variant: "success" });
    } catch (error) {
      toast({ title: "Commit Failed", description: "Network error occurred.", variant: "destructive" });
    } finally {
      setIsSavingLocal(false);
    }
  };

  const handleFile = (file: File) => {
    if (file) {
      uploadStatement(file);
      setStatementName(file.name);
      sessionStorage.setItem("anti_ai_active_statement_name", file.name);
      setShowErrors(false);
      if (file.type === "application/pdf") {
        setPdfPreviewUrl(URL.createObjectURL(file));
      }
    }
  };

  return (
    <Layout title="Import Bank Statement" subtitle="Human-in-the-Loop Statement Parsing Workspace">
      <div className="flex flex-col gap-5 max-w-[1800px] mx-auto relative">
        
        {/* Sticky Action Header */}
        {stagedTransactions.length > 0 && (
          <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm sticky top-0 z-30">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                <span className="text-sm font-bold text-slate-800">{stagedTransactions.length} Total</span>
                <div className="w-px h-4 bg-slate-300" />
                <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1"><CheckCircle2 size={14}/> {summary.valid} Ready</span>
                {summary.invalid > 0 && (
                  <>
                    <div className="w-px h-4 bg-slate-300" />
                    <span className="text-xs font-semibold text-amber-600 flex items-center gap-1"><AlertTriangle size={14}/> {summary.invalid} Pending</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleAddManualRow} className="px-3 py-1.5 text-xs text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition font-semibold flex items-center gap-1 shadow-sm">
                <Plus size={14}/> Add Manual
              </button>
              <button onClick={handleClearGrid} className="px-3 py-1.5 text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-lg hover:bg-rose-100 transition font-semibold shadow-sm">
                Discard All
              </button>
              <button 
                onClick={handleCommitToDailyLog} 
                disabled={isSavingLocal} 
                className="px-4 py-1.5 text-xs bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-semibold shadow-md transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {isSavingLocal ? "Saving..." : `Commit to Log`}
              </button>
            </div>
          </div>
        )}

        {stagedTransactions.length === 0 ? (
          <div 
            className={`mt-6 border-2 border-dashed rounded-2xl p-16 flex flex-col items-center justify-center text-center transition-all bg-white ${
              dragActive ? 'border-blue-500 bg-blue-50/30' : 'border-slate-300'
            }`}
            onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }} 
            onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }} 
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }} 
            onDrop={(e) => { e.preventDefault(); setDragActive(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
          >
            <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-xl mb-4 shadow-sm">📑</div>
            <h3 className="text-base font-bold text-slate-800">Drop Statement PDF or CSV</h3>
            <p className="text-slate-500 mt-1.5 mb-5 max-w-sm text-xs leading-relaxed">
              Auto-extract dates, amounts, infer customers/vendors, and securely stage transactions for human review.
            </p>
            <label className="px-5 py-2.5 bg-slate-900 text-white rounded-lg cursor-pointer hover:bg-slate-800 transition-all text-xs font-semibold shadow-md">
              {isUploading ? "Extracting..." : "Browse Files"}
              <input type="file" className="hidden" onChange={(e) => e.target.files && handleFile(e.target.files[0])} disabled={isUploading} accept=".pdf,.csv" />
            </label>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch min-h-[75vh]">
            
            {/* Left: Interactive Viewer */}
            <div className="lg:col-span-5 h-full relative">
              {pdfPreviewUrl ? (
                <InteractivePDFViewer pdfUrl={pdfPreviewUrl} statementName={statementName || "Statement.pdf"} />
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-6 bg-slate-50 rounded-xl border border-dashed border-slate-300 h-[600px] sticky top-6 shadow-sm">
                  <AlertCircle size={28} className="text-slate-400 mb-2" />
                  <p className="text-xs font-bold text-slate-700">Preview Disconnected</p>
                  <label className="mt-4 px-4 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-md cursor-pointer transition text-xs font-semibold shadow-sm">
                    Re-link PDF
                    <input type="file" className="hidden" accept=".pdf" onChange={(e) => { if (e.target.files?.[0]?.type === "application/pdf") { const f = e.target.files[0]; setPdfPreviewUrl(URL.createObjectURL(f)); setStatementName(f.name); sessionStorage.setItem("anti_ai_active_statement_name", f.name); } }} />
                  </label>
                </div>
              )}
            </div>

            {/* Right: Spreadsheet-Lite Staging Grid */}
            <div className="lg:col-span-7 flex flex-col gap-3 pb-10">
              <div className="bg-blue-50 text-blue-800 p-4 rounded-xl border border-blue-100 flex gap-2.5 items-start shadow-sm">
                <span className="mt-0.5 text-base">💡</span>
                <p className="text-xs font-medium leading-relaxed font-sans">
                  <strong>Auto-Extraction Complete:</strong> Review each card carefully. Assign any blank mandatory columns (highlighted in yellow) before saving to the Daily Log. Scroll down to see all entries.
                </p>
              </div>
              
              <StagingGrid 
                data={stagedTransactions} 
                onUpdate={handleUpdateRow} 
                onRemove={handleRemoveRow} 
                onAdd={handleAddManualRow} 
                showErrors={showErrors}
              />
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog 
        isOpen={showClearConfirm}
        title="Discard Staged Transactions"
        message="Are you sure you want to discard all staged transactions? This action will clear your current import workspace."
        onConfirm={executeClearGrid}
        onCancel={() => setShowClearConfirm(false)}
        confirmText="Discard"
      />
    </Layout>
  );
}
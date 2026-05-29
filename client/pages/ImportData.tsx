import Layout from "@/components/Layout";
import { useBankImport } from "@/hooks/useBankImport";
import { StagingGrid } from "@/components/ui/StagingGrid";
import { useState } from "react";

export default function ImportData() {
  const { isUploading, isSaving, stagedData, uploadStatement, updateRow, removeRow, commitData, clearData } = useBankImport();
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadStatement(e.dataTransfer.files[0]);
    }
  };

  return (
    <Layout title="Import Bank Statement">
      <div className="flex flex-col gap-6 p-6">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Import Bank Statement</h1>
            <p className="text-slate-500">Upload a PDF or CSV to auto-extract and stage transactions.</p>
          </div>
          {stagedData.length > 0 && (
             <div className="flex gap-3">
               <button onClick={clearData} className="px-4 py-2 text-slate-600 bg-slate-100 rounded hover:bg-slate-200">
                 Cancel
               </button>
               <button onClick={commitData} disabled={isSaving} className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium shadow-sm">
                 {isSaving ? "Saving..." : `Save ${stagedData.length} to Daily Log`}
               </button>
             </div>
          )}
        </div>

        {stagedData.length === 0 ? (
          <div 
            className={`mt-10 border-2 border-dashed rounded-xl p-20 flex flex-col items-center justify-center text-center transition-colors ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-slate-50'}`}
            onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
          >
            <div className="text-4xl mb-4">📄</div>
            <h3 className="text-lg font-medium text-slate-700">Drag & Drop your statement here</h3>
            <p className="text-slate-500 mt-2 mb-6">Supports PDF, CSV, and Excel formats.</p>
            <label className="px-6 py-2 bg-slate-900 text-white rounded cursor-pointer hover:bg-slate-800 transition-colors">
              {isUploading ? "Extracting Data..." : "Browse Files"}
              <input 
                type="file" 
                className="hidden" 
                onChange={(e) => e.target.files && uploadStatement(e.target.files[0])} 
                disabled={isUploading}
              />
            </label>
          </div>
        ) : (
          <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-blue-50 text-blue-800 p-4 rounded border border-blue-100 flex gap-2 items-start">
              <span className="mt-0.5">💡</span>
              <p className="text-sm">Please assign a Department and Project to your expenses before saving. Rows discarded here will not be saved to the database.</p>
            </div>
            <StagingGrid data={stagedData} onUpdate={updateRow} onRemove={removeRow} />
          </div>
        )}
      </div>
    </Layout>
  );
}
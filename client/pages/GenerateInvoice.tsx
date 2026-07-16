import React, { useState, useEffect } from 'react';
import { pdf } from '@react-pdf/renderer';
import { InvoiceTemplate } from '../components/InvoiceTemplate'; 
import { fetchWithAuth } from "@/lib/api";
import Layout from "@/components/Layout"; // 👉 1. IMPORTED THE LAYOUT COMPONENT
import { Plus, Trash2, FileText, Loader2, Save } from 'lucide-react'; // Added Loader2 and Save icons
import { useToast } from "@/hooks/use-toast";

const GenerateInvoice = () => {
  const { toast } = useToast();
  // 1. Form State
  const [invoiceNumber, setInvoiceNumber] = useState(`INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
  const [client, setClient] = useState({ name: '', email: '', address: '', tax_id: '' });
  const [lineItems, setLineItems] = useState([
    { description: '', quantity: 1, unit_price: 0, subtotal: 0 }
  ]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);

  // 2. Auto-Calculate Totals whenever line items change
  useEffect(() => {
    const newTotal = lineItems.reduce((sum, item) => sum + item.subtotal, 0);
    setTotalAmount(newTotal);
  }, [lineItems]);

  // 3. Line Item Handlers
  const addLineItem = () => {
    setLineItems([...lineItems, { description: '', quantity: 1, unit_price: 0, subtotal: 0 }]);
  };

  const removeLineItem = (index: number) => {
    const updatedItems = lineItems.filter((_, i) => i !== index);
    setLineItems(updatedItems);
  };

  const updateLineItem = (index: number, field: string, value: string | number) => {
    const updatedItems = [...lineItems];
    const item = { ...updatedItems[index], [field]: value };
    
    if (field === 'quantity' || field === 'unit_price') {
      item.subtotal = Number(item.quantity) * Number(item.unit_price);
    }
    
    updatedItems[index] = item;
    setLineItems(updatedItems);
  };

  // 4. Handle Final Submit
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    
    try {
      console.log("1. Generating PDF Blob...");
      const blob = await pdf(
        <InvoiceTemplate 
          invoiceNumber={invoiceNumber} 
          client={client} 
          lineItems={lineItems} 
          totalAmount={totalAmount} 
        />
      ).toBlob();

      const file = new File([blob], `${invoiceNumber}.pdf`, { type: 'application/pdf' });

      console.log("2. Uploading PDF to Supabase Bucket...");
      const formData = new FormData();
      formData.append("invoice", file);

      const uploadResponse = await fetchWithAuth("/api/invoices/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) throw new Error("Failed to upload the PDF to storage.");

      const uploadData = await uploadResponse.json();
      const pdfPath = uploadData.path; 

      console.log("3. Saving Invoice to Database...");
      const saveResponse = await fetchWithAuth("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice_number: invoiceNumber,
          client_details: client,
          line_items: lineItems,
          total_amount: totalAmount,
          status: "Sent", 
          invoice_url: pdfPath, 
        }),
      });

      if (!saveResponse.ok) throw new Error("Failed to save the invoice record in the database.");

      toast({
        title: "Success",
        description: "Invoice generated, uploaded, and saved successfully!",
        variant: "success",
      });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${invoiceNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setInvoiceNumber(`INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
      setClient({ name: '', email: '', address: '', tax_id: '' });
      setLineItems([{ description: '', quantity: 1, unit_price: 0, subtotal: 0 }]);
      
    } catch (error) {
      console.error("Pipeline Error:", error);
      toast({
        title: "Generation Failed",
        description: "Failed to complete the invoice generation process.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Shared input styling for a cleaner UI
  const inputStyles = "w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white transition-all";

  // 👉 2. WRAPPED IN <Layout> COMPONENT
  return (
    <Layout 
      title="Create New Invoice" 
      subtitle="Generate a formatted company invoice and save it directly to the MIS."
    >
      <div className="max-w-4xl mx-auto pb-12">
        {/* Dynamic Invoice Badge */}
        <div className="flex justify-end mb-6">
          <div className="inline-flex items-center space-x-2 bg-blue-50 border border-blue-100 text-blue-700 px-4 py-2 rounded-lg font-mono text-sm font-semibold shadow-sm">
            <FileText size={16} />
            <span>{invoiceNumber}</span>
          </div>
        </div>

        <form onSubmit={handleGenerate} className="space-y-6">
          {/* --- CLIENT DETAILS SECTION --- */}
          <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-semibold mb-6 text-slate-800 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-sm font-bold">1</span>
              Client Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Company/Client Name *</label>
                <input 
                  required type="text" className={inputStyles} placeholder="e.g. Acme Corp"
                  value={client.name} onChange={(e) => setClient({...client, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Email Address *</label>
                <input 
                  required type="email" className={inputStyles} placeholder="client@company.com"
                  value={client.email} onChange={(e) => setClient({...client, email: e.target.value})}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Billing Address *</label>
                <input 
                  required type="text" className={inputStyles} placeholder="123 Business Rd, Suite 100..."
                  value={client.address} onChange={(e) => setClient({...client, address: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Tax ID / GST (Optional)</label>
                <input 
                  type="text" className={inputStyles} placeholder="Enter Tax ID"
                  value={client.tax_id} onChange={(e) => setClient({...client, tax_id: e.target.value})}
                />
              </div>
            </div>
          </div>

          {/* --- LINE ITEMS SECTION --- */}
          <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-sm font-bold">2</span>
                Services & Items
              </h2>
              <button 
                type="button" 
                onClick={addLineItem} 
                className="text-sm font-medium flex items-center px-3 py-1.5 bg-slate-50 text-slate-700 rounded-md hover:bg-slate-100 hover:text-blue-600 transition-colors border border-slate-200"
              >
                <Plus size={16} className="mr-1.5" /> Add Item
              </button>
            </div>

            {/* Desktop Table Header */}
            <div className="hidden md:grid grid-cols-12 gap-4 mb-3 px-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <div className="col-span-6">Description</div>
              <div className="col-span-2">Qty</div>
              <div className="col-span-2">Price (₹)</div>
              <div className="col-span-2 text-right">Total</div>
            </div>

            <div className="space-y-3">
              {lineItems.map((item, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center group bg-slate-50/50 p-2 rounded-lg border border-transparent hover:border-slate-100 transition-colors">
                  <div className="col-span-1 md:col-span-6">
                    <input 
                      placeholder="e.g. Website Development" required type="text" className={inputStyles}
                      value={item.description} onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                    />
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <input 
                      type="number" min="1" className={inputStyles} placeholder="1"
                      value={item.quantity} onChange={(e) => updateLineItem(index, 'quantity', e.target.value)}
                    />
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <input 
                      type="number" min="0" step="0.01" className={inputStyles} placeholder="0.00"
                      value={item.unit_price || ''} onChange={(e) => updateLineItem(index, 'unit_price', e.target.value)}
                    />
                  </div>
                  <div className="col-span-1 md:col-span-2 flex items-center justify-between md:justify-end pr-2">
                    <span className="font-mono font-medium text-slate-700">₹{item.subtotal.toFixed(2)}</span>
                    {lineItems.length > 1 && (
                      <button 
                        type="button" 
                        onClick={() => removeLineItem(index)} 
                        className="text-slate-400 hover:text-red-500 ml-3 transition-colors p-1.5 rounded-md hover:bg-red-50"
                        title="Remove Item"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Grand Total */}
            <div className="mt-8 border-t border-slate-200 pt-6 flex justify-end">
              <div className="bg-slate-50 px-6 py-4 rounded-xl border border-slate-200 min-w-[250px] flex justify-between items-center shadow-sm">
                <span className="text-slate-500 font-medium uppercase tracking-wider text-xs">Grand Total</span>
                <span className="text-2xl font-bold text-slate-900 font-mono">₹{totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-4">
            <button 
              type="submit" 
              disabled={isGenerating || lineItems.length === 0}
              className={`flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-semibold transition-all shadow-sm text-white min-w-[220px]
                ${isGenerating 
                  ? 'bg-blue-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0'}
              `}
            >
              {isGenerating ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Save size={20} />
                  Generate & Save
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default GenerateInvoice;
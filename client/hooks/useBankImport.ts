// client/hooks/useBankImport.ts
import { useState } from 'react';
import { useToast } from './use-toast'; // Assuming you have standard shadcn/radix toast

export interface StagedTransaction {
  id: string;
  date: string;
  amount: number;
  type: 'Revenue' | 'Expense';
  notes: string;
  dept: string;
  project: string;
  customer: string;
  business_unit: string; // BU: CFB, B2B, D2C, SS
  invoice_number: string; // Inv #
  owner: string;         // Owner
  ctype: string;         // Customer Type: New, Existing
  costt: string;         // Cost Type (from your schema, keeping it empty by default)
}

// ... rest of the useBankImport hook remains exactly the same

export function useBankImport() {
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [stagedData, setStagedData] = useState<StagedTransaction[]>([]);
  const { toast } = useToast();

  const uploadStatement = async (file: File) => {

  setIsUploading(true);

  const formData = new FormData();

  formData.append('statement', file);

  try {

    const res = await fetch('/api/import', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      throw new Error('Failed to parse document');
    }

    const result = await res.json();

    const transactions = result.transactions ?? [];

    setStagedData(transactions);

    toast({
      title: 'Success',
      description: `Extracted ${transactions.length} entries.`,
    });

  } catch (err) {

    toast({
      title: 'Import Failed',
      description: 'Could not process the document.',
      variant: 'destructive'
    });

  } finally {

    setIsUploading(false);
  }
};

  const updateRow = (id: string, field: keyof StagedTransaction, value: string | number) => {
    setStagedData(prev => 
      prev.map(row => row.id === id ? { ...row, [field]: value } : row)
    );
  };

  const removeRow = (id: string) => {
    setStagedData(prev => prev.filter(row => row.id !== id));
  };

  const commitData = async () => {
    setIsSaving(true);
    
    // DEBUGGING: Log the exact state before we send it
    console.log("Staged Data at save time:", stagedData);

    try {
      const payload = stagedData.map(({ id, ...rest }) => rest);
      
      // DEBUGGING: Log the exact JSON payload being sent
      console.log("Payload being sent to API:", JSON.stringify(payload, null, 2));

      const res = await fetch('/api/transactions/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: payload }),
      });
      // Catch the exact error from the backend
      if (!res.ok) {
        const errorData = await res.json();
        console.error("Bulk Insert Error Details:", errorData);
        throw new Error(errorData.error || 'Failed to save to database');
      }
      
      toast({ title: 'Saved!', description: 'Transactions added to Daily Log.' });
      setStagedData([]); // Clear the staging area
    } catch (err: any) {
      // Display the specific error message to the user
      toast({ 
        title: 'Save Failed', 
        description: err.message || 'Check the console for details.', 
        variant: 'destructive' 
      });
    } finally {
      setIsSaving(false);
    }
  };

  return {
    isUploading,
    isSaving,
    stagedData,
    uploadStatement,
    updateRow,
    removeRow,
    commitData,
    clearData: () => setStagedData([])
  };
}
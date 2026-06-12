import { useState } from "react";
import { InvoiceUploadResponse } from "@shared/api";
import { fetchWithAuth } from "@/lib/api";

export function useInvoiceUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadInvoice = async (file: File): Promise<InvoiceUploadResponse | null> => {
    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("invoice", file);

    try {
      const response = await fetchWithAuth("/api/invoices/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to upload invoice");
      }

      const data: InvoiceUploadResponse = await response.json();
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setError(message);
      return null;
    } finally {
      setUploading(false);
    }
  };

  return { uploadInvoice, uploading, error };
}

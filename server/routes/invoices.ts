import { RequestHandler } from "express";
import multer from "multer";
import { getSupabaseAdminClient } from "../lib/supabase";
import { InvoiceUploadResponse } from "@shared/api";
import path from "path";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

export const uploadMiddleware = upload.single("invoice");

export const handleUploadInvoice: RequestHandler = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const supabase = getSupabaseAdminClient();
    const file = req.file;
    const fileExt = path.extname(file.originalname);
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}${fileExt}`;
    const filePath = `invoices/${fileName}`;

    const { data, error } = await supabase.storage
      .from("invoices")
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const { data: publicUrlData } = supabase.storage
      .from("invoices")
      .getPublicUrl(filePath);

    const response: InvoiceUploadResponse = {
      url: publicUrlData.publicUrl,
      path: data.path,
    };

    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to upload invoice",
    });
  }
};

/**
 * Placeholder for Phase 1 - Bulk Download (ZIP)
 * In a real implementation, this would fetch all invoices for a period,
 * ZIP them, and stream the file back.
 */
export const handleBulkDownloadInvoices: RequestHandler = async (_req, res) => {
  return res.status(501).json({
    message: "Bulk download feature is planned for a future update.",
  });
};

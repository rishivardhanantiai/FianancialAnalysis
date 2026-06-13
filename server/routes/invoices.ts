import { RequestHandler } from "express";
import multer from "multer";
import { getSupabaseAdminClient } from "../lib/supabase";
import { InvoiceUploadResponse } from "@shared/api";
import path from "path";
import ExcelJS from "exceljs";

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

    const response: InvoiceUploadResponse = {
      url: "", // We no longer send the public URL back
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
 * Phase 1 - Bulk Download (.xlsx)
 * Fetches all invoices, generates 7-day signed URLs, and returns an Excel file buffer.
 * Optimized to prevent corruption and timeouts on Serverless platforms.
 */
export const handleBulkDownloadInvoices: RequestHandler = async (req, res) => {
  try {
    const supabase = getSupabaseAdminClient();

    // 1. Fetch ALL transactions
    const { data: transactions, error: dbError } = await supabase
      .from("transactions")
      .select("date, business_unit, type, invoice_number, amount, project, dept, customer, owner, invoice_url")
      .order("date", { ascending: false })
      .order("id", { ascending: false });

    if (dbError) throw dbError;
    if (!transactions || transactions.length === 0) {
      return res.status(404).json({ error: "No records found to export." });
    }

    // 2. Extract ONLY valid paths (ignores empty strings like "")
    const validPaths = transactions
      .map(t => t.invoice_url)
      .filter(path => path && path.trim() !== "");

    // 3. Generate Bulk Signed URLs (Valid for 7 Days)
    const urlMap = new Map();
    
    if (validPaths.length > 0) {
      const SEVEN_DAYS = 7 * 24 * 60 * 60;
      const { data: signedUrlsData, error: signError } = await supabase.storage
        .from("invoices")
        .createSignedUrls(validPaths, SEVEN_DAYS);

      if (signError) throw signError;

      signedUrlsData?.forEach(item => {
        if (!item.error) urlMap.set(item.path, item.signedUrl);
      });
    }

    // 4. Create the Excel Workbook
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Invoices Export");

    // Define Columns
    sheet.columns = [
      { header: "Date", key: "date", width: 15 },
      { header: "BU", key: "bu", width: 10 },
      { header: "Type", key: "type", width: 15 },
      { header: "Inv #", key: "invNum", width: 20 },
      { header: "Amount", key: "amount", width: 15 },
      { header: "Project / Dept", key: "project", width: 30 },
      { header: "Customer / Owner", key: "customer", width: 30 },
      { header: "Invoice Link (Valid 7 Days)", key: "link", width: 30 },
    ];

    // Style the Header Row
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2EFDA" } };

    // 5. Populate Rows
    transactions.forEach(txn => {
      const signedUrl = (txn.invoice_url && txn.invoice_url.trim() !== "") 
        ? urlMap.get(txn.invoice_url) 
        : null;
      
      const row = sheet.addRow({
        date: txn.date,
        bu: txn.business_unit || "—",
        type: txn.type,
        invNum: txn.invoice_number || "—",
        amount: txn.amount,
        project: `${txn.project || ""} (${txn.dept || ""})`,
        customer: `${txn.customer || ""} (${txn.owner || ""})`,
        link: signedUrl ? "Click to View Document" : "Invoice hasn't been uploaded" 
      });

      if (signedUrl) {
        const linkCell = row.getCell("link");
        linkCell.value = { text: "View Invoice", hyperlink: signedUrl };
        linkCell.font = { color: { argb: "FF0563C1" }, underline: true };
      } else {
        row.getCell("link").font = { color: { argb: "FF888888" }, italic: true };
      }
    });
// ==========================================
    // 6. SERVERLESS SAFE COMPILATION & DELIVERY (BASE64)
    // ==========================================
    
    // Compile entire sheet into a single buffer array first
    const buffer = await workbook.xlsx.writeBuffer();
    
    // Convert the raw buffer into a safe Base64 string
    const base64Data = Buffer.from(buffer).toString("base64");
    
    // Send it as a standard JSON response so Netlify doesn't scramble it
    return res.status(200).json({
      fileName: `MIS_Invoices_${new Date().toISOString().split("T")[0]}.xlsx`,
      fileData: base64Data
    });

  } catch (error) {
    console.error("Export Error:", error);
    res.status(500).json({ error: "Failed to generate Excel export" });
  }
};

export const handleGetInvoiceUrl: RequestHandler = async (req, res) => {
  try {
    const { path } = req.query; 
    if (!path || typeof path !== "string") {
      return res.status(400).json({ error: "Path is required" });
    }

    const supabase = getSupabaseAdminClient();
    
    // Generate a secure link that expires in 60 seconds for the preview panel
    const { data, error } = await supabase.storage
      .from("invoices")
      .createSignedUrl(path, 60);

    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json({ url: data.signedUrl });
  } catch (error) {
    return res.status(500).json({ error: "Failed to generate secure link" });
  }
};


// --- NEW INVOICE GENERATION ROUTES (PHASE 2) ---

/**
 * Save a newly generated invoice to the database
 * POST /api/invoices
 */
export const handleCreateInvoice: RequestHandler = async (req, res) => {
  try {
    // Fallback to empty object if serverless stripped the body entirely
    const body = req.body || {}; 

    // Extract values with fallbacks
    const final_invoice_number = body.invoice_number || body.invoiceNumber;
    const final_total_amount = body.total_amount !== undefined ? body.total_amount : body.totalAmount;
    const final_client_details = body.client_details || body.clientDetails;
    const final_line_items = body.line_items || body.lineItems;
    const final_invoice_url = body.invoice_url || body.invoiceUrl;
    const final_status = body.status || 'Draft';

    // Validation Guard
    if (!final_invoice_number || final_total_amount === undefined) {
      return res.status(400).json({ 
        error: "Invoice number and total amount are required."
      });
    }

    const supabase = getSupabaseAdminClient();
    
    const { data, error } = await supabase
      .from("invoices")
      .insert([{ 
        invoice_number: final_invoice_number, 
        client_details: final_client_details, 
        line_items: final_line_items, 
        total_amount: final_total_amount, 
        status: final_status, 
        invoice_url: final_invoice_url 
      }])
      .select("*")
      .single();

    if (error) {
      console.error("Create invoice DB error:", error.message);
      throw error;
    }

    return res.status(201).json({ invoice: data });
  } catch (error) {
    console.error("Create Invoice Catch Error:", error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : "Failed to create invoice" 
    });
  }
};

/**
 * Lookup an invoice by its number to link to a transaction
 * GET /api/invoices/lookup/:invoiceNumber
 */
export const handleLookupInvoice: RequestHandler = async (req, res) => {
  try {
    const { invoiceNumber } = req.params;
    
    if (!invoiceNumber) {
      return res.status(400).json({ error: "Invoice number is required" });
    }

    const supabase = getSupabaseAdminClient();
    
    const { data, error } = await supabase
      .from("invoices")
      .select("id, invoice_number, invoice_url")
      .eq("invoice_number", invoiceNumber)
      .single();

    if (error) {
      // Supabase throws error code PGRST116 if .single() finds no rows.
      // This is normal! It just means the user typed an invoice that doesn't exist.
      if (error.code === 'PGRST116') {
        return res.status(200).json({ exists: false });
      }
      throw error;
    }

    // Match found!
    return res.status(200).json({ exists: true, invoice: data });
  } catch (error) {
    console.error("Lookup Invoice Error:", error);
    return res.status(500).json({ error: "Failed to lookup invoice" });
  }
};

/**
 * Fetch all generated invoices (For the future Invoices Dashboard)
 * GET /api/invoices
 */
export const handleListInvoices: RequestHandler = async (_req, res) => {
  try {
    const supabase = getSupabaseAdminClient();
    
    const { data, error } = await supabase
      .from("invoices")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return res.status(200).json({ invoices: data });
  } catch (error) {
    console.error("List Invoices Error:", error);
    return res.status(500).json({ error: "Failed to list invoices" });
  }
};
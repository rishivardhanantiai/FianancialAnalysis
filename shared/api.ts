/**
 * Shared code between client and server
 * Useful to share types between client and server
 * and/or small pure JS functions that can be used on both client and server
 */

export interface DemoResponse {
  message: string;
}

export interface TransactionRecord {
  id: string;
  date: string;
  type: "Revenue" | "Expense";
  amount: number;
  dept: string;
  project: string;
  customer: string;
  ctype: string;
  costt: string;
  owner: string;
  notes: string;
  business_unit: string;
  invoice_number: string;
  invoice_url: string;
  
  // --- PHASE 2 ADDITION ---
  // Purpose: Holds the foreign key reference to the invoices table.
  // Reason: Allows the MIS dashboard to know this transaction is tied to an internal company invoice.
  linked_invoice_id?: string | null; 
  
  created_at?: string;
}

export interface InvoiceUploadResponse {
  url: string;
  path: string;
}

export interface TransactionsListResponse {
  transactions: TransactionRecord[];
}

export interface TransactionCreateRequest {
  date: string;
  type: "Revenue" | "Expense";
  amount: number;
  dept: string;
  project: string;
  customer: string;
  ctype: string;
  costt: string;
  owner: string;
  notes: string;
  business_unit: string;
  invoice_number: string;
  invoice_url: string;
  
  // Phase 2: Passed from the frontend when a typed invoice number matches our database.
  linked_invoice_id?: string | null;
}

export interface TransactionCreateResponse {
  transaction: TransactionRecord;
}

// ============================================================================
// --- PHASE 2: INVOICE GENERATION TYPES ---
// Purpose: These interfaces define the structure for the new invoice generation feature.
// Reason: Keeps the complex invoice data (client info, line items) separate from the 
// flat transaction ledger, improving database normalization and system scalability.
// ============================================================================

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface InvoiceClientDetails {
  name: string;
  address: string;
  email: string;
  tax_id?: string;
}

export interface InvoiceRecord {
  id: string;
  invoice_number: string;
  client_details: InvoiceClientDetails;
  line_items: InvoiceLineItem[];
  total_amount: number;
  status: "Draft" | "Sent" | "Paid" | "Cancelled";
  invoice_url: string; // The path to the generated PDF in the Supabase bucket
  created_at?: string;
}

export interface InvoiceCreateResponse {
  invoice: InvoiceRecord;
}
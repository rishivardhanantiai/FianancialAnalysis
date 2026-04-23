/**
 * Shared code between client and server
 * Useful to share types between client and server
 * and/or small pure JS functions that can be used on both client and server
 */

/**
 * Example response type for /api/demo
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
  created_at?: string;
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
}

export interface TransactionCreateResponse {
  transaction: TransactionRecord;
}

import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import {
  createTransaction,
  deleteTransaction,
  listTransactions,
  createBulkTransactions,
} from "./routes/transactions";

import {
  handleUploadInvoice,
  handleBulkDownloadInvoices,
  uploadMiddleware,
  handleGetInvoiceUrl,
} from "./routes/invoices";
import importRoutes from "./routes/import";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use('/api/import', importRoutes);

  // Example API routes
  app.get(["/api/ping", "/ping"], (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get(["/api/demo", "/demo"], handleDemo);
  app.get(["/api/transactions", "/transactions"], listTransactions);
  app.post(["/api/transactions", "/transactions"], createTransaction);
  app.delete(["/api/transactions", "/transactions"], deleteTransaction);
  app.delete(["/api/transactions/:id", "/transactions/:id"], deleteTransaction);
  app.post(["/api/transactions/bulk", "/transactions/bulk"], createBulkTransactions);
  // Invoice routes
  app.post("/api/invoices/upload", uploadMiddleware, handleUploadInvoice);
  app.get("/api/invoices/download", handleBulkDownloadInvoices);
  app.get("/api/invoices/url", handleGetInvoiceUrl);
  return app;
}

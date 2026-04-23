import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import {
  createTransaction,
  deleteTransaction,
  listTransactions,
} from "./routes/transactions";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Example API routes
  app.get(["/api/ping", "/ping"], (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get(["/api/demo", "/demo"], handleDemo);
  app.get(["/api/transactions", "/transactions"], listTransactions);
  app.post(["/api/transactions", "/transactions"], createTransaction);
  app.delete(["/api/transactions/:id", "/transactions/:id"], deleteTransaction);

  return app;
}

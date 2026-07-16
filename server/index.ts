console.log("SERVER INDEX LOADED");
import "dotenv/config";
import express from "express";
import cors from "cors";
import { verifySessionToken } from "./lib/session";

// --- Route Imports ---
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
  handleCreateInvoice, 
  handleLookupInvoice, 
  handleListInvoices
} from "./routes/invoices";
import importRoutes from "./routes/import";

// --- Role-Based Security Imports ---
import { handleLogin, handleChangePassword } from "./routes/auth";
import { listUsers, createUser, deleteUser, updateUser } from "./routes/users";
import { listLogs, exportTransactionsCSV, exportLogsCSV } from "./routes/logs";

export function createServer() {
  const app = express();

  // ==========================================
  // 1. STANDARD MIDDLEWARE
  // ==========================================
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // ==========================================
  // 2. SERVERLESS JSON FALLBACK (NETLIFY FIX)
  // ==========================================
  app.use((req, res, next) => {
    if (req.body) {
      if (Buffer.isBuffer(req.body)) {
        try {
          req.body = JSON.parse(req.body.toString("utf-8"));
        } catch (err) {
          // Body was not valid JSON, leave as-is
        }
      } else if (typeof req.body === 'string') {
        try {
          req.body = JSON.parse(req.body);
        } catch (err) {
          // Body was not valid JSON, leave as-is
        }
      }
    }
    next();
  });

  // ==========================================
  // 3. SESSION-BASED AUTHENTICATION MIDDLEWARE
  // ==========================================
  // Extracts and verifies the signed session token from the
  // Authorization header. Sets req._sessionUser on success.
  // Does NOT reject unauthenticated requests — that's done
  // by requireAuth/requireRole below, so public routes still work.
  const authenticateRequest: express.RequestHandler = (req: any, _res, next) => {
    const authHeader = req.headers["authorization"] as string | undefined;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const payload = verifySessionToken(token);
      if (payload) {
        req._sessionUser = payload;
      }
    }
    next();
  };

  app.use(authenticateRequest);

  // ==========================================
  // 4. ROLE-BASED ACCESS CONTROL MIDDLEWARE
  // ==========================================
  // Now uses the SERVER-VERIFIED session identity instead of
  // trusting client-sent x-user-role headers.
  const requireRole = (allowedRoles: string[]) => {
    return (req: any, res: any, next: any) => {
      const user = req._sessionUser;
      if (!user) {
        return res.status(401).json({ error: "Unauthorized. Valid session token required." });
      }
      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ error: `Forbidden. Role '${user.role}' does not have permission.` });
      }
      // Attach verified identity headers for downstream route handlers
      // that still read x-user-role / x-user-email / x-user-id
      req.headers["x-user-role"] = user.role;
      req.headers["x-user-email"] = user.email;
      req.headers["x-user-id"] = user.id;
      next();
    };
  };

  // ==========================================
  // 5. API ROUTES
  // ==========================================
  
  // Auth Routes (Public for login, session needed for password change)
  app.post("/api/auth/login", handleLogin);
  app.post("/api/auth/change-password", requireRole(["admin", "team", "ca"]), handleChangePassword);

  // User/Team Management Routes (Admin/Team viewable, Admin only CRUD)
  app.get("/api/users", requireRole(["admin", "team"]), listUsers);
  app.post("/api/users", requireRole(["admin"]), createUser);
  app.put("/api/users/:id", requireRole(["admin"]), updateUser);
  app.delete("/api/users/:id", requireRole(["admin"]), deleteUser);

  // Audit Logs & Export Routes (Viewable by all authorized roles)
  app.get("/api/logs", requireRole(["admin", "team", "ca"]), listLogs);
  app.get("/api/exports/transactions", requireRole(["admin", "team", "ca"]), exportTransactionsCSV);
  app.get("/api/exports/logs", requireRole(["admin", "team", "ca"]), exportLogsCSV);

  // Import Routes (Admin and Team only)
  app.use('/api/import', requireRole(["admin", "team"]), importRoutes);

  // System Routes (Public)
  app.get(["/api/ping", "/ping"], (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });
  app.get(["/api/demo", "/demo"], handleDemo);

  // Transaction Routes (CA read-only, Admin/Team write)
  app.get(["/api/transactions", "/transactions"], requireRole(["admin", "team", "ca"]), listTransactions);
  app.post(["/api/transactions", "/transactions"], requireRole(["admin", "team"]), createTransaction);
  app.delete(["/api/transactions", "/transactions"], requireRole(["admin", "team"]), deleteTransaction);
  app.delete(["/api/transactions/:id", "/transactions/:id"], requireRole(["admin", "team"]), deleteTransaction);
  app.post(["/api/transactions/bulk", "/transactions/bulk"], requireRole(["admin", "team"]), createBulkTransactions);

  // Invoice Routes (CA read-only, Admin/Team write)
  app.post("/api/invoices/upload", requireRole(["admin", "team"]), uploadMiddleware, handleUploadInvoice);
  app.get("/api/invoices/download", requireRole(["admin", "team", "ca"]), handleBulkDownloadInvoices);
  app.get("/api/invoices/url", requireRole(["admin", "team", "ca"]), handleGetInvoiceUrl);
  app.post("/api/invoices", requireRole(["admin", "team"]), handleCreateInvoice);
  app.get("/api/invoices/lookup/:invoiceNumber", requireRole(["admin", "team", "ca"]), handleLookupInvoice);
  app.get("/api/invoices", requireRole(["admin", "team", "ca"]), handleListInvoices);

  return app;
}
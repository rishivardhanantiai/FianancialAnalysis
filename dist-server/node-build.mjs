import path from "node:path";
import "dotenv/config";
import * as express$1 from "express";
import express from "express";
import cors from "cors";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
//#region server/routes/demo.ts
var handleDemo = (req, res) => {
	res.status(200).json({ message: "Hello from Express server" });
};
//#endregion
//#region shared/schema.ts
var transactionSchema = z.object({
	date: z.string().min(1, "Date is required"),
	type: z.enum(["Revenue", "Expense"]),
	amount: z.coerce.number().min(0, "Amount must be positive"),
	dept: z.string(),
	project: z.string(),
	customer: z.string(),
	ctype: z.string(),
	costt: z.string(),
	owner: z.string(),
	notes: z.string().optional()
}).refine((data) => {
	if (data.type === "Expense") return data.dept.trim().length > 0 && data.project.trim().length > 0 && data.costt.trim().length > 0 && data.owner.trim().length > 0;
	if (data.type === "Revenue") return data.project.trim().length > 0 && data.customer.trim().length > 0 && data.ctype.trim().length > 0 && data.owner.trim().length > 0;
	return true;
}, {
	message: "Check required fields for your transaction type",
	path: ["type"]
});
//#endregion
//#region server/lib/supabase.ts
var cachedClient = null;
function getSupabaseAdminClient() {
	if (cachedClient) return cachedClient;
	const supabaseUrl = process.env.SUPABASE_URL;
	const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!supabaseUrl || !serviceRoleKey) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables");
	cachedClient = createClient(supabaseUrl, serviceRoleKey, { auth: {
		persistSession: false,
		autoRefreshToken: false
	} });
	return cachedClient;
}
//#endregion
//#region server/routes/transactions.ts
var TABLE_NAME = "transactions";
function mapRowToTransaction(row) {
	return {
		id: row.id,
		date: row.date,
		type: row.type,
		amount: Number(row.amount ?? 0),
		dept: row.dept ?? "",
		project: row.project ?? "",
		customer: row.customer ?? "",
		ctype: row.ctype ?? "",
		costt: row.costt ?? "",
		owner: row.owner ?? "",
		notes: row.notes ?? "",
		created_at: row.created_at
	};
}
var listTransactions = async (_req, res) => {
	try {
		const { data, error } = await getSupabaseAdminClient().from(TABLE_NAME).select("*").order("date", { ascending: false }).order("created_at", { ascending: false });
		if (error) return res.status(500).json({ error: error.message });
		const response = { transactions: (data ?? []).map(mapRowToTransaction) };
		return res.status(200).json(response);
	} catch (error) {
		return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to list transactions" });
	}
};
var createTransaction = async (req, res) => {
	const validation = transactionSchema.safeParse(req.body);
	if (!validation.success) return res.status(400).json({
		error: "Invalid transaction payload",
		details: validation.error.flatten()
	});
	const payload = {
		date: validation.data.date,
		type: validation.data.type,
		amount: validation.data.amount,
		dept: validation.data.dept ?? "",
		project: validation.data.project ?? "",
		customer: validation.data.customer ?? "",
		ctype: validation.data.ctype ?? "",
		costt: validation.data.costt ?? "",
		owner: validation.data.owner ?? "",
		notes: validation.data.notes ?? ""
	};
	try {
		const { data, error } = await getSupabaseAdminClient().from(TABLE_NAME).insert(payload).select("*").single();
		if (error) return res.status(500).json({ error: error.message });
		const response = { transaction: mapRowToTransaction(data) };
		return res.status(201).json(response);
	} catch (error) {
		return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to create transaction" });
	}
};
var deleteTransaction = async (req, res) => {
	const id = req.params.id;
	if (!id) return res.status(400).json({ error: "Transaction id is required" });
	try {
		const { error } = await getSupabaseAdminClient().from(TABLE_NAME).delete().eq("id", id);
		if (error) return res.status(500).json({ error: error.message });
		return res.status(204).send();
	} catch (error) {
		return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to delete transaction" });
	}
};
//#endregion
//#region server/index.ts
function createServer() {
	const app = express();
	app.use(cors());
	app.use(express.json());
	app.use(express.urlencoded({ extended: true }));
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
//#endregion
//#region server/node-build.ts
var app = createServer();
var port = process.env.PORT || 3e3;
var __dirname = import.meta.dirname;
var distPath = path.join(__dirname, "../spa");
app.use(express$1.static(distPath));
app.get("*", (req, res) => {
	if (req.path.startsWith("/api/") || req.path.startsWith("/health")) return res.status(404).json({ error: "API endpoint not found" });
	res.sendFile(path.join(distPath, "index.html"));
});
app.listen(port, () => {
	console.log(`🚀 Fusion Starter server running on port ${port}`);
	console.log(`📱 Frontend: http://localhost:${port}`);
	console.log(`🔧 API: http://localhost:${port}/api`);
});
process.on("SIGTERM", () => {
	console.log("🛑 Received SIGTERM, shutting down gracefully");
	process.exit(0);
});
process.on("SIGINT", () => {
	console.log("🛑 Received SIGINT, shutting down gracefully");
	process.exit(0);
});
//#endregion
export {};

//# sourceMappingURL=node-build.mjs.map
import path from "node:path";
import "dotenv/config";
import * as express$1 from "express";
import express, { Router } from "express";
import cors from "cors";
import * as crypto$1 from "crypto";
import crypto from "crypto";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import multer from "multer";
import path$1 from "path";
import ExcelJS from "exceljs";
import PDFParser from "pdf2json";
//#region server/lib/session.ts
/**
* Server-side session token management.
*
* Generates and verifies HMAC-SHA256 signed session tokens so that
* the server never trusts client-sent role/email/id headers.
*
* Token format:  base64url(payload).base64url(signature)
* Payload:       JSON { id, email, role, iat, exp }
*
* The signing secret is derived from SUPABASE_SERVICE_ROLE_KEY which
* is already a server-only secret that never reaches the frontend.
*/
var SESSION_TTL_SECONDS = 1440 * 60;
function getSigningSecret() {
	const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!key) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY for session signing");
	return crypto.createHash("sha256").update(`session-sign:${key}`).digest("hex");
}
function base64UrlEncode(data) {
	return Buffer.from(data, "utf-8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function base64UrlDecode(encoded) {
	let base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
	while (base64.length % 4 !== 0) base64 += "=";
	return Buffer.from(base64, "base64").toString("utf-8");
}
function sign(payload, secret) {
	return crypto.createHmac("sha256", secret).update(payload).digest("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
/**
* Creates a signed session token for the authenticated user.
* Called after successful login verification.
*/
function createSessionToken(user) {
	const now = Math.floor(Date.now() / 1e3);
	const payload = {
		id: user.id,
		email: user.email,
		role: user.role,
		name: user.name,
		iat: now,
		exp: now + SESSION_TTL_SECONDS
	};
	const encodedPayload = base64UrlEncode(JSON.stringify(payload));
	return `${encodedPayload}.${sign(encodedPayload, getSigningSecret())}`;
}
/**
* Verifies a session token and returns the payload if valid.
* Returns null if the token is invalid, expired, or tampered.
*/
function verifySessionToken(token) {
	if (!token || typeof token !== "string") return null;
	const parts = token.split(".");
	if (parts.length !== 2) return null;
	const [encodedPayload, providedSignature] = parts;
	try {
		const expectedSignature = sign(encodedPayload, getSigningSecret());
		if (providedSignature.length !== expectedSignature.length || !crypto.timingSafeEqual(Buffer.from(providedSignature), Buffer.from(expectedSignature))) return null;
		const payloadStr = base64UrlDecode(encodedPayload);
		const payload = JSON.parse(payloadStr);
		const now = Math.floor(Date.now() / 1e3);
		if (payload.exp < now) return null;
		if (!payload.id || !payload.email || !payload.role) return null;
		return payload;
	} catch {
		return null;
	}
}
//#endregion
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
	notes: z.string().optional(),
	business_unit: z.string().optional(),
	invoice_number: z.string().optional(),
	invoice_url: z.string().optional(),
	linked_invoice_id: z.string().optional()
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
var TABLE_NAME$1 = "transactions";
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
		business_unit: row.business_unit ?? "",
		invoice_number: row.invoice_number ?? "",
		invoice_url: row.invoice_url ?? "",
		linked_invoice_id: row.linked_invoice_id ?? null,
		created_at: row.created_at
	};
}
var listTransactions = async (_req, res) => {
	try {
		const { data, error } = await getSupabaseAdminClient().from(TABLE_NAME$1).select("*").order("date", { ascending: false }).order("created_at", { ascending: false });
		if (error) return res.status(500).json({ error: error.message });
		const response = { transactions: (data ?? []).map(mapRowToTransaction) };
		return res.status(200).json(response);
	} catch (error) {
		return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to list transactions" });
	}
};
var createTransaction = async (req, res) => {
	const validation = transactionSchema.safeParse(req.body);
	if (!validation.success) {
		const type = req.body?.type;
		const amount = Number(req.body?.amount);
		const date = typeof req.body?.date === "string" ? req.body.date.trim() : "";
		const missingFields = [];
		if (!date) missingFields.push("Date");
		if (Number.isNaN(amount) || amount < 0) missingFields.push("Amount");
		if (type === "Expense") {
			if (!req.body?.dept) missingFields.push("Department");
			if (!req.body?.project) missingFields.push("Project");
			if (!req.body?.costt) missingFields.push("Cost Type");
			if (!req.body?.owner) missingFields.push("Owner");
		}
		if (type === "Revenue") {
			if (!req.body?.project) missingFields.push("Project");
			if (!req.body?.customer) missingFields.push("Customer");
			if (!req.body?.ctype) missingFields.push("Customer Type");
			if (!req.body?.owner) missingFields.push("Owner");
		}
		if (missingFields.length > 0) return res.status(400).json({ error: `Please fill required fields: ${missingFields.join(", ")}` });
		return res.status(400).json({
			error: "Invalid transaction payload",
			details: validation.error.flatten()
		});
	}
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
		notes: validation.data.notes ?? "",
		business_unit: validation.data.business_unit ?? "",
		invoice_number: validation.data.invoice_number ?? "",
		invoice_url: validation.data.invoice_url ?? "",
		linked_invoice_id: validation.data.linked_invoice_id ?? null
	};
	try {
		const supabase = getSupabaseAdminClient();
		const { data, error } = await supabase.from(TABLE_NAME$1).insert(payload).select("*").single();
		if (error) return res.status(500).json({ error: error.message });
		const userEmail = req.headers["x-user-email"] || "system@antiaifinance.com";
		const userRole = req.headers["x-user-role"] || "system";
		await supabase.from("transaction_logs").insert({
			action: "CREATE",
			transaction_id: data.id,
			details: data,
			performed_by_email: userEmail,
			performed_by_role: userRole
		});
		const response = { transaction: mapRowToTransaction(data) };
		return res.status(201).json(response);
	} catch (error) {
		return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to create transaction" });
	}
};
var deleteTransaction = async (req, res) => {
	const rawQueryId = req.query?.id;
	const queryId = Array.isArray(rawQueryId) ? rawQueryId[0] : rawQueryId;
	const id = req.params.id ?? queryId;
	if (!id) return res.status(400).json({ error: "Transaction id is required" });
	try {
		const supabase = getSupabaseAdminClient();
		const { data: txnToDelete } = await supabase.from(TABLE_NAME$1).select("*").eq("id", id).single();
		const { error } = await supabase.from(TABLE_NAME$1).delete().eq("id", id);
		if (error) return res.status(500).json({ error: error.message });
		if (txnToDelete) {
			const userEmail = req.headers["x-user-email"] || "system@antiaifinance.com";
			const userRole = req.headers["x-user-role"] || "system";
			await supabase.from("transaction_logs").insert({
				action: "DELETE",
				transaction_id: id,
				details: txnToDelete,
				performed_by_email: userEmail,
				performed_by_role: userRole
			});
		}
		return res.status(204).send();
	} catch (error) {
		return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to delete transaction" });
	}
};
var createBulkTransactions = async (req, res) => {
	const { transactions } = req.body;
	if (!Array.isArray(transactions) || transactions.length === 0) return res.status(400).json({ error: "An array of transactions is required" });
	const validPayloads = [];
	const validationErrors = [];
	transactions.forEach((tx, index) => {
		const validation = transactionSchema.safeParse(tx);
		if (!validation.success) validationErrors.push({
			index,
			issues: validation.error.flatten()
		});
		else validPayloads.push({
			date: validation.data.date,
			type: validation.data.type,
			amount: validation.data.amount,
			dept: validation.data.dept ?? "",
			project: validation.data.project ?? "",
			customer: validation.data.customer ?? "",
			ctype: validation.data.ctype ?? "",
			costt: validation.data.costt ?? "",
			owner: validation.data.owner ?? "",
			notes: validation.data.notes ?? "",
			business_unit: validation.data.business_unit ?? "",
			invoice_number: validation.data.invoice_number ?? "",
			invoice_url: validation.data.invoice_url ?? ""
		});
	});
	if (validationErrors.length > 0) return res.status(400).json({
		error: "Validation failed for some transactions in the bulk upload.",
		details: validationErrors
	});
	try {
		const supabase = getSupabaseAdminClient();
		const { data, error } = await supabase.from(TABLE_NAME$1).insert(validPayloads).select("*");
		if (error) return res.status(500).json({ error: error.message });
		if (data && data.length > 0) {
			const userEmail = req.headers["x-user-email"] || "system@antiaifinance.com";
			const userRole = req.headers["x-user-role"] || "system";
			const logs = data.map((t) => ({
				action: "BULK_CREATE",
				transaction_id: t.id,
				details: t,
				performed_by_email: userEmail,
				performed_by_role: userRole
			}));
			await supabase.from("transaction_logs").insert(logs);
		}
		const response = { transactions: (data ?? []).map(mapRowToTransaction) };
		return res.status(201).json(response);
	} catch (error) {
		return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to bulk create transactions" });
	}
};
var uploadMiddleware = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 5 * 1024 * 1024 }
}).single("invoice");
var handleUploadInvoice = async (req, res) => {
	try {
		if (!req.file) return res.status(400).json({ error: "No file uploaded" });
		const supabase = getSupabaseAdminClient();
		const file = req.file;
		const fileExt = path$1.extname(file.originalname);
		const filePath = `invoices/${`${Date.now()}-${Math.random().toString(36).substring(2)}${fileExt}`}`;
		const { data, error } = await supabase.storage.from("invoices").upload(filePath, file.buffer, {
			contentType: file.mimetype,
			upsert: false
		});
		if (error) return res.status(500).json({ error: error.message });
		const response = {
			url: "",
			path: data.path
		};
		return res.status(200).json(response);
	} catch (error) {
		return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to upload invoice" });
	}
};
/**
* Phase 1 - Bulk Download (.xlsx)
* Fetches all invoices, generates 7-day signed URLs, and returns an Excel file buffer.
* Optimized to prevent corruption and timeouts on Serverless platforms.
*/
var handleBulkDownloadInvoices = async (req, res) => {
	try {
		const supabase = getSupabaseAdminClient();
		const { data: transactions, error: dbError } = await supabase.from("transactions").select("date, business_unit, type, invoice_number, amount, project, dept, customer, owner, invoice_url").order("date", { ascending: false }).order("id", { ascending: false });
		if (dbError) throw dbError;
		if (!transactions || transactions.length === 0) return res.status(404).json({ error: "No records found to export." });
		const validPaths = transactions.map((t) => t.invoice_url).filter((path) => path && path.trim() !== "");
		const urlMap = /* @__PURE__ */ new Map();
		if (validPaths.length > 0) {
			const { data: signedUrlsData, error: signError } = await supabase.storage.from("invoices").createSignedUrls(validPaths, 10080 * 60);
			if (signError) throw signError;
			signedUrlsData?.forEach((item) => {
				if (!item.error) urlMap.set(item.path, item.signedUrl);
			});
		}
		const workbook = new ExcelJS.Workbook();
		const sheet = workbook.addWorksheet("Invoices Export");
		sheet.columns = [
			{
				header: "Date",
				key: "date",
				width: 15
			},
			{
				header: "BU",
				key: "bu",
				width: 10
			},
			{
				header: "Type",
				key: "type",
				width: 15
			},
			{
				header: "Inv #",
				key: "invNum",
				width: 20
			},
			{
				header: "Amount",
				key: "amount",
				width: 15
			},
			{
				header: "Project / Dept",
				key: "project",
				width: 30
			},
			{
				header: "Customer / Owner",
				key: "customer",
				width: 30
			},
			{
				header: "Invoice Link (Valid 7 Days)",
				key: "link",
				width: 30
			}
		];
		sheet.getRow(1).font = { bold: true };
		sheet.getRow(1).fill = {
			type: "pattern",
			pattern: "solid",
			fgColor: { argb: "FFE2EFDA" }
		};
		transactions.forEach((txn) => {
			const signedUrl = txn.invoice_url && txn.invoice_url.trim() !== "" ? urlMap.get(txn.invoice_url) : null;
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
				linkCell.value = {
					text: "View Invoice",
					hyperlink: signedUrl
				};
				linkCell.font = {
					color: { argb: "FF0563C1" },
					underline: true
				};
			} else row.getCell("link").font = {
				color: { argb: "FF888888" },
				italic: true
			};
		});
		const buffer = await workbook.xlsx.writeBuffer();
		const base64Data = Buffer.from(buffer).toString("base64");
		return res.status(200).json({
			fileName: `MIS_Invoices_${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.xlsx`,
			fileData: base64Data
		});
	} catch (error) {
		console.error("Export Error:", error);
		res.status(500).json({ error: "Failed to generate Excel export" });
	}
};
var handleGetInvoiceUrl = async (req, res) => {
	try {
		const { path } = req.query;
		if (!path || typeof path !== "string") return res.status(400).json({ error: "Path is required" });
		const { data, error } = await getSupabaseAdminClient().storage.from("invoices").createSignedUrl(path, 60);
		if (error) return res.status(500).json({ error: error.message });
		return res.status(200).json({ url: data.signedUrl });
	} catch (error) {
		return res.status(500).json({ error: "Failed to generate secure link" });
	}
};
/**
* Save a newly generated invoice to the database
* POST /api/invoices
*/
var handleCreateInvoice = async (req, res) => {
	try {
		const body = req.body || {};
		const final_invoice_number = body.invoice_number || body.invoiceNumber;
		const final_total_amount = body.total_amount !== void 0 ? body.total_amount : body.totalAmount;
		const final_client_details = body.client_details || body.clientDetails;
		const final_line_items = body.line_items || body.lineItems;
		const final_invoice_url = body.invoice_url || body.invoiceUrl;
		const final_status = body.status || "Draft";
		if (!final_invoice_number || final_total_amount === void 0) return res.status(400).json({ error: "Invoice number and total amount are required." });
		const { data, error } = await getSupabaseAdminClient().from("invoices").insert([{
			invoice_number: final_invoice_number,
			client_details: final_client_details,
			line_items: final_line_items,
			total_amount: final_total_amount,
			status: final_status,
			invoice_url: final_invoice_url
		}]).select("*").single();
		if (error) {
			console.error("Create invoice DB error:", error.message);
			throw error;
		}
		return res.status(201).json({ invoice: data });
	} catch (error) {
		console.error("Create Invoice Catch Error:", error);
		return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to create invoice" });
	}
};
/**
* Lookup an invoice by its number to link to a transaction
* GET /api/invoices/lookup/:invoiceNumber
*/
var handleLookupInvoice = async (req, res) => {
	try {
		const { invoiceNumber } = req.params;
		if (!invoiceNumber) return res.status(400).json({ error: "Invoice number is required" });
		const { data, error } = await getSupabaseAdminClient().from("invoices").select("id, invoice_number, invoice_url").eq("invoice_number", invoiceNumber).single();
		if (error) {
			if (error.code === "PGRST116") return res.status(200).json({ exists: false });
			throw error;
		}
		return res.status(200).json({
			exists: true,
			invoice: data
		});
	} catch (error) {
		console.error("Lookup Invoice Error:", error);
		return res.status(500).json({ error: "Failed to lookup invoice" });
	}
};
/**
* Fetch all generated invoices (For the future Invoices Dashboard)
* GET /api/invoices
*/
var handleListInvoices = async (_req, res) => {
	try {
		const { data, error } = await getSupabaseAdminClient().from("invoices").select("*").order("created_at", { ascending: false });
		if (error) throw error;
		return res.status(200).json({ invoices: data });
	} catch (error) {
		console.error("List Invoices Error:", error);
		return res.status(500).json({ error: "Failed to list invoices" });
	}
};
//#endregion
//#region server/lib/statementParser.ts
var MONTHS = {
	JAN: 1,
	JANUARY: 1,
	FEB: 2,
	FEBRUARY: 2,
	MAR: 3,
	MARCH: 3,
	APR: 4,
	APRIL: 4,
	MAY: 5,
	JUN: 6,
	JUNE: 6,
	JUL: 7,
	JULY: 7,
	AUG: 8,
	AUGUST: 8,
	SEP: 9,
	SEPT: 9,
	SEPTEMBER: 9,
	OCT: 10,
	OCTOBER: 10,
	NOV: 11,
	NOVEMBER: 11,
	DEC: 12,
	DECEMBER: 12
};
var NOISE_PATTERNS = [
	/^PAGE\s+NO/i,
	/^ACCOUNT\s+BRANCH/i,
	/^ACCOUNT\s+STATUS/i,
	/^A\/C\s+OPEN\s+DATE/i,
	/^STATEMENT\s+OF\s+ACCOUNT/i,
	/^STATEMENT\s+SUMMARY/i,
	/^OPENING\s+BALANCE/i,
	/^CLOSING\s+BAL/i,
	/^CLOSING\s+BALANCE\s+INCLUDES/i,
	/CONTENTS\s+OF\s+THIS\s+STATEMENT/i,
	/^REGISTERED\s+OFFICE/i,
	/^HDFC\s+BANK\s+LIMITED/i,
	/FUNDS\s+EARMARKED/i,
	/STATE\s+ACCOUNT\s+BRANCH\s+GSTN/i,
	/GSTIN\s+NUMBER/i,
	/HTTPS?:\/\//i,
	/^GENERATED\s+ON/i,
	/^GENERATED\s+BY/i,
	/^REQUESTING\s+BRANCH/i,
	/COMPUTER\s+GENERATED\s+STATEMENT/i,
	/NOT\s+REQUIRE\s+SIGNATURE/i,
	/\bDATE\b.*\bNARRATION\b/i,
	/\bTXN\s+DATE\b.*\bBALANCE\b/i,
	/\bVALUE\s+DATE\b.*\bBALANCE\b/i,
	/^ACCOUNT\s+NAME/i,
	/^DRAWING\s+POWER/i,
	/^INTEREST\s+RATE/i,
	/^MOD\s+BALANCE/i,
	/^CIF\s+NO/i,
	/^IFS\s+CODE/i,
	/^MICR\s+CODE/i,
	/^NOMINATION\s+REGISTERED/i,
	/^BALANCE\s+AS\s+ON/i,
	/^ACCOUNT\s+STATEMENT\s+FROM/i,
	/^\bADDRESS\b/i,
	/^\bACCOUNT\s+NUMBER\b/i,
	/^\bACCOUNT\s+DESCRIPTION\b/i
];
patchPdf2JsonWarnings();
function patchPdf2JsonWarnings() {
	const globalWithFlag = globalThis;
	if (globalWithFlag.__bankParserWarnPatched) return;
	const originalWarn = console.warn.bind(console);
	console.warn = (...args) => {
		const first = String(args[0] ?? "");
		if (first.includes("Unsupported: field.type") || first.includes("NOT valid form element") || first.includes("Setting up fake worker")) return;
		originalWarn(...args);
	};
	globalWithFlag.__bankParserWarnPatched = true;
}
function normalizeWhitespace(value) {
	return value.replace(/\s+/g, " ").trim();
}
function decodePdfText(value) {
	try {
		return decodeURIComponent(value);
	} catch {
		try {
			return unescape(value);
		} catch {
			return value;
		}
	}
}
function rowText(items) {
	return normalizeWhitespace(items.map((item) => item.text).join(" "));
}
function groupItemsIntoRows(items, tolerance) {
	const rows = [];
	const pages = [...new Set(items.map((item) => item.page))].sort((a, b) => a - b);
	for (const page of pages) {
		const pageItems = items.filter((item) => item.page === page).sort((a, b) => a.y - b.y || a.x - b.x);
		let current = [];
		let currentY = Number.NEGATIVE_INFINITY;
		for (const item of pageItems) {
			if (!current.length || Math.abs(item.y - currentY) <= tolerance) {
				current.push(item);
				if (!Number.isFinite(currentY)) currentY = item.y;
				continue;
			}
			const sorted = current.sort((a, b) => a.x - b.x);
			rows.push({
				items: sorted,
				page,
				y: currentY,
				text: rowText(sorted)
			});
			current = [item];
			currentY = item.y;
		}
		if (current.length) {
			const sorted = current.sort((a, b) => a.x - b.x);
			rows.push({
				items: sorted,
				page,
				y: currentY,
				text: rowText(sorted)
			});
		}
	}
	return rows;
}
function itemsInRange(row, range) {
	return row.items.filter((item) => item.x >= range.min && item.x <= range.max);
}
function joinNarrationItems(items) {
	return normalizeWhitespace(items.filter((item) => !/^[\d,]+\.\d{2}$/.test(item.text)).map((item) => item.text).join(" ")).replace(/\s*-\s*/g, " - ").replace(/\s*\/\s*/g, "/").replace(/\s+([,.])/g, "$1").replace(/\s{2,}/g, " ").trim();
}
function toIsoDate(day, month, rawYear) {
	let yearText = rawYear.replace(/\D/g, "");
	if (yearText.length === 3) yearText = yearText.slice(0, 2);
	let year = Number(yearText);
	if (yearText.length <= 2) year += 2e3;
	if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year) || day < 1 || month < 1 || month > 12 || year < 1990 || year > 2099) return null;
	const maxDays = new Date(year, month, 0).getDate();
	const safeDay = Math.min(day, maxDays);
	return `${year}-${String(month).padStart(2, "0")}-${String(safeDay).padStart(2, "0")}`;
}
function parseDateFromText(raw) {
	if (!raw) return null;
	const compact = raw.toUpperCase().replace(/\s+/g, "").replace(/[.]/g, "");
	const numeric = compact.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
	if (numeric) return toIsoDate(Number(numeric[1]), Number(numeric[2]), numeric[3]);
	const named = compact.match(/(\d{1,2})[-/]?([A-Z]{3,9})[-/]?(\d{2,4})/);
	if (named) {
		const month = MONTHS[named[2]];
		if (month) return toIsoDate(Number(named[1]), month, named[3]);
	}
	return null;
}
function parseAmountText(raw) {
	if (!raw) return null;
	const matches = raw.replace(/(?:INR|RS\.?|₹|CR|DR)/gi, "").replace(/[()]/g, "").match(/-?[\d,.]+\.\d{1,2}(?!\d)/g);
	if (!matches?.length) return null;
	let numStr = matches[matches.length - 1].replace(/,/g, "");
	const lastDot = numStr.lastIndexOf(".");
	if (lastDot !== -1) numStr = numStr.substring(0, lastDot).replace(/\./g, "") + numStr.substring(lastDot);
	const value = Number(numStr);
	if (!Number.isFinite(value)) return null;
	return Math.abs(Number(value.toFixed(2)));
}
function getColumnAmount(row, range) {
	return parseAmountText(rowText(itemsInRange(row, range)));
}
function itemsInRightEdgeRange(row, range) {
	return row.items.filter((item) => {
		const rightEdge = item.x + item.text.length * .45;
		return rightEdge >= range.min && rightEdge <= range.max;
	});
}
function getHdfcColumnAmount(row, range) {
	return parseAmountText(rowText(itemsInRightEdgeRange(row, range)));
}
function roundAmount(value) {
	return Math.round((value + Number.EPSILON) * 100) / 100;
}
function isNoiseRow(row) {
	const text = row.text.trim();
	if (!text) return true;
	if (/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/.test(text)) return false;
	return NOISE_PATTERNS.some((pattern) => pattern.test(text));
}
function cleanDescription(notes) {
	if (!notes) return "";
	return notes.replace(/\bSING\s+H\b/gi, "SINGH").replace(/\bSIN\s+GH\b/gi, "SINGH").replace(/\bBIKRAMJ\b/gi, "BIKRAMJIT").replace(/\bPHON\s+E\b/gi, "PHONE").replace(/\bCRE\s+D\b/gi, "CRED").replace(/\bH\s+DFC\b/gi, "HDFC").replace(/\bHD\s+FC\b/gi, "HDFC").replace(/\bDF\s+C\b/gi, "DFC").replace(/\b\d{12,}\b/g, "").replace(/\b0{6,}\d+\b/g, "").replace(/\bAT\s+[A-Z]+\s+\d{2}:\d{2}:\d{2}\/\d+\b/gi, "").replace(/\s*-\s*/g, " - ").replace(/\s{2,}/g, " ").replace(/^[-\s]+|[-\s]+$/g, "").trim();
}
function extractCustomer(notes) {
	const cleaned = cleanDescription(notes);
	if (!cleaned) return "";
	const upper = cleaned.toUpperCase();
	const chunks = cleaned.split(/\s+-\s+|\/+/).map((part) => normalizeWhitespace(part)).filter(Boolean);
	if (upper.startsWith("UPI")) {
		const candidate = chunks.find((part) => !/^UPI$/i.test(part) && !/^[A-Z]{4}0[A-Z0-9]+$/i.test(part) && !/^\d+$/.test(part));
		if (candidate) return sanitizePartyName(candidate);
	}
	if (/^TPT\b/i.test(upper)) {
		const candidate = [...chunks].reverse().find((part) => !/^(TPT|C\s*CARD|CARD|BILL|SALARY)$/i.test(part));
		if (candidate) return sanitizePartyName(candidate);
	}
	if (/^(AXIS|BANK)\b/i.test(upper)) {
		const candidate = chunks.find((part) => /\b[A-Z]*SINGH\b|[A-Z]{5,}/i.test(part));
		if (candidate) return sanitizePartyName(candidate.replace(/^IN\s+/i, ""));
	}
	if (/^(NEFT|IMPS|RTGS)/i.test(upper)) {
		const candidate = chunks.find((part, index) => index > 0 && !/^\d+$/.test(part) && !/^(NEFT|IMPS|RTGS|HDFC|ICICI|SBI|STATE BANK OF INDIA)$/i.test(part));
		if (candidate) return sanitizePartyName(candidate);
	}
	if (upper.includes("CASH DEPOSIT")) return "Cash Deposit";
	const posMatch = cleaned.match(/(?:POS|PURCHASE|CARD PAYMENT)\s*-?\s*(.*?)(?:\s+(?:IN|AT)|$)/i);
	if (posMatch?.[1]) return sanitizePartyName(posMatch[1]);
	return sanitizePartyName(chunks[0] ?? cleaned);
}
function sanitizePartyName(value) {
	return value.replace(/[@].*$/g, "").replace(/\b\d{6,}\b/g, "").replace(/[^a-zA-Z0-9\s.&-]/g, " ").replace(/\s{2,}/g, " ").replace(/^[-\s]+|[-\s]+$/g, "").trim();
}
function normalizeFinalNotes(notes) {
	return cleanDescription(notes) || "Bank transaction";
}
function findHdfcColumns(rows) {
	const header = rows.find((row) => {
		const text = row.text.toUpperCase();
		return /WITHDRAWAL/.test(text) && /DEPOSIT/.test(text) && /BALANCE/.test(text);
	});
	let dateEnd = 4.5;
	let narrationEnd = 20;
	let withdrawalStart = 26.5;
	let depositStart = 31.7;
	let balanceStart = 36.75;
	if (header) {
		const anchors = header.items.map((item) => ({
			x: item.x,
			text: item.text.toUpperCase()
		}));
		const xFor = (patterns, fallback) => anchors.find((anchor) => patterns.some((pattern) => pattern.test(anchor.text)))?.x ?? fallback;
		const dateX = xFor([/^DATE/], 0);
		const valDtX = xFor([/VALUE/], 21);
		const withX = xFor([/WITHDRAWAL/], 25.05);
		const depX = xFor([/DEPOSIT/], 30.35);
		const balX = xFor([/BALANCE/, /CLOSING/], 35.15);
		dateEnd = dateX + 5;
		const vRightTarget = valDtX + 3;
		const wRightTarget = withX + 4;
		const dRightTarget = depX + 4;
		const bRightTarget = balX + 4;
		withdrawalStart = (vRightTarget + wRightTarget) / 2;
		depositStart = (wRightTarget + dRightTarget) / 2;
		balanceStart = (dRightTarget + bRightTarget) / 2;
		narrationEnd = withdrawalStart;
	}
	return {
		dateEnd,
		narration: {
			min: dateEnd,
			max: narrationEnd
		},
		debit: {
			min: withdrawalStart,
			max: depositStart
		},
		credit: {
			min: depositStart,
			max: balanceStart
		},
		balance: {
			min: balanceStart,
			max: Number.POSITIVE_INFINITY
		}
	};
}
function parseHdfcRows(rows) {
	const columns = findHdfcColumns(rows);
	const drafts = [];
	let currentTx = null;
	const flush = () => {
		if (!currentTx) return;
		let amount = 0;
		let type = "Expense";
		if (currentTx._w !== null && currentTx._w !== void 0) {
			amount = currentTx._w;
			type = "Expense";
		} else if (currentTx._d !== null && currentTx._d !== void 0) {
			amount = currentTx._d;
			type = "Revenue";
		}
		if (amount > 0) {
			currentTx.amount = roundAmount(amount);
			currentTx.type = type;
			currentTx.notes = normalizeFinalNotes(currentTx.notes);
			if (currentTx._b !== null && currentTx._b !== void 0) currentTx.balance = currentTx._b;
			drafts.push(currentTx);
		}
		currentTx = null;
	};
	for (const row of rows) {
		if (isNoiseRow(row)) continue;
		const rowDate = parseDateFromText(rowText(itemsInRange(row, {
			min: 0,
			max: columns.dateEnd
		})));
		if (rowDate) {
			flush();
			currentTx = {
				date: rowDate,
				amount: 0,
				type: "Expense",
				notes: "",
				_w: null,
				_d: null,
				_b: null
			};
		}
		if (!currentTx) continue;
		const narrationItems = itemsInRange(row, columns.narration);
		if (narrationItems.length > 0) {
			const narrationPart = joinNarrationItems(narrationItems);
			if (narrationPart) currentTx.notes = currentTx.notes ? `${currentTx.notes} ${narrationPart}` : narrationPart;
		}
		if (columns.debit && currentTx._w === null) {
			const w = getHdfcColumnAmount(row, columns.debit);
			if (w !== null) currentTx._w = w;
		}
		if (columns.credit && currentTx._d === null) {
			const d = getHdfcColumnAmount(row, columns.credit);
			if (d !== null) currentTx._d = d;
		}
		if (columns.balance) {
			const b = getHdfcColumnAmount(row, columns.balance);
			if (b !== null) currentTx._b = b;
		}
	}
	flush();
	return drafts;
}
function amountLikeGroups(row) {
	const groups = [];
	let current = [];
	const push = () => {
		if (!current.length) return;
		const raw = rowText(current);
		const value = parseAmountText(raw);
		const isDate = parseDateFromText(raw) !== null;
		if (value !== null && !isDate) groups.push({
			x: current[0].x,
			value
		});
		current = [];
	};
	for (const item of row.items) {
		const numericish = /[\d,.]/.test(item.text) && !/[A-Za-z@]/.test(item.text);
		const closeToCurrent = current.length > 0 && item.x - current[current.length - 1].x < 2.2;
		if (numericish && (!current.length || closeToCurrent)) current.push(item);
		else {
			push();
			if (numericish) current.push(item);
		}
	}
	push();
	return groups;
}
function findGenericColumns(rows) {
	const header = rows.find((row) => {
		const text = row.text.toUpperCase();
		return /BALANCE/.test(text) && /(DEBIT|WITHDRAWAL|DR\b)/.test(text) && /(CREDIT|DEPOSIT|CR\b)/.test(text);
	});
	if (!header) return {
		dateEnd: 8,
		narration: {
			min: 4,
			max: 24
		},
		debit: {
			min: 24,
			max: 30
		},
		credit: {
			min: 30,
			max: 35
		},
		balance: {
			min: 35,
			max: Number.POSITIVE_INFINITY
		}
	};
	const anchors = header.items.map((item) => ({
		x: item.x,
		text: item.text.toUpperCase()
	}));
	const xFor = (patterns, fallback) => anchors.find((anchor) => patterns.some((pattern) => pattern.test(anchor.text)))?.x ?? fallback;
	const dateX = xFor([/DATE/, /TXN/], 2);
	const narrationX = xFor([
		/NARRATION/,
		/PARTICULAR/,
		/DESCRIPTION/,
		/REMARK/
	], 6);
	const refX = xFor([
		/REF\b/,
		/CHQ/,
		/CHEQUE/,
		/REF\s+NO/
	], -1);
	const debitX = xFor([
		/DEBIT/,
		/WITHDRAWAL/,
		/^DR$/
	], 26);
	const creditX = xFor([
		/CREDIT/,
		/DEPOSIT/,
		/^CR$/
	], 31);
	const balanceX = xFor([/BALANCE/, /CLOSING/], 36);
	const debitCreditMid = (debitX + creditX) / 2;
	const creditBalanceMid = (creditX + balanceX) / 2;
	let narrationEnd = (narrationX + debitX) / 2;
	let debitStart = narrationEnd;
	if (refX !== -1) {
		narrationEnd = (narrationX + refX) / 2;
		debitStart = (refX + debitX) / 2;
	}
	return {
		dateEnd: Math.max(4, (dateX + narrationX) / 2),
		narration: {
			min: Math.max(0, (dateX + narrationX) / 2),
			max: Math.max(narrationX + 2, narrationEnd)
		},
		debit: {
			min: Math.max(debitStart - 2, debitStart),
			max: debitCreditMid
		},
		credit: {
			min: debitCreditMid,
			max: creditBalanceMid
		},
		balance: {
			min: creditBalanceMid,
			max: Number.POSITIVE_INFINITY
		}
	};
}
function startsLikelyContinuation(row, narrationRange) {
	if (isNoiseRow(row)) return false;
	if (itemsInRange(row, narrationRange).length === 0) return false;
	if ((row.text.match(/\d[\d,]*\.\d{1,2}/g)?.length ?? 0) >= 2) return false;
	return !(/OPENING|CLOSING|DEBITS|CREDITS|COUNT|TOTAL/i.test(row.text) && /\d[\d,]*\.\d{1,2}/.test(row.text));
}
function inferTypeFromNarration(text) {
	const upper = text.toUpperCase();
	if (/\b(CR|CREDIT|DEPOSIT|TRANSFER\s+IN|BY\s+TRANSFER|REFUND|INTEREST\s+PAID)\b/.test(upper)) return "Revenue";
	return "Expense";
}
function parseGenericLedgerRows(rows) {
	const columns = findGenericColumns(rows);
	const drafts = [];
	let current = null;
	let previousBalance = null;
	const flush = () => {
		if (!current) return;
		current.notes = normalizeFinalNotes(current.notes);
		drafts.push(current);
		current = null;
	};
	for (const row of rows) {
		const date = parseDateFromText(rowText(row.items.filter((item) => item.x < columns.dateEnd)));
		const debit = columns.debit ? getColumnAmount(row, columns.debit) : null;
		const credit = columns.credit ? getColumnAmount(row, columns.credit) : null;
		const balance = columns.balance ? getColumnAmount(row, columns.balance) : null;
		const groups = amountLikeGroups(row).filter((group) => group.x > columns.dateEnd);
		let amount = null;
		let type = null;
		if (debit !== null && credit === null) {
			amount = debit;
			type = "Expense";
		} else if (credit !== null && debit === null) {
			amount = credit;
			type = "Revenue";
		} else if (debit !== null && credit !== null) {
			if (debit > 0 && credit === 0) {
				amount = debit;
				type = "Expense";
			} else if (credit > 0 && debit === 0) {
				amount = credit;
				type = "Revenue";
			}
		}
		if ((amount === null || type === null) && balance !== null && previousBalance !== null) {
			const difference = roundAmount(balance - previousBalance);
			if (difference !== 0) {
				amount = Math.abs(difference);
				type = difference > 0 ? "Revenue" : "Expense";
			}
		}
		if ((amount === null || type === null) && groups.length >= 2) {
			amount = groups[groups.length - 2].value;
			type = inferTypeFromNarration(row.text);
		}
		if (date && amount !== null && type !== null) {
			flush();
			current = {
				date,
				amount: roundAmount(amount),
				type,
				notes: joinNarrationItems(itemsInRange(row, columns.narration)),
				balance: balance ?? void 0
			};
			if (balance !== null) previousBalance = balance;
			continue;
		}
		if (current && startsLikelyContinuation(row, columns.narration)) {
			const continuation = joinNarrationItems(itemsInRange(row, columns.narration));
			if (continuation) current.notes = normalizeWhitespace(`${current.notes} ${continuation}`);
		}
	}
	flush();
	return drafts;
}
function parseStatementSummary(fullText) {
	const text = fullText.replace(/\s+/g, " ");
	const drMatch = text.match(/\bDR\s+COUNT\s+(\d+)/i);
	const crMatch = text.match(/\bCR\s+COUNT\s+(\d+)/i);
	if (!drMatch && !crMatch) return null;
	return {
		debitCount: drMatch ? Number(drMatch[1]) : null,
		creditCount: crMatch ? Number(crMatch[1]) : null
	};
}
function warnIfSummaryMismatch(engineName, fullText, transactions) {
	const summary = parseStatementSummary(fullText);
	if (!summary) return;
	const debitCount = transactions.filter((tx) => tx.type === "Expense").length;
	const creditCount = transactions.filter((tx) => tx.type === "Revenue").length;
	if (summary.debitCount !== null && summary.debitCount !== debitCount || summary.creditCount !== null && summary.creditCount !== creditCount) console.warn(`[Statement Parser] ${engineName} summary mismatch. Expected Dr ${summary.debitCount ?? "?"}, Cr ${summary.creditCount ?? "?"}; parsed Dr ${debitCount}, Cr ${creditCount}.`);
}
function extractPdfRows(fileBuffer) {
	return new Promise((resolve, reject) => {
		const parser = new PDFParser();
		parser.on("pdfParser_dataError", (errData) => {
			reject(/* @__PURE__ */ new Error(`Failed to parse PDF data: ${errData.parserError}`));
		});
		parser.on("pdfParser_dataReady", (pdfData) => {
			try {
				const pages = pdfData.formImage?.Pages || pdfData.Pages || [];
				const items = [];
				pages.forEach((page, pageIndex) => {
					(page.Texts || []).forEach((textItem) => {
						const text = decodePdfText(textItem.R?.[0]?.T ?? "").trim();
						if (!text) return;
						text.split(/\r?\n/).forEach((lineText, idx) => {
							if (!lineText.trim()) return;
							items.push({
								text: lineText.trim(),
								x: Number(textItem.x ?? 0),
								y: Number(textItem.y ?? 0) + idx * .4,
								page: pageIndex + 1
							});
						});
					});
				});
				resolve(groupItemsIntoRows(items, .3));
			} catch (error) {
				reject(error);
			}
		});
		parser.parseBuffer(fileBuffer);
	});
}
var HDFCEngine = {
	name: "HDFC Bank",
	matchesSignature: (text) => /\bHDFC\s+BANK\b/.test(text) || /\bHDFCBANK\b/.test(text),
	parse: (context) => {
		const transactions = parseHdfcRows(context.rows);
		warnIfSummaryMismatch("HDFC Bank", context.fullText, transactions);
		return transactions;
	}
};
var ICICIEngine = {
	name: "ICICI Bank",
	matchesSignature: (text) => /\bICICI\b/.test(text),
	parse: (context) => {
		const transactions = parseGenericLedgerRows(context.rows);
		warnIfSummaryMismatch("ICICI Bank", context.fullText, transactions);
		return transactions;
	}
};
var SBIEngine = {
	name: "State Bank of India",
	matchesSignature: (text) => /\bSTATE\s+BANK\s+OF\s+INDIA\b/.test(text) || /\bSBI\b/.test(text),
	parse: (context) => {
		const transactions = parseGenericLedgerRows(context.rows);
		warnIfSummaryMismatch("State Bank of India", context.fullText, transactions);
		return transactions;
	}
};
var GenericEngine = {
	name: "Generic Bank",
	matchesSignature: () => true,
	parse: (context) => parseGenericLedgerRows(context.rows)
};
var PARSER_REGISTRY = [
	HDFCEngine,
	ICICIEngine,
	SBIEngine
];
function determineParsingEngine(documentText) {
	return PARSER_REGISTRY.find((engine) => engine.matchesSignature(documentText)) ?? GenericEngine;
}
function hydrateTransaction(tx) {
	return {
		id: crypto$1.randomUUID(),
		date: tx.date,
		amount: roundAmount(tx.amount),
		type: tx.type,
		notes: tx.notes,
		customer: extractCustomer(tx.notes),
		dept: "",
		project: "",
		business_unit: "",
		invoice_number: "",
		owner: "",
		ctype: "",
		costt: ""
	};
}
var parseBankStatement = async (fileBuffer, mimeType) => {
	const rows = await extractPdfRows(fileBuffer);
	const fullText = rows.map((row) => row.text).join(" ").toUpperCase();
	return determineParsingEngine(fullText).parse({
		rows,
		fullText,
		mimeType
	}).filter((tx) => tx.date && tx.amount > 0 && Number.isFinite(tx.amount)).map(hydrateTransaction);
};
//#endregion
//#region server/routes/import.ts
var router = Router();
var upload = multer({ storage: multer.memoryStorage() });
router.post("/", upload.single("statement"), async (req, res) => {
	try {
		if (!req.file) return res.status(400).json({ error: "No file uploaded" });
		const { buffer, mimetype } = req.file;
		const result = await parseBankStatement(buffer, mimetype);
		res.status(200).json({ transactions: result });
	} catch (error) {
		console.error("[Import API Error]:", error);
		res.status(500).json({ error: "Failed to parse bank statement" });
	}
});
//#endregion
//#region server/routes/auth.ts
var handleLogin = async (req, res) => {
	const { email, password } = req.body;
	if (!email || !password) return res.status(400).json({ error: "Email and password are required" });
	const cleanEmail = email.trim().toLowerCase();
	try {
		const { data, error } = await getSupabaseAdminClient().rpc("verify_user", {
			p_email: cleanEmail,
			p_password: password
		});
		if (error) {
			console.error("Login verify_user RPC error:", error);
			return res.status(500).json({ error: "Database error during validation" });
		}
		if (!data || data.length === 0) return res.status(401).json({ error: "Invalid email or password" });
		const dbUser = data[0];
		const user = {
			id: dbUser.id,
			name: dbUser.name,
			email: dbUser.email,
			role: dbUser.role
		};
		const token = createSessionToken(user);
		return res.status(200).json({
			user,
			token
		});
	} catch (error) {
		console.error("Unexpected login error:", error);
		return res.status(500).json({ error: error instanceof Error ? error.message : "Internal login server error" });
	}
};
var handleChangePassword = async (req, res) => {
	const { currentPassword, newPassword } = req.body;
	const sessionUser = req._sessionUser;
	if (!sessionUser) return res.status(401).json({ error: "Unauthorized. Valid session required." });
	if (!currentPassword || !newPassword) return res.status(400).json({ error: "Current and new password are required" });
	if (sessionUser.id.startsWith("local-")) return res.status(200).json({ message: "Password updated successfully (Local session)" });
	try {
		const { data: isSuccess, error } = await getSupabaseAdminClient().rpc("change_user_password", {
			p_user_id: sessionUser.id,
			p_current_password: currentPassword,
			p_new_password: newPassword
		});
		if (error) {
			console.error("Change password RPC error:", error);
			return res.status(500).json({ error: "Database error during password change" });
		}
		if (!isSuccess) return res.status(400).json({ error: "Current password is incorrect" });
		return res.status(200).json({ message: "Password updated successfully" });
	} catch (error) {
		console.error("Unexpected change password error:", error);
		return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to change password" });
	}
};
//#endregion
//#region server/routes/users.ts
var TABLE_NAME = "users";
var listUsers = async (req, res) => {
	if (req.headers["x-user-role"] === "ca") return res.status(403).json({ error: "Forbidden. CA users cannot view team members." });
	try {
		const { data, error } = await getSupabaseAdminClient().from(TABLE_NAME).select("id, name, email, role, created_at").order("created_at", { ascending: true });
		if (error) {
			console.error("List users error:", error);
			return res.status(500).json({ error: error.message });
		}
		return res.status(200).json({ users: data ?? [] });
	} catch (error) {
		console.error("Unexpected list users error:", error);
		return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to list team members" });
	}
};
var createUser = async (req, res) => {
	const { email, password, name, role } = req.body;
	if (req.headers["x-user-role"] !== "admin") return res.status(403).json({ error: "Forbidden. Only Admins can add team members." });
	if (!email || !password || !name || !role) return res.status(400).json({ error: "Name, email, password, and role are required." });
	if (![
		"admin",
		"team",
		"ca"
	].includes(role)) return res.status(400).json({ error: "Invalid role. Role must be admin, team, or ca." });
	try {
		const { data: newUserId, error } = await getSupabaseAdminClient().rpc("create_user", {
			p_email: email.trim(),
			p_password: password,
			p_name: name.trim(),
			p_role: role
		});
		if (error) {
			console.error("Create user RPC error:", error);
			if (error.message.includes("unique") || error.code === "23505") return res.status(400).json({ error: "A user with this email already exists." });
			return res.status(500).json({ error: error.message });
		}
		return res.status(201).json({
			message: "User created successfully",
			user: {
				id: newUserId,
				email: email.trim(),
				name: name.trim(),
				role
			}
		});
	} catch (error) {
		console.error("Unexpected create user error:", error);
		return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to create team member" });
	}
};
var deleteUser = async (req, res) => {
	const { id } = req.params;
	const userRole = req.headers["x-user-role"];
	const userEmail = req.headers["x-user-email"];
	if (userRole !== "admin") return res.status(403).json({ error: "Forbidden. Only Admins can delete team members." });
	if (!id) return res.status(400).json({ error: "User ID is required." });
	try {
		const supabase = getSupabaseAdminClient();
		const { data: targetUser, error: fetchError } = await supabase.from(TABLE_NAME).select("email").eq("id", id).single();
		if (fetchError) {
			console.error("Fetch target user for delete error:", fetchError);
			return res.status(404).json({ error: "User not found." });
		}
		if (targetUser && targetUser.email.toLowerCase() === userEmail.toLowerCase()) return res.status(400).json({ error: "You cannot delete your own logged-in account." });
		const { error } = await supabase.from(TABLE_NAME).delete().eq("id", id);
		if (error) {
			console.error("Delete user error:", error);
			return res.status(500).json({ error: error.message });
		}
		return res.status(200).json({ message: "User deleted successfully." });
	} catch (error) {
		console.error("Unexpected delete user error:", error);
		return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to delete team member" });
	}
};
var updateUser = async (req, res) => {
	const { id } = req.params;
	const { name, email, role, password } = req.body;
	if (req.headers["x-user-role"] !== "admin") return res.status(403).json({ error: "Forbidden. Only Admins can modify team members." });
	if (!id || !name || !email || !role) return res.status(400).json({ error: "Name, email, and role are required." });
	if (![
		"admin",
		"team",
		"ca"
	].includes(role)) return res.status(400).json({ error: "Invalid role. Role must be admin, team, or ca." });
	try {
		const { data: isSuccess, error } = await getSupabaseAdminClient().rpc("admin_update_user", {
			p_user_id: id,
			p_name: name.trim(),
			p_email: email.trim(),
			p_role: role,
			p_password: password && password.trim() !== "" ? password : null
		});
		if (error) {
			console.error("Update user RPC error:", error);
			if (error.message.includes("unique") || error.code === "23505") return res.status(400).json({ error: "A user with this email already exists." });
			return res.status(500).json({ error: error.message });
		}
		return res.status(200).json({ message: "User updated successfully" });
	} catch (error) {
		console.error("Unexpected update user error:", error);
		return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to update team member" });
	}
};
//#endregion
//#region server/routes/logs.ts
var escapeCSV = (val) => {
	if (val === null || val === void 0) return "";
	let str = String(val);
	str = str.replace(/"/g, "\"\"");
	if (str.includes(",") || str.includes("\"") || str.includes("\n") || str.includes("\r")) return `"${str}"`;
	return str;
};
var listLogs = async (req, res) => {
	const userRole = req.headers["x-user-role"];
	try {
		const { data, error } = await getSupabaseAdminClient().from("transaction_logs").select("*").order("created_at", { ascending: false });
		if (error) {
			console.error("List logs error:", error);
			return res.status(500).json({ error: error.message });
		}
		const processedLogs = (data ?? []).map((log) => {
			const isCA = userRole === "ca";
			return {
				id: log.id,
				action: log.action,
				transaction_id: log.transaction_id,
				details: log.details,
				performed_by_email: isCA ? `[Masked (${log.performed_by_role})]` : log.performed_by_email,
				performed_by_role: log.performed_by_role,
				created_at: log.created_at
			};
		});
		return res.status(200).json({ logs: processedLogs });
	} catch (error) {
		console.error("Unexpected list logs error:", error);
		return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to load audit logs" });
	}
};
var exportTransactionsCSV = async (req, res) => {
	try {
		const { data: transactions, error } = await getSupabaseAdminClient().from("transactions").select("*").order("date", { ascending: false });
		if (error) {
			console.error("Export transactions db error:", error);
			return res.status(500).json({ error: error.message });
		}
		let csvContent = [
			"ID",
			"Date",
			"Type",
			"Amount",
			"Business Unit (BU)",
			"Department",
			"Project",
			"Customer",
			"Customer Type",
			"Cost Type",
			"Owner",
			"Invoice Number",
			"Notes",
			"Created At"
		].join(",") + "\n";
		(transactions ?? []).forEach((t) => {
			const row = [
				t.id,
				t.date,
				t.type,
				t.amount,
				t.business_unit || "",
				t.dept || "",
				t.project || "",
				t.customer || "",
				t.ctype || "",
				t.costt || "",
				t.owner || "",
				t.invoice_number || "",
				t.notes || "",
				t.created_at
			];
			csvContent += row.map(escapeCSV).join(",") + "\n";
		});
		const fileName = `MIS_Ledger_${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.csv`;
		res.setHeader("Content-Type", "text/csv");
		res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
		return res.status(200).send(csvContent);
	} catch (error) {
		console.error("Unexpected export transactions error:", error);
		return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to export transactions" });
	}
};
var exportLogsCSV = async (req, res) => {
	const isCA = req.headers["x-user-role"] === "ca";
	try {
		const { data: logs, error } = await getSupabaseAdminClient().from("transaction_logs").select("*").order("created_at", { ascending: false });
		if (error) {
			console.error("Export logs db error:", error);
			return res.status(500).json({ error: error.message });
		}
		let csvContent = [
			"Log ID",
			"Timestamp",
			"Action Type",
			"Transaction ID",
			"Amount (₹)",
			"Transaction Type",
			"Project",
			"Dept/BU",
			"Performed By (Email)",
			"Performed By (Role)"
		].join(",") + "\n";
		(logs ?? []).forEach((log) => {
			const details = log.details || {};
			const amount = details.amount !== void 0 ? details.amount : "";
			const type = details.type || "";
			const project = details.project || "";
			const dept = details.dept || details.business_unit || "";
			const email = isCA ? `[Masked (${log.performed_by_role})]` : log.performed_by_email;
			const row = [
				log.id,
				log.created_at,
				log.action,
				log.transaction_id || "",
				amount,
				type,
				project,
				dept,
				email,
				log.performed_by_role
			];
			csvContent += row.map(escapeCSV).join(",") + "\n";
		});
		const fileName = `Audit_Logs_${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.csv`;
		res.setHeader("Content-Type", "text/csv");
		res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
		return res.status(200).send(csvContent);
	} catch (error) {
		console.error("Unexpected export logs error:", error);
		return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to export audit logs" });
	}
};
//#endregion
//#region server/index.ts
function createServer() {
	const app = express();
	app.use(cors());
	app.use(express.json());
	app.use(express.urlencoded({ extended: true }));
	app.use((req, res, next) => {
		if (req.body) {
			if (Buffer.isBuffer(req.body)) try {
				req.body = JSON.parse(req.body.toString("utf-8"));
			} catch (err) {}
			else if (typeof req.body === "string") try {
				req.body = JSON.parse(req.body);
			} catch (err) {}
		}
		next();
	});
	const authenticateRequest = (req, _res, next) => {
		const authHeader = req.headers["authorization"];
		if (authHeader && authHeader.startsWith("Bearer ")) {
			const payload = verifySessionToken(authHeader.slice(7));
			if (payload) req._sessionUser = payload;
		}
		next();
	};
	app.use(authenticateRequest);
	const requireRole = (allowedRoles) => {
		return (req, res, next) => {
			const user = req._sessionUser;
			if (!user) return res.status(401).json({ error: "Unauthorized. Valid session token required." });
			if (!allowedRoles.includes(user.role)) return res.status(403).json({ error: `Forbidden. Role '${user.role}' does not have permission.` });
			req.headers["x-user-role"] = user.role;
			req.headers["x-user-email"] = user.email;
			req.headers["x-user-id"] = user.id;
			next();
		};
	};
	app.post("/api/auth/login", handleLogin);
	app.post("/api/auth/change-password", requireRole([
		"admin",
		"team",
		"ca"
	]), handleChangePassword);
	app.get("/api/users", requireRole(["admin", "team"]), listUsers);
	app.post("/api/users", requireRole(["admin"]), createUser);
	app.put("/api/users/:id", requireRole(["admin"]), updateUser);
	app.delete("/api/users/:id", requireRole(["admin"]), deleteUser);
	app.get("/api/logs", requireRole([
		"admin",
		"team",
		"ca"
	]), listLogs);
	app.get("/api/exports/transactions", requireRole([
		"admin",
		"team",
		"ca"
	]), exportTransactionsCSV);
	app.get("/api/exports/logs", requireRole([
		"admin",
		"team",
		"ca"
	]), exportLogsCSV);
	app.use("/api/import", requireRole(["admin", "team"]), router);
	app.get(["/api/ping", "/ping"], (_req, res) => {
		const ping = process.env.PING_MESSAGE ?? "ping";
		res.json({ message: ping });
	});
	app.get(["/api/demo", "/demo"], handleDemo);
	app.get(["/api/transactions", "/transactions"], requireRole([
		"admin",
		"team",
		"ca"
	]), listTransactions);
	app.post(["/api/transactions", "/transactions"], requireRole(["admin", "team"]), createTransaction);
	app.delete(["/api/transactions", "/transactions"], requireRole(["admin", "team"]), deleteTransaction);
	app.delete(["/api/transactions/:id", "/transactions/:id"], requireRole(["admin", "team"]), deleteTransaction);
	app.post(["/api/transactions/bulk", "/transactions/bulk"], requireRole(["admin", "team"]), createBulkTransactions);
	app.post("/api/invoices/upload", requireRole(["admin", "team"]), uploadMiddleware, handleUploadInvoice);
	app.get("/api/invoices/download", requireRole([
		"admin",
		"team",
		"ca"
	]), handleBulkDownloadInvoices);
	app.get("/api/invoices/url", requireRole([
		"admin",
		"team",
		"ca"
	]), handleGetInvoiceUrl);
	app.post("/api/invoices", requireRole(["admin", "team"]), handleCreateInvoice);
	app.get("/api/invoices/lookup/:invoiceNumber", requireRole([
		"admin",
		"team",
		"ca"
	]), handleLookupInvoice);
	app.get("/api/invoices", requireRole([
		"admin",
		"team",
		"ca"
	]), handleListInvoices);
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
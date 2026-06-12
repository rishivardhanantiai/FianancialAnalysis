import path from "node:path";
import "dotenv/config";
import * as express$1 from "express";
import express, { Router } from "express";
import cors from "cors";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import multer from "multer";
import path$1 from "path";
import ExcelJS from "exceljs";
import crypto from "crypto";
import PDFParser from "pdf2json";
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
		business_unit: row.business_unit ?? "",
		invoice_number: row.invoice_number ?? "",
		invoice_url: row.invoice_url ?? "",
		linked_invoice_id: row.linked_invoice_id ?? null,
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
		const { data, error } = await getSupabaseAdminClient().from(TABLE_NAME).insert(payload).select("*").single();
		if (error) return res.status(500).json({ error: error.message });
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
		const { error } = await getSupabaseAdminClient().from(TABLE_NAME).delete().eq("id", id);
		if (error) return res.status(500).json({ error: error.message });
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
		const { data, error } = await getSupabaseAdminClient().from(TABLE_NAME).insert(validPayloads).select("*");
		if (error) return res.status(500).json({ error: error.message });
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
* Fetches all invoices, generates 7-day signed URLs, and streams an Excel file directly.
* Designed to prevent timeouts on large datasets.
*/
var handleBulkDownloadInvoices = async (req, res) => {
	try {
		const supabase = getSupabaseAdminClient();
		const { data: transactions, error: dbError } = await supabase.from("transactions").select("date, business_unit, type, invoice_number, amount, project, dept, customer, owner, invoice_url").order("date", { ascending: false }).order("id", { ascending: false });
		if (dbError) throw dbError;
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
		res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
		res.setHeader("Content-Disposition", `attachment; filename="MIS_Invoices_${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.xlsx"`);
		await workbook.xlsx.write(res);
		res.end();
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
		const { invoice_number, client_details, line_items, total_amount, status, invoice_url } = req.body;
		if (!invoice_number || total_amount === void 0) return res.status(400).json({ error: "Invoice number and total amount are required." });
		const { data, error } = await getSupabaseAdminClient().from("invoices").insert([{
			invoice_number,
			client_details,
			line_items,
			total_amount,
			status: status || "Draft",
			invoice_url
		}]).select("*").single();
		if (error) throw error;
		return res.status(201).json({ invoice: data });
	} catch (error) {
		console.error("Create Invoice Error:", error);
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
var HDFC_COLUMNS = {
	date: {
		min: 0,
		max: 4.15
	},
	narration: {
		min: 4.15,
		max: 17.7
	},
	withdrawal: {
		min: 25.05,
		max: 30.35
	},
	deposit: {
		min: 30.35,
		max: 35.15
	},
	balance: {
		min: 35.15,
		max: Number.POSITIVE_INFINITY
	}
};
var NOISE_PATTERNS = [
	/PAGE\s+NO/i,
	/ACCOUNT\s+BRANCH/i,
	/ACCOUNT\s+STATUS/i,
	/A\/C\s+OPEN\s+DATE/i,
	/STATEMENT\s+OF\s+ACCOUNT/i,
	/STATEMENT\s+SUMMARY/i,
	/OPENING\s+BALANCE/i,
	/CLOSING\s+BAL/i,
	/CLOSING\s+BALANCE\s+INCLUDES/i,
	/CONTENTS\s+OF\s+THIS\s+STATEMENT/i,
	/REGISTERED\s+OFFICE/i,
	/HDFC\s+BANK\s+LIMITED/i,
	/FUNDS\s+EARMARKED/i,
	/STATE\s+ACCOUNT\s+BRANCH\s+GSTN/i,
	/GSTIN\s+NUMBER/i,
	/HTTPS?:\/\//i,
	/GENERATED\s+ON/i,
	/GENERATED\s+BY/i,
	/REQUESTING\s+BRANCH/i,
	/COMPUTER\s+GENERATED\s+STATEMENT/i,
	/NOT\s+REQUIRE\s+SIGNATURE/i,
	/\bDATE\b.*\bNARRATION\b/i,
	/\bTXN\s+DATE\b.*\bBALANCE\b/i,
	/\bVALUE\s+DATE\b.*\bBALANCE\b/i
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
	return row.items.filter((item) => item.x >= range.min && item.x < range.max);
}
function joinNarrationItems(items) {
	return normalizeWhitespace(items.map((item) => item.text).join(" ")).replace(/\s*-\s*/g, " - ").replace(/\s*\/\s*/g, "/").replace(/\s+([,.])/g, "$1").replace(/\s{2,}/g, " ").trim();
}
function joinCompact(items) {
	return items.map((item) => item.text).join("");
}
function toIsoDate(day, month, rawYear) {
	let yearText = rawYear.replace(/\D/g, "");
	if (yearText.length === 3) yearText = yearText.slice(0, 2);
	let year = Number(yearText);
	if (yearText.length <= 2) year += 2e3;
	if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year) || day < 1 || day > 31 || month < 1 || month > 12 || year < 1990 || year > 2099) return null;
	const date = new Date(Date.UTC(year, month - 1, day));
	if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
	return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
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
function parseDateFromItems(items) {
	return parseDateFromText(joinCompact(items)) ?? parseDateFromText(rowText(items));
}
function parseAmountText(raw) {
	if (!raw) return null;
	const matches = raw.replace(/(?:INR|RS\.?|₹)/gi, "").replace(/\s+/g, "").replace(/[()]/g, "").replace(/CR|DR/gi, "").match(/-?\d[\d,]*(?:\.\d{1,2})?/g);
	if (!matches?.length) return null;
	const candidate = matches.filter((match) => match.includes(".")).at(-1) ?? matches.at(-1);
	if (!candidate) return null;
	const value = Number(candidate.replace(/,/g, ""));
	if (!Number.isFinite(value)) return null;
	return Math.abs(Number(value.toFixed(2)));
}
function parseAmountFromItems(items) {
	return parseAmountText(joinCompact(items)) ?? parseAmountText(rowText(items));
}
function getColumnAmount(row, range) {
	return parseAmountFromItems(itemsInRange(row, range));
}
function roundAmount(value) {
	return Math.round((value + Number.EPSILON) * 100) / 100;
}
function isNoiseRow(row) {
	const text = row.text.trim();
	if (!text) return true;
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
function startsLikelyContinuation(row, narrationRange) {
	if (isNoiseRow(row)) return false;
	if (itemsInRange(row, narrationRange).length === 0) return false;
	if ((row.text.match(/\d[\d,]*\.\d{1,2}/g)?.length ?? 0) >= 2) return false;
	return !(/OPENING|CLOSING|DEBITS|CREDITS|COUNT|TOTAL/i.test(row.text) && /\d[\d,]*\.\d{1,2}/.test(row.text));
}
function parseHdfcRows(rows) {
	const drafts = [];
	let current = null;
	const flush = () => {
		if (!current) return;
		current.notes = normalizeFinalNotes(current.notes);
		drafts.push(current);
		current = null;
	};
	for (const row of rows) {
		const date = parseDateFromItems(itemsInRange(row, HDFC_COLUMNS.date));
		const withdrawal = getColumnAmount(row, HDFC_COLUMNS.withdrawal);
		const deposit = getColumnAmount(row, HDFC_COLUMNS.deposit);
		const balance = getColumnAmount(row, HDFC_COLUMNS.balance);
		if (date && (withdrawal !== null || deposit !== null) && balance !== null) {
			flush();
			const type = withdrawal !== null ? "Expense" : "Revenue";
			const amount = withdrawal ?? deposit ?? 0;
			const notes = joinNarrationItems(itemsInRange(row, HDFC_COLUMNS.narration));
			current = {
				date,
				amount: roundAmount(amount),
				type,
				notes,
				balance
			};
			continue;
		}
		if (current && startsLikelyContinuation(row, HDFC_COLUMNS.narration)) {
			const continuation = joinNarrationItems(itemsInRange(row, HDFC_COLUMNS.narration));
			if (continuation) current.notes = normalizeWhitespace(`${current.notes} ${continuation}`);
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
		const raw = joinCompact(current);
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
	return {
		dateEnd: Math.max(4, (dateX + narrationX) / 2),
		narration: {
			min: Math.max(0, (dateX + narrationX) / 2),
			max: Math.max(narrationX + 2, (narrationX + debitX) / 2)
		},
		debit: {
			min: Math.max(0, (narrationX + debitX) / 2),
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
		const date = parseDateFromItems(row.items.filter((item) => item.x < columns.dateEnd));
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
function inferTypeFromNarration(text) {
	const upper = text.toUpperCase();
	if (/\b(CR|CREDIT|DEPOSIT|TRANSFER\s+IN|BY\s+TRANSFER|REFUND|INTEREST\s+PAID)\b/.test(upper)) return "Revenue";
	return "Expense";
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
async function performOCRExtraction(fileBuffer) {
	try {
		const formData = new FormData();
		const blob = new Blob([fileBuffer], { type: "application/pdf" });
		formData.append("file", blob, "statement.pdf");
		formData.append("apikey", process.env.OCR_SPACE_API_KEY || "helloworld");
		formData.append("isOverlayRequired", "true");
		formData.append("language", "eng");
		formData.append("scale", "true");
		const data = await (await fetch("https://api.ocr.space/parse/image", {
			method: "POST",
			body: formData
		})).json();
		if (data.IsErroredOnProcessing) throw new Error(`Cloud OCR failed: ${data.ErrorMessage?.[0] ?? "Unknown error"}`);
		const items = [];
		(data.ParsedResults ?? []).forEach((result, pageIndex) => {
			(result.TextOverlay?.Lines ?? []).forEach((line) => {
				(line.Words ?? []).forEach((word) => {
					const text = String(word.WordText ?? "").trim();
					if (!text) return;
					items.push({
						text,
						x: Number(word.Left ?? 0),
						y: Number(word.Top ?? 0),
						page: pageIndex + 1
					});
				});
			});
		});
		return groupItemsIntoRows(items, 6);
	} catch (error) {
		console.error("[Statement Parser OCR Error]", error);
		return [];
	}
}
function extractPdfRows(fileBuffer) {
	return new Promise((resolve, reject) => {
		const parser = new PDFParser();
		parser.on("pdfParser_dataError", (errData) => {
			reject(/* @__PURE__ */ new Error(`Failed to parse PDF data: ${errData.parserError}`));
		});
		parser.on("pdfParser_dataReady", async (pdfData) => {
			try {
				const pages = pdfData.formImage?.Pages || pdfData.Pages || [];
				const items = [];
				pages.forEach((page, pageIndex) => {
					(page.Texts || []).forEach((textItem) => {
						const text = decodePdfText(textItem.R?.[0]?.T ?? "").trim();
						if (!text) return;
						items.push({
							text,
							x: Number(textItem.x ?? 0),
							y: Number(textItem.y ?? 0),
							page: pageIndex + 1
						});
					});
				});
				if (items.length < 50) {
					resolve(await performOCRExtraction(fileBuffer));
					return;
				}
				resolve(groupItemsIntoRows(items, .58));
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
		id: crypto.randomUUID(),
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
//#region server/index.ts
function createServer() {
	const app = express();
	app.use(cors());
	app.use(express.json());
	app.use(express.urlencoded({ extended: true }));
	app.use("/api/import", router);
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
	app.post("/api/invoices/upload", uploadMiddleware, handleUploadInvoice);
	app.get("/api/invoices/download", handleBulkDownloadInvoices);
	app.get("/api/invoices/url", handleGetInvoiceUrl);
	app.post("/api/invoices", handleCreateInvoice);
	app.get("/api/invoices/lookup/:invoiceNumber", handleLookupInvoice);
	app.get("/api/invoices", handleListInvoices);
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
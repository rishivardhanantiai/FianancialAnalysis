import { Buffer } from "buffer";
import * as crypto from "crypto";
import PDFParser from "pdf2json";

type TransactionType = "Revenue" | "Expense";

export interface ParsedTransaction {
  id: string;
  date: string;
  amount: number;
  type: TransactionType;
  notes: string;
  dept: string;
  project: string;
  customer: string;
  business_unit: string;
  invoice_number: string;
  owner: string;
  ctype: string;
  costt: string;
}

interface TextItem {
  text: string;
  x: number;
  y: number;
  page: number;
}

interface TextRow {
  items: TextItem[];
  page: number;
  y: number;
  text: string;
}

interface ParserContext {
  rows: TextRow[];
  fullText: string;
  mimeType: string;
}

export interface ParsedDraft {
  date: string;
  amount: number;
  type: TransactionType;
  notes: string;
  balance?: number;
}

interface BankExtractionEngine {
  name: string;
  matchesSignature: (fullDocumentText: string) => boolean;
  parse: (context: ParserContext) => ParsedDraft[];
}

interface Range {
  min: number;
  max: number;
}

const MONTHS: Record<string, number> = {
  JAN: 1, JANUARY: 1, FEB: 2, FEBRUARY: 2, MAR: 3, MARCH: 3,
  APR: 4, APRIL: 4, MAY: 5, JUN: 6, JUNE: 6, JUL: 7, JULY: 7,
  AUG: 8, AUGUST: 8, SEP: 9, SEPT: 9, SEPTEMBER: 9,
  OCT: 10, OCTOBER: 10, NOV: 11, NOVEMBER: 11, DEC: 12, DECEMBER: 12,
};

const NOISE_PATTERNS = [
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
  const globalWithFlag = globalThis as typeof globalThis & {
    __bankParserWarnPatched?: boolean;
  };

  if (globalWithFlag.__bankParserWarnPatched) return;

  const originalWarn = console.warn.bind(console);
  console.warn = (...args) => {
    const first = String(args[0] ?? "");
    if (
      first.includes("Unsupported: field.type") ||
      first.includes("NOT valid form element") ||
      first.includes("Setting up fake worker")
    ) {
      return;
    }
    originalWarn(...args);
  };

  globalWithFlag.__bankParserWarnPatched = true;
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function decodePdfText(value: string) {
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

function rowText(items: TextItem[]) {
  return normalizeWhitespace(items.map((item) => item.text).join(" "));
}

function groupItemsIntoRows(items: TextItem[], tolerance: number): TextRow[] {
  const rows: TextRow[] = [];
  const pages = [...new Set(items.map((item) => item.page))].sort((a, b) => a - b);

  for (const page of pages) {
    const pageItems = items
      .filter((item) => item.page === page)
      .sort((a, b) => a.y - b.y || a.x - b.x);

    let current: TextItem[] = [];
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
        text: rowText(sorted),
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
        text: rowText(sorted),
      });
    }
  }

  return rows;
}

function itemsInRange(row: TextRow, range: Range) {
  return row.items.filter((item) => item.x >= range.min && item.x <= range.max);
}

// 🚨 NEW: Prevents purely financial amounts from polluting the narration text
function joinNarrationItems(items: TextItem[]) {
  const validItems = items.filter(item => !/^[\d,]+\.\d{2}$/.test(item.text));
  const raw = normalizeWhitespace(validItems.map((item) => item.text).join(" "));

  return raw
    .replace(/\s*-\s*/g, " - ")
    .replace(/\s*\/\s*/g, "/")
    .replace(/\s+([,.])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function toIsoDate(day: number, month: number, rawYear: string) {
  let yearText = rawYear.replace(/\D/g, "");

  if (yearText.length === 3) {
    yearText = yearText.slice(0, 2);
  }

  let year = Number(yearText);
  if (yearText.length <= 2) year += 2000;

  if (
    !Number.isInteger(day) ||
    !Number.isInteger(month) ||
    !Number.isInteger(year) ||
    day < 1 || month < 1 || month > 12 ||
    year < 1990 || year > 2099
  ) {
    return null;
  }

  const maxDays = new Date(year, month, 0).getDate();
  const safeDay = Math.min(day, maxDays);

  return `${year}-${String(month).padStart(2, "0")}-${String(safeDay).padStart(2, "0")}`;
}

function parseDateFromText(raw: string) {
  if (!raw) return null;

  const compact = raw.toUpperCase().replace(/\s+/g, "").replace(/[.]/g, "");

  const numeric = compact.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (numeric) {
    return toIsoDate(Number(numeric[1]), Number(numeric[2]), numeric[3]);
  }

  const named = compact.match(/(\d{1,2})[-/]?([A-Z]{3,9})[-/]?(\d{2,4})/);
  if (named) {
    const month = MONTHS[named[2]];
    if (month) return toIsoDate(Number(named[1]), month, named[3]);
  }

  return null;
}

function parseAmountText(raw: string): number | null {
  if (!raw) return null;

  const clean = raw.replace(/(?:INR|RS\.?|₹|CR|DR)/gi, "").replace(/[()]/g, "");
  const matches = clean.match(/-?[\d,.]+\.\d{1,2}(?!\d)/g);
  
  if (!matches?.length) return null;

  const candidate = matches[matches.length - 1];
  let numStr = candidate.replace(/,/g, "");
  
  const lastDot = numStr.lastIndexOf(".");
  if (lastDot !== -1) {
    numStr = numStr.substring(0, lastDot).replace(/\./g, "") + numStr.substring(lastDot);
  }

  const value = Number(numStr);
  if (!Number.isFinite(value)) return null;

  return Math.abs(Number(value.toFixed(2)));
}

function getColumnAmount(row: TextRow, range: Range) {
  return parseAmountText(rowText(itemsInRange(row, range)));
}

// 🚨 NEW: Extracts amounts by mapping their estimated Right Edge.
function itemsInRightEdgeRange(row: TextRow, range: Range) {
  return row.items.filter((item) => {
    const rightEdge = item.x + (item.text.length * 0.45);
    return rightEdge >= range.min && rightEdge <= range.max;
  });
}

function getHdfcColumnAmount(row: TextRow, range: Range) {
  return parseAmountText(rowText(itemsInRightEdgeRange(row, range)));
}

function roundAmount(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function isNoiseRow(row: TextRow) {
  const text = row.text.trim();
  if (!text) return true;

  if (/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/.test(text)) return false;

  return NOISE_PATTERNS.some((pattern) => pattern.test(text));
}

function cleanDescription(notes: string): string {
  if (!notes) return "";

  return notes
    .replace(/\bSING\s+H\b/gi, "SINGH")
    .replace(/\bSIN\s+GH\b/gi, "SINGH")
    .replace(/\bBIKRAMJ\b/gi, "BIKRAMJIT")
    .replace(/\bPHON\s+E\b/gi, "PHONE")
    .replace(/\bCRE\s+D\b/gi, "CRED")
    .replace(/\bH\s+DFC\b/gi, "HDFC")
    .replace(/\bHD\s+FC\b/gi, "HDFC")
    .replace(/\bDF\s+C\b/gi, "DFC")
    .replace(/\b\d{12,}\b/g, "")
    .replace(/\b0{6,}\d+\b/g, "")
    .replace(/\bAT\s+[A-Z]+\s+\d{2}:\d{2}:\d{2}\/\d+\b/gi, "")
    .replace(/\s*-\s*/g, " - ")
    .replace(/\s{2,}/g, " ")
    .replace(/^[-\s]+|[-\s]+$/g, "")
    .trim();
}

function extractCustomer(notes: string): string {
  const cleaned = cleanDescription(notes);
  if (!cleaned) return "";

  const upper = cleaned.toUpperCase();
  const chunks = cleaned
    .split(/\s+-\s+|\/+/)
    .map((part) => normalizeWhitespace(part))
    .filter(Boolean);

  if (upper.startsWith("UPI")) {
    const candidate = chunks.find(
      (part) =>
        !/^UPI$/i.test(part) &&
        !/^[A-Z]{4}0[A-Z0-9]+$/i.test(part) &&
        !/^\d+$/.test(part),
    );
    if (candidate) return sanitizePartyName(candidate);
  }

  if (/^TPT\b/i.test(upper)) {
    const candidate = [...chunks]
      .reverse()
      .find((part) => !/^(TPT|C\s*CARD|CARD|BILL|SALARY)$/i.test(part));
    if (candidate) return sanitizePartyName(candidate);
  }

  if (/^(AXIS|BANK)\b/i.test(upper)) {
    const candidate = chunks.find((part) => /\b[A-Z]*SINGH\b|[A-Z]{5,}/i.test(part));
    if (candidate) return sanitizePartyName(candidate.replace(/^IN\s+/i, ""));
  }

  if (/^(NEFT|IMPS|RTGS)/i.test(upper)) {
    const candidate = chunks.find(
      (part, index) =>
        index > 0 &&
        !/^\d+$/.test(part) &&
        !/^(NEFT|IMPS|RTGS|HDFC|ICICI|SBI|STATE BANK OF INDIA)$/i.test(part),
    );
    if (candidate) return sanitizePartyName(candidate);
  }

  if (upper.includes("CASH DEPOSIT")) return "Cash Deposit";

  const posMatch = cleaned.match(/(?:POS|PURCHASE|CARD PAYMENT)\s*-?\s*(.*?)(?:\s+(?:IN|AT)|$)/i);
  if (posMatch?.[1]) return sanitizePartyName(posMatch[1]);

  return sanitizePartyName(chunks[0] ?? cleaned);
}

function sanitizePartyName(value: string) {
  return value
    .replace(/[@].*$/g, "")
    .replace(/\b\d{6,}\b/g, "")
    .replace(/[^a-zA-Z0-9\s.&-]/g, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/^[-\s]+|[-\s]+$/g, "")
    .trim();
}

function normalizeFinalNotes(notes: string) {
  const cleaned = cleanDescription(notes);
  return cleaned || "Bank transaction";
}

interface GenericColumns {
  dateEnd: number;
  narration: Range;
  debit?: Range;
  credit?: Range;
  balance?: Range;
}

// 🚨 NEW: Uses right-target mapping to lock down boundaries dynamically
function findHdfcColumns(rows: TextRow[]): GenericColumns {
  const header = rows.find((row) => {
    const text = row.text.toUpperCase();
    return /WITHDRAWAL/.test(text) && /DEPOSIT/.test(text) && /BALANCE/.test(text);
  });

  let dateEnd = 4.5;
  let narrationEnd = 20.0;
  let withdrawalStart = 26.5; 
  let depositStart = 31.7; 
  let balanceStart = 36.75;

  if (header) {
    const anchors = header.items.map((item) => ({ x: item.x, text: item.text.toUpperCase() }));
    const xFor = (patterns: RegExp[], fallback: number) =>
      anchors.find((anchor) => patterns.some((pattern) => pattern.test(anchor.text)))?.x ?? fallback;

    const dateX = xFor([/^DATE/], 0);
    const valDtX = xFor([/VALUE/], 21.0);
    const withX = xFor([/WITHDRAWAL/], 25.05);
    const depX = xFor([/DEPOSIT/], 30.35);
    const balX = xFor([/BALANCE/, /CLOSING/], 35.15);

    dateEnd = dateX + 5.0; 

    const vRightTarget = valDtX + 3.0;
    const wRightTarget = withX + 4.0;
    const dRightTarget = depX + 4.0;
    const bRightTarget = balX + 4.0;

    withdrawalStart = (vRightTarget + wRightTarget) / 2;
    depositStart = (wRightTarget + dRightTarget) / 2;
    balanceStart = (dRightTarget + bRightTarget) / 2;
    narrationEnd = withdrawalStart;
  }

  return {
    dateEnd,
    narration: { min: dateEnd, max: narrationEnd },
    debit: { min: withdrawalStart, max: depositStart },
    credit: { min: depositStart, max: balanceStart },
    balance: { min: balanceStart, max: Number.POSITIVE_INFINITY },
  };
}

interface HdfcDraft extends ParsedDraft {
  _w?: number | null;
  _d?: number | null;
  _b?: number | null;
}

function parseHdfcRows(rows: TextRow[]): ParsedDraft[] {
  const columns = findHdfcColumns(rows);
  const drafts: ParsedDraft[] = [];
  let currentTx: HdfcDraft | null = null;

  const flush = () => {
    if (!currentTx) return;

    let amount = 0;
    let type: TransactionType = "Expense";

    if (currentTx._w !== null && currentTx._w !== undefined) {
      amount = currentTx._w;
      type = "Expense";
    } else if (currentTx._d !== null && currentTx._d !== undefined) {
      amount = currentTx._d;
      type = "Revenue";
    }

    if (amount > 0) {
      currentTx.amount = roundAmount(amount);
      currentTx.type = type;
      currentTx.notes = normalizeFinalNotes(currentTx.notes);
      if (currentTx._b !== null && currentTx._b !== undefined) {
        currentTx.balance = currentTx._b;
      }
      drafts.push(currentTx);
    }
    currentTx = null;
  };

  for (const row of rows) {
    if (isNoiseRow(row)) continue;

    const dateItems = itemsInRange(row, { min: 0, max: columns.dateEnd });
    const rowDate = parseDateFromText(rowText(dateItems));

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
      if (narrationPart) {
        currentTx.notes = currentTx.notes ? `${currentTx.notes} ${narrationPart}` : narrationPart;
      }
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

// ------------------------------------------------------------------------------------------------
// NOTE: Generic parsers below have been strictly left alone/preserved as per explicit instructions
// ------------------------------------------------------------------------------------------------

function amountLikeGroups(row: TextRow) {
  const groups: { x: number; value: number }[] = [];
  let current: TextItem[] = [];

  const push = () => {
    if (!current.length) return;
    const raw = rowText(current);
    const value = parseAmountText(raw);
    const isDate = parseDateFromText(raw) !== null;

    if (value !== null && !isDate) {
      groups.push({ x: current[0].x, value });
    }
    current = [];
  };

  for (const item of row.items) {
    const numericish = /[\d,.]/.test(item.text) && !/[A-Za-z@]/.test(item.text);
    const closeToCurrent = current.length > 0 && item.x - current[current.length - 1].x < 2.2;

    if (numericish && (!current.length || closeToCurrent)) {
      current.push(item);
    } else {
      push();
      if (numericish) current.push(item);
    }
  }

  push();
  return groups;
}

function findGenericColumns(rows: TextRow[]): GenericColumns {
  const header = rows.find((row) => {
    const text = row.text.toUpperCase();
    return /BALANCE/.test(text) && /(DEBIT|WITHDRAWAL|DR\b)/.test(text) && /(CREDIT|DEPOSIT|CR\b)/.test(text);
  });

  if (!header) {
    return {
      dateEnd: 8,
      narration: { min: 4, max: 24 },
      debit: { min: 24, max: 30 },
      credit: { min: 30, max: 35 },
      balance: { min: 35, max: Number.POSITIVE_INFINITY },
    };
  }

  const anchors = header.items.map((item) => ({ x: item.x, text: item.text.toUpperCase() }));
  const xFor = (patterns: RegExp[], fallback: number) =>
    anchors.find((anchor) => patterns.some((pattern) => pattern.test(anchor.text)))?.x ?? fallback;

  const dateX = xFor([/DATE/, /TXN/], 2);
  const narrationX = xFor([/NARRATION/, /PARTICULAR/, /DESCRIPTION/, /REMARK/], 6);
  const refX = xFor([/REF\b/, /CHQ/, /CHEQUE/, /REF\s+NO/], -1); 
  const debitX = xFor([/DEBIT/, /WITHDRAWAL/, /^DR$/], 26);
  const creditX = xFor([/CREDIT/, /DEPOSIT/, /^CR$/], 31);
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
    narration: { min: Math.max(0, (dateX + narrationX) / 2), max: Math.max(narrationX + 2, narrationEnd) },
    debit: { min: Math.max(debitStart - 2, debitStart), max: debitCreditMid },
    credit: { min: debitCreditMid, max: creditBalanceMid },
    balance: { min: creditBalanceMid, max: Number.POSITIVE_INFINITY },
  };
}

function startsLikelyContinuation(row: TextRow, narrationRange: Range) {
  if (isNoiseRow(row)) return false;
  if (itemsInRange(row, narrationRange).length === 0) return false;

  const decimalAmountCount = row.text.match(/\d[\d,]*\.\d{1,2}/g)?.length ?? 0;
  if (decimalAmountCount >= 2) return false;

  const hasSummaryAmount = /OPENING|CLOSING|DEBITS|CREDITS|COUNT|TOTAL/i.test(row.text) && /\d[\d,]*\.\d{1,2}/.test(row.text);
  return !hasSummaryAmount;
}

function inferTypeFromNarration(text: string): TransactionType {
  const upper = text.toUpperCase();
  if (/\b(CR|CREDIT|DEPOSIT|TRANSFER\s+IN|BY\s+TRANSFER|REFUND|INTEREST\s+PAID)\b/.test(upper)) return "Revenue";
  return "Expense";
}

function parseGenericLedgerRows(rows: TextRow[]): ParsedDraft[] {
  const columns = findGenericColumns(rows);
  const drafts: ParsedDraft[] = [];
  let current: ParsedDraft | null = null;
  let previousBalance: number | null = null;

  const flush = () => {
    if (!current) return;
    current.notes = normalizeFinalNotes(current.notes);
    drafts.push(current);
    current = null;
  };

  for (const row of rows) {
    const dateItems = row.items.filter((item) => item.x < columns.dateEnd);
    const date = parseDateFromText(rowText(dateItems));
    const debit = columns.debit ? getColumnAmount(row, columns.debit) : null;
    const credit = columns.credit ? getColumnAmount(row, columns.credit) : null;
    const balance = columns.balance ? getColumnAmount(row, columns.balance) : null;
    const groups = amountLikeGroups(row).filter((group) => group.x > columns.dateEnd);

    let amount: number | null = null;
    let type: TransactionType | null = null;

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
      const transactionAmount = groups[groups.length - 2].value;
      amount = transactionAmount;
      type = inferTypeFromNarration(row.text);
    }

    if (date && amount !== null && type !== null) {
      flush();
      current = {
        date,
        amount: roundAmount(amount),
        type,
        notes: joinNarrationItems(itemsInRange(row, columns.narration)),
        balance: balance ?? undefined,
      };

      if (balance !== null) previousBalance = balance;
      continue;
    }

    if (current && startsLikelyContinuation(row, columns.narration)) {
      const continuation = joinNarrationItems(itemsInRange(row, columns.narration));
      if (continuation) {
        current.notes = normalizeWhitespace(`${current.notes} ${continuation}`);
      }
    }
  }

  flush();
  return drafts;
}

// ------------------------------------------------------------------------------------------------
// Engine Processing and Entry functions below
// ------------------------------------------------------------------------------------------------

function parseStatementSummary(fullText: string) {
  const text = fullText.replace(/\s+/g, " ");
  const drMatch = text.match(/\bDR\s+COUNT\s+(\d+)/i);
  const crMatch = text.match(/\bCR\s+COUNT\s+(\d+)/i);

  if (!drMatch && !crMatch) return null;

  return {
    debitCount: drMatch ? Number(drMatch[1]) : null,
    creditCount: crMatch ? Number(crMatch[1]) : null,
  };
}

function warnIfSummaryMismatch(engineName: string, fullText: string, transactions: ParsedDraft[]) {
  const summary = parseStatementSummary(fullText);
  if (!summary) return;

  const debitCount = transactions.filter((tx) => tx.type === "Expense").length;
  const creditCount = transactions.filter((tx) => tx.type === "Revenue").length;

  if (
    (summary.debitCount !== null && summary.debitCount !== debitCount) ||
    (summary.creditCount !== null && summary.creditCount !== creditCount)
  ) {
    console.warn(`[Statement Parser] ${engineName} summary mismatch. Expected Dr ${summary.debitCount ?? "?"}, Cr ${summary.creditCount ?? "?"}; parsed Dr ${debitCount}, Cr ${creditCount}.`);
  }
}

function extractPdfRows(fileBuffer: Buffer): Promise<TextRow[]> {
  return new Promise((resolve, reject) => {
    const parser = new PDFParser();

    parser.on("pdfParser_dataError", (errData: any) => {
      reject(new Error(`Failed to parse PDF data: ${errData.parserError}`));
    });

    parser.on("pdfParser_dataReady", (pdfData: any) => {
      try {
        const pages = pdfData.formImage?.Pages || pdfData.Pages || [];
        const items: TextItem[] = [];

        pages.forEach((page: any, pageIndex: number) => {
          (page.Texts || []).forEach((textItem: any) => {
            const raw = textItem.R?.[0]?.T ?? "";
            const text = decodePdfText(raw).trim();
            if (!text) return;

            const lines = text.split(/\r?\n/);
            lines.forEach((lineText, idx) => {
              if (!lineText.trim()) return;
              items.push({
                text: lineText.trim(),
                x: Number(textItem.x ?? 0),
                y: Number(textItem.y ?? 0) + (idx * 0.4), 
                page: pageIndex + 1,
              });
            });
          });
        });

        resolve(groupItemsIntoRows(items, 0.3));
      } catch (error) {
        reject(error);
      }
    });

    parser.parseBuffer(fileBuffer);
  });
}

const HDFCEngine: BankExtractionEngine = {
  name: "HDFC Bank",
  matchesSignature: (text) => /\bHDFC\s+BANK\b/.test(text) || /\bHDFCBANK\b/.test(text),
  parse: (context) => {
    const transactions = parseHdfcRows(context.rows);
    warnIfSummaryMismatch("HDFC Bank", context.fullText, transactions);
    return transactions;
  },
};

const ICICIEngine: BankExtractionEngine = {
  name: "ICICI Bank",
  matchesSignature: (text) => /\bICICI\b/.test(text),
  parse: (context) => {
    const transactions = parseGenericLedgerRows(context.rows);
    warnIfSummaryMismatch("ICICI Bank", context.fullText, transactions);
    return transactions;
  },
};

const SBIEngine: BankExtractionEngine = {
  name: "State Bank of India",
  matchesSignature: (text) => /\bSTATE\s+BANK\s+OF\s+INDIA\b/.test(text) || /\bSBI\b/.test(text),
  parse: (context) => {
    const transactions = parseGenericLedgerRows(context.rows);
    warnIfSummaryMismatch("State Bank of India", context.fullText, transactions);
    return transactions;
  },
};

const GenericEngine: BankExtractionEngine = {
  name: "Generic Bank",
  matchesSignature: () => true,
  parse: (context) => parseGenericLedgerRows(context.rows),
};

const PARSER_REGISTRY: BankExtractionEngine[] = [
  HDFCEngine,
  ICICIEngine,
  SBIEngine,
];

function determineParsingEngine(documentText: string): BankExtractionEngine {
  return PARSER_REGISTRY.find((engine) => engine.matchesSignature(documentText)) ?? GenericEngine;
}

function hydrateTransaction(tx: ParsedDraft): ParsedTransaction {
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
    costt: "",
  };
}

export const parseBankStatement = async (
  fileBuffer: Buffer,
  mimeType: string,
): Promise<ParsedTransaction[]> => {
  const rows = await extractPdfRows(fileBuffer);
  const fullText = rows.map((row) => row.text).join(" ").toUpperCase();
  const engine = determineParsingEngine(fullText);
  const drafts = engine.parse({ rows, fullText, mimeType });

  return drafts
    .filter((tx) => tx.date && tx.amount > 0 && Number.isFinite(tx.amount))
    .map(hydrateTransaction);
};

export const __statementParserTestUtils = {
  cleanDescription,
  extractCustomer,
  parseAmountText,
  parseDateFromText,
  parseGenericLedgerRows,
  parseHdfcRows,
};
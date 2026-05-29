import { Buffer } from 'buffer';
import crypto from 'crypto';
import PDFParser from 'pdf2json';

export interface ParsedTransaction {
  id: string;
  date: string;
  amount: number;
  type: 'Revenue' | 'Expense';
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

export const parseBankStatement = async (fileBuffer: Buffer, mimeType: string): Promise<ParsedTransaction[]> => {
  console.log(`[Parser] Starting Precision Row Extraction... Size: ${fileBuffer.length} bytes`);

  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();

    pdfParser.on("pdfParser_dataError", (errData: any) => {
      console.error("[Parser Error]:", errData.parserError);
      reject(new Error("Failed to parse PDF data."));
    });

    pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
      try {
        const pages = pdfData.formImage?.Pages || pdfData.Pages || [];
        let allItems: any[] = [];

        // 1. Extract all text with Page Offsets safely
        pages.forEach((page: any, pageIndex: number) => {
          const pageOffset = pageIndex * 2000;
          
          page.Texts.forEach((t: any) => {
            let text = t.R[0].T;
            try { text = decodeURIComponent(text); } 
            catch { try { text = unescape(text); } catch {} }
            
            if (text.trim() !== '') {
              allItems.push({ 
                text: text.trim(), 
                x: t.x, 
                y: t.y + pageOffset 
              });
            }
          });
        });

        // 2. Group into Logical Rows
        allItems.sort((a, b) => a.y - b.y || a.x - b.x);
        
        const rows: any[][] = [];
        let currentRow: any[] = [];
        let currentY = -1000;

        for (const item of allItems) {
          if (Math.abs(item.y - currentY) > 0.5) {
            if (currentRow.length > 0) rows.push(currentRow);
            currentRow = [item];
            currentY = item.y;
          } else {
            currentRow.push(item);
          }
        }
        if (currentRow.length > 0) rows.push(currentRow);

        // 3. THE BANK ROUTER: Identify the bank and route securely
        const fullDocumentText = allItems.map(i => i.text).join(' ').toUpperCase();
        let transactions: any[] = [];

        if (fullDocumentText.includes("UNION BANK") || fullDocumentText.includes("UBIN")) {
          console.log("[Parser] Routed to: Union Bank Engine");
          transactions = parseUnionBank(rows);
        }
        else if (fullDocumentText.includes("STANDARD CHARTERED") || fullDocumentText.includes("SCBL")) {
          console.log("[Parser] Routed to: Standard Chartered Engine");
          transactions = parseStandardChartered(rows);
        } 
        else if (fullDocumentText.includes("YOUR BANK") || fullDocumentText.includes("JOHN SMITH")) {
          console.log("[Parser] Routed to: UK Dummy Bank Engine");
          transactions = parseUKDummyBank(rows);
        } 
        else {
          console.warn("[Parser] Bank not explicitly recognized. Attempting fallback...");
          transactions = parseStandardChartered(rows); 
        }

        // 4. Finalize for React
        const finalData: ParsedTransaction[] = transactions.map(tx => ({
          ...tx,
          id: crypto.randomUUID(),
          dept: '', project: '', business_unit: '', invoice_number: '', owner: '', ctype: '', costt: '',
        }));

        console.log(`[Parser] Successfully extracted ${finalData.length} complete transactions.`);
        resolve(finalData);

      } catch (err) {
        console.error("[Parser Processing Error]:", err);
        reject(err);
      }
    });

    pdfParser.parseBuffer(fileBuffer);
  });
};

// ==========================================
// ENGINE 3: UNION BANK PARSER
// ==========================================
function parseUnionBank(rows: any[][]) {
  const transactions: any[] = [];
  let activeTx: any = null;

  // Union Bank uses DD/MM/YYYY
  const dateRegex = /^(\d{2}\/\d{2}\/\d{4})$/;
  // Union Bank attaches (Dr) and (Cr) to the amounts
  const numRegex = /^[\d,]+\.\d{2}(?:\s*\((?:Dr|Cr)\))?$/i;
  // Ignore the Transaction IDs that start with 'S' or 'C' followed by digits
  const tranIdRegex = /^[SC]\d{6,}$/i;

  for (const row of rows) {
    row.sort((a, b) => a.x - b.x);
    const textParts = row.map(i => i.text);
    const fullLine = textParts.join(' ');

    if (fullLine.includes('Tran Id') || fullLine.includes('Statement Date') || fullLine.includes('Balance (Rs.)') || fullLine.includes('UNION BANK')) continue;

    const dateMatch = textParts.find(p => dateRegex.test(p));
    const numbers = textParts.filter(p => numRegex.test(p));

    if (dateMatch && numbers.length > 0) {
      // Find the specific amount that has (Dr) or (Cr) attached to it
      const amountStr = numbers.find(n => n.toLowerCase().includes('(dr)') || n.toLowerCase().includes('(cr)')) || numbers[0];
      
      const type = amountStr.toLowerCase().includes('(cr)') ? 'Revenue' : 'Expense';
      const amount = parseFloat(amountStr.replace(/[^\d.]/g, ''));

      // The notes are whatever is left over (ignoring dates, numbers, and the Tran ID)
      let rawNotes = textParts.filter(p => !dateRegex.test(p) && !numRegex.test(p) && !tranIdRegex.test(p)).join(' ');

      activeTx = {
        date: formatDateForInput(dateMatch),
        notes: rawNotes,
        amount: amount,
        type: type,
        customer: ''
      };
      transactions.push(activeTx);

    } else if (activeTx && !dateMatch && numbers.length === 0) {
      // If there are no dates or numbers, this line is a continuation of the previous description
      const extraNotes = textParts.filter(p => !tranIdRegex.test(p)).join(' ');
      if (extraNotes) activeTx.notes += ' ' + extraNotes;
    }
  }

  // Clean descriptions and find customers
  for (const tx of transactions) {
    tx.customer = extractCustomer(tx.notes);
    tx.notes = cleanDescription(tx.notes);
  }

  return transactions;
}

// ==========================================
// ENGINE 1: UK DUMMY BANK PARSER
// ==========================================
function parseUKDummyBank(rows: any[][]) {
  const transactions: any[] = [];
  let stickyDate = "";
  let previousBalance = 0;
  let hasHitTransactionTable = false;

  const dateRegex = /^(\d{1,2}\s(?:January|February|March|April|May|June|July|August|September|October|November|December))/i;
  const currencyRegex = /^[£$€]?[\d,]+\.\d{2}$/;

  for (const row of rows) {
    row.sort((a, b) => a.x - b.x);
    const textParts = row.map(i => i.text);
    const fullLine = textParts.join(' ');

    if (fullLine.includes('Balance brought forward')) {
      hasHitTransactionTable = true;
      const nums = textParts.filter(p => currencyRegex.test(p));
      if (nums.length > 0) previousBalance = parseAmount(nums[nums.length - 1]);
      continue;
    }

    if (!hasHitTransactionTable) continue;

    const dateMatch = textParts[0]?.match(dateRegex);
    if (dateMatch) stickyDate = dateMatch[1];

    const numbers = textParts.filter(p => currencyRegex.test(p));
    
    if (numbers.length > 0 && stickyDate !== "") {
      let amount = 0;
      let balance = 0;
      
      if (numbers.length >= 2) {
        balance = parseAmount(numbers[numbers.length - 1]);
        amount = parseAmount(numbers[numbers.length - 2]);
      } else {
        amount = parseAmount(numbers[0]);
      }

      const nonNumbers = textParts.filter(p => !currencyRegex.test(p));
      let rawNotes = nonNumbers.join(' ').replace(dateRegex, '').trim();

      let type: 'Revenue' | 'Expense' = 'Expense';
      if (balance > 0 && previousBalance > 0 && balance > previousBalance) {
        type = 'Revenue';
      } else if (rawNotes.toUpperCase().includes('DIRECT DEPOSIT')) {
        type = 'Revenue';
      }

      if (amount > 0) {
        transactions.push({
          date: formatDateForInput(`${stickyDate} 2019`), 
          notes: rawNotes,
          amount: amount,
          type: type,
          customer: extractCustomer(rawNotes)
        });
      }
      if (balance > 0) previousBalance = balance;
    }
  }
  return transactions;
}


// ==========================================
// ENGINE 2: STANDARD CHARTERED 
// ==========================================
function parseStandardChartered(rows: any[][]) {
  const transactions: any[] = [];
  let activeDate = "";
  let activeTx: any = null;
  let previousBalance = 0;

  const dateRegex = /^(\d{1,2}\s[A-Za-z]{3}\s\d{2,4})/;
  const currencyRegex = /^[\d,]+\.\d{2}$/;

  for (const row of rows) {
    row.sort((a, b) => a.x - b.x);
    const textParts = row.map(i => i.text);
    const fullLine = textParts.join(' ');

    if (fullLine.includes('BALANCE FORWARD') || fullLine.includes('ACCOUNT STATEMENT') || fullLine.includes('STATEMENT DATE') || fullLine.includes('OPENING BALANCE') || fullLine.includes('PAGE ')) {
      const nums = textParts.filter(p => currencyRegex.test(p));
      if (nums.length > 0) previousBalance = parseAmount(nums[nums.length - 1]);
      continue;
    }

    const dateMatch = textParts[0]?.match(dateRegex);
    if (dateMatch) activeDate = dateMatch[1];

    const numbers = textParts.filter(p => currencyRegex.test(p));
    const nonNumbers = textParts.filter(p => !currencyRegex.test(p));

    if (numbers.length > 0 && activeDate !== "") {
      let amount = 0;
      let balance = 0;
      
      if (numbers.length >= 2) {
        balance = parseAmount(numbers[numbers.length - 1]);
        amount = parseAmount(numbers[numbers.length - 2]);
      } else {
        amount = parseAmount(numbers[0]);
      }

      let rawNotes = nonNumbers.join(' ').replace(/^(\d{1,2}\s[A-Za-z]{3}\s\d{2,4})\s*/g, '').trim();

      let type: 'Revenue' | 'Expense' = 'Expense';
      if (balance > 0 && previousBalance > 0 && balance > previousBalance) {
        type = 'Revenue';
      } else if (rawNotes.toUpperCase().includes('CRADJ') || rawNotes.toUpperCase().includes('CREDIT')) {
        type = 'Revenue';
      }

      activeTx = {
        date: formatDateForInput(activeDate),
        notes: rawNotes,
        amount: amount,
        type: type,
        customer: ''
      };
      
      transactions.push(activeTx);
      if (balance > 0) previousBalance = balance;

    } else {
      if (activeTx) {
        let extraNotes = nonNumbers.join(' ').replace(/^(\d{1,2}\s[A-Za-z]{3}\s\d{2,4})\s*/g, '').trim();
        if (extraNotes) activeTx.notes += ' ' + extraNotes;
      }
    }
  }

  for (const tx of transactions) {
    tx.customer = extractCustomer(tx.notes);
    tx.notes = cleanDescription(tx.notes);
  }
  return transactions;
}


// ==========================================
// SHARED UTILITIES
// ==========================================
function parseAmount(str: string): number {
  return parseFloat(str.replace(/[£$€,]/g, ''));
}

function extractCustomer(notes: string): string {
  const upper = notes.toUpperCase();
  let customer = "";

  if (upper.includes("UPI/")) {
    const parts = notes.split('/');
    const atPart = parts.find((p: string) => p.includes('@'));
    if (atPart) {
      customer = atPart.split('@')[0];
      if (['ADD-MONEY', 'AMAZONPAY', 'PAYTM', 'BILLDESKTEZ'].includes(customer)) {
         const idx = parts.indexOf(atPart);
         if (idx > 0 && !/^\d+$/.test(parts[idx-1])) customer = parts[idx-1]; 
      }
    } else if (parts.length > 2 && !/^\d+$/.test(parts[2])) {
      customer = parts[2];
    }
  } else if (upper.includes("POS:") || upper.includes("PURCHASE ") || upper.includes("CARD PAYMENT")) {
    const match = upper.match(/(?:POS:|PURCHASE|CARD PAYMENT)\s*-?\s*(.*?)(?:\s+(?:IN|AT|\d{2}:\d{2}|\/)|$)/);
    if (match) customer = match[1];
  } else if (upper.includes("DIRECT DEBIT")) {
    const match = upper.match(/DIRECT DEBIT\s*-?\s*(.*)/);
    if (match) customer = match[1];
  } else if (upper.includes("NEFT") || upper.includes("IMPS")) {
    const parts = upper.split(/[-/:]/);
    if (parts.length > 3) customer = parts[parts.length - 1]; 
    // Specific catch for the NEFT format in Union Bank
    const neftMatch = upper.match(/NEFT:([A-Z\s]+)/);
    if (neftMatch) customer = neftMatch[1];
  } else if (upper.includes("DIRECT DEPOSIT")) {
    customer = "Direct Deposit";
  }

  if (upper.includes("OASYS")) customer = "OASYS";
  if (upper.includes("ATM WITHDRAWAL") || upper.includes("CASH WITHDRAWAL")) customer = "ATM Withdrawal";

  return customer.replace(/[^a-zA-Z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim();
}

function cleanDescription(notes: string): string {
  let cleaned = notes;
  cleaned = cleaned.replace(/\b\d{10,}\/?[A-Za-z0-9]*\b/g, '');
  cleaned = cleaned.replace(/AT\s[A-Z]+\s\d{2}:\d{2}:\d{2}\/\d+/g, '');
  return cleaned.replace(/\s{2,}/g, ' ').trim();
}

function formatDateForInput(dateStr: string) {
  // Handles DD/MM/YYYY (Union Bank)
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
  }

  // Handles text-based dates
  const months: { [key: string]: string } = { 
    JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06', 
    JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12',
    JANUARY: '01', FEBRUARY: '02', MARCH: '03', APRIL: '04', 
    AUGUST: '08', SEPTEMBER: '09', OCTOBER: '10', NOVEMBER: '11', DECEMBER: '12'
  };
  
  if (dateStr.includes(' ')) {
    const parts = dateStr.split(' ');
    let day = parts[0].padStart(2, '0');
    let month = months[parts[1].toUpperCase()] || '01';
    let year = parts.length === 3 ? parts[2] : '2019'; 
    if (year.length === 2) year = '20' + year;
    return `${year}-${month}-${day}`;
  }
  return dateStr;
}
/**
 * Browser-only bank statement parsing (CSV, Excel, PDF) into draft transactions.
 * Heavy libraries are loaded on demand so they never run during server rendering.
 */
import { guessCategory } from "./categories";
import type { TxType } from "./types";

export interface DraftTx {
  key: string;
  date: string;
  description: string;
  amount: number;
  type: TxType;
  category: string;
  include: boolean;
}

const MONTHS: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };
const pad = (n: number) => String(n).padStart(2, "0");

/** Parses Indian statement dates: DD/MM/YYYY, DD-MM-YY, DD MMM YYYY, YYYY-MM-DD, Excel serials. */
export function parseDate(raw: unknown): string | null {
  if (raw == null || raw === "") return null;
  if (typeof raw === "number" && raw > 20000 && raw < 80000) {
    const d = new Date(Math.round((raw - 25569) * 86400 * 1000));
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  }
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) return `${raw.getFullYear()}-${pad(raw.getMonth() + 1)}-${pad(raw.getDate())}`;
  const s = String(raw).trim();
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return valid(+m[1]!, +m[2]!, +m[3]!);
  m = s.match(/^(\d{1,2})[-/.\s](\d{1,2})[-/.\s](\d{2,4})/);
  if (m) return valid(year(+m[3]!), +m[2]!, +m[1]!);
  m = s.match(/^(\d{1,2})[-/.\s]([A-Za-z]{3,4})[-/.\s,]*(\d{2,4})/);
  if (m) {
    const mo = MONTHS[m[2]!.toLowerCase()];
    if (mo) return valid(year(+m[3]!), mo, +m[1]!);
  }
  return null;
}
const year = (y: number) => (y < 100 ? 2000 + y : y);
function valid(y: number, mo: number, d: number) {
  if (y < 1990 || y > 2100 || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return `${y}-${pad(mo)}-${pad(d)}`;
}

export function parseAmount(raw: unknown): number | null {
  if (raw == null || raw === "") return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  const s = String(raw).replace(/[₹,\s]|INR|Rs\.?/gi, "");
  if (!s || s === "-") return null;
  const neg = /^\(.*\)$/.test(s) || s.startsWith("-");
  const n = Number(s.replace(/[()+-]/g, "").replace(/(cr|dr)$/i, ""));
  if (!Number.isFinite(n)) return null;
  return neg ? -n : n;
}

const H = {
  date: /^(txn |transaction |value |posting )?date|^dt$/i,
  desc: /narration|description|particular|remark|details|transaction details|merchant|payee|^name$/i,
  debit: /debit|withdraw|dr\b|paid out|spent/i,
  credit: /credit|deposit|cr\b|paid in|received/i,
  amount: /^amount|amt|value \(inr\)|^inr$/i,
  type: /^type$|cr\/dr|dr\/cr|txn type/i,
};

/** Converts rows (first row = header somewhere in the first 30 rows) into drafts. */
export function rowsToDrafts(rows: unknown[][]): DraftTx[] {
  const headerIdx = rows.slice(0, 30).findIndex((r) => {
    const cells = r.map((c) => String(c ?? "").trim());
    return cells.some((c) => H.date.test(c)) && cells.some((c) => H.desc.test(c) || H.amount.test(c) || H.debit.test(c));
  });
  if (headerIdx < 0) return [];
  const header = (rows[headerIdx] ?? []).map((c) => String(c ?? "").trim());
  const find = (re: RegExp, exclude: number[] = []) => header.findIndex((h, i) => !exclude.includes(i) && re.test(h));
  const iDate = find(H.date);
  const iDesc = find(H.desc);
  const iDebit = find(H.debit);
  const iCredit = find(H.credit, [iDebit]);
  const iAmount = find(H.amount, [iDebit, iCredit]);
  const iType = find(H.type);
  const out: DraftTx[] = [];
  rows.slice(headerIdx + 1).forEach((r, n) => {
    const date = parseDate(r[iDate]);
    if (!date) return;
    let amount: number | null = null;
    let type: TxType = "expense";
    const debit = iDebit >= 0 ? parseAmount(r[iDebit]) : null;
    const credit = iCredit >= 0 ? parseAmount(r[iCredit]) : null;
    if (debit && Math.abs(debit) > 0) { amount = Math.abs(debit); type = "expense"; }
    else if (credit && Math.abs(credit) > 0) { amount = Math.abs(credit); type = "income"; }
    else if (iAmount >= 0) {
      const a = parseAmount(r[iAmount]);
      if (a == null || a === 0) return;
      const tcell = iType >= 0 ? String(r[iType] ?? "") : String(r[iAmount] ?? "");
      type = /cr|credit|deposit/i.test(tcell) ? "income" : /dr|debit/i.test(tcell) ? "expense" : a < 0 ? "expense" : iType >= 0 ? "expense" : "expense";
      if (iType < 0 && a > 0 && /cr/i.test(String(r[iAmount]))) type = "income";
      amount = Math.abs(a);
    }
    if (!amount) return;
    const description = String((iDesc >= 0 ? r[iDesc] : "") ?? "").replace(/\s+/g, " ").trim().slice(0, 140) || "Imported transaction";
    out.push({ key: `${n}-${date}-${amount}`, date, description, amount, type, category: guessCategory(description, type), include: true });
  });
  return out;
}

async function parseCsv(file: File) {
  const Papa = (await import("papaparse")).default;
  const text = await file.text();
  const res = Papa.parse<string[]>(text, { skipEmptyLines: true });
  return rowsToDrafts(res.data);
}

async function parseExcel(file: File) {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
  const all: DraftTx[] = [];
  for (const name of wb.SheetNames) {
    const sheet = wb.Sheets[name];
    if (!sheet) continue;
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: "" });
    all.push(...rowsToDrafts(rows));
  }
  return all;
}

/** PDF statements: group text by line, then read "date … description … amount(s)" patterns. */
async function parsePdf(file: File) {
  const pdfjs = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const lines: string[] = [];
  for (let p = 1; p <= Math.min(doc.numPages, 40); p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const byY = new Map<number, Array<{ x: number; s: string }>>();
    for (const item of content.items) {
      if (!("str" in item) || !item.str.trim()) continue;
      const y = Math.round(item.transform[5] as number);
      const key = [...byY.keys()].find((k) => Math.abs(k - y) <= 2) ?? y;
      const arr = byY.get(key) ?? [];
      arr.push({ x: item.transform[4] as number, s: item.str });
      byY.set(key, arr);
    }
    [...byY.entries()].sort((a, b) => b[0] - a[0]).forEach(([, items]) => lines.push(items.sort((a, b) => a.x - b.x).map((i) => i.s).join(" ")));
  }
  const out: DraftTx[] = [];
  const amountRe = /-?\(?₹?\s?\d{1,3}(?:,\d{2,3})*(?:\.\d{1,2})|-?\(?₹?\s?\d+\.\d{2}\)?/g;
  lines.forEach((line, n) => {
    const dm = line.match(/^\s*(\d{1,2}[-/.\s](?:\d{1,2}|[A-Za-z]{3,4})[-/.\s,]*\d{2,4}|\d{4}-\d{2}-\d{2})/);
    if (!dm) return;
    const date = parseDate(dm[1]);
    if (!date) return;
    const rest = line.slice(dm[0].length);
    const amounts = [...rest.matchAll(amountRe)].map((m) => ({ v: parseAmount(m[0]), i: m.index ?? 0 })).filter((a) => a.v != null);
    if (amounts.length === 0) return;
    // Statements usually end with "... amount balance": use the second last when 2+ numbers.
    const pick = amounts.length >= 2 ? amounts[amounts.length - 2]! : amounts[0]!;
    const desc = rest.slice(0, amounts[0]!.i).replace(/\s+/g, " ").trim();
    const isCredit = /\bcr\b|credit|deposit|salary|refund|received/i.test(line);
    const amount = Math.abs(pick.v!);
    if (!amount) return;
    const type: TxType = isCredit ? "income" : "expense";
    const description = desc.slice(0, 140) || "Imported transaction";
    out.push({ key: `${n}-${date}-${amount}`, date, description, amount, type, category: guessCategory(description, type), include: true });
  });
  return out;
}

export async function parseStatement(file: File): Promise<DraftTx[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv") || file.type === "text/csv") return parseCsv(file);
  if (/\.(xlsx|xls|ods)$/.test(name)) return parseExcel(file);
  if (name.endsWith(".pdf") || file.type === "application/pdf") return parsePdf(file);
  throw new Error("Please upload a CSV, Excel (.xlsx/.xls) or PDF statement.");
}

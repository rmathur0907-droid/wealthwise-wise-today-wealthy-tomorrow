/** Browser-only file exports (PDF / Excel / CSV / JSON). Heavy libraries load on demand. */
import { getCategory, PAYMENT_METHODS } from "./categories";
import type { Report } from "./reports";
import type { FinanceData } from "./types";

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

const num = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
/** PDF base fonts have no ₹ glyph, so PDFs use "Rs." */
const rs = (n: number) => `Rs. ${num.format(Math.round(n))}`;
const pm = (id: string) => PAYMENT_METHODS.find((p) => p.id === id)?.label ?? id;
const modeLabel = (m: string) => m.charAt(0).toUpperCase() + m.slice(1);
const slug = (s: string) => s.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
export const reportFileName = (r: Report, ext: string) => `wealthwise-${r.mode}-report-${slug(r.range.label)}.${ext}`;

function txRows(txs: FinanceData["transactions"]) {
  return txs.map((t) => ({
    Date: t.date,
    Type: t.type === "income" ? "Income" : "Expense",
    Description: t.description,
    Category: getCategory(t.category).label,
    "Amount (INR)": t.amount,
    "Payment method": pm(t.payment_method),
    Status: t.status === "pending" ? "Pending" : "Paid",
    Recurring: t.recurring ? "Yes" : "No",
    Member: t.member_name ?? "",
    Party: t.counterparty ?? "",
  }));
}

export async function exportReportExcel(r: Report) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  const s = r.summary;
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ["Wealth Wise — Financial report"],
    ["Mode", modeLabel(r.mode)],
    ["Period", r.range.label, `${r.range.start} to ${r.range.end}`],
    [],
    ["Total income (INR)", s.income],
    ["Total expenses (INR)", s.expense],
    ["Net savings (INR)", s.savings],
    ["Savings rate (%)", Number(s.savingsRate.toFixed(1))],
    ["Average monthly expenses (INR)", Math.round(s.avgMonthlyExpense)],
    ["Transactions", s.count],
    ["Pending to receive (INR)", r.pending.receivable],
    ["Pending to pay (INR)", r.pending.payable],
  ]), "Summary");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(r.monthly.map((m) => ({ Month: m.label, "Income (INR)": m.income, "Expenses (INR)": m.expense, "Savings (INR)": m.savings }))), "Monthly");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([
    ...r.expenseByCategory.map((c) => ({ Type: "Expense", Category: c.label, "Amount (INR)": c.amount, "Share (%)": s.expense ? Number(((c.amount / s.expense) * 100).toFixed(1)) : 0 })),
    ...r.incomeByCategory.map((c) => ({ Type: "Income", Category: c.label, "Amount (INR)": c.amount, "Share (%)": s.income ? Number(((c.amount / s.income) * 100).toFixed(1)) : 0 })),
  ]), "Categories");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(txRows(r.transactions)), "Transactions");
  if (r.investments.length)
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(r.investments.map((i) => ({ Name: i.name, Type: i.type, "Invested (INR)": i.invested, "Current value (INR)": i.current_value, "Monthly SIP (INR)": i.monthly_sip, "Expected return (%/yr)": i.expected_return, Risk: i.risk, "Start date": i.start_date }))), "Investments");
  if (r.goals.length)
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(r.goals.map((g) => ({ Title: g.title, Kind: g.kind, "Target (INR)": g.target, "Saved (INR)": g.saved, Deadline: g.deadline ?? "" }))), "Goals");
  const out = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  downloadBlob(new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), reportFileName(r, "xlsx"));
}

export async function exportReportPdf(r: Report) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const emerald: [number, number, number] = [11, 83, 69];
  const saffron: [number, number, number] = [222, 150, 28];
  doc.setFillColor(...emerald);
  doc.rect(0, 0, W, 86, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Wealth Wise", 40, 40);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Beyond Numbers. Towards Better Decisions.", 40, 58);
  doc.setFontSize(11);
  doc.text(`${modeLabel(r.mode)} financial report · ${r.range.label}`, W - 40, 40, { align: "right" });
  doc.setFontSize(9);
  doc.text(`${r.range.start} to ${r.range.end}`, W - 40, 58, { align: "right" });
  doc.setFillColor(...saffron);
  doc.rect(0, 86, W, 4, "F");

  const s = r.summary;
  const head = { fillColor: emerald, textColor: 255, fontStyle: "bold" as const };
  const base = { styles: { fontSize: 9, cellPadding: 5 }, headStyles: head, margin: { left: 40, right: 40 } };
  let y = 110;
  const next = () => ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 22;
  const heading = (t: string) => {
    if (y > 760) { doc.addPage(); y = 50; }
    doc.setTextColor(...emerald);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(t, 40, y);
    y += 8;
  };

  heading("Summary");
  autoTable(doc, { ...base, startY: y, head: [["Measure", "Value"]], body: [
    ["Total income", rs(s.income)], ["Total expenses", rs(s.expense)], ["Net savings", rs(s.savings)],
    ["Savings rate", `${s.savingsRate.toFixed(1)}%`], ["Average monthly expenses", rs(s.avgMonthlyExpense)],
    ["Transactions", String(s.count)], ["Pending to receive", rs(r.pending.receivable)], ["Pending to pay", rs(r.pending.payable)],
  ], columnStyles: { 1: { halign: "right" } } });
  y = next();
  heading("Month by month");
  autoTable(doc, { ...base, startY: y, head: [["Month", "Income", "Expenses", "Savings"]], body: r.monthly.map((m) => [m.label, rs(m.income), rs(m.expense), rs(m.savings)]), columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" } } });
  y = next();
  if (r.expenseByCategory.length) {
    heading("Spending by category");
    autoTable(doc, { ...base, startY: y, head: [["Category", "Amount", "Share"]], body: r.expenseByCategory.map((c) => [c.label, rs(c.amount), s.expense ? `${((c.amount / s.expense) * 100).toFixed(1)}%` : "-"]), columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } } });
    y = next();
  }
  if (r.byPaymentMethod.length) {
    heading("How you paid");
    autoTable(doc, { ...base, startY: y, head: [["Method", "Payments", "Amount"]], body: r.byPaymentMethod.map((p) => [p.label, String(p.count), rs(p.amount)]), columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } } });
    y = next();
  }
  if (r.investments.length) {
    heading("Investments");
    autoTable(doc, { ...base, startY: y, head: [["Name", "Type", "Invested", "Current value", "Monthly SIP"]], body: r.investments.map((i) => [i.name, i.type.replace("_", " ").toUpperCase(), rs(i.invested), rs(i.current_value), rs(i.monthly_sip)]), columnStyles: { 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" } } });
    y = next();
  }
  heading("Transactions");
  autoTable(doc, { ...base, startY: y, head: [["Date", "Description", "Category", "Method", "Amount"]], body: r.transactions.map((t) => [t.date, t.description, getCategory(t.category).label, pm(t.payment_method), `${t.type === "income" ? "+" : "-"} ${rs(t.amount)}`]), columnStyles: { 4: { halign: "right" } } });

  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    const h = doc.internal.pageSize.getHeight();
    doc.text(`Generated ${new Date().toLocaleDateString("en-IN")} from your own records. For information only — not financial advice.`, 40, h - 20);
    doc.text(`Page ${p} of ${pages}`, W - 40, h - 20, { align: "right" });
  }
  downloadBlob(doc.output("blob"), reportFileName(r, "pdf"));
}

/** Full backup of everything the user has stored. */
export function exportAllJson(data: FinanceData) {
  const payload = { app: "Wealth Wise", exported_at: new Date().toISOString(), currency: "INR", ...data };
  downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }), `wealthwise-backup-${new Date().toISOString().slice(0, 10)}.json`);
}

export async function exportAllExcel(data: FinanceData) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.transactions.map((t) => ({ Mode: modeLabel(t.mode), ...txRows([t])[0] }))), "Transactions");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.budgets.map((b) => ({ Mode: modeLabel(b.mode), Category: b.category === "_total" ? "Overall" : getCategory(b.category).label, "Monthly limit (INR)": b.amount }))), "Budgets");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.investments.map((i) => ({ Name: i.name, Type: i.type, "Invested (INR)": i.invested, "Current value (INR)": i.current_value, "Monthly SIP (INR)": i.monthly_sip, "Expected return (%/yr)": i.expected_return, Risk: i.risk, "Start date": i.start_date }))), "Investments");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.goals.map((g) => ({ Mode: modeLabel(g.mode), Kind: g.kind, Title: g.title, "Target (INR)": g.target, "Saved (INR)": g.saved, Deadline: g.deadline ?? "" }))), "Goals");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.members.map((m) => ({ Name: m.name, Email: m.email ?? "", Role: m.role, "Spending limit (INR)": m.spending_limit }))), "Family");
  const out = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  downloadBlob(new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `wealthwise-all-data-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/** Pure report building: period ranges (incl. Indian financial year) and summaries for a mode. */
import { categoryBreakdown, forMode, portfolioSummary, totals } from "./analytics";
import { PAYMENT_METHODS } from "./categories";
import { monthLabel, shiftMonth } from "./format";
import type { FinanceData, Goal, Investment, Mode, Transaction } from "./types";

export type ReportPeriod = "this_month" | "last_month" | "last_3" | "last_6" | "this_fy" | "last_fy";
export const REPORT_PERIODS: Array<{ id: ReportPeriod; label: string }> = [
  { id: "this_month", label: "This month" },
  { id: "last_month", label: "Last month" },
  { id: "last_3", label: "Last 3 months" },
  { id: "last_6", label: "Last 6 months" },
  { id: "this_fy", label: "This financial year" },
  { id: "last_fy", label: "Last financial year" },
];

export interface DateRange { start: string; end: string; label: string; months: string[] }

const pad = (n: number) => String(n).padStart(2, "0");
const monthEnd = (key: string) => {
  const [y, m] = key.split("-").map(Number) as [number, number];
  return `${key}-${pad(new Date(y, m, 0).getDate())}`;
};
function monthsBetween(startKey: string, endKey: string) {
  const out: string[] = [];
  for (let k = startKey; k <= endKey; k = shiftMonth(k, 1)) out.push(k);
  return out;
}

/** Inclusive date range for a period. Indian financial year runs 1 April – 31 March. */
export function periodRange(period: ReportPeriod, today = new Date()): DateRange {
  const cur = `${today.getFullYear()}-${pad(today.getMonth() + 1)}`;
  const fyStartYear = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
  let startKey = cur;
  let endKey = cur;
  let label = "";
  switch (period) {
    case "this_month": label = monthLabel(cur, false); break;
    case "last_month": startKey = endKey = shiftMonth(cur, -1); label = monthLabel(startKey, false); break;
    case "last_3": startKey = shiftMonth(cur, -2); break;
    case "last_6": startKey = shiftMonth(cur, -5); break;
    case "this_fy": startKey = `${fyStartYear}-04`; endKey = `${fyStartYear + 1}-03`; label = `FY ${fyStartYear}-${String(fyStartYear + 1).slice(2)}`; break;
    case "last_fy": startKey = `${fyStartYear - 1}-04`; endKey = `${fyStartYear}-03`; label = `FY ${fyStartYear - 1}-${String(fyStartYear).slice(2)}`; break;
  }
  if (!label) label = `${monthLabel(startKey, false)} – ${monthLabel(endKey, false)}`;
  return { start: `${startKey}-01`, end: monthEnd(endKey), label, months: monthsBetween(startKey, endKey) };
}

export interface Report {
  mode: Mode;
  range: DateRange;
  transactions: Transaction[];
  summary: ReturnType<typeof totals> & { count: number; avgMonthlyExpense: number };
  expenseByCategory: ReturnType<typeof categoryBreakdown>;
  incomeByCategory: ReturnType<typeof categoryBreakdown>;
  monthly: Array<{ month: string; label: string; income: number; expense: number; savings: number }>;
  byPaymentMethod: Array<{ method: string; label: string; amount: number; count: number }>;
  topExpenses: Transaction[];
  pending: { receivable: number; payable: number };
  investments: Investment[];
  portfolio: ReturnType<typeof portfolioSummary>;
  goals: Goal[];
}

export function buildReport(data: FinanceData, mode: Mode, range: DateRange): Report {
  const txs = forMode(data.transactions, mode)
    .filter((t) => t.date >= range.start && t.date <= range.end)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const sum = totals(txs);
  const monthly = range.months.map((m) => {
    const t = totals(txs.filter((x) => x.date.startsWith(m)));
    return { month: m, label: monthLabel(m), income: t.income, expense: t.expense, savings: t.savings };
  });
  // Average over months that have already started (a full FY includes future months).
  const elapsed = monthly.filter((m) => m.income > 0 || m.expense > 0).length || 1;
  const pm = new Map<string, { amount: number; count: number }>();
  for (const t of txs) {
    if (t.type !== "expense") continue;
    const e = pm.get(t.payment_method) ?? { amount: 0, count: 0 };
    pm.set(t.payment_method, { amount: e.amount + t.amount, count: e.count + 1 });
  }
  return {
    mode,
    range,
    transactions: txs,
    summary: { ...sum, count: txs.length, avgMonthlyExpense: sum.expense / elapsed },
    expenseByCategory: categoryBreakdown(txs, "expense"),
    incomeByCategory: categoryBreakdown(txs, "income"),
    monthly,
    byPaymentMethod: [...pm.entries()]
      .map(([method, v]) => ({ method, label: PAYMENT_METHODS.find((p) => p.id === method)?.label ?? method, ...v }))
      .sort((a, b) => b.amount - a.amount),
    topExpenses: txs.filter((t) => t.type === "expense").sort((a, b) => b.amount - a.amount).slice(0, 5),
    pending: {
      receivable: txs.filter((t) => t.type === "income" && t.status === "pending").reduce((a, t) => a + t.amount, 0),
      payable: txs.filter((t) => t.type === "expense" && t.status === "pending").reduce((a, t) => a + t.amount, 0),
    },
    investments: data.investments,
    portfolio: portfolioSummary(data.investments),
    goals: data.goals.filter((g) => g.mode === mode),
  };
}

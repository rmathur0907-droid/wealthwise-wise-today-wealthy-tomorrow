/** Pure, deterministic analytics over transactions/budgets/investments. Used by dashboards, reports and AI context. */
import type { Budget, FinanceData, Investment, Mode, Transaction } from "./types";
import { currentMonthKey, monthKey, shiftMonth, monthLabel, formatINR } from "./format";
import { getCategory } from "./categories";

export const forMode = (txs: Transaction[], mode: Mode) => txs.filter((t) => t.mode === mode);
export const inMonth = (txs: Transaction[], month: string) => txs.filter((t) => monthKey(t.date) === month);

export function totals(txs: Transaction[]) {
  let income = 0;
  let expense = 0;
  for (const t of txs) {
    if (t.type === "income") income += t.amount;
    else expense += t.amount;
  }
  const savings = income - expense;
  return { income, expense, savings, savingsRate: income > 0 ? (savings / income) * 100 : 0 };
}

/** Expense totals per category, largest first. */
export function categoryBreakdown(txs: Transaction[], type: "expense" | "income" = "expense") {
  const map = new Map<string, number>();
  for (const t of txs) if (t.type === type) map.set(t.category, (map.get(t.category) ?? 0) + t.amount);
  return [...map.entries()]
    .map(([category, amount]) => ({ category, label: getCategory(category).label, color: getCategory(category).color, amount }))
    .sort((a, b) => b.amount - a.amount);
}

/** Last `count` months (oldest first) of income/expense/savings. */
export function monthlySeries(txs: Transaction[], count = 6, endMonth = currentMonthKey()) {
  const out: Array<{ month: string; label: string; income: number; expense: number; savings: number }> = [];
  for (let i = count - 1; i >= 0; i--) {
    const m = shiftMonth(endMonth, -i);
    const t = totals(inMonth(txs, m));
    out.push({ month: m, label: monthLabel(m), income: t.income, expense: t.expense, savings: t.savings });
  }
  return out;
}

export type BudgetState = "ok" | "near" | "over";
export function budgetStatus(spent: number, limit: number): { pct: number; remaining: number; state: BudgetState } {
  const pct = limit > 0 ? (spent / limit) * 100 : 0;
  return { pct, remaining: limit - spent, state: pct >= 100 ? "over" : pct >= 80 ? "near" : "ok" };
}

/** Budget utilisation for a mode/month: overall plus each category budget. */
export function budgetReport(txs: Transaction[], budgets: Budget[], mode: Mode, month = currentMonthKey()) {
  const monthTx = inMonth(forMode(txs, mode), month).filter((t) => t.type === "expense");
  const spentBy = new Map<string, number>();
  let totalSpent = 0;
  for (const t of monthTx) {
    spentBy.set(t.category, (spentBy.get(t.category) ?? 0) + t.amount);
    totalSpent += t.amount;
  }
  const modeBudgets = budgets.filter((b) => b.mode === mode);
  const overall = modeBudgets.find((b) => b.category === "_total") ?? null;
  const categories = modeBudgets
    .filter((b) => b.category !== "_total")
    .map((b) => ({ budget: b, spent: spentBy.get(b.category) ?? 0, ...budgetStatus(spentBy.get(b.category) ?? 0, b.amount) }));
  const categoryLimitSum = categories.reduce((a, c) => a + c.budget.amount, 0);
  const overallLimit = overall?.amount ?? categoryLimitSum;
  return {
    totalSpent,
    overall,
    overallLimit,
    overallStatus: budgetStatus(totalSpent, overallLimit),
    categories,
    alerts: categories.filter((c) => c.state !== "ok"),
  };
}

/** Recurring payments due next, plus pending (unpaid) entries. */
export function upcomingPayments(txs: Transaction[], mode: Mode, today = new Date()) {
  const seen = new Set<string>();
  const items: Array<{ id: string; description: string; amount: number; dueDate: string; type: Transaction["type"]; kind: "recurring" | "pending" }> = [];
  const sorted = [...forMode(txs, mode)].sort((a, b) => (a.date < b.date ? 1 : -1));
  for (const t of sorted) {
    if (t.recurring) {
      const key = `${t.description.toLowerCase()}|${t.type}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const d = new Date(t.date + "T00:00:00");
      let next = new Date(today.getFullYear(), today.getMonth(), d.getDate());
      if (next < new Date(today.getFullYear(), today.getMonth(), today.getDate())) next = new Date(today.getFullYear(), today.getMonth() + 1, d.getDate());
      const iso = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
      items.push({ id: t.id, description: t.description, amount: t.amount, dueDate: iso, type: t.type, kind: "recurring" });
    } else if (t.status === "pending") {
      items.push({ id: t.id, description: t.description, amount: t.amount, dueDate: t.date, type: t.type, kind: "pending" });
    }
  }
  return items.sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1));
}

export function portfolioSummary(investments: Investment[]) {
  const invested = investments.reduce((a, i) => a + i.invested, 0);
  const current = investments.reduce((a, i) => a + i.current_value, 0);
  const byType = new Map<string, number>();
  const byRisk = new Map<string, number>();
  for (const i of investments) {
    byType.set(i.type, (byType.get(i.type) ?? 0) + i.current_value);
    byRisk.set(i.risk, (byRisk.get(i.risk) ?? 0) + i.current_value);
  }
  const weightedReturn = current > 0 ? investments.reduce((a, i) => a + i.expected_return * i.current_value, 0) / current : 0;
  return {
    invested,
    current,
    gain: current - invested,
    gainPct: invested > 0 ? ((current - invested) / invested) * 100 : 0,
    monthlySip: investments.reduce((a, i) => a + i.monthly_sip, 0),
    weightedReturn,
    byType: [...byType.entries()].map(([type, value]) => ({ type, value })).sort((a, b) => b.value - a.value),
    byRisk: [...byRisk.entries()].map(([risk, value]) => ({ risk, value })),
  };
}

/**
 * Compact plain-text snapshot of the user's real data for the AI assistant.
 * Only built when the user has allowed AI to use their data.
 */
export function buildFinanceContext(data: FinanceData, mode: Mode): string {
  const month = currentMonthKey();
  const prev = shiftMonth(month, -1);
  const lines: string[] = [];
  const hasAny = data.transactions.length + data.investments.length + data.goals.length + data.budgets.length > 0;
  if (!hasAny) return "The user has not entered any financial data yet.";
  lines.push(`Active mode: ${mode}. Current month: ${month}. Currency: INR.`);
  for (const m of ["personal", "family", "business"] as Mode[]) {
    const txs = forMode(data.transactions, m);
    if (txs.length === 0) continue;
    const cur = totals(inMonth(txs, month));
    const last = totals(inMonth(txs, prev));
    lines.push(`\n## ${m} mode (${txs.length} transactions recorded)`);
    lines.push(`This month: income ${formatINR(cur.income)}, expenses ${formatINR(cur.expense)}, savings ${formatINR(cur.savings)}.`);
    lines.push(`Last month: income ${formatINR(last.income)}, expenses ${formatINR(last.expense)}, savings ${formatINR(last.savings)}.`);
    const catNow = categoryBreakdown(inMonth(txs, month));
    const catPrev = new Map(categoryBreakdown(inMonth(txs, prev)).map((c) => [c.category, c.amount]));
    if (catNow.length) {
      lines.push(
        "Expenses by category this month (vs last month): " +
          catNow.slice(0, 10).map((c) => `${c.label} ${formatINR(c.amount)} (last month ${formatINR(catPrev.get(c.category) ?? 0)})`).join("; "),
      );
    }
    const series = monthlySeries(txs, 6);
    lines.push("Last 6 months income/expense: " + series.map((s) => `${s.label}: ${formatINR(s.income)}/${formatINR(s.expense)}`).join(", "));
    const br = budgetReport(data.transactions, data.budgets, m, month);
    if (br.overallLimit > 0) {
      lines.push(`Budget: limit ${formatINR(br.overallLimit)}, spent ${formatINR(br.totalSpent)} (${br.overallStatus.pct.toFixed(0)}%).`);
      for (const c of br.categories) lines.push(`- ${getCategory(c.budget.category).label} budget ${formatINR(c.budget.amount)}, spent ${formatINR(c.spent)}`);
    }
    const up = upcomingPayments(data.transactions, m).slice(0, 8);
    if (up.length) lines.push("Upcoming/pending: " + up.map((u) => `${u.description} ${formatINR(u.amount)} on ${u.dueDate} (${u.kind}, ${u.type})`).join("; "));
    if (m === "business") {
      const receivable = txs.filter((t) => t.type === "income" && t.status === "pending").reduce((a, t) => a + t.amount, 0);
      lines.push(`Outstanding customer payments: ${formatINR(receivable)}.`);
    }
    const recent = [...txs].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 12);
    lines.push("Recent: " + recent.map((t) => `${t.date} ${t.type} ${formatINR(t.amount)} ${t.description} [${t.category}]`).join("; "));
  }
  if (data.investments.length) {
    const p = portfolioSummary(data.investments);
    lines.push(`\n## Investments`);
    lines.push(`Total invested ${formatINR(p.invested)}, current value ${formatINR(p.current)}, gain ${p.gainPct.toFixed(1)}%, monthly SIPs ${formatINR(p.monthlySip)}.`);
    for (const i of data.investments.slice(0, 20))
      lines.push(`- ${i.name} (${i.type}, ${i.risk} risk): invested ${formatINR(i.invested)}, now ${formatINR(i.current_value)}, expected ${i.expected_return}%/yr`);
  }
  if (data.goals.length) {
    lines.push(`\n## Goals & challenges`);
    for (const g of data.goals.slice(0, 15)) lines.push(`- ${g.title} (${g.kind}, ${g.mode}): ${formatINR(g.saved)} of ${formatINR(g.target)}${g.deadline ? ` by ${g.deadline}` : ""}`);
  }
  if (data.familyGroup) {
    lines.push(`\n## Family group "${data.familyGroup.name}" — members: ` + data.members.map((m) => `${m.name} (${m.role}, limit ${formatINR(m.spending_limit)})`).join(", "));
  }
  return lines.join("\n").slice(0, 12000);
}

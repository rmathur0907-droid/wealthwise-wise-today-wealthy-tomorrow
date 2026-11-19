/** Achievement badges and challenge progress, derived purely from the user's data. */
import { budgetReport, categoryBreakdown, forMode, inMonth, totals } from "./analytics";
import { currentMonthKey, shiftMonth } from "./format";
import type { FinanceData, Goal } from "./types";

export interface Badge { id: string; title: string; description: string; earned: boolean; emoji: string }

export function computeBadges(d: FinanceData): Badge[] {
  const month = currentMonthKey();
  const prev = shiftMonth(month, -1);
  const tx = d.transactions;
  const personal = forMode(tx, "personal");
  const prevTotals = totals(inMonth(personal, prev));
  const underBudgetLastMonth = (() => {
    const r = budgetReport(tx, d.budgets, "personal", prev);
    return r.overallLimit > 0 && r.totalSpent > 0 && r.totalSpent <= r.overallLimit;
  })();
  return [
    { id: "first", emoji: "🌱", title: "First step", description: "Record your first transaction", earned: tx.length >= 1 },
    { id: "tracker", emoji: "📒", title: "Steady tracker", description: "Record 50 transactions", earned: tx.length >= 50 },
    { id: "budgeter", emoji: "🎯", title: "Budget planner", description: "Set your first budget", earned: d.budgets.length >= 1 },
    { id: "disciplined", emoji: "🛡️", title: "Within limits", description: "Stay under your overall budget for a full month", earned: underBudgetLastMonth },
    { id: "saver", emoji: "🐷", title: "Super saver", description: "Save at least 20% of income in a month", earned: prevTotals.income > 0 && prevTotals.savingsRate >= 20 },
    { id: "investor", emoji: "📈", title: "Investor", description: "Add your first investment", earned: d.investments.length >= 1 },
    { id: "sip", emoji: "🔁", title: "SIP habit", description: "Run at least one monthly SIP", earned: d.investments.some((i) => i.monthly_sip > 0) },
    { id: "diversified", emoji: "🧺", title: "Diversified", description: "Hold 3 or more types of investments", earned: new Set(d.investments.map((i) => i.type)).size >= 3 },
    { id: "goal", emoji: "🏆", title: "Goal getter", description: "Complete a savings goal", earned: d.goals.some((g) => g.kind === "goal" && g.target > 0 && g.saved >= g.target) },
    { id: "challenger", emoji: "⚡", title: "Challenger", description: "Complete a money challenge", earned: d.goals.some((g) => g.kind === "challenge" && challengeProgress(g, d).done) },
    { id: "family", emoji: "👨‍👩‍👧", title: "Family first", description: "Create a family group with a member", earned: !!d.familyGroup && d.members.length >= 1 },
    { id: "business", emoji: "🏪", title: "Business owner", description: "Track business income", earned: forMode(tx, "business").some((x) => x.type === "income") },
  ];
}

/** Progress of a challenge (0–100) with a short status line. */
export function challengeProgress(g: Goal, d: FinanceData): { pct: number; done: boolean; status: string } {
  const month = g.meta.month ?? currentMonthKey();
  const txs = forMode(d.transactions, g.mode);
  switch (g.meta.challenge) {
    case "save_amount": {
      const saved = Math.max(0, totals(inMonth(txs, month)).savings);
      const pct = g.target > 0 ? (saved / g.target) * 100 : 0;
      return { pct, done: pct >= 100, status: `Saved ₹${Math.round(saved).toLocaleString("en-IN")} of ₹${g.target.toLocaleString("en-IN")} this month` };
    }
    case "reduce_category": {
      const cat = g.meta.category ?? "food";
      const pctCut = g.meta.percent ?? 10;
      const before = categoryBreakdown(inMonth(txs, shiftMonth(month, -1))).find((c) => c.category === cat)?.amount ?? 0;
      const now = categoryBreakdown(inMonth(txs, month)).find((c) => c.category === cat)?.amount ?? 0;
      const limit = before * (1 - pctCut / 100);
      if (before === 0) return { pct: 0, done: false, status: "No spending last month in this category to compare with" };
      const over = now > limit;
      return { pct: Math.min(100, (now / (limit || 1)) * 100), done: !over && month < currentMonthKey(), status: `₹${Math.round(now).toLocaleString("en-IN")} spent · stay under ₹${Math.round(limit).toLocaleString("en-IN")}` };
    }
    case "streak30": {
      const days = new Set(g.meta.checkins ?? []).size;
      return { pct: (days / 30) * 100, done: days >= 30, status: `${days} of 30 days checked in` };
    }
    default: {
      const pct = g.target > 0 ? (g.saved / g.target) * 100 : 0;
      return { pct, done: pct >= 100, status: `₹${Math.round(g.saved).toLocaleString("en-IN")} of ₹${g.target.toLocaleString("en-IN")}` };
    }
  }
}

/** Monthly amount needed to reach a goal by its deadline. */
export function monthlyNeeded(target: number, saved: number, deadline: string | null, today = new Date()): number | null {
  if (!deadline) return null;
  const d = new Date(deadline + "T00:00:00");
  const months = (d.getFullYear() - today.getFullYear()) * 12 + (d.getMonth() - today.getMonth());
  const remaining = Math.max(0, target - saved);
  if (remaining === 0) return 0;
  return remaining / Math.max(1, months);
}

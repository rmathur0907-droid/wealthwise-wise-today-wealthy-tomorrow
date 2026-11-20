import { describe, expect, it } from "vitest";
import { buildReport, periodRange } from "@/lib/reports";
import { emptyFinanceData, type Transaction } from "@/lib/types";

const tx = (p: Partial<Transaction>): Transaction => ({
  id: Math.random().toString(36), mode: "personal", type: "expense", amount: 100, date: "2026-11-05", description: "x",
  category: "food", payment_method: "upi", recurring: false, member_name: null, split_members: [], counterparty: null, status: "paid", ...p,
});

describe("report periods", () => {
  it("financial year runs 1 April to 31 March (November date)", () => {
    const r = periodRange("this_fy", new Date(2026, 10, 20));
    expect([r.start, r.end, r.label]).toEqual(["2026-04-01", "2027-03-31", "FY 2026-27"]);
  });
  it("in February the financial year started the previous April", () => {
    const r = periodRange("this_fy", new Date(2026, 1, 10));
    expect([r.start, r.end]).toEqual(["2025-04-01", "2026-03-31"]);
  });
  it("last 3 months includes the current month", () => {
    const r = periodRange("last_3", new Date(2026, 10, 20));
    expect([r.start, r.end, r.months.length]).toEqual(["2026-09-01", "2026-11-30", 3]);
  });
});

describe("buildReport", () => {
  it("only counts the chosen mode and dates", () => {
    const d = emptyFinanceData();
    d.transactions.push(
      tx({ type: "income", amount: 50000, category: "salary" }),
      tx({ amount: 2000 }),
      tx({ amount: 999, mode: "business" }),
      tx({ amount: 777, date: "2026-10-31" }),
    );
    const r = buildReport(d, "personal", periodRange("this_month", new Date(2026, 10, 20)));
    expect(r.summary.income).toBe(50000);
    expect(r.summary.expense).toBe(2000);
    expect(r.summary.count).toBe(2);
  });
});

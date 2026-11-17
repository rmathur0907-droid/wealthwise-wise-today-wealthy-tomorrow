/** Realistic sample entries so a new user can explore the app before adding their own. */
import { shiftMonth, currentMonthKey } from "./format";
import type { Mode } from "./types";
import type { NewTransaction } from "./store";

const base = (mode: Mode): Omit<NewTransaction, "type" | "amount" | "date" | "description" | "category"> => ({
  mode, payment_method: "upi", recurring: false, member_name: null, split_members: [], counterparty: null, status: "paid",
});

export function sampleTransactions(mode: Mode): NewTransaction[] {
  const out: NewTransaction[] = [];
  const now = currentMonthKey();
  const today = new Date().getDate();
  for (let back = 2; back >= 0; back--) {
    const m = shiftMonth(now, -back);
    const day = (d: number) => `${m}-${String(back === 0 ? Math.min(d, today) : d).padStart(2, "0")}`;
    const wiggle = 1 + (back - 1) * 0.08;
    const add = (t: Partial<NewTransaction> & Pick<NewTransaction, "type" | "amount" | "description" | "category">, d: number) =>
      out.push({ ...base(mode), ...t, amount: Math.round(t.amount * (t.type === "expense" ? wiggle : 1)), date: day(d) });
    if (mode === "business") {
      add({ type: "income", amount: 145000, description: "Shop sales (UPI + cash)", category: "business_income" }, 5);
      add({ type: "income", amount: 62000, description: "Bulk order — Sharma Traders", category: "business_income", counterparty: "Sharma Traders", status: back === 0 ? "pending" : "paid" }, 18);
      add({ type: "expense", amount: 68000, description: "Supplier stock purchase", category: "operations", counterparty: "Metro Wholesale", payment_method: "net_banking" }, 3);
      add({ type: "expense", amount: 35000, description: "Staff salaries", category: "salaries", recurring: true, payment_method: "net_banking" }, 1);
      add({ type: "expense", amount: 22000, description: "Shop rent", category: "rent", recurring: true }, 2);
      add({ type: "expense", amount: 4800, description: "Electricity bill", category: "utilities", recurring: true }, 10);
      add({ type: "expense", amount: 6500, description: "Instagram ads", category: "marketing", payment_method: "credit_card" }, 14);
    } else {
      const fam = mode === "family";
      add({ type: "income", amount: fam ? 140000 : 85000, description: fam ? "Household salaries" : "Salary — November", category: "salary", recurring: true, payment_method: "net_banking" }, 1);
      add({ type: "expense", amount: fam ? 28000 : 18000, description: "House rent", category: "rent", recurring: true }, 3);
      add({ type: "expense", amount: fam ? 14500 : 6200, description: "BigBasket groceries", category: "food" }, 6);
      add({ type: "expense", amount: 2400, description: "Swiggy dinner", category: "food" }, 12);
      add({ type: "expense", amount: 1850, description: "BESCOM electricity bill", category: "utilities", recurring: true }, 9);
      add({ type: "expense", amount: 3200, description: "Uber & metro rides", category: "transport" }, 15);
      add({ type: "expense", amount: 4100, description: "Myntra shopping", category: "shopping", payment_method: "credit_card" }, 20);
      add({ type: "expense", amount: 649, description: "Netflix subscription", category: "entertainment", recurring: true, payment_method: "debit_card" }, 11);
      add({ type: "expense", amount: 10000, description: "Groww SIP — Nifty 50 index fund", category: "investments", recurring: true }, 5);
      if (fam) add({ type: "expense", amount: 9500, description: "School fees", category: "education", recurring: true, payment_method: "net_banking" }, 7);
    }
  }
  return out;
}

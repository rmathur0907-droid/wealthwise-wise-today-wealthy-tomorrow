import { describe, expect, it } from "vitest";
import { parseAmount, parseDate, rowsToDrafts } from "@/lib/importer";

describe("statement import", () => {
  it("reads Indian date formats", () => {
    expect(parseDate("05/11/2026")).toBe("2026-11-05");
    expect(parseDate("05-Nov-26")).toBe("2026-11-05");
    expect(parseDate("2026-11-05")).toBe("2026-11-05");
  });
  it("reads rupee amounts with lakh commas", () => {
    expect(parseAmount("₹1,25,000.50")).toBe(125000.5);
    expect(parseAmount("(450.00)")).toBe(-450);
  });
  it("maps debit/credit columns to expense/income", () => {
    const drafts = rowsToDrafts([
      ["Statement of account"],
      ["Date", "Narration", "Withdrawal Amt.", "Deposit Amt.", "Balance"],
      ["01/11/2026", "UPI-SWIGGY-ORDER", "450.00", "", "10,000"],
      ["02/11/2026", "SALARY NOV", "", "85,000.00", "95,000"],
    ]);
    expect(drafts).toHaveLength(2);
    expect(drafts[0]).toMatchObject({ type: "expense", amount: 450, category: "food" });
    expect(drafts[1]).toMatchObject({ type: "income", amount: 85000, category: "salary" });
  });
});

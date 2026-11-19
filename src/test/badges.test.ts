import { describe, expect, it } from "vitest";
import { computeBadges, monthlyNeeded } from "@/lib/badges";
import { emptyFinanceData } from "@/lib/types";

describe("goals and badges", () => {
  it("spreads the remaining goal amount over the months left", () => {
    expect(monthlyNeeded(120000, 20000, "2027-11-01", new Date(2026, 10, 15))).toBeCloseTo(100000 / 12);
  });
  it("needs nothing more when a goal is already reached", () => {
    expect(monthlyNeeded(5000, 6000, "2027-01-01", new Date(2026, 10, 15))).toBe(0);
  });
  it("awards the investor badge only after an investment is added", () => {
    const d = emptyFinanceData();
    expect(computeBadges(d).find((b) => b.id === "investor")?.earned).toBe(false);
    d.investments.push({ id: "1", name: "FD", type: "fd", invested: 1000, current_value: 1000, expected_return: 7, risk: "low", start_date: "2026-01-01", monthly_sip: 0 });
    expect(computeBadges(d).find((b) => b.id === "investor")?.earned).toBe(true);
  });
});

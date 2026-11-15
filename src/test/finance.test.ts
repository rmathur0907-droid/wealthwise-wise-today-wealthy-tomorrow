import { describe, expect, it } from "vitest";
import { emi, fdMaturity, rdMaturity, sipFutureValue, investmentReturn, linearForecast, amortisation } from "@/lib/finance";

describe("financial formulas", () => {
  it("EMI for ₹10,00,000 at 8.5% over 20 years is about ₹8,678", () => {
    const r = emi(1_000_000, 8.5, 240);
    expect(Math.round(r.emi)).toBe(8678);
    expect(Math.abs(r.totalPayment - r.emi * 240)).toBeLessThan(5);
  });

  it("zero-interest EMI splits principal evenly", () => {
    expect(emi(120_000, 0, 12).emi).toBe(10_000);
  });

  it("SIP of ₹5,000/month at 12% for 10 years grows to about ₹11.6 lakh", () => {
    const r = sipFutureValue(5000, 12, 10);
    expect(r.invested).toBe(600_000);
    expect(Math.round(r.value / 1000)).toBe(1162);
  });

  it("FD of ₹1,00,000 at 7% for 5 years compounded quarterly gives about ₹1,41,478", () => {
    expect(Math.round(fdMaturity(100_000, 7, 5).value)).toBe(141478);
  });

  it("RD of ₹5,000/month at 7% for 12 months matures to about ₹62,330", () => {
    const r = rdMaturity(5000, 7, 12);
    expect(r.invested).toBe(60_000);
    expect(Math.abs(r.value - 62330)).toBeLessThan(60);
  });

  it("CAGR of doubling in 6 years is about 12.25%", () => {
    expect(investmentReturn(100, 200, 6).cagrPct).toBeCloseTo(12.25, 1);
  });

  it("amortisation repays the full principal", () => {
    const years = amortisation(500_000, 10, 60);
    const repaid = years.reduce((a, y) => a + y.principal, 0);
    expect(Math.round(repaid)).toBe(500_000);
    expect(years.at(-1)?.balance).toBe(0);
  });

  it("linear forecast continues a steady trend", () => {
    expect(linearForecast([100, 200, 300], 2)).toEqual([400, 500]);
  });
});

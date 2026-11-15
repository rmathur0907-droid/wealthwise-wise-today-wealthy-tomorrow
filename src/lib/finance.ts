/** Accurate financial formulas used across calculators. All money in INR. */

const round2 = (n: number) => Math.round(n * 100) / 100;

/** SIP future value: monthly investment P, annual rate r%, years n. Payments at start of each month (as used by Indian AMCs). */
export function sipFutureValue(monthly: number, annualRatePct: number, years: number) {
  const n = Math.round(years * 12);
  const i = annualRatePct / 100 / 12;
  const invested = monthly * n;
  const value = i === 0 ? invested : monthly * ((Math.pow(1 + i, n) - 1) / i) * (1 + i);
  return { invested: round2(invested), value: round2(value), gains: round2(value - invested) };
}

/** Fixed deposit maturity with compounding frequency (4 = quarterly, the Indian bank default). */
export function fdMaturity(principal: number, annualRatePct: number, years: number, compoundsPerYear = 4) {
  const r = annualRatePct / 100;
  const value = principal * Math.pow(1 + r / compoundsPerYear, compoundsPerYear * years);
  return { invested: round2(principal), value: round2(value), gains: round2(value - principal) };
}

/** Recurring deposit maturity — monthly deposits, quarterly compounding (Indian bank convention). */
export function rdMaturity(monthly: number, annualRatePct: number, months: number) {
  const r = annualRatePct / 100;
  let value = 0;
  for (let k = 1; k <= months; k++) {
    // deposit k stays for (months - k + 1) months
    const monthsHeld = months - k + 1;
    value += monthly * Math.pow(1 + r / 4, (4 * monthsHeld) / 12);
  }
  const invested = monthly * months;
  return { invested: round2(invested), value: round2(value), gains: round2(value - invested) };
}

/** Compound interest A = P(1 + r/n)^(nt) */
export function compoundInterest(principal: number, annualRatePct: number, years: number, compoundsPerYear = 1) {
  return fdMaturity(principal, annualRatePct, years, compoundsPerYear);
}

/** Simple + annualised (CAGR) return for an investment. */
export function investmentReturn(invested: number, currentValue: number, years: number) {
  const absolute = invested > 0 ? ((currentValue - invested) / invested) * 100 : 0;
  const cagr = invested > 0 && years > 0 ? (Math.pow(currentValue / invested, 1 / years) - 1) * 100 : 0;
  return { gain: round2(currentValue - invested), absolutePct: round2(absolute), cagrPct: round2(cagr) };
}

/** EMI = P·r·(1+r)^n / ((1+r)^n − 1), r monthly rate, n months. */
export function emi(principal: number, annualRatePct: number, months: number) {
  const r = annualRatePct / 100 / 12;
  if (months <= 0) return { emi: 0, totalInterest: 0, totalPayment: 0 };
  const e = r === 0 ? principal / months : (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
  const total = e * months;
  return { emi: round2(e), totalInterest: round2(total - principal), totalPayment: round2(total) };
}

/** Yearly amortisation schedule: principal vs interest paid each year. */
export function amortisation(principal: number, annualRatePct: number, months: number) {
  const r = annualRatePct / 100 / 12;
  const e = r === 0 ? principal / months : (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
  let balance = principal;
  const years: Array<{ year: number; principal: number; interest: number; balance: number }> = [];
  let yp = 0;
  let yi = 0;
  for (let m = 1; m <= months; m++) {
    const interest = balance * r;
    const princ = Math.min(e - interest, balance);
    balance = balance - princ < 0.005 ? 0 : balance - princ;
    yp += princ;
    yi += interest;
    if (m % 12 === 0 || m === months) {
      years.push({ year: Math.ceil(m / 12), principal: round2(yp), interest: round2(yi), balance: round2(balance) });
      yp = 0;
      yi = 0;
    }
  }
  return years;
}

/** Year-by-year growth for SIP / lumpsum charts. */
export function sipGrowthSeries(monthly: number, annualRatePct: number, years: number) {
  const out: Array<{ year: number; invested: number; value: number }> = [];
  for (let y = 1; y <= Math.max(1, Math.round(years)); y++) {
    const s = sipFutureValue(monthly, annualRatePct, y);
    out.push({ year: y, invested: s.invested, value: s.value });
  }
  return out;
}

export function lumpsumGrowthSeries(principal: number, annualRatePct: number, years: number, compoundsPerYear = 1) {
  const out: Array<{ year: number; invested: number; value: number }> = [];
  for (let y = 1; y <= Math.max(1, Math.round(years)); y++) {
    const s = fdMaturity(principal, annualRatePct, y, compoundsPerYear);
    out.push({ year: y, invested: principal, value: s.value });
  }
  return out;
}

/** Least-squares linear trend, returns next `ahead` projected values. */
export function linearForecast(values: number[], ahead: number): number[] {
  const n = values.length;
  if (n === 0) return Array.from({ length: ahead }, () => 0);
  if (n === 1) return Array.from({ length: ahead }, () => values[0] ?? 0);
  const xs = values.map((_, i) => i);
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = values.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - mx) * ((values[i] ?? 0) - my);
    den += (i - mx) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = my - slope * mx;
  return Array.from({ length: ahead }, (_, k) => Math.max(0, round2(intercept + slope * (n + k))));
}

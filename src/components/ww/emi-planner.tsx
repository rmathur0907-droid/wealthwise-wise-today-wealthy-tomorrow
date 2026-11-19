import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CalcField } from "./calc-field";
import { amortisation, emi } from "@/lib/finance";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";

export function EmiPlanner() {
  const [p, setP] = useState(500000);
  const [rate, setRate] = useState(11);
  const [months, setMonths] = useState(36);
  const r = emi(p, rate, months);
  const sched = useMemo(() => amortisation(p, rate, months), [p, rate, months]);
  const [offers, setOffers] = useState([
    { name: "Bank A", rate: 10.5, months: 36 },
    { name: "NBFC B", rate: 13, months: 48 },
  ]);
  const compared = [{ name: "Your plan", rate, months }, ...offers].map((o) => ({ ...o, ...emi(p, o.rate, o.months) }));
  const best = Math.min(...compared.map((c) => c.totalPayment));
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">EMI planner & loan comparison</CardTitle></CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-5">
          <CalcField label="Loan amount" prefix="₹" value={p} onChange={setP} min={10000} max={10000000} step={10000} />
          <CalcField label="Interest rate (p.a.)" suffix="%" value={rate} onChange={setRate} min={1} max={30} step={0.25} />
          <CalcField label="Tenure" suffix="months" value={months} onChange={setMonths} min={3} max={360} />
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-gradient-card p-3 text-primary-foreground"><p className="text-[11px] opacity-80">Monthly EMI</p><p className="num font-display text-lg font-bold">{formatINR(r.emi)}</p></div>
            <div className="rounded-xl bg-muted p-3"><p className="text-[11px] text-muted-foreground">Total interest</p><p className="num font-display text-lg font-bold">{formatINR(r.totalInterest)}</p></div>
            <div className="rounded-xl bg-muted p-3"><p className="text-[11px] text-muted-foreground">Total payment</p><p className="num font-display text-lg font-bold">{formatINR(r.totalPayment)}</p></div>
          </div>
          <div className="max-h-48 overflow-y-auto rounded-xl border text-xs">
            <table className="w-full">
              <thead className="sticky top-0 bg-muted text-left text-muted-foreground"><tr><th className="p-2">Year</th><th className="p-2 text-right">Principal</th><th className="p-2 text-right">Interest</th><th className="p-2 text-right">Balance</th></tr></thead>
              <tbody>{sched.map((y) => <tr key={y.year} className="border-t"><td className="p-2">{y.year}</td><td className="num p-2 text-right">{formatINR(y.principal)}</td><td className="num p-2 text-right">{formatINR(y.interest)}</td><td className="num p-2 text-right">{formatINR(y.balance)}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Compare offers for the same {formatINR(p)} loan:</p>
          {offers.map((o, i) => (
            <div key={i} className="grid grid-cols-[1fr_5rem_5rem] gap-2">
              <Input aria-label="Lender" value={o.name} onChange={(e) => setOffers(offers.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
              <Input aria-label="Rate %" type="number" step="0.1" value={o.rate} onChange={(e) => setOffers(offers.map((x, j) => (j === i ? { ...x, rate: Number(e.target.value) || 0 } : x)))} />
              <Input aria-label="Months" type="number" value={o.months} onChange={(e) => setOffers(offers.map((x, j) => (j === i ? { ...x, months: Number(e.target.value) || 1 } : x)))} />
            </div>
          ))}
          <div className="space-y-2 pt-2">
            {compared.map((c) => (
              <div key={c.name} className={cn("flex items-center justify-between rounded-xl border p-3 text-sm", c.totalPayment === best && "border-primary bg-secondary/50")}>
                <div>
                  <p className="font-semibold">{c.name} {c.totalPayment === best && <span className="ml-1 rounded bg-primary px-1.5 py-px text-[10px] text-primary-foreground">Cheapest</span>}</p>
                  <p className="text-xs text-muted-foreground">{c.rate}% · {c.months} months</p>
                </div>
                <div className="text-right">
                  <p className="num font-semibold">{formatINR(c.emi)}/mo</p>
                  <p className="num text-xs text-muted-foreground">Interest {formatINR(c.totalInterest)}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">Also check processing fees and prepayment charges before choosing a loan.</p>
        </div>
      </CardContent>
    </Card>
  );
}

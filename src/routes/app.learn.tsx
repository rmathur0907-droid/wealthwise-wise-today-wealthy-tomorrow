import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BookOpen, Calculator, Coins, Landmark, LineChart, PiggyBank, Repeat, ShieldAlert, TrendingUp } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalcField } from "@/components/ww/calc-field";
import { GrowthChart } from "@/components/ww/charts";
import { PageHeader } from "@/components/ww/ui";
import { compoundInterest, fdMaturity, investmentReturn, lumpsumGrowthSeries, rdMaturity, sipFutureValue, sipGrowthSeries } from "@/lib/finance";
import { formatINR } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/app/learn")({
  head: () => ({
    meta: [
      { title: "Investment Guide & Calculators — Wealth Wise" },
      { name: "description", content: "Learn SIPs, mutual funds, index funds, FDs and RDs in plain words, with SIP, FD, RD and compound interest calculators." },
      { property: "og:title", content: "Investment Guide & Calculators — Wealth Wise" },
      { property: "og:description", content: "Plain-language investing lessons and accurate Indian calculators." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LearnPage,
});

const LESSONS = [
  { id: "sip", icon: Repeat, title: "SIP — Systematic Investment Plan", level: "Beginner",
    body: ["A SIP invests a fixed amount (from ₹100–₹500) into a mutual fund every month, automatically from your bank account.", "Because you buy every month, you get more units when markets are down and fewer when they are up — this is called rupee cost averaging.", "SIPs work best for goals 5+ years away. Returns are not guaranteed; equity funds can fall in the short term."],
    tip: "Start small, increase your SIP by 10% every year when your salary goes up (step-up SIP)." },
  { id: "mf", icon: Coins, title: "Mutual funds", level: "Beginner",
    body: ["A mutual fund pools money from many investors and a professional fund manager invests it in shares, bonds or both.", "Equity funds aim for higher growth with more ups and downs. Debt funds are steadier with lower returns. Hybrid funds mix both.", "Check the expense ratio (yearly fee) — lower is better. Choose 'Direct' plans to avoid distributor commission."],
    tip: "Funds are regulated by SEBI. Check a fund's details on the AMC's website or AMFI before investing." },
  { id: "index", icon: LineChart, title: "Index funds", level: "Beginner",
    body: ["An index fund simply copies an index like the Nifty 50 or Sensex, so you own a small piece of India's largest companies.", "There's no fund manager picking stocks, so fees are very low (often 0.1–0.3% a year).", "Over long periods many active funds fail to beat the index after fees, which is why index funds are popular for beginners."],
    tip: "A Nifty 50 index fund SIP is a simple core holding for long-term goals." },
  { id: "fd", icon: Landmark, title: "Fixed deposits (FD)", level: "Beginner",
    body: ["You deposit a lump sum with a bank for a fixed time (7 days to 10 years) at a fixed interest rate.", "Indian banks usually compound interest quarterly. Deposits up to ₹5 lakh per bank are insured by DICGC.", "FD interest is fully taxable as per your income slab, and banks deduct TDS above a limit."],
    tip: "Good for money you need within 1–3 years, or for your emergency fund." },
  { id: "rd", icon: PiggyBank, title: "Recurring deposits (RD)", level: "Beginner",
    body: ["An RD lets you deposit a fixed amount every month for a fixed period, earning FD-like interest.", "It builds a saving habit when you can't put a large lump sum into an FD.", "Missing an instalment usually means a small penalty, so set up auto-debit."],
    tip: "Use an RD for a known expense 6–24 months away — a festival, school fees or a trip." },
  { id: "compound", icon: TrendingUp, title: "The power of compounding", level: "Core idea",
    body: ["Compounding means you earn returns on your returns. The longer your money stays invested, the faster it grows.", "₹5,000 a month for 10 years at 12% becomes about ₹11.6 lakh; for 20 years it becomes about ₹50 lakh — the extra 10 years more than quadruple it.", "Starting early matters more than investing a big amount later."],
    tip: "Try the SIP calculator below and change only the years to see compounding at work." },
  { id: "risk", icon: ShieldAlert, title: "Risk, emergency fund and insurance", level: "Core idea",
    body: ["Before investing, keep 3–6 months of expenses in an emergency fund (savings account, FD or liquid fund).", "Get term life insurance and health insurance first — investing is not a replacement for insurance.", "Never invest money you'll need soon in equity, and be wary of anyone promising 'guaranteed' high returns."],
    tip: "Wealth Wise and real banks will never ask for your UPI PIN or OTP." },
];

function Result({ items }: { items: Array<{ label: string; value: number; strong?: boolean }> }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {items.map((i) => (
        <div key={i.label} className={i.strong ? "rounded-xl bg-gradient-card p-4 text-primary-foreground" : "rounded-xl bg-muted p-4"}>
          <p className={i.strong ? "text-xs opacity-80" : "text-xs text-muted-foreground"}>{i.label}</p>
          <p className="num mt-1 font-display text-xl font-bold">{formatINR(i.value)}</p>
        </div>
      ))}
    </div>
  );
}

function SipCalc() {
  const [monthly, setMonthly] = useState(5000);
  const [rate, setRate] = useState(12);
  const [years, setYears] = useState(10);
  const r = sipFutureValue(monthly, rate, years);
  const series = useMemo(() => sipGrowthSeries(monthly, rate, years).map((s) => ({ ...s, label: `Y${s.year}` })), [monthly, rate, years]);
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
      <div className="space-y-6">
        <CalcField label="Monthly investment" prefix="₹" value={monthly} onChange={setMonthly} min={100} max={200000} step={100} />
        <CalcField label="Expected return (p.a.)" suffix="%" value={rate} onChange={setRate} min={1} max={30} step={0.5} />
        <CalcField label="Time period" suffix="yrs" value={years} onChange={setYears} min={1} max={40} />
        <Result items={[{ label: "Invested", value: r.invested }, { label: "Est. returns", value: r.gains }, { label: "Total value", value: r.value, strong: true }]} />
      </div>
      <GrowthChart data={series} height={300} />
    </div>
  );
}

function FdCalc() {
  const [p, setP] = useState(100000);
  const [rate, setRate] = useState(7);
  const [years, setYears] = useState(3);
  const r = fdMaturity(p, rate, years, 4);
  const series = useMemo(() => lumpsumGrowthSeries(p, rate, years, 4).map((s) => ({ ...s, label: `Y${s.year}` })), [p, rate, years]);
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
      <div className="space-y-6">
        <CalcField label="Deposit amount" prefix="₹" value={p} onChange={setP} min={1000} max={10000000} step={1000} />
        <CalcField label="Interest rate (p.a.)" suffix="%" value={rate} onChange={setRate} min={1} max={12} step={0.05} />
        <CalcField label="Tenure" suffix="yrs" value={years} onChange={setYears} min={1} max={10} />
        <Result items={[{ label: "Deposited", value: r.invested }, { label: "Interest earned", value: r.gains }, { label: "Maturity value", value: r.value, strong: true }]} />
        <p className="text-xs text-muted-foreground">Quarterly compounding, as used by most Indian banks. Interest is taxable.</p>
      </div>
      <GrowthChart data={series} height={300} />
    </div>
  );
}

function RdCalc() {
  const [m, setM] = useState(5000);
  const [rate, setRate] = useState(6.8);
  const [months, setMonths] = useState(24);
  const r = rdMaturity(m, rate, months);
  return (
    <div className="max-w-2xl space-y-6">
      <CalcField label="Monthly deposit" prefix="₹" value={m} onChange={setM} min={100} max={200000} step={100} />
      <CalcField label="Interest rate (p.a.)" suffix="%" value={rate} onChange={setRate} min={1} max={10} step={0.05} />
      <CalcField label="Tenure" suffix="months" value={months} onChange={setMonths} min={6} max={120} step={1} />
      <Result items={[{ label: "Deposited", value: r.invested }, { label: "Interest earned", value: r.gains }, { label: "Maturity value", value: r.value, strong: true }]} />
    </div>
  );
}

function CompoundCalc() {
  const [p, setP] = useState(50000);
  const [rate, setRate] = useState(10);
  const [years, setYears] = useState(15);
  const [n, setN] = useState(1);
  const r = compoundInterest(p, rate, years, n);
  const series = useMemo(() => lumpsumGrowthSeries(p, rate, years, n).map((s) => ({ ...s, label: `Y${s.year}` })), [p, rate, years, n]);
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
      <div className="space-y-6">
        <CalcField label="Principal" prefix="₹" value={p} onChange={setP} min={1000} max={10000000} step={1000} />
        <CalcField label="Rate (p.a.)" suffix="%" value={rate} onChange={setRate} min={1} max={30} step={0.5} />
        <CalcField label="Years" suffix="yrs" value={years} onChange={setYears} min={1} max={40} />
        <div className="flex flex-wrap gap-2 text-sm">
          {[["Yearly", 1], ["Half-yearly", 2], ["Quarterly", 4], ["Monthly", 12]].map(([l, v]) => (
            <button key={l} type="button" onClick={() => setN(v as number)} className={`rounded-full border px-3 py-1 ${n === v ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}>{l}</button>
          ))}
        </div>
        <Result items={[{ label: "Principal", value: r.invested }, { label: "Interest", value: r.gains }, { label: "Final amount", value: r.value, strong: true }]} />
      </div>
      <GrowthChart data={series} height={300} />
    </div>
  );
}

function ReturnCalc() {
  const [inv, setInv] = useState(100000);
  const [cur, setCur] = useState(165000);
  const [years, setYears] = useState(4);
  const r = investmentReturn(inv, cur, years);
  return (
    <div className="max-w-2xl space-y-6">
      <CalcField label="Amount invested" prefix="₹" value={inv} onChange={setInv} min={1000} max={10000000} step={1000} />
      <CalcField label="Current value" prefix="₹" value={cur} onChange={setCur} min={0} max={20000000} step={1000} />
      <CalcField label="Years held" suffix="yrs" value={years} onChange={setYears} min={1} max={40} />
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-muted p-4"><p className="text-xs text-muted-foreground">Gain</p><p className="num mt-1 font-display text-xl font-bold">{formatINR(r.gain)}</p></div>
        <div className="rounded-xl bg-muted p-4"><p className="text-xs text-muted-foreground">Absolute return</p><p className="num mt-1 font-display text-xl font-bold">{r.absolutePct.toFixed(2)}%</p></div>
        <div className="rounded-xl bg-gradient-card p-4 text-primary-foreground"><p className="text-xs opacity-80">CAGR (yearly)</p><p className="num mt-1 font-display text-xl font-bold">{r.cagrPct.toFixed(2)}%</p></div>
      </div>
    </div>
  );
}

function LearnPage() {
  const { t } = useI18n();
  return (
    <div className="space-y-8">
      <PageHeader title={t("nav.learn")} description="Plain-language lessons and accurate calculators. Educational only — not investment advice." />
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-xl font-bold"><BookOpen className="size-5 text-primary" /> Lessons</h2>
        <Card>
          <CardContent className="p-2 sm:p-4">
            <Accordion type="single" collapsible defaultValue="sip">
              {LESSONS.map((l) => (
                <AccordionItem key={l.id} value={l.id} className="border-b last:border-0">
                  <AccordionTrigger className="px-2 hover:no-underline">
                    <span className="flex items-center gap-3 text-left">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary text-primary"><l.icon className="size-4" /></span>
                      <span>
                        <span className="block font-semibold">{l.title}</span>
                        <span className="text-xs font-normal text-muted-foreground">{l.level}</span>
                      </span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-2 px-2 pl-14 text-sm leading-relaxed text-muted-foreground">
                    {l.body.map((b, i) => <p key={i}>{b}</p>)}
                    <p className="rounded-lg bg-accent p-3 text-accent-foreground"><strong>Tip:</strong> {l.tip}</p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </section>
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-xl font-bold"><Calculator className="size-5 text-primary" /> Calculators</h2>
        <Card>
          <CardContent className="p-4 sm:p-6">
            <Tabs defaultValue="sip">
              <TabsList className="mb-6 flex h-auto flex-wrap justify-start">
                <TabsTrigger value="sip">SIP</TabsTrigger>
                <TabsTrigger value="fd">FD</TabsTrigger>
                <TabsTrigger value="rd">RD</TabsTrigger>
                <TabsTrigger value="ci">Compound interest</TabsTrigger>
                <TabsTrigger value="ret">Returns (CAGR)</TabsTrigger>
              </TabsList>
              <TabsContent value="sip"><SipCalc /></TabsContent>
              <TabsContent value="fd"><FdCalc /></TabsContent>
              <TabsContent value="rd"><RdCalc /></TabsContent>
              <TabsContent value="ci"><CompoundCalc /></TabsContent>
              <TabsContent value="ret"><ReturnCalc /></TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

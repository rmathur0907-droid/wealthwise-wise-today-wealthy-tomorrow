import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { ArrowDownRight, ArrowUpRight, Briefcase, CheckCircle2, Clock, Repeat, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AiInsightsCard } from "@/components/ww/ai-insights";
import { LineSeriesChart, TrendChart } from "@/components/ww/charts";
import { EmiPlanner } from "@/components/ww/emi-planner";
import { EmptyState, PageHeader, StatCard } from "@/components/ww/ui";
import { categoryBreakdown, forMode, inMonth, monthlySeries, totals } from "@/lib/analytics";
import { linearForecast } from "@/lib/finance";
import { currentMonthKey, formatDate, formatINR, monthLabel, shiftMonth } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { useFinance } from "@/lib/store";

export const Route = createFileRoute("/app/business")({
  head: () => ({
    meta: [
      { title: "Business Finance — Wealth Wise" },
      { name: "description", content: "Profit & loss, pending customer payments, recurring costs, cash-flow forecast and EMI planning for small businesses." },
      { property: "og:title", content: "Business Finance — Wealth Wise" },
      { property: "og:description", content: "P&L, receivables, cash-flow forecast and EMI planning for small businesses." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BusinessPage,
});

function BusinessPage() {
  const { t } = useI18n();
  const { data, mode, setMode, updateTransaction } = useFinance();
  const txs = useMemo(() => forMode(data.transactions, "business"), [data.transactions]);
  const month = currentMonthKey();
  const s = useMemo(() => {
    const cur = totals(inMonth(txs, month));
    const prev = totals(inMonth(txs, shiftMonth(month, -1)));
    const series = monthlySeries(txs, 6);
    const net = series.map((x) => x.income - x.expense);
    const fIn = linearForecast(series.map((x) => x.income), 3);
    const fOut = linearForecast(series.map((x) => x.expense), 3);
    const forecast = [
      ...series.map((x) => ({ label: x.label, income: x.income, expense: x.expense, net: x.income - x.expense })),
      ...fIn.map((v, i) => ({ label: `${monthLabel(shiftMonth(month, i + 1))}*`, income: v, expense: fOut[i] ?? 0, net: v - (fOut[i] ?? 0) })),
    ];
    const receivables = txs.filter((x) => x.type === "income" && x.status === "pending").sort((a, b) => (a.date < b.date ? -1 : 1));
    const payables = txs.filter((x) => x.type === "expense" && x.status === "pending");
    const recurring = new Map<string, (typeof txs)[number]>();
    for (const x of [...txs].sort((a, b) => (a.date < b.date ? 1 : -1))) if (x.recurring && x.type === "expense" && !recurring.has(x.description.toLowerCase())) recurring.set(x.description.toLowerCase(), x);
    return { cur, prev, series, net, forecast, receivables, payables, recurring: [...recurring.values()], costs: categoryBreakdown(inMonth(txs, month)).slice(0, 6) };
  }, [txs, month]);
  const margin = s.cur.income > 0 ? (s.cur.savings / s.cur.income) * 100 : 0;
  const recurringTotal = s.recurring.reduce((a, x) => a + x.amount, 0);

  return (
    <div className="space-y-6">
      <PageHeader title={t("nav.business")} description={`Profit & loss and cash flow for ${monthLabel(month, false)}`}
        actions={mode !== "business" && <Button variant="outline" onClick={() => setMode("business")}><Briefcase /> Switch to Business mode to add entries</Button>} />
      {txs.length === 0 ? (
        <EmptyState icon={Briefcase} title="No business entries yet" text="Switch to Business mode and add sales, supplier costs, salaries and rent. Mark unpaid customer invoices as pending to track them here." action={<Button onClick={() => setMode("business")}>Switch to Business mode</Button>} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard tone="hero" label="Net profit this month" value={formatINR(s.cur.savings)} icon={TrendingUp} hint={`${margin.toFixed(1)}% margin · last month ${formatINR(s.prev.savings)}`} />
            <StatCard tone="income" label="Revenue" value={formatINR(s.cur.income)} icon={ArrowDownRight} />
            <StatCard tone="expense" label="Expenses" value={formatINR(s.cur.expense)} icon={ArrowUpRight} />
            <StatCard tone="gold" label="Customers owe you" value={formatINR(s.receivables.reduce((a, x) => a + x.amount, 0))} icon={Clock} hint={`${s.receivables.length} pending payments`} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Profit & loss — last 6 months</CardTitle></CardHeader>
              <CardContent><TrendChart data={s.series} /></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Cash-flow forecast <span className="text-xs font-normal text-muted-foreground">(* projected from your trend)</span></CardTitle></CardHeader>
              <CardContent>
                <LineSeriesChart data={s.forecast} lines={[{ key: "income", name: "Money in", color: "var(--income)" }, { key: "expense", name: "Money out", color: "var(--expense)" }, { key: "net", name: "Net", color: "var(--gold)", dashed: true }]} />
              </CardContent>
            </Card>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Clock className="size-4 text-primary" /> Pending customer payments</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {s.receivables.length === 0 && <p className="text-muted-foreground">Nothing pending. Mark a sale as “not received yet” to track it.</p>}
                {s.receivables.map((x) => (
                  <div key={x.id} className="flex items-center justify-between gap-2 rounded-lg border p-2.5">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{x.counterparty ?? x.description}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(x.date)} · {formatINR(x.amount)}</p>
                    </div>
                    <Button size="xs" variant="soft" onClick={() => void updateTransaction(x.id, { status: "paid" })}><CheckCircle2 /> Received</Button>
                  </div>
                ))}
                {s.payables.length > 0 && <p className="pt-2 text-xs text-muted-foreground">You also owe {formatINR(s.payables.reduce((a, x) => a + x.amount, 0))} across {s.payables.length} unpaid bills.</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Repeat className="size-4 text-primary" /> Recurring costs</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {s.recurring.length === 0 && <p className="text-muted-foreground">Mark rent, salaries and bills as “repeats monthly”.</p>}
                {s.recurring.map((x) => (
                  <div key={x.id} className="flex justify-between"><span className="truncate">{x.description}</span><span className="num">{formatINR(x.amount)}</span></div>
                ))}
                {s.recurring.length > 0 && <div className="flex justify-between border-t pt-2 font-semibold"><span>Fixed monthly costs</span><span className="num">{formatINR(recurringTotal)}</span></div>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Top costs this month</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {s.costs.map((c) => (
                  <div key={c.category} className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full" style={{ background: c.color }} />
                    <span className="flex-1 truncate">{c.label}</span>
                    <span className="num">{formatINR(c.amount)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
          <AiInsightsCard topic="business" title="AI business insights" />
        </>
      )}
      <EmiPlanner />
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, CalendarClock, Gauge, PiggyBank, Plus, Sparkle, TrendingUp, Upload, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AiInsightsCard } from "@/components/ww/ai-insights";
import { DonutChart, TrendChart } from "@/components/ww/charts";
import { TransactionDialog } from "@/components/ww/transaction-dialog";
import { ImportDialog } from "@/components/ww/import-dialog";
import { TxRow } from "@/components/ww/tx-row";
import { EmptyState, Meter, PageHeader, StatCard } from "@/components/ww/ui";
import { budgetReport, categoryBreakdown, forMode, inMonth, monthlySeries, portfolioSummary, totals, upcomingPayments } from "@/lib/analytics";
import { currentMonthKey, formatDate, formatINR } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { sampleTransactions } from "@/lib/sample";
import { useFinance, useModeTransactions } from "@/lib/store";
import type { TxType } from "@/lib/types";

export const Route = createFileRoute("/app/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Wealth Wise" },
      { name: "description", content: "This month's income, expenses, savings, budget use and AI insights at a glance." },
      { property: "og:title", content: "Dashboard — Wealth Wise" },
      { property: "og:description", content: "Income, expenses, savings and AI insights at a glance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { t } = useI18n();
  const { data, mode, email, source, addTransactions } = useFinance();
  const txs = useModeTransactions();
  const [dialog, setDialog] = useState<TxType | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [importing, setImporting] = useState(false);
  const month = currentMonthKey();

  const stats = useMemo(() => {
    const cur = totals(inMonth(txs, month));
    const all = totals(txs);
    return {
      cur,
      balance: all.income - all.expense,
      series: monthlySeries(txs, 6),
      cats: categoryBreakdown(inMonth(txs, month)).slice(0, 7),
      budget: budgetReport(data.transactions, data.budgets, mode, month),
      upcoming: upcomingPayments(data.transactions, mode).slice(0, 5),
      recent: [...txs].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)).slice(0, 6),
      portfolio: portfolioSummary(data.investments),
    };
  }, [txs, data.transactions, data.budgets, data.investments, mode, month]);

  const name = source === "account" && email ? email.split("@")[0] : null;
  const seed = async () => {
    setSeeding(true);
    await addTransactions(sampleTransactions(mode));
    setSeeding(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={name ? `${t("dash.welcome")}, ${name}` : t("nav.dashboard")}
        description={`${t(`mode.${mode}`)} · ${t("dash.thisMonth")}`}
        actions={
          <>
            <Button variant="outline" onClick={() => setDialog("income")}><ArrowDownRight className="text-income" /> {t("tx.income")}</Button>
            <Button onClick={() => setDialog("expense")}><Plus /> {t("tx.add")}</Button>
          </>
        }
      />

      {txs.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title={t("tx.empty")}
          text="Add an entry, import a bank statement, or load sample entries to see how Wealth Wise works. You can delete them any time."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={() => setDialog("expense")}><Plus /> {t("tx.add")}</Button>
              <Button variant="outline" onClick={() => setImporting(true)}><Upload /> {t("tx.import")}</Button>
              <Button variant="soft" onClick={seed} disabled={seeding}><Sparkle /> Load sample data</Button>
            </div>
          }
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard tone="hero" label={t("dash.balance")} value={formatINR(stats.balance)} icon={Wallet} hint="All income minus all expenses in this mode" />
            <StatCard tone="income" label={t("dash.income")} value={formatINR(stats.cur.income)} icon={ArrowDownRight} hint={t("dash.thisMonth")} />
            <StatCard tone="expense" label={t("dash.expenses")} value={formatINR(stats.cur.expense)} icon={ArrowUpRight} hint={t("dash.thisMonth")} />
            <StatCard tone="gold" label={t("dash.savings")} value={formatINR(stats.cur.savings)} icon={PiggyBank} hint={`${stats.cur.savingsRate.toFixed(0)}% of income saved`} />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2"><CardTitle className="text-base">{t("dash.trend")}</CardTitle></CardHeader>
              <CardContent><TrendChart data={stats.series} /></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">{t("dash.spending")}</CardTitle></CardHeader>
              <CardContent>
                {stats.cats.length ? (
                  <>
                    <DonutChart data={stats.cats} height={180} />
                    <ul className="mt-3 space-y-1.5 text-sm">
                      {stats.cats.slice(0, 5).map((c) => (
                        <li key={c.category} className="flex items-center gap-2">
                          <span className="size-2.5 rounded-full" style={{ background: c.color }} />
                          <span className="flex-1 truncate">{c.label}</span>
                          <span className="num font-medium">{formatINR(c.amount)}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : <p className="py-10 text-center text-sm text-muted-foreground">No expenses this month yet.</p>}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex-row items-center justify-between pb-2">
                <CardTitle className="flex items-center gap-2 text-base"><Gauge className="size-4 text-primary" /> {t("dash.budgetUsed")}</CardTitle>
                <Link to="/app/budget" className="text-xs font-semibold text-primary hover:underline">{t("common.viewAll")}</Link>
              </CardHeader>
              <CardContent className="space-y-4">
                {stats.budget.overallLimit > 0 ? (
                  <>
                    <div>
                      <div className="mb-1.5 flex justify-between text-sm">
                        <span className="num font-semibold">{formatINR(stats.budget.totalSpent)}</span>
                        <span className="num text-muted-foreground">of {formatINR(stats.budget.overallLimit)}</span>
                      </div>
                      <Meter pct={stats.budget.overallStatus.pct} state={stats.budget.overallStatus.state} />
                    </div>
                    {stats.budget.alerts.slice(0, 3).map((a) => (
                      <p key={a.budget.id} className="rounded-lg bg-warning/15 px-3 py-2 text-xs text-accent-foreground">
                        {a.state === "over" ? t("budget.over") : t("budget.near")}: {a.budget.category} ({a.pct.toFixed(0)}%)
                      </p>
                    ))}
                  </>
                ) : (
                  <div className="py-4 text-center text-sm text-muted-foreground">
                    No budget yet. <Link to="/app/budget" className="font-semibold text-primary hover:underline">{t("budget.set")}</Link>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex-row items-center justify-between pb-2">
                <CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="size-4 text-primary" /> {t("dash.investments")}</CardTitle>
                <Link to="/app/portfolio" className="text-xs font-semibold text-primary hover:underline">{t("common.viewAll")}</Link>
              </CardHeader>
              <CardContent>
                {data.investments.length ? (
                  <div className="space-y-2">
                    <p className="num font-display text-2xl font-bold">{formatINR(stats.portfolio.current)}</p>
                    <p className={stats.portfolio.gain >= 0 ? "text-sm text-income" : "text-sm text-expense"}>
                      {stats.portfolio.gain >= 0 ? "+" : ""}{formatINR(stats.portfolio.gain)} ({stats.portfolio.gainPct.toFixed(1)}%)
                    </p>
                    <p className="text-xs text-muted-foreground">Monthly SIPs: {formatINR(stats.portfolio.monthlySip)}</p>
                  </div>
                ) : (
                  <div className="py-4 text-center text-sm text-muted-foreground">
                    Track SIPs, FDs and stocks. <Link to="/app/portfolio" className="font-semibold text-primary hover:underline">Add investment</Link>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><CalendarClock className="size-4 text-primary" /> {t("dash.upcoming")}</CardTitle></CardHeader>
              <CardContent>
                {stats.upcoming.length ? (
                  <ul className="space-y-2.5 text-sm">
                    {stats.upcoming.map((u) => (
                      <li key={u.id + u.dueDate} className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{u.description}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(u.dueDate)} · {u.kind === "pending" ? "pending" : "monthly"}</p>
                        </div>
                        <span className={u.type === "income" ? "num text-income" : "num"}>{formatINR(u.amount)}</span>
                      </li>
                    ))}
                  </ul>
                ) : <p className="py-4 text-center text-sm text-muted-foreground">Mark bills as “repeats monthly” to see them here.</p>}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">{t("dash.recent")}</CardTitle>
                <Link to="/app/transactions" className="text-xs font-semibold text-primary hover:underline">{t("common.viewAll")}</Link>
              </CardHeader>
              <CardContent className="space-y-0.5">
                {stats.recent.map((tx) => <TxRow key={tx.id} tx={tx} />)}
              </CardContent>
            </Card>
            <AiInsightsCard topic={mode === "business" ? "business" : mode === "family" ? "family" : "overview"} />
          </div>
        </>
      )}

      <ImportDialog open={importing} onOpenChange={setImporting} />
      <TransactionDialog open={dialog !== null} onOpenChange={(o) => !o && setDialog(null)} defaultType={dialog ?? "expense"} />
    </div>
  );
}

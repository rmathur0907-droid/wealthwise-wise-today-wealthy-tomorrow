import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { FileSpreadsheet, FileText, Loader2, PiggyBank, ReceiptIndianRupee, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DonutChart, TrendChart } from "@/components/ww/charts";
import { EmptyState, PageHeader, StatCard } from "@/components/ww/ui";
import { getCategory } from "@/lib/categories";
import { formatDate, formatINR } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { buildReport, periodRange, REPORT_PERIODS, type ReportPeriod } from "@/lib/reports";
import { useFinance } from "@/lib/store";

export const Route = createFileRoute("/app/reports")({
  head: () => ({
    meta: [
      { title: "Financial Reports — Wealth Wise" },
      { name: "description", content: "Monthly and financial-year reports of your income, spending and savings, downloadable as PDF or Excel." },
      { property: "og:title", content: "Financial Reports — Wealth Wise" },
      { property: "og:description", content: "Income, spending and savings reports with PDF and Excel downloads." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const { t } = useI18n();
  const { data, mode } = useFinance();
  const [period, setPeriod] = useState<ReportPeriod>("this_month");
  const [busy, setBusy] = useState<"pdf" | "xlsx" | null>(null);
  const report = useMemo(() => buildReport(data, mode, periodRange(period)), [data, mode, period]);
  const s = report.summary;
  const empty = s.count === 0;

  const download = async (kind: "pdf" | "xlsx") => {
    setBusy(kind);
    try {
      const ex = await import("@/lib/export");
      await (kind === "pdf" ? ex.exportReportPdf(report) : ex.exportReportExcel(report));
      toast.success(kind === "pdf" ? "PDF report downloaded" : "Excel report downloaded");
    } catch (e) {
      console.error(e);
      toast.error("Couldn't create the file. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("nav.reports")}
        description={`${t(`mode.${mode}`)} · ${report.range.label}`}
        actions={
          <>
            <Select value={period} onValueChange={(v) => setPeriod(v as ReportPeriod)}>
              <SelectTrigger className="w-48" aria-label="Report period"><SelectValue /></SelectTrigger>
              <SelectContent>{REPORT_PERIODS.map((p) => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="outline" disabled={empty || !!busy} onClick={() => void download("xlsx")}>
              {busy === "xlsx" ? <Loader2 className="animate-spin" /> : <FileSpreadsheet />} Excel
            </Button>
            <Button disabled={empty || !!busy} onClick={() => void download("pdf")}>
              {busy === "pdf" ? <Loader2 className="animate-spin" /> : <FileText />} PDF
            </Button>
          </>
        }
      />

      {empty ? (
        <EmptyState icon={ReceiptIndianRupee} title="Nothing to report for this period" text="Add or import transactions, or pick a different period above." action={<Button asChild><Link to="/app/transactions">Go to transactions</Link></Button>} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard tone="hero" label="Net savings" value={formatINR(s.savings)} hint={`${s.savingsRate.toFixed(1)}% of income saved`} icon={PiggyBank} />
            <StatCard tone="income" label={t("dash.income")} value={formatINR(s.income)} icon={TrendingUp} />
            <StatCard tone="expense" label={t("dash.expenses")} value={formatINR(s.expense)} hint={report.range.months.length > 1 ? `About ${formatINR(s.avgMonthlyExpense)} a month` : undefined} icon={TrendingDown} />
            <StatCard tone="gold" label="Transactions" value={String(s.count)} hint={report.pending.receivable || report.pending.payable ? `Pending: ${formatINR(report.pending.receivable)} to receive · ${formatINR(report.pending.payable)} to pay` : "No pending payments"} icon={Wallet} />
          </div>

          <div className="grid gap-4 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <CardHeader><CardTitle>Month by month</CardTitle></CardHeader>
              <CardContent><TrendChart data={report.monthly} /></CardContent>
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle>{t("dash.spending")}</CardTitle></CardHeader>
              <CardContent>
                {report.expenseByCategory.length ? (
                  <>
                    <DonutChart data={report.expenseByCategory} height={200} />
                    <ul className="mt-3 space-y-1.5 text-sm">
                      {report.expenseByCategory.slice(0, 6).map((c) => (
                        <li key={c.category} className="flex items-center gap-2">
                          <span className="size-2.5 rounded-full" style={{ background: c.color }} />
                          <span className="flex-1 truncate">{c.label}</span>
                          <span className="num font-medium">{formatINR(c.amount)}</span>
                          <span className="w-10 text-right text-xs text-muted-foreground">{s.expense ? ((c.amount / s.expense) * 100).toFixed(0) : 0}%</span>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : <p className="text-sm text-muted-foreground">No expenses in this period.</p>}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader><CardTitle>How you paid</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {report.byPaymentMethod.length ? report.byPaymentMethod.map((p) => (
                  <div key={p.method} className="flex justify-between gap-2"><span>{p.label} <span className="text-xs text-muted-foreground">· {p.count}</span></span><span className="num font-medium">{formatINR(p.amount)}</span></div>
                )) : <p className="text-muted-foreground">No expenses yet.</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Where money came from</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {report.incomeByCategory.length ? report.incomeByCategory.map((c) => (
                  <div key={c.category} className="flex justify-between gap-2"><span>{c.label}</span><span className="num font-medium text-income">{formatINR(c.amount)}</span></div>
                )) : <p className="text-muted-foreground">No income recorded.</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Biggest expenses</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {report.topExpenses.length ? report.topExpenses.map((x) => (
                  <div key={x.id} className="flex justify-between gap-2">
                    <span className="min-w-0"><span className="block truncate">{x.description}</span><span className="text-xs text-muted-foreground">{formatDate(x.date)} · {getCategory(x.category).label}</span></span>
                    <span className="num shrink-0 font-medium text-expense">{formatINR(x.amount)}</span>
                  </div>
                )) : <p className="text-muted-foreground">No expenses yet.</p>}
              </CardContent>
            </Card>
          </div>
          <p className="text-xs text-muted-foreground">Reports are built only from what you have entered. The PDF and Excel files include every transaction in this period{report.investments.length ? ", plus your investments" : ""}.</p>
        </>
      )}
    </div>
  );
}

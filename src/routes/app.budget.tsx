import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent } from "react";
import { AlertTriangle, CheckCircle2, Plus, Target, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AiInsightsCard } from "@/components/ww/ai-insights";
import { EmptyState, Meter, PageHeader } from "@/components/ww/ui";
import { budgetReport, categoryBreakdown, forMode, inMonth } from "@/lib/analytics";
import { EXPENSE_CATEGORIES, getCategory } from "@/lib/categories";
import { currentMonthKey, formatINR, monthLabel, shiftMonth } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { useFinance } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/budget")({
  head: () => ({
    meta: [
      { title: "Smart Budget — Wealth Wise" },
      { name: "description", content: "Set an overall monthly budget and category limits, get alerts and AI tips to save more." },
      { property: "og:title", content: "Smart Budget — Wealth Wise" },
      { property: "og:description", content: "Monthly and category budgets with alerts and AI saving tips." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BudgetPage,
});

function BudgetPage() {
  const { t } = useI18n();
  const { data, mode, setBudget, deleteBudget, canEditFamily } = useFinance();
  const month = currentMonthKey();
  const report = useMemo(() => budgetReport(data.transactions, data.budgets, mode, month), [data.transactions, data.budgets, mode, month]);
  const lastMonth = useMemo(() => new Map(categoryBreakdown(inMonth(forMode(data.transactions, mode), shiftMonth(month, -1))).map((c) => [c.category, c.amount])), [data.transactions, mode, month]);
  const unbudgeted = useMemo(() => {
    const set = new Set(report.categories.map((c) => c.budget.category));
    return categoryBreakdown(inMonth(forMode(data.transactions, mode), month)).filter((c) => !set.has(c.category));
  }, [report, data.transactions, mode, month]);
  const [dialog, setDialog] = useState<{ category: string; amount: string } | null>(null);
  const readOnly = mode === "family" && !canEditFamily;
  const daysLeft = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate() + 1;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!dialog) return;
    const amt = Number(dialog.amount);
    if (!(amt > 0)) return;
    await setBudget(mode, dialog.category, amt);
    setDialog(null);
  };
  const st = report.overallStatus;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("nav.budget")}
        description={`${t(`mode.${mode}`)} · ${monthLabel(month, false)} · ${daysLeft} days left`}
        actions={!readOnly && (
          <>
            <Button variant="outline" onClick={() => setDialog({ category: "_total", amount: String(report.overall?.amount ?? "") })}>{t("budget.overall")}</Button>
            <Button onClick={() => setDialog({ category: EXPENSE_CATEGORIES.find((c) => !report.categories.some((x) => x.budget.category === c.id))?.id ?? "food", amount: "" })}><Plus /> Category limit</Button>
          </>
        )}
      />

      {report.overallLimit === 0 && report.categories.length === 0 ? (
        <EmptyState icon={Target} title="No budget yet" text="Set an overall monthly limit and limits for categories like food or shopping. You'll be warned at 80% and when you go over."
          action={!readOnly && <Button onClick={() => setDialog({ category: "_total", amount: "" })}>{t("budget.set")}</Button>} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="overflow-hidden lg:col-span-2">
            <div className="bg-gradient-card p-6 text-primary-foreground">
              <p className="text-sm opacity-80">{t("budget.overall")}</p>
              <div className="mt-1 flex flex-wrap items-end justify-between gap-2">
                <p className="num font-display text-4xl font-bold">{formatINR(report.totalSpent)}</p>
                <p className="num text-sm opacity-85">of {formatINR(report.overallLimit)}</p>
              </div>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-primary-foreground/15">
                <div className={cn("h-full rounded-full", st.state === "over" ? "bg-destructive" : "bg-gradient-gold")} style={{ width: `${Math.min(100, st.pct)}%` }} />
              </div>
              <p className="mt-3 text-sm opacity-90">
                {st.remaining >= 0 ? `${formatINR(st.remaining)} ${t("budget.remaining")} · about ${formatINR(st.remaining / daysLeft)} a day` : `${formatINR(-st.remaining)} over budget`}
              </p>
            </div>
            <CardContent className="space-y-4 p-6">
              {report.categories.length === 0 && <p className="text-sm text-muted-foreground">Add category limits to see where your money goes.</p>}
              {report.categories.map((c) => {
                const cat = getCategory(c.budget.category);
                const prev = lastMonth.get(c.budget.category) ?? 0;
                return (
                  <div key={c.budget.id} className="group">
                    <div className="mb-1.5 flex items-center gap-2 text-sm">
                      <cat.icon className="size-4" style={{ color: cat.color }} />
                      <span className="flex-1 font-medium">{cat.label}</span>
                      {c.state !== "ok" && <span className={cn("rounded-full px-2 py-px text-[11px] font-semibold", c.state === "over" ? "bg-destructive/15 text-destructive" : "bg-warning/25 text-accent-foreground")}>{c.state === "over" ? t("budget.over") : t("budget.near")}</span>}
                      <span className="num text-muted-foreground">{formatINR(c.spent)} / {formatINR(c.budget.amount)}</span>
                      {!readOnly && (
                        <>
                          <button type="button" className="text-xs font-medium text-primary opacity-0 group-hover:opacity-100 focus:opacity-100" onClick={() => setDialog({ category: c.budget.category, amount: String(c.budget.amount) })}>{t("tx.edit")}</button>
                          <button type="button" aria-label="Remove budget" className="text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100 focus:opacity-100" onClick={() => void deleteBudget(c.budget.id)}><Trash2 className="size-3.5" /></button>
                        </>
                      )}
                    </div>
                    <Meter pct={c.pct} state={c.state} />
                    {prev > 0 && <p className="mt-1 text-[11px] text-muted-foreground">Last month: {formatINR(prev)} ({c.spent >= prev ? "+" : ""}{(((c.spent - prev) / prev) * 100).toFixed(0)}%)</p>}
                  </div>
                );
              })}
            </CardContent>
          </Card>
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Alerts</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {st.state !== "ok" && report.overallLimit > 0 && (
                  <p className="flex gap-2 rounded-lg bg-destructive/10 p-2.5 text-destructive"><AlertTriangle className="size-4 shrink-0" /> Overall budget is at {st.pct.toFixed(0)}%.</p>
                )}
                {report.alerts.map((a) => (
                  <p key={a.budget.id} className="flex gap-2 rounded-lg bg-warning/15 p-2.5 text-accent-foreground"><AlertTriangle className="size-4 shrink-0" /> {getCategory(a.budget.category).label}: {a.pct.toFixed(0)}% used.</p>
                ))}
                {report.alerts.length === 0 && st.state === "ok" && <p className="flex gap-2 text-income"><CheckCircle2 className="size-4" /> All budgets on track.</p>}
                {unbudgeted.slice(0, 3).map((u) => (
                  <p key={u.category} className="text-xs text-muted-foreground">No limit for {u.label} ({formatINR(u.amount)} spent).{" "}
                    {!readOnly && <button className="font-semibold text-primary hover:underline" onClick={() => setDialog({ category: u.category, amount: String(Math.ceil(u.amount / 500) * 500) })}>Set one</button>}
                  </p>
                ))}
              </CardContent>
            </Card>
            <AiInsightsCard topic="budget" title="AI spending insights" />
          </div>
        </div>
      )}

      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{dialog?.category === "_total" ? t("budget.overall") : t("budget.set")}</DialogTitle></DialogHeader>
          {dialog && (
            <form onSubmit={save} className="space-y-4">
              {dialog.category !== "_total" && (
                <div className="space-y-2">
                  <Label>{t("tx.category")}</Label>
                  <Select value={dialog.category} onValueChange={(v) => setDialog({ ...dialog, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{EXPENSE_CATEGORIES.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="bamt">Monthly limit (₹)</Label>
                <Input id="bamt" type="number" min="1" required autoFocus value={dialog.amount} onChange={(e) => setDialog({ ...dialog, amount: e.target.value })} />
              </div>
              <DialogFooter><Button type="button" variant="ghost" onClick={() => setDialog(null)}>{t("tx.cancel")}</Button><Button>{t("tx.save")}</Button></DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent } from "react";
import { Pencil, PieChart as PieIcon, Plus, Trash2, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AiInsightsCard } from "@/components/ww/ai-insights";
import { DonutChart } from "@/components/ww/charts";
import { EmptyState, PageHeader, StatCard } from "@/components/ww/ui";
import { portfolioSummary } from "@/lib/analytics";
import { investmentReturn } from "@/lib/finance";
import { formatINR, todayISO } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { useFinance } from "@/lib/store";
import type { Investment, InvestmentType, Risk } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/portfolio")({
  head: () => ({
    meta: [
      { title: "Portfolio Tracker — Wealth Wise" },
      { name: "description", content: "Track SIPs, mutual funds, stocks, FDs, PPF and gold in one place, with returns, allocation and AI analysis." },
      { property: "og:title", content: "Portfolio Tracker — Wealth Wise" },
      { property: "og:description", content: "Track all your investments with returns, allocation and AI analysis." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PortfolioPage,
});

export const INVESTMENT_TYPES: Array<{ id: InvestmentType; label: string; risk: Risk; rate: number; color: string }> = [
  { id: "sip", label: "SIP (mutual fund)", risk: "moderate", rate: 12, color: "var(--chart-1)" },
  { id: "mutual_fund", label: "Mutual fund (lumpsum)", risk: "moderate", rate: 11, color: "var(--chart-4)" },
  { id: "index_fund", label: "Index fund", risk: "moderate", rate: 11, color: "var(--chart-5)" },
  { id: "stock", label: "Stocks", risk: "high", rate: 13, color: "var(--chart-3)" },
  { id: "fd", label: "Fixed deposit", risk: "low", rate: 7, color: "var(--chart-2)" },
  { id: "rd", label: "Recurring deposit", risk: "low", rate: 6.8, color: "oklch(0.72 0.13 100)" },
  { id: "ppf", label: "PPF", risk: "low", rate: 7.1, color: "oklch(0.6 0.12 175)" },
  { id: "gold", label: "Gold / SGB", risk: "moderate", rate: 8, color: "oklch(0.8 0.15 85)" },
  { id: "bond", label: "Bonds", risk: "low", rate: 7.5, color: "oklch(0.55 0.08 250)" },
  { id: "other", label: "Other", risk: "moderate", rate: 8, color: "oklch(0.65 0.02 150)" },
];
const typeOf = (id: string) => INVESTMENT_TYPES.find((t) => t.id === id) ?? INVESTMENT_TYPES[INVESTMENT_TYPES.length - 1]!;
const RISK_LABEL: Record<Risk, string> = { low: "Low risk", moderate: "Moderate risk", high: "High risk" };

type Form = { name: string; type: InvestmentType; invested: string; current_value: string; expected_return: string; risk: Risk; start_date: string; monthly_sip: string };
const blank = (): Form => ({ name: "", type: "sip", invested: "", current_value: "", expected_return: "12", risk: "moderate", start_date: todayISO(), monthly_sip: "" });

function PortfolioPage() {
  const { t } = useI18n();
  const { data, addInvestment, updateInvestment, deleteInvestment } = useFinance();
  const inv = data.investments;
  const sum = useMemo(() => portfolioSummary(inv), [inv]);
  const [form, setForm] = useState<Form | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  const open = (i?: Investment) => {
    setEditId(i?.id ?? null);
    setForm(i ? { name: i.name, type: i.type, invested: String(i.invested), current_value: String(i.current_value), expected_return: String(i.expected_return), risk: i.risk, start_date: i.start_date, monthly_sip: String(i.monthly_sip || "") } : blank());
  };
  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!form) return;
    const invested = Number(form.invested) || 0;
    const payload = {
      name: form.name.trim() || typeOf(form.type).label, type: form.type, invested,
      current_value: form.current_value === "" ? invested : Number(form.current_value) || 0,
      expected_return: Number(form.expected_return) || 0, risk: form.risk, start_date: form.start_date, monthly_sip: Number(form.monthly_sip) || 0,
    };
    if (editId) await updateInvestment(editId, payload);
    else await addInvestment(payload);
    setForm(null);
  };
  const years = (d: string) => Math.max(0.1, (Date.now() - new Date(d + "T00:00:00").getTime()) / (365.25 * 86400000));
  const alloc = sum.byType.map((b) => ({ label: typeOf(b.type).label, amount: b.value, color: typeOf(b.type).color }));

  return (
    <div className="space-y-6">
      <PageHeader title={t("nav.portfolio")} description="All your investments in one view. Update current values from your app or statement." actions={<Button onClick={() => open()}><Plus /> Add investment</Button>} />
      {inv.length === 0 ? (
        <EmptyState icon={PieIcon} title="No investments yet" text="Add your SIPs, mutual funds, stocks, FDs, PPF or gold to see total value, returns and how diversified you are." action={<Button onClick={() => open()}><Plus /> Add investment</Button>} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard tone="hero" label="Current value" value={formatINR(sum.current)} icon={Wallet} />
            <StatCard label="Total invested" value={formatINR(sum.invested)} />
            <StatCard tone={sum.gain >= 0 ? "income" : "expense"} label="Total gain" value={`${sum.gain >= 0 ? "+" : ""}${formatINR(sum.gain)}`} icon={sum.gain >= 0 ? TrendingUp : TrendingDown} hint={`${sum.gainPct.toFixed(2)}% overall`} />
            <StatCard tone="gold" label="Monthly SIPs" value={formatINR(sum.monthlySip)} hint={`Weighted expected return ${sum.weightedReturn.toFixed(1)}% p.a.`} />
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2"><CardTitle className="text-base">Holdings</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="text-left text-xs text-muted-foreground">
                    <tr><th className="pb-2">Name</th><th className="pb-2 text-right">Invested</th><th className="pb-2 text-right">Current</th><th className="pb-2 text-right">Return</th><th className="pb-2" /></tr>
                  </thead>
                  <tbody>
                    {inv.map((i) => {
                      const r = investmentReturn(i.invested, i.current_value, years(i.start_date));
                      return (
                        <tr key={i.id} className="group border-t">
                          <td className="py-2.5">
                            <p className="font-medium">{i.name}</p>
                            <p className="text-xs text-muted-foreground">{typeOf(i.type).label} · {RISK_LABEL[i.risk]}{i.monthly_sip ? ` · ${formatINR(i.monthly_sip)}/mo` : ""}</p>
                          </td>
                          <td className="num py-2.5 text-right">{formatINR(i.invested)}</td>
                          <td className="num py-2.5 text-right font-medium">{formatINR(i.current_value)}</td>
                          <td className={cn("num py-2.5 text-right", r.gain >= 0 ? "text-income" : "text-expense")}>
                            {r.absolutePct.toFixed(1)}%
                            {years(i.start_date) >= 1 && <span className="block text-[11px] text-muted-foreground">CAGR {r.cagrPct.toFixed(1)}%</span>}
                          </td>
                          <td className="py-2.5 text-right">
                            <Button variant="ghost" size="icon-sm" aria-label="Edit investment" onClick={() => open(i)}><Pencil /></Button>
                            <Button variant="ghost" size="icon-sm" aria-label="Delete investment" onClick={() => void deleteInvestment(i.id)}><Trash2 /></Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Allocation</CardTitle></CardHeader>
              <CardContent>
                <DonutChart data={alloc} height={180} />
                <ul className="mt-3 space-y-1.5 text-sm">
                  {alloc.map((a) => (
                    <li key={a.label} className="flex items-center gap-2">
                      <span className="size-2.5 rounded-full" style={{ background: a.color }} />
                      <span className="flex-1">{a.label}</span>
                      <span className="num text-muted-foreground">{((a.amount / (sum.current || 1)) * 100).toFixed(0)}%</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 space-y-1.5 border-t pt-3 text-xs">
                  {(["low", "moderate", "high"] as Risk[]).map((r) => {
                    const v = sum.byRisk.find((x) => x.risk === r)?.value ?? 0;
                    return <div key={r} className="flex justify-between"><span>{RISK_LABEL[r]}</span><span className="num">{((v / (sum.current || 1)) * 100).toFixed(0)}%</span></div>;
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
          <AiInsightsCard topic="portfolio" title="AI portfolio analysis" />
        </>
      )}

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editId ? "Edit investment" : "Add investment"}</DialogTitle></DialogHeader>
          {form && (
            <form onSubmit={save} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-2 sm:col-span-1">
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={(v) => { const ty = typeOf(v); setForm({ ...form, type: ty.id, risk: ty.risk, expected_return: String(ty.rate) }); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{INVESTMENT_TYPES.map((x) => <SelectItem key={x.id} value={x.id}>{x.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-2 sm:col-span-1">
                  <Label htmlFor="iname">Name</Label>
                  <Input id="iname" placeholder="e.g. Nifty 50 Index Fund" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="iinv">Amount invested (₹)</Label>
                  <Input id="iinv" type="number" min="0" required value={form.invested} onChange={(e) => setForm({ ...form, invested: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="icur">Current value (₹)</Label>
                  <Input id="icur" type="number" min="0" placeholder="Same as invested" value={form.current_value} onChange={(e) => setForm({ ...form, current_value: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="isip">Monthly SIP (₹)</Label>
                  <Input id="isip" type="number" min="0" placeholder="0" value={form.monthly_sip} onChange={(e) => setForm({ ...form, monthly_sip: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="iret">Expected return (% p.a.)</Label>
                  <Input id="iret" type="number" step="0.1" min="0" value={form.expected_return} onChange={(e) => setForm({ ...form, expected_return: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Risk</Label>
                  <Select value={form.risk} onValueChange={(v) => setForm({ ...form, risk: v as Risk })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{(["low", "moderate", "high"] as Risk[]).map((r) => <SelectItem key={r} value={r}>{RISK_LABEL[r]}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="idate">Start date</Label>
                  <Input id="idate" type="date" required value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
                </div>
              </div>
              <DialogFooter><Button type="button" variant="ghost" onClick={() => setForm(null)}>{t("tx.cancel")}</Button><Button>{t("tx.save")}</Button></DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

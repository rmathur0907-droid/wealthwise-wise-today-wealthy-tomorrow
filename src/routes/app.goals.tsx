import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent } from "react";
import { CalendarCheck, Flag, Plus, Trash2, Trophy, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, Meter, PageHeader } from "@/components/ww/ui";
import { challengeProgress, computeBadges, monthlyNeeded } from "@/lib/badges";
import { forMode, inMonth, totals } from "@/lib/analytics";
import { EXPENSE_CATEGORIES, getCategory } from "@/lib/categories";
import { currentMonthKey, formatDate, formatINR, shiftMonth, todayISO } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { useFinance } from "@/lib/store";
import type { Goal } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/goals")({
  head: () => ({
    meta: [
      { title: "Goals, Challenges & Badges — Wealth Wise" },
      { name: "description", content: "Save for goals, take money challenges and earn achievement badges as your habits improve." },
      { property: "og:title", content: "Goals, Challenges & Badges — Wealth Wise" },
      { property: "og:description", content: "Savings goals, money challenges and achievement badges." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GoalsPage,
});

type ChallengeKind = "save_amount" | "reduce_category" | "emergency_fund" | "streak30";
const CHALLENGES: Array<{ id: ChallengeKind; title: string; text: string }> = [
  { id: "save_amount", title: "Save a fixed amount this month", text: "Income minus expenses this month must reach your target." },
  { id: "reduce_category", title: "Cut a category", text: "Spend less in one category than last month by a percentage." },
  { id: "emergency_fund", title: "Build an emergency fund", text: "Save 6 months of expenses, step by step." },
  { id: "streak30", title: "30-day tracking streak", text: "Check in every day for 30 days and log your spends." },
];

function GoalsPage() {
  const { t } = useI18n();
  const { data, mode, addGoal, updateGoal, deleteGoal } = useFinance();
  const badges = useMemo(() => computeBadges(data), [data]);
  const goals = data.goals.filter((g) => g.mode === mode && g.kind === "goal");
  const challenges = data.goals.filter((g) => g.mode === mode && g.kind === "challenge");
  const [goalForm, setGoalForm] = useState<{ title: string; target: string; saved: string; deadline: string } | null>(null);
  const [chForm, setChForm] = useState<{ kind: ChallengeKind; target: string; category: string; percent: string } | null>(null);
  const [addMoney, setAddMoney] = useState<{ goal: Goal; amount: string } | null>(null);
  const month = currentMonthKey();
  const avgExpense = useMemo(() => {
    const txs = forMode(data.transactions, mode);
    const vals = [1, 2, 3].map((i) => totals(inMonth(txs, shiftMonth(month, -i))).expense).filter((v) => v > 0);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : totals(inMonth(txs, month)).expense;
  }, [data.transactions, mode, month]);

  const saveGoal = async (e: FormEvent) => {
    e.preventDefault();
    if (!goalForm) return;
    await addGoal({ mode, kind: "goal", title: goalForm.title.trim() || "My goal", target: Number(goalForm.target) || 0, saved: Number(goalForm.saved) || 0, deadline: goalForm.deadline || null, meta: {} });
    setGoalForm(null);
  };
  const saveChallenge = async (e: FormEvent) => {
    e.preventDefault();
    if (!chForm) return;
    const c = CHALLENGES.find((x) => x.id === chForm.kind)!;
    const target = chForm.kind === "emergency_fund" ? Math.round(avgExpense * 6) || Number(chForm.target) || 0 : chForm.kind === "streak30" ? 30 : Number(chForm.target) || 0;
    const title = chForm.kind === "reduce_category" ? `Spend ${chForm.percent}% less on ${getCategory(chForm.category).label}` : chForm.kind === "save_amount" ? `Save ${formatINR(target)} this month` : c.title;
    await addGoal({ mode, kind: "challenge", title, target, saved: 0, deadline: null, meta: { challenge: chForm.kind, category: chForm.category, percent: Number(chForm.percent) || 10, month, checkins: [] } });
    setChForm(null);
  };
  const contribute = async (e: FormEvent) => {
    e.preventDefault();
    if (!addMoney) return;
    const amt = Number(addMoney.amount);
    if (!amt) return;
    const g = addMoney.goal;
    const saved = Math.max(0, g.saved + amt);
    await updateGoal(g.id, { saved });
    if (g.saved < g.target && saved >= g.target) toast.success(`🎉 Goal reached: ${g.title}!`);
    setAddMoney(null);
  };
  const checkIn = (g: Goal) => {
    const today = todayISO();
    const list = g.meta.checkins ?? [];
    if (list.includes(today)) return void toast("Already checked in today. See you tomorrow!");
    void updateGoal(g.id, { meta: { ...g.meta, checkins: [...list, today] } });
    toast.success("Checked in for today ✅");
  };

  return (
    <div className="space-y-8">
      <PageHeader title={t("nav.goals")} description={`${t(`mode.${mode}`)} goals and challenges`}
        actions={<><Button variant="outline" onClick={() => setChForm({ kind: "save_amount", target: "5000", category: "food", percent: "15" })}><Zap /> New challenge</Button><Button onClick={() => setGoalForm({ title: "", target: "", saved: "", deadline: "" })}><Plus /> New goal</Button></>} />

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-xl font-bold"><Flag className="size-5 text-primary" /> Savings goals</h2>
        {goals.length === 0 ? (
          <EmptyState icon={Flag} title="No goals yet" text="Saving for a phone, a trip to Goa, a child's education or a home down payment? Add it and track progress." action={<Button onClick={() => setGoalForm({ title: "", target: "", saved: "", deadline: "" })}><Plus /> New goal</Button>} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {goals.map((g) => {
              const pct = g.target > 0 ? (g.saved / g.target) * 100 : 0;
              const need = monthlyNeeded(g.target, g.saved, g.deadline);
              return (
                <Card key={g.id} className={cn("p-5", pct >= 100 && "border-gold shadow-glow")}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-display text-lg font-semibold">{g.title}</p>
                      {g.deadline && <p className="text-xs text-muted-foreground">By {formatDate(g.deadline)}</p>}
                    </div>
                    <Button variant="ghost" size="icon-sm" aria-label="Delete goal" onClick={() => void deleteGoal(g.id)}><Trash2 /></Button>
                  </div>
                  <p className="num mt-3 font-display text-2xl font-bold">{formatINR(g.saved)} <span className="text-sm font-normal text-muted-foreground">of {formatINR(g.target)}</span></p>
                  <div className="mt-2"><Meter pct={pct} /></div>
                  <p className="mt-2 text-xs text-muted-foreground">{pct >= 100 ? "🎉 Goal reached!" : need != null ? `Save about ${formatINR(need)} a month to make it` : `${pct.toFixed(0)}% done`}</p>
                  {pct < 100 && <Button size="sm" variant="soft" className="mt-3" onClick={() => setAddMoney({ goal: g, amount: "" })}><Plus /> Add money</Button>}
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-xl font-bold"><Zap className="size-5 text-primary" /> Challenges</h2>
        {challenges.length === 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {CHALLENGES.map((c) => (
              <button key={c.id} type="button" onClick={() => setChForm({ kind: c.id, target: "5000", category: "food", percent: "15" })} className="rounded-2xl border bg-card p-4 text-left shadow-card transition hover:-translate-y-0.5 hover:border-primary">
                <p className="font-semibold">{c.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{c.text}</p>
              </button>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {challenges.map((g) => {
              const p = g.meta.challenge === "emergency_fund" ? { pct: g.target ? (g.saved / g.target) * 100 : 0, done: g.saved >= g.target && g.target > 0, status: `${formatINR(g.saved)} of ${formatINR(g.target)} (6 months of expenses)` } : challengeProgress(g, data);
              return (
                <Card key={g.id} className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold">{p.done && "✅ "}{g.title}</p>
                    <Button variant="ghost" size="icon-sm" aria-label="Delete challenge" onClick={() => void deleteGoal(g.id)}><Trash2 /></Button>
                  </div>
                  <div className="mt-3"><Meter pct={p.pct} state={g.meta.challenge === "reduce_category" && p.pct >= 100 ? "over" : "ok"} /></div>
                  <p className="mt-2 text-xs text-muted-foreground">{p.status}</p>
                  {g.meta.challenge === "streak30" && !p.done && <Button size="sm" variant="soft" className="mt-3" onClick={() => checkIn(g)}><CalendarCheck /> Check in today</Button>}
                  {g.meta.challenge === "emergency_fund" && !p.done && <Button size="sm" variant="soft" className="mt-3" onClick={() => setAddMoney({ goal: g, amount: "" })}><Plus /> Add savings</Button>}
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-xl font-bold"><Trophy className="size-5 text-primary" /> Badges <span className="text-sm font-normal text-muted-foreground">{badges.filter((b) => b.earned).length} of {badges.length} earned</span></h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {badges.map((b) => (
            <Card key={b.id} className={cn("flex flex-col items-center p-4 text-center", !b.earned && "opacity-50 grayscale")}>
              <CardContent className="p-0">
                <div className={cn("mx-auto grid size-14 place-items-center rounded-full text-2xl", b.earned ? "bg-gradient-gold shadow-glow" : "bg-muted")}>{b.emoji}</div>
                <p className="mt-2 text-sm font-semibold">{b.title}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{b.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Dialog open={!!goalForm} onOpenChange={(o) => !o && setGoalForm(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>New savings goal</DialogTitle></DialogHeader>
          {goalForm && (
            <form onSubmit={saveGoal} className="space-y-4">
              <div className="space-y-2"><Label htmlFor="gt">Goal</Label><Input id="gt" required placeholder="e.g. Family trip to Kerala" value={goalForm.title} onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label htmlFor="gtar">Target (₹)</Label><Input id="gtar" type="number" min="1" required value={goalForm.target} onChange={(e) => setGoalForm({ ...goalForm, target: e.target.value })} /></div>
                <div className="space-y-2"><Label htmlFor="gs">Already saved (₹)</Label><Input id="gs" type="number" min="0" value={goalForm.saved} onChange={(e) => setGoalForm({ ...goalForm, saved: e.target.value })} /></div>
              </div>
              <div className="space-y-2"><Label htmlFor="gd">Target date</Label><Input id="gd" type="date" value={goalForm.deadline} onChange={(e) => setGoalForm({ ...goalForm, deadline: e.target.value })} /></div>
              <DialogFooter><Button type="button" variant="ghost" onClick={() => setGoalForm(null)}>{t("tx.cancel")}</Button><Button>{t("tx.save")}</Button></DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!chForm} onOpenChange={(o) => !o && setChForm(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Start a challenge</DialogTitle></DialogHeader>
          {chForm && (
            <form onSubmit={saveChallenge} className="space-y-4">
              <div className="space-y-2">
                <Label>Challenge</Label>
                <Select value={chForm.kind} onValueChange={(v) => setChForm({ ...chForm, kind: v as ChallengeKind })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CHALLENGES.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">{CHALLENGES.find((c) => c.id === chForm.kind)?.text}</p>
              </div>
              {chForm.kind === "save_amount" && <div className="space-y-2"><Label htmlFor="ct">Amount to save this month (₹)</Label><Input id="ct" type="number" min="1" required value={chForm.target} onChange={(e) => setChForm({ ...chForm, target: e.target.value })} /></div>}
              {chForm.kind === "reduce_category" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Category</Label>
                    <Select value={chForm.category} onValueChange={(v) => setChForm({ ...chForm, category: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{EXPENSE_CATEGORIES.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label htmlFor="cp">Cut by (%)</Label><Input id="cp" type="number" min="1" max="90" value={chForm.percent} onChange={(e) => setChForm({ ...chForm, percent: e.target.value })} /></div>
                </div>
              )}
              {chForm.kind === "emergency_fund" && <p className="rounded-lg bg-muted p-3 text-sm">{avgExpense > 0 ? <>Your target: <strong>{formatINR(avgExpense * 6)}</strong> (6 × your average monthly expenses of {formatINR(avgExpense)}).</> : "Add some expenses first so we can work out 6 months of expenses."}</p>}
              <DialogFooter><Button type="button" variant="ghost" onClick={() => setChForm(null)}>{t("tx.cancel")}</Button><Button disabled={chForm.kind === "emergency_fund" && avgExpense === 0}>Start</Button></DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!addMoney} onOpenChange={(o) => !o && setAddMoney(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Add to “{addMoney?.goal.title}”</DialogTitle></DialogHeader>
          {addMoney && (
            <form onSubmit={contribute} className="space-y-4">
              <div className="space-y-2"><Label htmlFor="am">Amount (₹)</Label><Input id="am" type="number" required autoFocus value={addMoney.amount} onChange={(e) => setAddMoney({ ...addMoney, amount: e.target.value })} /></div>
              <DialogFooter><Button type="button" variant="ghost" onClick={() => setAddMoney(null)}>{t("tx.cancel")}</Button><Button>{t("tx.save")}</Button></DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

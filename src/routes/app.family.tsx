import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent } from "react";
import { Crown, Eye, Pencil, Plus, Split, Trash2, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AiInsightsCard } from "@/components/ww/ai-insights";
import { EmptyState, Meter, PageHeader, StatCard } from "@/components/ww/ui";
import { budgetStatus, forMode, inMonth, totals } from "@/lib/analytics";
import { currentMonthKey, formatINR } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { useFinance } from "@/lib/store";
import type { FamilyMember } from "@/lib/types";

export const Route = createFileRoute("/app/family")({
  head: () => ({
    meta: [
      { title: "Family Finance — Wealth Wise" },
      { name: "description", content: "Manage household money together: invite family by email, set roles and spending limits, split bills and save for shared goals." },
      { property: "og:title", content: "Family Finance — Wealth Wise" },
      { property: "og:description", content: "Household money together: roles, spending limits, bill splits and shared goals." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FamilyPage,
});

const ROLE = { owner: { label: "Owner", icon: Crown }, editor: { label: "Can edit", icon: Pencil }, viewer: { label: "View only", icon: Eye } } as const;
type MemberForm = { name: string; email: string; role: FamilyMember["role"]; limit: string };

function FamilyPage() {
  const { t } = useI18n();
  const { data, source, mode, setMode, isFamilyOwner, canEditFamily, createFamilyGroup, renameFamilyGroup, addMember, updateMember, removeMember } = useFinance();
  const group = data.familyGroup;
  const [groupName, setGroupName] = useState("");
  const [form, setForm] = useState<MemberForm | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const month = currentMonthKey();
  const txs = useMemo(() => inMonth(forMode(data.transactions, "family"), month), [data.transactions, month]);
  const sum = totals(txs);

  const perMember = useMemo(() => data.members.map((m) => {
    const spent = txs.filter((x) => x.type === "expense" && x.member_name === m.name).reduce((a, x) => a + x.amount, 0);
    return { m, spent, ...budgetStatus(spent, m.spending_limit) };
  }), [data.members, txs]);

  // Split balances: paid by member minus their share of split bills.
  const balances = useMemo(() => {
    const bal = new Map<string, number>();
    for (const x of txs) {
      if (x.type !== "expense" || x.split_members.length === 0) continue;
      const share = x.amount / x.split_members.length;
      if (x.member_name) bal.set(x.member_name, (bal.get(x.member_name) ?? 0) + x.amount);
      for (const n of x.split_members) bal.set(n, (bal.get(n) ?? 0) - share);
    }
    return [...bal.entries()].filter(([, v]) => Math.abs(v) >= 1).sort((a, b) => b[1] - a[1]);
  }, [txs]);

  const openMember = (m?: FamilyMember) => {
    setEditId(m?.id ?? null);
    setForm(m ? { name: m.name, email: m.email ?? "", role: m.role, limit: String(m.spending_limit || "") } : { name: "", email: "", role: "editor", limit: "" });
  };
  const saveMember = async (e: FormEvent) => {
    e.preventDefault();
    if (!form || !form.name.trim()) return;
    const payload = { name: form.name.trim(), email: form.email.trim() || null, role: form.role, spending_limit: Number(form.limit) || 0 };
    if (editId) await updateMember(editId, payload);
    else await addMember(payload);
    setForm(null);
  };
  const sharedGoals = data.goals.filter((g) => g.mode === "family");

  if (!group)
    return (
      <div className="space-y-6">
        <PageHeader title={t("nav.family")} />
        <Card className="mx-auto max-w-lg p-8 text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-gradient-gold text-gold-foreground shadow-glow"><Users className="size-6" /></div>
          <h2 className="mt-4 text-2xl font-bold">Create your family group</h2>
          <p className="mt-2 text-sm text-muted-foreground">Add family members, give each a spending limit, split bills and save for shared goals together.{source === "guest" && " Inviting by email needs a free account."}</p>
          <form className="mt-6 flex gap-2" onSubmit={(e) => { e.preventDefault(); void createFamilyGroup(groupName.trim() || "Our family"); }}>
            <Input placeholder="e.g. Sharma family" value={groupName} onChange={(e) => setGroupName(e.target.value)} aria-label="Family group name" />
            <Button><Plus /> Create</Button>
          </form>
        </Card>
      </div>
    );

  return (
    <div className="space-y-6">
      <PageHeader
        title={group.name}
        description={`${t("nav.family")} · you are ${ROLE[group.role].label.toLowerCase()}`}
        actions={
          <>
            {mode !== "family" && <Button variant="outline" onClick={() => setMode("family")}>Switch to Family mode</Button>}
            {isFamilyOwner && <Button variant="ghost" onClick={() => { const n = window.prompt("Rename family group", group.name); if (n?.trim()) void renameFamilyGroup(n.trim()); }}><Pencil /> Rename</Button>}
            {isFamilyOwner && <Button onClick={() => openMember()}><UserPlus /> Add member</Button>}
          </>
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard tone="hero" label="Family spending this month" value={formatINR(sum.expense)} icon={Users} />
        <StatCard tone="income" label="Family income" value={formatINR(sum.income)} />
        <StatCard tone="gold" label="Saved this month" value={formatINR(sum.savings)} hint={`${sum.savingsRate.toFixed(0)}% of income`} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-base">Members & spending limits</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {perMember.length === 0 ? (
              <EmptyState icon={UserPlus} title="No members yet" text="Add family members by name. Add their email so they can sign in and see the family's money." action={isFamilyOwner && <Button onClick={() => openMember()}><UserPlus /> Add member</Button>} />
            ) : perMember.map(({ m, spent, pct, state }) => {
              const R = ROLE[m.role];
              return (
                <div key={m.id} className="group">
                  <div className="mb-1.5 flex items-center gap-3">
                    <span className="grid size-9 place-items-center rounded-full bg-secondary font-display text-sm font-bold text-primary">{m.name.slice(0, 1).toUpperCase()}</span>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 text-sm font-semibold">{m.name} <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-px text-[10px] font-medium text-muted-foreground"><R.icon className="size-3" />{R.label}</span></p>
                      <p className="truncate text-xs text-muted-foreground">{m.email ?? "No email — can't sign in"}</p>
                    </div>
                    <p className="num text-right text-sm">{formatINR(spent)}<span className="block text-[11px] text-muted-foreground">{m.spending_limit ? `of ${formatINR(m.spending_limit)}` : "no limit"}</span></p>
                    {isFamilyOwner && (
                      <div className="flex opacity-60 group-hover:opacity-100">
                        <Button variant="ghost" size="icon-sm" aria-label={`Edit ${m.name}`} onClick={() => openMember(m)}><Pencil /></Button>
                        <Button variant="ghost" size="icon-sm" aria-label={`Remove ${m.name}`} onClick={() => void removeMember(m.id)}><Trash2 /></Button>
                      </div>
                    )}
                  </div>
                  {m.spending_limit > 0 && <Meter pct={pct} state={state} />}
                </div>
              );
            })}
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Split className="size-4 text-primary" /> Bill splits</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {balances.length === 0 ? <p className="text-muted-foreground">When adding a family expense, choose who paid and who it's split between.</p> :
                balances.map(([name, v]) => (
                  <div key={name} className="flex justify-between"><span>{name}</span><span className={v > 0 ? "num text-income" : "num text-expense"}>{v > 0 ? `gets back ${formatINR(v)}` : `owes ${formatINR(-v)}`}</span></div>
                ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-2"><CardTitle className="text-base">Shared goals</CardTitle><Link to="/app/goals" className="text-xs font-semibold text-primary hover:underline">{t("common.viewAll")}</Link></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {sharedGoals.length === 0 && <p className="text-muted-foreground">Switch to Family mode and add a goal on Goals & Badges — like a family trip or new fridge.</p>}
              {sharedGoals.slice(0, 4).map((g) => (
                <div key={g.id}><div className="mb-1 flex justify-between"><span className="font-medium">{g.title}</span><span className="num text-xs">{formatINR(g.saved)} / {formatINR(g.target)}</span></div><Meter pct={(g.saved / (g.target || 1)) * 100} /></div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
      {!canEditFamily && <p className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">You have view-only access to this family group.</p>}
      <AiInsightsCard topic="family" title="AI family insights" />

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit member" : "Add family member"}</DialogTitle>
            <DialogDescription>Members with an email can sign in to Wealth Wise with that email to see this family group.</DialogDescription>
          </DialogHeader>
          {form && (
            <form onSubmit={saveMember} className="space-y-4">
              <div className="space-y-2"><Label htmlFor="mname">Name</Label><Input id="mname" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="space-y-2"><Label htmlFor="memail">Email (to invite)</Label><Input id="memail" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Optional" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Access</Label>
                  <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as FamilyMember["role"] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="editor">Can edit</SelectItem><SelectItem value="viewer">View only</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label htmlFor="mlimit">Monthly limit (₹)</Label><Input id="mlimit" type="number" min="0" value={form.limit} onChange={(e) => setForm({ ...form, limit: e.target.value })} placeholder="No limit" /></div>
              </div>
              <DialogFooter><Button type="button" variant="ghost" onClick={() => setForm(null)}>{t("tx.cancel")}</Button><Button>{t("tx.save")}</Button></DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS, guessCategory } from "@/lib/categories";
import { todayISO } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { useFinance, type NewTransaction } from "@/lib/store";
import type { PaymentMethod, Transaction, TxType } from "@/lib/types";
import { cn } from "@/lib/utils";

export function TransactionDialog({
  open, onOpenChange, initial, defaultType = "expense",
}: { open: boolean; onOpenChange: (o: boolean) => void; initial?: Transaction | null; defaultType?: TxType }) {
  const { t } = useI18n();
  const { mode, data, addTransaction, updateTransaction } = useFinance();
  const [type, setType] = useState<TxType>(defaultType);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("food");
  const [catTouched, setCatTouched] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>("upi");
  const [recurring, setRecurring] = useState(false);
  const [pending, setPending] = useState(false);
  const [member, setMember] = useState<string>("");
  const [split, setSplit] = useState<string[]>([]);
  const [counterparty, setCounterparty] = useState("");
  const [busy, setBusy] = useState(false);
  const txMode = initial?.mode ?? mode;

  useEffect(() => {
    if (!open) return;
    setType(initial?.type ?? defaultType);
    setAmount(initial ? String(initial.amount) : "");
    setDate(initial?.date ?? todayISO());
    setDescription(initial?.description ?? "");
    setCategory(initial?.category ?? (defaultType === "income" ? (mode === "business" ? "business_income" : "salary") : "food"));
    setCatTouched(!!initial);
    setMethod(initial?.payment_method ?? "upi");
    setRecurring(initial?.recurring ?? false);
    setPending(initial?.status === "pending");
    setMember(initial?.member_name ?? "");
    setSplit(initial?.split_members ?? []);
    setCounterparty(initial?.counterparty ?? "");
  }, [open, initial, defaultType, mode]);

  const cats = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const onDesc = (v: string) => {
    setDescription(v);
    if (!catTouched && v.length > 2) setCategory(guessCategory(v, type));
  };
  const onType = (v: TxType) => {
    setType(v);
    if (!catTouched) setCategory(v === "income" ? (txMode === "business" ? "business_income" : "salary") : guessCategory(description, "expense"));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) return;
    const payload: NewTransaction = {
      mode: txMode, type, amount: Math.round(amt * 100) / 100, date, description: description.trim() || (cats.find((c) => c.id === category)?.label ?? "Entry"),
      category, payment_method: method, recurring, status: pending ? "pending" : "paid",
      member_name: txMode === "family" && member ? member : null,
      split_members: txMode === "family" ? split : [],
      counterparty: txMode === "business" && counterparty.trim() ? counterparty.trim() : null,
    };
    setBusy(true);
    if (initial) await updateTransaction(initial.id, payload);
    else await addTransaction(payload);
    setBusy(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? t("tx.edit") : t("tx.add")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
            {(["expense", "income"] as const).map((v) => (
              <button key={v} type="button" onClick={() => onType(v)}
                className={cn("rounded-lg py-2 text-sm font-semibold transition", type === v ? (v === "income" ? "bg-card text-income shadow-card" : "bg-card text-expense shadow-card") : "text-muted-foreground")}>
                {t(v === "income" ? "tx.income" : "tx.expense")}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="amt">{t("tx.amount")}</Label>
              <Input id="amt" type="number" inputMode="decimal" min="0.01" step="0.01" required autoFocus value={amount} onChange={(e) => setAmount(e.target.value)} className="num text-lg font-semibold" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">{t("tx.date")}</Label>
              <Input id="date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="desc">{t("tx.description")}</Label>
            <Input id="desc" placeholder={type === "income" ? "e.g. November salary" : "e.g. Swiggy dinner, BESCOM bill"} value={description} onChange={(e) => onDesc(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t("tx.category")}</Label>
              <Select value={category} onValueChange={(v) => { setCategory(v); setCatTouched(true); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("tx.method")}</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          {txMode === "business" && (
            <div className="space-y-2">
              <Label htmlFor="cp">{type === "income" ? "Customer" : "Supplier / payee"}</Label>
              <Input id="cp" value={counterparty} onChange={(e) => setCounterparty(e.target.value)} placeholder="Optional" />
            </div>
          )}
          {txMode === "family" && data.members.length > 0 && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Paid by</Label>
                <Select value={member || "_none"} onValueChange={(v) => setMember(v === "_none" ? "" : v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Not specified</SelectItem>
                    {data.members.map((m) => <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {type === "expense" && (
                <div className="space-y-2">
                  <Label>Split between</Label>
                  <div className="flex flex-wrap gap-2">
                    {data.members.map((m) => {
                      const on = split.includes(m.name);
                      return (
                        <button key={m.id} type="button" onClick={() => setSplit(on ? split.filter((x) => x !== m.name) : [...split, m.name])}
                          className={cn("rounded-full border px-3 py-1 text-xs font-medium transition", on ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}>
                          {m.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="space-y-3 rounded-xl border p-3">
            <label className="flex items-center justify-between gap-3 text-sm">
              {t("tx.recurring")}
              <Switch checked={recurring} onCheckedChange={setRecurring} />
            </label>
            <label className="flex items-center justify-between gap-3 text-sm">
              {type === "income" ? "Not received yet (pending)" : "Not paid yet (pending)"}
              <Switch checked={pending} onCheckedChange={setPending} />
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>{t("tx.cancel")}</Button>
            <Button disabled={busy}>{t("tx.save")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

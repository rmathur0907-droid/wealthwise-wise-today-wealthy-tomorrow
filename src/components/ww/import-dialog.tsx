import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { FileUp, Loader2, Sparkle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { aiCategorize } from "@/lib/ai.functions";
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_IDS, INCOME_CATEGORIES, INCOME_CATEGORY_IDS } from "@/lib/categories";
import { formatDate, formatINR } from "@/lib/format";
import type { DraftTx } from "@/lib/importer";
import { useFinance } from "@/lib/store";

export function ImportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { mode, addTransactions } = useFinance();
  const categorize = useServerFn(aiCategorize);
  const inputRef = useRef<HTMLInputElement>(null);
  const [drafts, setDrafts] = useState<DraftTx[]>([]);
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState<"parse" | "ai" | "save" | null>(null);

  const reset = () => { setDrafts([]); setFileName(""); };
  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy("parse");
    setFileName(file.name);
    try {
      const { parseStatement } = await import("@/lib/importer");
      const rows = await parseStatement(file);
      setDrafts(rows);
      if (rows.length === 0) toast.error("No transactions found. Check that the file has date, description and amount columns.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't read that file.");
    } finally {
      setBusy(null);
    }
  };
  const runAi = async () => {
    setBusy("ai");
    try {
      const res = await categorize({
        data: {
          items: drafts.map((d, index) => ({ index, description: d.description, type: d.type, amount: d.amount })),
          categories: { expense: EXPENSE_CATEGORY_IDS, income: INCOME_CATEGORY_IDS },
        },
      });
      if (res.error) toast.error(res.error);
      const map = new Map(res.items.map((i) => [i.index, i.category]));
      setDrafts((ds) => ds.map((d, i) => {
        const c = map.get(i);
        const allowed = d.type === "income" ? INCOME_CATEGORY_IDS : EXPENSE_CATEGORY_IDS;
        return c && allowed.includes(c) ? { ...d, category: c } : d;
      }));
      if (!res.error) toast.success("Categories updated by WealthWise AI. Review and change any you like.");
    } catch {
      toast.error("Couldn't reach WealthWise AI. Keyword categories are kept.");
    } finally {
      setBusy(null);
    }
  };
  const save = async () => {
    const chosen = drafts.filter((d) => d.include);
    setBusy("save");
    const n = await addTransactions(chosen.map((d) => ({
      mode, type: d.type, amount: d.amount, date: d.date, description: d.description, category: d.category,
      payment_method: /upi/i.test(d.description) ? "upi" : "net_banking", recurring: false, member_name: null, split_members: [], counterparty: null, status: "paid",
    })));
    setBusy(null);
    if (n > 0) toast.success(`Imported ${n} transactions.`);
    reset();
    onOpenChange(false);
  };
  const update = (key: string, patch: Partial<DraftTx>) => setDrafts((ds) => ds.map((d) => (d.key === key ? { ...d, ...patch } : d)));
  const selected = drafts.filter((d) => d.include).length;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-h-[92vh] overflow-hidden sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Import bank statement</DialogTitle>
          <DialogDescription>Upload a CSV, Excel or PDF statement. It's read in your browser — the file itself is never uploaded.</DialogDescription>
        </DialogHeader>
        <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls,.ods,.pdf,text/csv,application/pdf" className="hidden" onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ""; }} />
        {drafts.length === 0 ? (
          <button type="button" onClick={() => inputRef.current?.click()} disabled={busy === "parse"}
            className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed p-10 text-center transition hover:border-primary hover:bg-secondary/40">
            {busy === "parse" ? <Loader2 className="size-8 animate-spin text-primary" /> : <FileUp className="size-8 text-primary" />}
            <span className="font-semibold">{busy === "parse" ? `Reading ${fileName}…` : "Choose a statement file"}</span>
            <span className="text-xs text-muted-foreground">Works with most Indian bank exports (SBI, HDFC, ICICI, Axis, Kotak…) and UPI app statements.</span>
          </button>
        ) : (
          <div className="flex min-h-0 flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="text-muted-foreground">{fileName}: {drafts.length} found, {selected} selected</span>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => inputRef.current?.click()}>Other file</Button>
                <Button size="sm" variant="soft" onClick={runAi} disabled={busy !== null}>
                  {busy === "ai" ? <Loader2 className="animate-spin" /> : <Sparkle />} Categorise with AI
                </Button>
              </div>
            </div>
            <div className="max-h-[50vh] overflow-y-auto rounded-xl border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted text-left text-xs text-muted-foreground">
                  <tr><th className="w-8 p-2" /><th className="p-2">Date</th><th className="p-2">Description</th><th className="p-2">Category</th><th className="p-2 text-right">Amount</th></tr>
                </thead>
                <tbody>
                  {drafts.map((d) => (
                    <tr key={d.key} className="border-t">
                      <td className="p-2"><Checkbox checked={d.include} onCheckedChange={(v) => update(d.key, { include: v === true })} aria-label="Include" /></td>
                      <td className="whitespace-nowrap p-2 text-xs">{formatDate(d.date)}</td>
                      <td className="max-w-56 truncate p-2" title={d.description}>{d.description}</td>
                      <td className="p-2">
                        <Select value={d.category} onValueChange={(v) => update(d.key, { category: v })}>
                          <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {(d.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className={`num whitespace-nowrap p-2 text-right font-medium ${d.type === "income" ? "text-income" : ""}`}>
                        <button type="button" title="Switch income/expense" onClick={() => update(d.key, { type: d.type === "income" ? "expense" : "income", category: d.type === "income" ? "other" : "gift" })}>
                          {d.type === "income" ? "+" : "−"}{formatINR(d.amount, true)}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={selected === 0 || busy !== null}>
            {busy === "save" && <Loader2 className="animate-spin" />} Import {selected || ""} transactions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

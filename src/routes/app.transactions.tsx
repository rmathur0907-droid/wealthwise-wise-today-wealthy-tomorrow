import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { MoreVertical, Pencil, Plus, ReceiptIndianRupee, Search, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImportDialog } from "@/components/ww/import-dialog";
import { TransactionDialog } from "@/components/ww/transaction-dialog";
import { TxRow } from "@/components/ww/tx-row";
import { EmptyState, PageHeader, StatCard } from "@/components/ww/ui";
import { totals } from "@/lib/analytics";
import { ALL_CATEGORIES, getCategory } from "@/lib/categories";
import { formatINR, monthKey, monthLabel } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { useFinance, useModeTransactions } from "@/lib/store";
import type { Transaction } from "@/lib/types";

export const Route = createFileRoute("/app/transactions")({
  head: () => ({
    meta: [
      { title: "Transactions — Wealth Wise" },
      { name: "description", content: "Add, import, search and categorise your income and expenses." },
      { property: "og:title", content: "Transactions — Wealth Wise" },
      { property: "og:description", content: "Add, import and categorise income and expenses." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TransactionsPage,
});

function TransactionsPage() {
  const { t } = useI18n();
  const { deleteTransaction, canEditFamily, mode } = useFinance();
  const txs = useModeTransactions();
  const [q, setQ] = useState("");
  const [type, setType] = useState<"all" | "income" | "expense">("all");
  const [cat, setCat] = useState("all");
  const [month, setMonth] = useState("all");
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const readOnly = mode === "family" && !canEditFamily;

  const months = useMemo(() => [...new Set(txs.map((x) => monthKey(x.date)))].sort().reverse(), [txs]);
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return txs
      .filter((x) => (type === "all" || x.type === type) && (cat === "all" || x.category === cat) && (month === "all" || monthKey(x.date) === month))
      .filter((x) => !s || x.description.toLowerCase().includes(s) || getCategory(x.category).label.toLowerCase().includes(s) || (x.counterparty ?? "").toLowerCase().includes(s))
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  }, [txs, q, type, cat, month]);
  const sum = totals(filtered);

  // Group by month for readability.
  const groups = useMemo(() => {
    const g = new Map<string, Transaction[]>();
    for (const x of filtered) {
      const k = monthKey(x.date);
      g.set(k, [...(g.get(k) ?? []), x]);
    }
    return [...g.entries()];
  }, [filtered]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("nav.transactions")}
        description={`${t(`mode.${mode}`)} · ${txs.length} entries`}
        actions={!readOnly && (
          <>
            <Button variant="outline" onClick={() => setImporting(true)}><Upload /> {t("tx.import")}</Button>
            <Button onClick={() => setAdding(true)}><Plus /> {t("tx.add")}</Button>
          </>
        )}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard tone="income" label={t("tx.income")} value={formatINR(sum.income)} />
        <StatCard tone="expense" label={t("tx.expense")} value={formatINR(sum.expense)} />
        <StatCard tone="gold" label="Net" value={formatINR(sum.savings)} />
      </div>
      <Card className="p-4">
        <div className="flex flex-col gap-2 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder={t("tx.search")} value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
          <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
            <SelectTrigger className="md:w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="income">{t("tx.income")}</SelectItem>
              <SelectItem value="expense">{t("tx.expense")}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={cat} onValueChange={setCat}>
            <SelectTrigger className="md:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {ALL_CATEGORIES.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="md:w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All months</SelectItem>
              {months.map((m) => <SelectItem key={m} value={m}>{monthLabel(m, false)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {txs.length === 0 ? (
        <EmptyState icon={ReceiptIndianRupee} title={t("tx.empty")} text="Add entries one by one or import a CSV, Excel or PDF statement from your bank." />
      ) : filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">No transactions match these filters.</p>
      ) : (
        groups.map(([m, items]) => (
          <Card key={m} className="p-3">
            <div className="flex items-center justify-between px-2 pb-1 pt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <span>{monthLabel(m, false)}</span>
              <span className="num">{formatINR(totals(items).expense)} spent</span>
            </div>
            {items.map((x) => (
              <TxRow
                key={x.id}
                tx={x}
                {...(readOnly ? {} : { onClick: () => setEditing(x) })}
                actions={!readOnly && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon-sm" aria-label="Transaction actions"><MoreVertical /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuItem onClick={() => setEditing(x)}><Pencil /> {t("tx.edit")}</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => void deleteTransaction(x.id)}><Trash2 /> {t("tx.delete")}</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              />
            ))}
          </Card>
        ))
      )}
      <TransactionDialog open={adding || !!editing} onOpenChange={(o) => { if (!o) { setAdding(false); setEditing(null); } }} initial={editing} />
      <ImportDialog open={importing} onOpenChange={setImporting} />
    </div>
  );
}

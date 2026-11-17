import { getCategory } from "@/lib/categories";
import { formatDate, formatINR } from "@/lib/format";
import type { Transaction } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function TxRow({ tx, actions, onClick }: { tx: Transaction; actions?: ReactNode; onClick?: () => void }) {
  const cat = getCategory(tx.category);
  const Icon = cat.icon;
  return (
    <div className={cn("flex items-center gap-3 rounded-xl px-2 py-2.5", onClick && "cursor-pointer hover:bg-muted/60")} onClick={onClick}>
      <span className="grid size-10 shrink-0 place-items-center rounded-xl" style={{ background: `color-mix(in oklab, ${cat.color} 16%, transparent)`, color: cat.color }}>
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{tx.description}</p>
        <p className="truncate text-xs text-muted-foreground">
          {cat.label} · {formatDate(tx.date)}
          {tx.member_name ? ` · ${tx.member_name}` : ""}
          {tx.counterparty ? ` · ${tx.counterparty}` : ""}
          {tx.status === "pending" && <span className="ml-1.5 rounded bg-warning/25 px-1.5 py-px text-[10px] font-semibold text-accent-foreground">Pending</span>}
          {tx.recurring && <span className="ml-1.5 rounded bg-secondary px-1.5 py-px text-[10px] font-semibold text-secondary-foreground">Monthly</span>}
        </p>
      </div>
      <p className={cn("num shrink-0 text-sm font-semibold", tx.type === "income" ? "text-income" : "text-foreground")}>
        {tx.type === "income" ? "+" : "−"}
        {formatINR(tx.amount)}
      </p>
      {actions}
    </div>
  );
}

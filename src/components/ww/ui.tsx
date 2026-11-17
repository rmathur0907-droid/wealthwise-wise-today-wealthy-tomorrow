import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label, value, hint, icon: Icon, tone = "default", className,
}: { label: string; value: string; hint?: ReactNode; icon?: LucideIcon; tone?: "default" | "income" | "expense" | "gold" | "hero"; className?: string }) {
  if (tone === "hero")
    return (
      <div className={cn("relative overflow-hidden rounded-2xl bg-gradient-card p-5 text-primary-foreground shadow-elegant", className)}>
        <div className="absolute -right-8 -top-8 size-28 rounded-full bg-gold/25 blur-2xl" />
        <div className="relative flex items-center justify-between text-sm opacity-85">
          {label}
          {Icon && <Icon className="size-4" />}
        </div>
        <p className="num relative mt-2 font-display text-3xl font-bold">{value}</p>
        {hint && <div className="relative mt-1 text-xs opacity-80">{hint}</div>}
      </div>
    );
  const iconTone = { default: "bg-secondary text-primary", income: "bg-income/12 text-income", expense: "bg-expense/12 text-expense", gold: "bg-accent text-accent-foreground" }[tone];
  return (
    <Card className={cn("p-5", className)}>
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        {label}
        {Icon && (
          <span className={cn("grid size-8 place-items-center rounded-lg", iconTone)}>
            <Icon className="size-4" />
          </span>
        )}
      </div>
      <p className="num mt-2 font-display text-2xl font-bold">{value}</p>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </Card>
  );
}

export function EmptyState({ icon: Icon, title, text, action }: { icon: LucideIcon; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/30 px-6 py-12 text-center">
      <div className="grid size-12 place-items-center rounded-2xl bg-secondary text-primary">
        <Icon className="size-5" />
      </div>
      <p className="mt-4 font-semibold">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Meter({ pct, state }: { pct: number; state?: "ok" | "near" | "over" }) {
  const color = state === "over" ? "bg-destructive" : state === "near" ? "bg-warning" : "bg-primary";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
    </div>
  );
}

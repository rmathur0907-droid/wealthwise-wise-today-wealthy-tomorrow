import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, Lightbulb, Loader2, RefreshCw, ThumbsUp } from "lucide-react";
import owl from "@/assets/wealthwise-ai-owl.png";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getAiInsights, type AiInsight } from "@/lib/ai.functions";
import { buildFinanceContext } from "@/lib/analytics";
import { useI18n } from "@/lib/i18n";
import { useFinance } from "@/lib/store";
import { cn } from "@/lib/utils";

type Topic = "overview" | "budget" | "portfolio" | "business" | "family";

export function AiInsightsCard({ topic, title, className }: { topic: Topic; title?: string; className?: string }) {
  const { t, lang } = useI18n();
  const { data, mode } = useFinance();
  const run = useServerFn(getAiInsights);
  const [insights, setInsights] = useState<AiInsight[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const analyse = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await run({ data: { topic, context: buildFinanceContext(data, mode), lang } });
      setInsights(res.insights);
      setError(res.error);
    } catch {
      setError("Couldn't reach WealthWise AI. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const icon = { positive: ThumbsUp, warning: AlertTriangle, tip: Lightbulb } as const;
  const tone = { positive: "bg-income/12 text-income", warning: "bg-warning/20 text-accent-foreground", tip: "bg-secondary text-primary" } as const;

  return (
    <Card className={cn("p-5", className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <img src={owl} alt="" className="size-9" />
          <div>
            <h3 className="font-display font-semibold">{title ?? t("dash.insights")}</h3>
            <p className="text-xs text-muted-foreground">Uses your Wealth Wise data only when you ask.</p>
          </div>
        </div>
        <Button size="sm" variant={insights ? "ghost" : "default"} onClick={analyse} disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : insights ? <RefreshCw /> : null}
          {insights ? "Refresh" : t("ai.analyse")}
        </Button>
      </div>
      {error && <p className="mt-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      {busy && !insights && (
        <div className="mt-4 space-y-2">
          {[0, 1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-muted" />)}
        </div>
      )}
      {insights && insights.length > 0 && (
        <ul className="mt-4 space-y-2.5">
          {insights.map((ins, i) => {
            const Icon = icon[ins.tone];
            return (
              <li key={i} className="flex gap-3 rounded-xl border p-3">
                <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg", tone[ins.tone])}><Icon className="size-4" /></span>
                <div className="text-sm">
                  <p className="font-semibold">{ins.title}</p>
                  <p className="text-muted-foreground">{ins.detail}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-3 text-[11px] text-muted-foreground">{t("ai.disclaimer")}</p>
    </Card>
  );
}

import { Briefcase, User, Users } from "lucide-react";
import { useFinance } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import type { Mode } from "@/lib/types";
import { cn } from "@/lib/utils";

const MODES: Array<{ id: Mode; icon: typeof User }> = [
  { id: "personal", icon: User },
  { id: "family", icon: Users },
  { id: "business", icon: Briefcase },
];

export function ModeSwitch() {
  const { mode, setMode } = useFinance();
  const { t } = useI18n();
  return (
    <div role="radiogroup" aria-label={t("mode.label")} className="grid grid-cols-3 gap-1 rounded-xl bg-sidebar-accent p-1">
      {MODES.map((m) => (
        <button
          key={m.id}
          type="button"
          role="radio"
          aria-checked={mode === m.id}
          onClick={() => setMode(m.id)}
          className={cn(
            "flex flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-[11px] font-semibold transition",
            mode === m.id ? "bg-card text-primary shadow-card" : "text-sidebar-accent-foreground/70 hover:text-sidebar-accent-foreground",
          )}
        >
          <m.icon className="size-4" />
          {t(`mode.${m.id}`)}
        </button>
      ))}
    </div>
  );
}

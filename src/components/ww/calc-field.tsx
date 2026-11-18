import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";

export function CalcField({ label, value, onChange, min, max, step = 1, suffix, prefix }: {
  label: string; value: number; onChange: (v: number) => void; min: number; max: number; step?: number; suffix?: string; prefix?: string;
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-medium">{label}</label>
        <div className="flex items-center gap-1 rounded-lg bg-secondary px-2">
          {prefix && <span className="text-sm text-secondary-foreground">{prefix}</span>}
          <Input type="number" value={value} min={min} max={max} step={step} aria-label={label}
            onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
            className="num h-8 w-28 border-0 bg-transparent px-1 text-right font-semibold shadow-none focus-visible:ring-0" />
          {suffix && <span className="text-sm text-secondary-foreground">{suffix}</span>}
        </div>
      </div>
      <Slider value={[Math.min(max, value)]} min={min} max={max} step={step} onValueChange={(v) => onChange(v[0] ?? min)} aria-label={label} />
    </div>
  );
}

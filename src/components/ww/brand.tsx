import { Link } from "@tanstack/react-router";
import { Languages, Moon, Sun } from "lucide-react";
import logo from "@/assets/wealthwise-logo.png";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LANGUAGES, useI18n, type LangCode } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

export function Logo({ className, withText = true, to = "/" }: { className?: string; withText?: boolean; to?: "/" | "/app" }) {
  return (
    <Link to={to} className={cn("flex items-center gap-2.5", className)} aria-label="Wealth Wise home">
      <img src={logo} alt="" width={36} height={36} className="size-9 shrink-0" />
      {withText && (
        <span className="font-display text-xl font-bold tracking-tight">
          Wealth<span className="text-gradient-gold">Wise</span>
        </span>
      )}
    </Link>
  );
}

export function LanguageSelect({ compact = false }: { compact?: boolean }) {
  const { lang, setLang } = useI18n();
  const current = LANGUAGES.find((l) => l.code === lang);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size={compact ? "icon" : "sm"} aria-label="Change language" className="gap-2">
          <Languages className="size-4" />
          {!compact && <span>{current?.native}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuRadioGroup value={lang} onValueChange={(v) => setLang(v as LangCode)}>
          {LANGUAGES.map((l) => (
            <DropdownMenuRadioItem key={l.code} value={l.code}>
              <span className="flex-1">{l.native}</span>
              <span className="text-xs text-muted-foreground">{l.label}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
      {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}

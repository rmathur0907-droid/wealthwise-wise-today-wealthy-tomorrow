import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BarChart3, Briefcase, Building2, GraduationCap, Languages, Lock, ShieldCheck, TrendingUp, Users, Wallet } from "lucide-react";
import owl from "@/assets/wealthwise-ai-owl.png";
import { Button } from "@/components/ui/button";
import { LanguageSelect, Logo, ThemeToggle } from "@/components/ww/brand";
import { useAuth } from "@/lib/auth";
import { useI18n, type TKey } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Wealth Wise — AI money companion for everyday India" },
      { name: "description", content: "Track UPI spends, plan budgets, learn SIPs and FDs, run family money and small-business cash flow — with WealthWise AI in 8 Indian languages." },
      { property: "og:title", content: "Wealth Wise — Beyond Numbers. Towards Better Decisions." },
      { property: "og:description", content: "AI-powered personal, family and small-business finance for India, in 8 languages." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const FEATURES: Array<{ icon: typeof Wallet; title: TKey; desc: TKey }> = [
  { icon: Wallet, title: "feat.track", desc: "feat.trackDesc" },
  { icon: GraduationCap, title: "feat.invest", desc: "feat.investDesc" },
  { icon: Users, title: "feat.family", desc: "feat.familyDesc" },
  { icon: Briefcase, title: "feat.business", desc: "feat.businessDesc" },
  { icon: BarChart3, title: "feat.ai", desc: "feat.aiDesc" },
  { icon: Languages, title: "feat.multi", desc: "feat.multiDesc" },
];

function Landing() {
  const { t } = useI18n();
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <div className="flex items-center gap-1">
            <LanguageSelect />
            <ThemeToggle />
            <Button asChild size="sm" variant="outline" className="ml-2 hidden sm:inline-flex">
              <Link to={user ? "/app" : "/auth"}>{user ? "Open dashboard" : t("common.signIn")}</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-hero">
        <div className="grid-pattern pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-14 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pt-20">
          <div className="animate-rise">
            <span className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
              <span className="size-1.5 rounded-full bg-gold" /> Made for everyday India · ₹
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] sm:text-5xl lg:text-6xl">
              {t("app.tagline").split(". ")[0]}.
              <br />
              <span className="text-gradient-gold">{t("app.tagline").split(". ").slice(1).join(". ")}</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">{t("landing.intro")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" variant="hero">
                <Link to="/app">
                  {user ? "Open dashboard" : t("landing.guest")} <ArrowRight />
                </Link>
              </Button>
              {!user && (
                <Button asChild size="lg" variant="outline">
                  <Link to="/auth">{t("landing.signup")}</Link>
                </Button>
              )}
            </div>
            <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="size-4 text-primary" /> We never ask for your UPI PIN, OTP or bank password.
            </p>
          </div>
          <HeroPreview />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <h2 className="text-3xl font-bold sm:text-4xl">{t("landing.featuresTitle")}</h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">Personal, family and business money in one place — switch modes any time.</p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <div key={f.title} className="group rounded-2xl border bg-card p-6 shadow-card transition hover:-translate-y-1 hover:shadow-elegant" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="grid size-11 place-items-center rounded-xl bg-secondary text-primary transition group-hover:bg-gradient-primary group-hover:text-primary-foreground">
                <f.icon className="size-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{t(f.title)}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t(f.desc)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y bg-secondary/40">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-16 sm:px-6 md:grid-cols-3">
          {[
            { icon: Wallet, title: t("mode.personal"), text: "Salary, UPI spends, budgets, SIPs and savings goals." },
            { icon: Users, title: t("mode.family"), text: "Invite family, set spending limits, split bills, save together." },
            { icon: Building2, title: t("mode.business"), text: "Sales, supplier costs, pending payments, P&L and EMI planning." },
          ].map((m) => (
            <div key={m.title} className="flex gap-4">
              <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-gold text-gold-foreground shadow-glow">
                <m.icon className="size-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">{m.title}</h3>
                <p className="text-sm text-muted-foreground">{m.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-card p-8 text-primary-foreground shadow-elegant sm:p-12">
          <div className="grid items-center gap-8 md:grid-cols-[auto_1fr_auto]">
            <img src={owl} alt="WealthWise AI owl" width={112} height={112} className="size-28 animate-float" />
            <div>
              <h2 className="text-3xl font-bold">Ask WealthWise AI — in your language</h2>
              <p className="mt-2 max-w-xl opacity-85">“Where did I overspend this month?” · “SIP ya FD, kya behtar hai?” · “How much should I save for my daughter's education?”</p>
            </div>
            <Button asChild size="lg" variant="gold">
              <Link to="/app">{t("landing.getStarted")} <ArrowRight /></Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Logo />
          <p className="flex items-center gap-2"><Lock className="size-3.5" /> Educational guidance only — not investment advice.</p>
          <p>© {new Date().getFullYear()} Wealth Wise</p>
        </div>
      </footer>
    </div>
  );
}

function HeroPreview() {
  const bars = [42, 58, 50, 71, 64, 82];
  return (
    <div className="relative mx-auto w-full max-w-md animate-rise [animation-delay:150ms]">
      <div className="absolute -right-6 -top-6 size-32 rounded-full bg-gold/30 blur-3xl" />
      <div className="relative rounded-3xl bg-gradient-card p-6 text-primary-foreground shadow-elegant">
        <p className="text-sm opacity-80">Available balance · Nov</p>
        <p className="num mt-1 font-display text-4xl font-bold">₹48,250</p>
        <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-primary-foreground/10 p-3">
            <p className="opacity-75">Income</p>
            <p className="num text-lg font-semibold">₹85,000</p>
          </div>
          <div className="rounded-xl bg-primary-foreground/10 p-3">
            <p className="opacity-75">Spent</p>
            <p className="num text-lg font-semibold">₹36,750</p>
          </div>
        </div>
        <div className="mt-5 flex h-24 items-end gap-2">
          {bars.map((h, i) => (
            <div key={i} className="flex-1 origin-bottom animate-grow rounded-t-md bg-gradient-gold" style={{ height: `${h}%`, animationDelay: `${300 + i * 80}ms` }} />
          ))}
        </div>
      </div>
      <div className="relative -mt-6 ml-8 mr-[-1rem] rounded-2xl border bg-card p-4 shadow-card">
        <div className="flex items-start gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
            <TrendingUp className="size-4" />
          </div>
          <div className="text-sm">
            <p className="font-semibold">AI insight</p>
            <p className="text-muted-foreground">Food delivery is 32% higher than last month. Cooking twice more a week saves about ₹2,400.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

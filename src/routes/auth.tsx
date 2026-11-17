import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LanguageSelect, Logo, ThemeToggle } from "@/components/ww/brand";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in or create an account — Wealth Wise" },
      { name: "description", content: "Sign in to Wealth Wise to save your budgets, transactions and goals securely across devices." },
      { property: "og:title", content: "Sign in — Wealth Wise" },
      { property: "og:description", content: "Save your money data securely and sync it across devices." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.3 14.6 2.3 12 2.3 6.7 2.3 2.4 6.6 2.4 12s4.3 9.7 9.6 9.7c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z" />
    </svg>
  );
}

function AuthPage() {
  const { t } = useI18n();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [view, setView] = useState<"main" | "forgot">("main");

  useEffect(() => {
    if (!loading && user) void navigate({ to: "/app" });
  }, [loading, user, navigate]);

  const signIn = async (e: FormEvent) => {
    e.preventDefault();
    setBusy("signin");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(null);
    if (error) toast.error(error.message);
  };
  const signUp = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { toast.error("Use at least 8 characters for your password."); return; }
    setBusy("signup");
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/app`, data: { display_name: name || email.split("@")[0] } },
    });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    if (!data.session) toast.success("Check your email to confirm your account, then sign in.");
  };
  const google = async () => {
    setBusy("google");
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}/auth` });
    if (result.error) {
      setBusy(null);
      toast.error(result.error.message || "Google sign-in failed.");
    }
  };
  const forgot = async (e: FormEvent) => {
    e.preventDefault();
    setBusy("forgot");
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success("If that email has an account, a reset link is on its way.");
    setView("main");
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-gradient-card p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="grid-pattern absolute inset-0 opacity-30" />
        <div className="relative">
          <Logo />
        </div>
        <div className="relative">
          <h1 className="text-5xl font-extrabold leading-tight">{t("app.tagline")}</h1>
          <p className="mt-4 max-w-md text-lg opacity-85">Your account keeps budgets, transactions, goals and AI chats safe and synced across every device.</p>
        </div>
        <p className="relative flex items-center gap-2 text-sm opacity-80">
          <ShieldCheck className="size-4" /> Wealth Wise never asks for UPI PINs, OTPs or bank passwords.
        </p>
      </aside>
      <main className="flex flex-col">
        <div className="flex items-center justify-between p-4">
          <Button asChild variant="ghost" size="sm">
            <Link to="/"><ArrowLeft /> Home</Link>
          </Button>
          <div className="flex items-center gap-1">
            <LanguageSelect compact />
            <ThemeToggle />
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center px-4 pb-16">
          <div className="w-full max-w-sm">
            <div className="mb-6 lg:hidden"><Logo /></div>
            {view === "forgot" ? (
              <form onSubmit={forgot} className="space-y-4">
                <h2 className="text-2xl font-bold">Reset your password</h2>
                <p className="text-sm text-muted-foreground">We'll email you a secure link to set a new password.</p>
                <div className="space-y-2">
                  <Label htmlFor="femail">Email</Label>
                  <Input id="femail" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <Button className="w-full" disabled={busy !== null}>{busy === "forgot" && <Loader2 className="animate-spin" />} Send reset link</Button>
                <Button type="button" variant="link" className="w-full" onClick={() => setView("main")}>Back to sign in</Button>
              </form>
            ) : (
              <>
                <h2 className="text-2xl font-bold">Welcome to Wealth Wise</h2>
                <p className="mt-1 text-sm text-muted-foreground">Sign in or create a free account.</p>
                <Button variant="outline" className="mt-6 w-full" onClick={google} disabled={busy !== null}>
                  {busy === "google" ? <Loader2 className="animate-spin" /> : <GoogleIcon />} Continue with Google
                </Button>
                <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or use email<span className="h-px flex-1 bg-border" /></div>
                <Tabs defaultValue="signin">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="signin">{t("common.signIn")}</TabsTrigger>
                    <TabsTrigger value="signup">Create account</TabsTrigger>
                  </TabsList>
                  <TabsContent value="signin">
                    <form onSubmit={signIn} className="mt-4 space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="password">Password</Label>
                          <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => setView("forgot")}>Forgot password?</button>
                        </div>
                        <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                      </div>
                      <Button className="w-full" disabled={busy !== null}>{busy === "signin" && <Loader2 className="animate-spin" />} {t("common.signIn")}</Button>
                    </form>
                  </TabsContent>
                  <TabsContent value="signup">
                    <form onSubmit={signUp} className="mt-4 space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Your name</Label>
                        <Input id="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="semail">Email</Label>
                        <Input id="semail" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="spassword">Password</Label>
                        <Input id="spassword" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} />
                        <p className="text-xs text-muted-foreground">At least 8 characters.</p>
                      </div>
                      <Button className="w-full" disabled={busy !== null}>{busy === "signup" && <Loader2 className="animate-spin" />} Create free account</Button>
                    </form>
                  </TabsContent>
                </Tabs>
                <Button asChild variant="link" className="mt-4 w-full">
                  <Link to="/app">{t("landing.guest")}</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Database, Download, FileSpreadsheet, LogOut, Moon, Palette, ShieldCheck, Sparkles, Sun, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/ww/ui";
import { supabase } from "@/integrations/supabase/client";
import { useAiShare } from "@/lib/ai-share";
import { useAuth } from "@/lib/auth";
import { LANGUAGES, useI18n, type LangCode } from "@/lib/i18n";
import { useFinance } from "@/lib/store";
import { useTheme } from "@/lib/theme";
import type { Mode } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Wealth Wise" },
      { name: "description", content: "Manage your profile, language, theme, AI privacy and download or delete your Wealth Wise data." },
      { property: "og:title", content: "Settings — Wealth Wise" },
      { property: "og:description", content: "Profile, language, theme, privacy and data controls." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { t, lang, setLang } = useI18n();
  const { theme, setTheme } = useTheme();
  const { signOut } = useAuth();
  const { data, mode, setMode, source, userId, email, deleteAllData } = useFinance();
  const [share, setShare] = useAiShare();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const counts = { tx: data.transactions.length, inv: data.investments.length, goals: data.goals.length, budgets: data.budgets.length };
  const total = counts.tx + counts.inv + counts.goals + counts.budgets;

  useEffect(() => {
    if (!userId) return;
    void supabase.from("profiles").select("display_name").eq("id", userId).maybeSingle().then(({ data: p }) => setName(p?.display_name ?? ""));
  }, [userId]);

  const saveName = async (e: FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setSavingName(true);
    const { error } = await supabase.from("profiles").update({ display_name: name.trim() || null }).eq("id", userId);
    setSavingName(false);
    if (error) toast.error("Couldn't save your name. Please try again.");
    else toast.success("Name saved");
  };

  const changeLang = (v: string) => {
    setLang(v as LangCode);
    if (userId) void supabase.from("profiles").update({ language: v }).eq("id", userId);
  };
  const changeTheme = (v: "light" | "dark") => {
    setTheme(v);
    if (userId) void supabase.from("profiles").update({ theme: v }).eq("id", userId);
  };

  const exportExcel = async () => {
    setExporting(true);
    try {
      await (await import("@/lib/export")).exportAllExcel(data);
    } catch (e) {
      console.error(e);
      toast.error("Couldn't create the file. Please try again.");
    } finally {
      setExporting(false);
    }
  };
  const exportJson = async () => (await import("@/lib/export")).exportAllJson(data);

  const doDelete = async () => {
    setDeleting(true);
    await deleteAllData();
    setDeleting(false);
    setConfirmOpen(false);
    setConfirmText("");
    toast.success("All your financial data has been deleted");
  };

  const logout = async () => {
    await signOut();
    void navigate({ to: "/" });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader title={t("nav.settings")} description="Your profile, preferences, privacy and data." />

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><UserRound className="size-5 text-primary" /> Profile</CardTitle></CardHeader>
        <CardContent>
          {source === "account" ? (
            <div className="space-y-4">
              <form onSubmit={saveName} className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="flex-1 space-y-2"><Label htmlFor="dn">Your name</Label><Input id="dn" value={name} maxLength={60} placeholder="e.g. Rashi" onChange={(e) => setName(e.target.value)} /></div>
                <Button disabled={savingName}>{t("tx.save")}</Button>
              </form>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted/50 p-3 text-sm">
                <span>Signed in as <strong>{email}</strong></span>
                <Button variant="outline" size="sm" onClick={() => void logout()}><LogOut /> Sign out</Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <p className="text-muted-foreground">You're using Wealth Wise as a guest. Your data stays only on this device.</p>
              <Button asChild><Link to="/auth">Create a free account</Link></Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Palette className="size-5 text-primary" /> Preferences</CardTitle></CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Language</Label>
            <Select value={lang} onValueChange={changeLang}>
              <SelectTrigger aria-label="Language"><SelectValue /></SelectTrigger>
              <SelectContent>{LANGUAGES.map((l) => <SelectItem key={l.code} value={l.code}>{l.native} · {l.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("mode.label")}</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as Mode)}>
              <SelectTrigger aria-label={t("mode.label")}><SelectValue /></SelectTrigger>
              <SelectContent>{(["personal", "family", "business"] as Mode[]).map((m) => <SelectItem key={m} value={m}>{t(`mode.${m}`)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Appearance</Label>
            <div role="radiogroup" aria-label="Appearance" className="grid grid-cols-2 gap-2 sm:max-w-xs">
              {([["light", Sun, "Light"], ["dark", Moon, "Dark"]] as const).map(([id, Icon, label]) => (
                <button key={id} type="button" role="radio" aria-checked={theme === id} onClick={() => changeTheme(id)}
                  className={cn("flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-medium transition", theme === id ? "border-primary bg-secondary text-primary" : "hover:border-primary/50")}>
                  <Icon className="size-4" /> {label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="size-5 text-primary" /> Privacy & AI</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Label htmlFor="share" className="flex items-center gap-1.5"><Sparkles className="size-4 text-gold" /> Let WealthWise AI use my financial data</Label>
              <p className="mt-1 text-sm text-muted-foreground">When on, the assistant reads your transactions, budgets and goals to give personal answers. When off, it only gives general guidance.</p>
            </div>
            <Switch id="share" checked={share} onCheckedChange={setShare} />
          </div>
          <p className="rounded-xl bg-accent/60 p-3 text-sm text-accent-foreground">Wealth Wise will never ask for your UPI PIN, OTP, card PIN or bank password. If anyone asks for these in our name, don't share them.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Database className="size-5 text-primary" /> Your data</CardTitle>
          <CardDescription>{counts.tx} transactions · {counts.budgets} budgets · {counts.inv} investments · {counts.goals} goals &amp; challenges</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={total === 0 || exporting} onClick={() => void exportExcel()}><FileSpreadsheet /> Download as Excel</Button>
            <Button variant="outline" disabled={total === 0} onClick={() => void exportJson()}><Download /> Download backup (JSON)</Button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
            <div>
              <p className="font-semibold text-destructive">Delete all my data</p>
              <p className="text-sm text-muted-foreground">Removes every transaction, budget, investment, goal, chat and family group you own. This can't be undone.</p>
            </div>
            <Button variant="destructive" disabled={total === 0 && !data.familyGroup} onClick={() => setConfirmOpen(true)}><Trash2 /> Delete</Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={(o) => { setConfirmOpen(o); if (!o) setConfirmText(""); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete all your data?</AlertDialogTitle>
            <AlertDialogDescription>Consider downloading a backup first. Type <strong>DELETE</strong> to confirm.</AlertDialogDescription>
          </AlertDialogHeader>
          <Input aria-label="Type DELETE to confirm" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="DELETE" />
          <AlertDialogFooter>
            <AlertDialogCancel>{t("tx.cancel")}</AlertDialogCancel>
            <AlertDialogAction disabled={confirmText !== "DELETE" || deleting} onClick={(e) => { e.preventDefault(); void doDelete(); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Loader2, LogOut, Settings, UserRound } from "lucide-react";
import owl from "@/assets/wealthwise-ai-owl.png";
import { Button } from "@/components/ui/button";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { AppSidebar } from "@/components/ww/app-sidebar";
import { LanguageSelect, ThemeToggle } from "@/components/ww/brand";
import { useAuth } from "@/lib/auth";
import { useFinance } from "@/lib/store";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "Your money — Wealth Wise" },
      { name: "description", content: "Your Wealth Wise dashboard: income, expenses, budgets, investments and AI insights." },
      { property: "og:title", content: "Wealth Wise dashboard" },
      { property: "og:description", content: "Income, expenses, budgets, investments and AI insights in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AppLayout,
});

function AppLayout() {
  const { t } = useI18n();
  const { ready, source, email, mode, pendingGuestData, migrateGuestData, discardGuestData } = useFinance();
  const { signOut } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const onAssistant = pathname.startsWith("/app/assistant");

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-w-0 bg-background">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-background/85 px-3 backdrop-blur sm:px-5">
          <SidebarTrigger />
          <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-accent-foreground">{t(`mode.${mode}`)}</span>
          <div className="ml-auto flex items-center gap-1">
            <LanguageSelect compact />
            <ThemeToggle />
            {source === "guest" ? (
              <Button asChild size="sm" className="ml-1">
                <Link to="/auth">{t("common.signIn")}</Link>
              </Button>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Account menu">
                    <UserRound className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel className="max-w-56 truncate font-normal text-muted-foreground">{email}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/app/settings"><Settings /> {t("nav.settings")}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void signOut()}>
                    <LogOut /> {t("common.signOut")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </header>
        {source === "guest" && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-accent/60 px-4 py-2 text-sm text-accent-foreground sm:px-6">
            <span>{t("common.guestBanner")}</span>
            <Link to="/auth" className="font-semibold underline-offset-4 hover:underline">{t("common.createAccount")} →</Link>
          </div>
        )}
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:py-8">
          {ready ? (
            <Outlet />
          ) : (
            <div className="flex h-64 items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" /> {t("common.loading")}
            </div>
          )}
        </main>
      </SidebarInset>

      {!onAssistant && (
        <Link
          to="/app/assistant"
          aria-label="Open WealthWise AI"
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-gradient-card py-2 pl-2 pr-4 text-primary-foreground shadow-elegant transition hover:-translate-y-0.5 hover:brightness-110"
        >
          <img src={owl} alt="" className="size-10" />
          <span className="hidden font-display text-sm font-semibold sm:inline">{t("ai.title")}</span>
        </Link>
      )}

      <AlertDialog open={!!pendingGuestData}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move your guest data into your account?</AlertDialogTitle>
            <AlertDialogDescription>
              You added {pendingGuestData?.transactions.length ?? 0} transactions, {pendingGuestData?.budgets.length ?? 0} budgets, {pendingGuestData?.investments.length ?? 0} investments and {pendingGuestData?.goals.length ?? 0} goals as a guest on this browser. Save them to your account so they sync everywhere.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={discardGuestData}>Discard guest data</AlertDialogCancel>
            <AlertDialogAction onClick={() => void migrateGuestData()}>Save to my account</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
}

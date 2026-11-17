import { Link, useRouterState } from "@tanstack/react-router";
import { BarChart3, Briefcase, GraduationCap, LayoutDashboard, PieChart, ReceiptIndianRupee, Settings, Target, Trophy, Users, Wallet } from "lucide-react";
import owl from "@/assets/wealthwise-ai-owl.png";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";
import { Logo } from "./brand";
import { ModeSwitch } from "./mode-switch";
import { useI18n, type TKey } from "@/lib/i18n";

export const NAV = [
  { to: "/app", label: "nav.dashboard", icon: LayoutDashboard },
  { to: "/app/transactions", label: "nav.transactions", icon: ReceiptIndianRupee },
  { to: "/app/budget", label: "nav.budget", icon: Target },
  { to: "/app/learn", label: "nav.learn", icon: GraduationCap },
  { to: "/app/portfolio", label: "nav.portfolio", icon: PieChart },
  { to: "/app/business", label: "nav.business", icon: Briefcase },
  { to: "/app/family", label: "nav.family", icon: Users },
  { to: "/app/goals", label: "nav.goals", icon: Trophy },
  { to: "/app/reports", label: "nav.reports", icon: BarChart3 },
  { to: "/app/settings", label: "nav.settings", icon: Settings },
] as const satisfies ReadonlyArray<{ to: string; label: TKey; icon: typeof Wallet }>;

export function AppSidebar() {
  const { t } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { setOpenMobile } = useSidebar();
  const isActive = (to: string) => (to === "/app" ? pathname === "/app" || pathname === "/app/" : pathname.startsWith(to));
  return (
    <Sidebar>
      <SidebarHeader className="gap-4 p-4">
        <Logo to="/app" />
        <ModeSwitch />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild isActive={isActive(item.to)} className="h-10 rounded-xl font-medium data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground">
                    <Link to={item.to} onClick={() => setOpenMobile(false)}>
                      <item.icon />
                      <span>{t(item.label)}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3">
        <Link
          to="/app/assistant"
          onClick={() => setOpenMobile(false)}
          className="flex items-center gap-3 rounded-2xl bg-gradient-card p-3 text-primary-foreground shadow-elegant transition hover:brightness-110"
        >
          <img src={owl} alt="" className="size-10" />
          <div className="leading-tight">
            <p className="font-display font-semibold">{t("ai.title")}</p>
            <p className="text-xs opacity-80">{t("nav.assistant")}</p>
          </div>
        </Link>
      </SidebarFooter>
    </Sidebar>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { Construction } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/ww/ui";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/app/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Wealth Wise" },
      { name: "description", content: "Settings in Wealth Wise, your AI money companion for India." },
      { property: "og:title", content: "Settings — Wealth Wise" },
      { property: "og:description", content: "Settings in Wealth Wise." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { t } = useI18n();
  return (
    <div>
      <PageHeader title={t("nav.settings")} />
      <EmptyState icon={Construction} title="This page is coming next" text="This section is still being built." />
    </div>
  );
}

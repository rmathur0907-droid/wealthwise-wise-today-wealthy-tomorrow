import { createFileRoute } from "@tanstack/react-router";
import { Construction } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/ww/ui";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/app/reports")({
  head: () => ({
    meta: [
      { title: "Financial Reports — Wealth Wise" },
      { name: "description", content: "Financial Reports in Wealth Wise, your AI money companion for India." },
      { property: "og:title", content: "Financial Reports — Wealth Wise" },
      { property: "og:description", content: "Financial Reports in Wealth Wise." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const { t } = useI18n();
  return (
    <div>
      <PageHeader title={t("nav.reports")} />
      <EmptyState icon={Construction} title="This page is coming next" text="This section is still being built." />
    </div>
  );
}

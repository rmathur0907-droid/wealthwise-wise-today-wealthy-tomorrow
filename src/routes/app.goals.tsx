import { createFileRoute } from "@tanstack/react-router";
import { Construction } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/ww/ui";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/app/goals")({
  head: () => ({
    meta: [
      { title: "Goals & Badges — Wealth Wise" },
      { name: "description", content: "Goals & Badges in Wealth Wise, your AI money companion for India." },
      { property: "og:title", content: "Goals & Badges — Wealth Wise" },
      { property: "og:description", content: "Goals & Badges in Wealth Wise." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GoalsPage,
});

function GoalsPage() {
  const { t } = useI18n();
  return (
    <div>
      <PageHeader title={t("nav.goals")} />
      <EmptyState icon={Construction} title="This page is coming next" text="This section is still being built." />
    </div>
  );
}

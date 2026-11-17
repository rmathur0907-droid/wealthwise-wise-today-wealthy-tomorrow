import { createFileRoute } from "@tanstack/react-router";
import { Construction } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/ww/ui";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/app/budget")({
  head: () => ({
    meta: [
      { title: "Smart Budget — Wealth Wise" },
      { name: "description", content: "Smart Budget in Wealth Wise, your AI money companion for India." },
      { property: "og:title", content: "Smart Budget — Wealth Wise" },
      { property: "og:description", content: "Smart Budget in Wealth Wise." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BudgetPage,
});

function BudgetPage() {
  const { t } = useI18n();
  return (
    <div>
      <PageHeader title={t("nav.budget")} />
      <EmptyState icon={Construction} title="This page is coming next" text="This section is still being built." />
    </div>
  );
}

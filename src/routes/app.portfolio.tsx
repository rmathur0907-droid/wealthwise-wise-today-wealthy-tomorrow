import { createFileRoute } from "@tanstack/react-router";
import { Construction } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/ww/ui";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/app/portfolio")({
  head: () => ({
    meta: [
      { title: "Portfolio — Wealth Wise" },
      { name: "description", content: "Portfolio in Wealth Wise, your AI money companion for India." },
      { property: "og:title", content: "Portfolio — Wealth Wise" },
      { property: "og:description", content: "Portfolio in Wealth Wise." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PortfolioPage,
});

function PortfolioPage() {
  const { t } = useI18n();
  return (
    <div>
      <PageHeader title={t("nav.portfolio")} />
      <EmptyState icon={Construction} title="This page is coming next" text="This section is still being built." />
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { Construction } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/ww/ui";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/app/business")({
  head: () => ({
    meta: [
      { title: "Business Finance — Wealth Wise" },
      { name: "description", content: "Business Finance in Wealth Wise, your AI money companion for India." },
      { property: "og:title", content: "Business Finance — Wealth Wise" },
      { property: "og:description", content: "Business Finance in Wealth Wise." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BusinessPage,
});

function BusinessPage() {
  const { t } = useI18n();
  return (
    <div>
      <PageHeader title={t("nav.business")} />
      <EmptyState icon={Construction} title="This page is coming next" text="This section is still being built." />
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { Construction } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/ww/ui";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/app/assistant")({
  head: () => ({
    meta: [
      { title: "WealthWise AI — Wealth Wise" },
      { name: "description", content: "WealthWise AI in Wealth Wise, your AI money companion for India." },
      { property: "og:title", content: "WealthWise AI — Wealth Wise" },
      { property: "og:description", content: "WealthWise AI in Wealth Wise." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AssistantPage,
});

function AssistantPage() {
  const { t } = useI18n();
  return (
    <div>
      <PageHeader title={t("nav.assistant")} />
      <EmptyState icon={Construction} title="This page is coming next" text="This section is still being built." />
    </div>
  );
}

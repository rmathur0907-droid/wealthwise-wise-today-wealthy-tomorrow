import { createFileRoute } from "@tanstack/react-router";
import { Construction } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/ww/ui";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/app/learn")({
  head: () => ({
    meta: [
      { title: "Investment Guide — Wealth Wise" },
      { name: "description", content: "Investment Guide in Wealth Wise, your AI money companion for India." },
      { property: "og:title", content: "Investment Guide — Wealth Wise" },
      { property: "og:description", content: "Investment Guide in Wealth Wise." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LearnPage,
});

function LearnPage() {
  const { t } = useI18n();
  return (
    <div>
      <PageHeader title={t("nav.learn")} />
      <EmptyState icon={Construction} title="This page is coming next" text="This section is still being built." />
    </div>
  );
}

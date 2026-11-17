import { createFileRoute } from "@tanstack/react-router";
import { Construction } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/ww/ui";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/app/family")({
  head: () => ({
    meta: [
      { title: "Family Finance — Wealth Wise" },
      { name: "description", content: "Family Finance in Wealth Wise, your AI money companion for India." },
      { property: "og:title", content: "Family Finance — Wealth Wise" },
      { property: "og:description", content: "Family Finance in Wealth Wise." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FamilyPage,
});

function FamilyPage() {
  const { t } = useI18n();
  return (
    <div>
      <PageHeader title={t("nav.family")} />
      <EmptyState icon={Construction} title="This page is coming next" text="This section is still being built." />
    </div>
  );
}

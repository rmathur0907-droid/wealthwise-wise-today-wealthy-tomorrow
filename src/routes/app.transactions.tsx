import { createFileRoute } from "@tanstack/react-router";
import { Construction } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/ww/ui";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/app/transactions")({
  head: () => ({
    meta: [
      { title: "Transactions — Wealth Wise" },
      { name: "description", content: "Transactions in Wealth Wise, your AI money companion for India." },
      { property: "og:title", content: "Transactions — Wealth Wise" },
      { property: "og:description", content: "Transactions in Wealth Wise." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TransactionsPage,
});

function TransactionsPage() {
  const { t } = useI18n();
  return (
    <div>
      <PageHeader title={t("nav.transactions")} />
      <EmptyState icon={Construction} title="This page is coming next" text="This section is still being built." />
    </div>
  );
}

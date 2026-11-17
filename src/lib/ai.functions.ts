/** AI server functions: spending/portfolio insights and transaction categorisation. */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const insightSchema = z.object({
  insights: z.array(
    z.object({
      title: z.string(),
      detail: z.string(),
      tone: z.enum(["positive", "warning", "tip"]),
    }),
  ),
});
export type AiInsight = z.infer<typeof insightSchema>["insights"][number];

const TOPICS = {
  overview: "overall spending, savings and budget health this month",
  budget: "budget usage: which categories are over or close to the limit, unusual spending versus last month, and practical ways to cut back",
  portfolio: "the investment portfolio: diversification, risk balance, SIP habits and what to review",
  business: "small-business cash flow: profit, pending customer payments, recurring costs and next month's outlook",
  family: "family spending: members near their limits, shared costs and shared goals",
} as const;

export const getAiInsights = createServerFn({ method: "POST" })
  .inputValidator((d: { topic: keyof typeof TOPICS; context: string; lang: string }) => ({
    topic: (d.topic in TOPICS ? d.topic : "overview") as keyof typeof TOPICS,
    context: String(d.context ?? "").slice(0, 12000),
    lang: String(d.lang ?? "en"),
  }))
  .handler(async ({ data }) => {
    const { streamText, Output, NoObjectGeneratedError } = await import("ai");
    const { createGateway, LANGUAGE_NAMES, REASONING_OPTIONS, SAFETY_RULES } = await import("@/server/ai/gateway");
    const language = LANGUAGE_NAMES[data.lang] ?? "English";
    try {
      const { model } = createGateway();
      const result = streamText({
        model,
        instructions: `${SAFETY_RULES}\nWrite in ${language}. Give 3 to 5 short, specific insights (title under 8 words, detail under 40 words) about ${TOPICS[data.topic]}. Base every number strictly on the data. If there is too little data, return one tip explaining what to add.`,
        prompt: `User's financial data:\n${data.context || "No data yet."}`,
        output: Output.object({ schema: insightSchema }),
        providerOptions: REASONING_OPTIONS,
      });
      const out = await result.output;
      return { insights: out.insights.slice(0, 5), error: null as string | null };
    } catch (e) {
      if (NoObjectGeneratedError.isInstance(e)) return { insights: [], error: "AI returned an unreadable answer. Please try again." };
      const status = (e as { statusCode?: number })?.statusCode;
      console.error("insights", e);
      return {
        insights: [],
        error: status === 429 ? "AI is busy. Try again in a minute." : status === 402 ? "AI credits have run out for this workspace." : "Couldn't get AI insights right now.",
      };
    }
  });

const catSchema = z.object({ items: z.array(z.object({ index: z.number(), category: z.string() })) });

export const aiCategorize = createServerFn({ method: "POST" })
  .inputValidator((d: { items: Array<{ index: number; description: string; type: "income" | "expense"; amount: number }>; categories: { expense: string[]; income: string[] } }) => ({
    items: (d.items ?? []).slice(0, 150).map((i) => ({ index: Number(i.index), description: String(i.description).slice(0, 140), type: i.type === "income" ? "income" : "expense", amount: Number(i.amount) || 0 })),
    categories: { expense: (d.categories?.expense ?? []).map(String), income: (d.categories?.income ?? []).map(String) },
  }))
  .handler(async ({ data }) => {
    if (data.items.length === 0) return { items: [] as Array<{ index: number; category: string }>, error: null as string | null };
    const { streamText, Output } = await import("ai");
    const { createGateway } = await import("@/server/ai/gateway");
    try {
      const { model } = createGateway();
      const result = streamText({
        model,
        instructions: `You categorise Indian bank/UPI transactions. Expense categories: ${data.categories.expense.join(", ")}. Income categories: ${data.categories.income.join(", ")}. Return one item per input index, choosing only from the list for that transaction's type. Use "other" (expense) or "gift" (income) when unsure.`,
        prompt: data.items.map((i) => `${i.index}\t${i.type}\t₹${i.amount}\t${i.description}`).join("\n"),
        output: Output.object({ schema: catSchema }),
        providerOptions: { openai: { forceReasoning: true, reasoningEffort: "low", store: false } },
      });
      const out = await result.output;
      return { items: out.items, error: null };
    } catch (e) {
      console.error("categorize", e);
      return { items: [], error: "AI categorisation is unavailable right now; keyword matching was used instead." };
    }
  });

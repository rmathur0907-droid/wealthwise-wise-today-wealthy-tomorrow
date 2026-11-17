/** Server-only Lovable AI Gateway setup shared by the chat route and AI server functions. */
import { createOpenAI } from "@ai-sdk/openai";
import { createLovableAiGatewayRunIdFetch } from "./run-id.ts";

export const AI_MODEL = "openai/gpt-6-astra";
const BASE_URL = "https://ai.gateway.lovable.dev/v1";

export const REASONING_OPTIONS = {
  openai: {
    forceReasoning: true,
    reasoningEffort: "low",
    reasoningSummary: "auto",
    store: false,
    include: ["reasoning.encrypted_content"],
  },
} as const;

export function createGateway(initialRunId?: string) {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI is not configured (missing LOVABLE_API_KEY).");
  const runIdFetch = createLovableAiGatewayRunIdFetch(initialRunId);
  const provider = createOpenAI({
    baseURL: BASE_URL,
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });
  return { model: provider.responses(AI_MODEL), runIdFetch };
}

export const LANGUAGE_NAMES: Record<string, string> = {
  en: "English", hi: "Hindi", kn: "Kannada", ta: "Tamil", te: "Telugu", ml: "Malayalam", bn: "Bengali", mr: "Marathi",
};

export const SAFETY_RULES = `Rules you must always follow:
- You are WealthWise AI, the assistant inside the Wealth Wise app for users in India. Currency is INR (₹); use Indian number formatting (lakh, crore).
- Give clear, friendly, practical, educational guidance in simple words. You are not a SEBI-registered adviser; say so briefly when recommending investments.
- Never guarantee or promise returns. Describe expected returns as historical ranges or assumptions, and mention risk.
- Only use the financial data provided in this conversation. Never invent numbers, transactions or balances. If data is missing, say so and suggest what to add.
- Never ask for or accept UPI PINs, OTPs, card numbers, CVVs, bank passwords or net-banking logins. If a user shares one, tell them to never share it and to change it.
- Keep answers concise: short paragraphs or bullet points, with concrete ₹ figures when the data supports it.`;

import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import owl from "@/assets/wealthwise-ai-owl.png";
import { Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { PromptInput, PromptInputFooter, PromptInputSubmit, PromptInputTextarea } from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAiShare } from "@/lib/ai-share";
import { buildFinanceContext } from "@/lib/analytics";
import { useI18n } from "@/lib/i18n";
import { useFinance } from "@/lib/store";

const SUGGESTIONS = [
  "Where did I overspend this month?",
  "SIP or FD — which suits me for 3 years?",
  "How can I build an emergency fund?",
  "Make me a simple monthly budget",
];

export function ChatWindow({ threadId, initialMessages }: { threadId: string | null; initialMessages: UIMessage[] }) {
  const { t, lang } = useI18n();
  const { data, mode } = useFinance();
  const [share, setShare] = useAiShare();
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Latest values for the request without re-creating the transport.
  const live = useRef({ share, data, mode, lang });
  live.current = { share, data, mode, lang };

  const transport = useMemo(
    () =>
      new DefaultChatTransport<UIMessage>({
        api: "/api/chat",
        prepareSendMessagesRequest: async ({ messages }) => {
          const { share: s, data: d, mode: m, lang: l } = live.current;
          const headers: Record<string, string> = {};
          if (threadId) {
            const { data: sess } = await supabase.auth.getSession();
            if (sess.session) headers["Authorization"] = `Bearer ${sess.session.access_token}`;
          }
          return { headers, body: { messages, threadId, lang: l, mode: m, context: s ? buildFinanceContext(d, m) : null } };
        },
      }),
    [threadId],
  );

  const { messages, sendMessage, status, stop } = useChat({
    id: threadId ?? "guest-chat",
    messages: initialMessages,
    transport,
    onError: (e) => {
      const msg = e.message || "";
      toast.error(msg.includes("{") ? (JSON.parse(msg.slice(msg.indexOf("{"))) as { error?: string }).error ?? "WealthWise AI couldn't answer." : msg || "WealthWise AI couldn't answer. Check your connection.");
    },
    onFinish: () => window.dispatchEvent(new Event("ww:threads")),
  });
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (!busy) textareaRef.current?.focus();
  }, [busy, threadId]);

  const send = (text: string) => {
    const v = text.trim();
    if (!v || busy) return;
    void sendMessage({ text: v });
    setInput("");
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <img src={owl} alt="" className="size-8" />
          <div className="leading-tight">
            <p className="font-display text-sm font-semibold">{t("ai.title")}</p>
            <p className="text-[11px] text-muted-foreground">{threadId ? "Saved to your account" : "Guest chat — not saved"}</p>
          </div>
        </div>
        <label className="flex items-center gap-2 text-xs font-medium">
          {t("ai.shareData")}
          <Switch checked={share} onCheckedChange={setShare} aria-label={t("ai.shareData")} />
        </label>
      </div>

      <Conversation className="min-h-0 flex-1">
        <ConversationContent className="mx-auto w-full max-w-3xl">
          {messages.length === 0 ? (
            <ConversationEmptyState>
              <img src={owl} alt="" className="size-20 animate-float" />
              <h3 className="font-display text-xl font-semibold">Namaste! Ask me about your money.</h3>
              <p className="max-w-md text-sm text-muted-foreground">I answer in your chosen language. Turn on “{t("ai.shareData")}” for answers based on your own numbers.</p>
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s} type="button" onClick={() => send(s)} className="rounded-full border bg-card px-3 py-1.5 text-xs font-medium transition hover:border-primary hover:text-primary">
                    {s}
                  </button>
                ))}
              </div>
            </ConversationEmptyState>
          ) : (
            messages.map((m) => (
              <Message key={m.id} from={m.role}>
                <MessageContent className="group-[.is-user]:bg-primary group-[.is-user]:text-primary-foreground group-[.is-user]:rounded-2xl">
                  {m.parts.map((p, i) => {
                    if (p.type === "text") return m.role === "assistant" ? <MessageResponse key={i}>{p.text}</MessageResponse> : <p key={i} className="whitespace-pre-wrap">{p.text}</p>;
                    if (p.type === "reasoning" && p.text.trim())
                      return (
                        <details key={i} className="rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                          <summary className="cursor-pointer select-none">How I thought about it</summary>
                          <p className="mt-1 whitespace-pre-wrap">{p.text}</p>
                        </details>
                      );
                    return null;
                  })}
                </MessageContent>
              </Message>
            ))
          )}
          {status === "submitted" && (
            <Message from="assistant">
              <MessageContent><Shimmer>Thinking…</Shimmer></MessageContent>
            </Message>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="mx-auto w-full max-w-3xl px-4 pb-4">
        <PromptInput onSubmit={(msg) => send(msg.text)} className="rounded-2xl bg-card shadow-card">
          <PromptInputTextarea ref={textareaRef} value={input} onChange={(e) => setInput(e.target.value)} placeholder={t("ai.placeholder")} />
          <PromptInputFooter className="justify-end">
            <PromptInputSubmit status={status} onStop={stop} disabled={!busy && !input.trim()} />
          </PromptInputFooter>
        </PromptInput>
        <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground">
          <ShieldCheck className="size-3" /> {t("ai.disclaimer")}
        </p>
      </div>
    </div>
  );
}

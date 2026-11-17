import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

interface ChatBody {
  messages?: UIMessage[];
  threadId?: string | null;
  context?: string | null;
  lang?: string;
  mode?: string;
}

const json = (status: number, message: string) =>
  new Response(JSON.stringify({ error: message }), { status, headers: { "content-type": "application/json" } });

const textOf = (m: UIMessage) =>
  m.parts
    .map((p) => (p.type === "text" ? p.text : ""))
    .join(" ")
    .trim();

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { createGateway, LANGUAGE_NAMES, REASONING_OPTIONS, SAFETY_RULES } = await import("@/server/ai/gateway");
        const { getLovableAiGatewayRunId, withLovableAiGatewayRunIdHeader } = await import("@/server/ai/run-id");
        const { userClientFromRequest } = await import("@/server/user-client");

        let body: ChatBody;
        try {
          body = (await request.json()) as ChatBody;
        } catch {
          return json(400, "Invalid request.");
        }
        const messages = Array.isArray(body.messages) ? body.messages.slice(-40) : [];
        if (messages.length === 0) return json(400, "No message to answer.");

        // Signed-in users with a thread: verify ownership, save the new user message.
        const threadId = typeof body.threadId === "string" ? body.threadId : null;
        const user = threadId ? await userClientFromRequest(request) : null;
        if (threadId && !user) return json(401, "Please sign in again to use saved chats.");
        if (user && threadId) {
          const { data: thread, error } = await user.supabase.from("chat_threads").select("id,title").eq("id", threadId).maybeSingle();
          if (error) return json(500, "Couldn't open this conversation.");
          if (!thread) return json(404, "Conversation not found.");
          const last = messages[messages.length - 1];
          if (last && last.role === "user") {
            const { error: saveErr } = await user.supabase.from("chat_messages").upsert(
              { thread_id: threadId, user_id: user.userId, message_id: last.id, role: "user", message: last as never },
              { onConflict: "thread_id,message_id" },
            );
            if (saveErr) console.error("save user message", saveErr);
            const patch: { updated_at: string; title?: string } = { updated_at: new Date().toISOString() };
            if (thread.title === "New conversation") patch.title = textOf(last).slice(0, 60) || "New conversation";
            await user.supabase.from("chat_threads").update(patch).eq("id", threadId);
          }
        }

        const language = LANGUAGE_NAMES[body.lang ?? "en"] ?? "English";
        const context = typeof body.context === "string" && body.context.trim() ? body.context.slice(0, 12000) : null;
        const instructions = `${SAFETY_RULES}
- Reply in ${language} unless the user writes in another language, then match theirs.
- The user's active finance mode is "${body.mode ?? "personal"}".
${
  context
    ? `\nThe user has allowed you to use their Wealth Wise data. Here is a snapshot (source of truth):\n${context}`
    : "\nThe user has NOT shared their financial data with you. Answer generally, and suggest turning on data sharing for personalised answers."
}`;

        try {
          const { model, runIdFetch } = createGateway(getLovableAiGatewayRunId(request));
          const result = streamText({
            model,
            instructions,
            messages: await convertToModelMessages(messages),
            abortSignal: request.signal,
            providerOptions: REASONING_OPTIONS,
          });
          const response = result.toUIMessageStreamResponse({
            originalMessages: messages,
            sendReasoning: true,
            onError: (e) => {
              console.error("chat stream", e);
              const status = (e as { statusCode?: number })?.statusCode;
              if (status === 429) return "WealthWise AI is busy right now. Please try again in a minute.";
              if (status === 402) return "AI credits have run out for this workspace. Please add credits to keep chatting.";
              return "WealthWise AI couldn't answer just now. Please try again.";
            },
            onFinish: async ({ responseMessage }) => {
              if (!user || !threadId || !responseMessage) return;
              const { error } = await user.supabase.from("chat_messages").upsert(
                { thread_id: threadId, user_id: user.userId, message_id: responseMessage.id, role: "assistant", message: responseMessage as never },
                { onConflict: "thread_id,message_id" },
              );
              if (error) console.error("save assistant message", error);
            },
          });
          return withLovableAiGatewayRunIdHeader(response, runIdFetch);
        } catch (e) {
          console.error("chat", e);
          return json(500, "WealthWise AI is unavailable right now.");
        }
      },
    },
  },
});

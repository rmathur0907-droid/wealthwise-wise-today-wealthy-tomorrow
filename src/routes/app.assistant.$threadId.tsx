import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { UIMessage } from "ai";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatWindow } from "@/components/ww/chat-window";
import { supabase } from "@/integrations/supabase/client";
import { useFinance } from "@/lib/store";

export const Route = createFileRoute("/app/assistant/$threadId")({
  head: () => ({ meta: [{ title: "Conversation — WealthWise AI" }, { name: "robots", content: "noindex" }] }),
  component: ThreadPage,
});

function ThreadPage() {
  const { threadId } = Route.useParams();
  const { source } = useFinance();
  const [state, setState] = useState<{ id: string; messages: UIMessage[] } | "missing" | null>(null);

  useEffect(() => {
    if (source !== "account") return;
    let cancelled = false;
    setState(null);
    void (async () => {
      const [{ data: thread }, { data: rows, error }] = await Promise.all([
        supabase.from("chat_threads").select("id").eq("id", threadId).maybeSingle(),
        supabase.from("chat_messages").select("message").eq("thread_id", threadId).order("created_at", { ascending: true }),
      ]);
      if (cancelled) return;
      if (!thread || error) return setState("missing");
      setState({ id: threadId, messages: (rows ?? []).map((r) => r.message as unknown as UIMessage) });
    })();
    return () => {
      cancelled = true;
    };
  }, [threadId, source]);

  if (source !== "account" || state === "missing")
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="font-semibold">{source !== "account" ? "Sign in to see saved conversations." : "This conversation doesn't exist."}</p>
        <Button asChild variant="outline"><Link to="/app/assistant">Open WealthWise AI</Link></Button>
      </div>
    );
  if (!state || state.id !== threadId)
    return <div className="flex h-full items-center justify-center text-muted-foreground"><Loader2 className="size-5 animate-spin" /></div>;
  return <ChatWindow key={threadId} threadId={threadId} initialMessages={state.messages} />;
}

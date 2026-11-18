import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { ChatWindow } from "@/components/ww/chat-window";
import { supabase } from "@/integrations/supabase/client";
import { useFinance } from "@/lib/store";
import { createThread } from "./app.assistant";

export const Route = createFileRoute("/app/assistant/")({
  component: AssistantHome,
});

/** Guests chat without saving. Signed-in users open their latest conversation (or a new one). */
function AssistantHome() {
  const { source, userId } = useFinance();
  const navigate = useNavigate();
  const started = useRef(false);

  useEffect(() => {
    if (source !== "account" || !userId || started.current) return;
    started.current = true;
    void (async () => {
      const { data } = await supabase.from("chat_threads").select("id").order("updated_at", { ascending: false }).limit(1);
      const id = data?.[0]?.id ?? (await createThread(userId));
      if (id) void navigate({ to: "/app/assistant/$threadId", params: { threadId: id }, replace: true });
    })();
  }, [source, userId, navigate]);

  if (source === "account")
    return <div className="flex h-full items-center justify-center text-muted-foreground"><Loader2 className="size-5 animate-spin" /></div>;
  return <ChatWindow threadId={null} initialMessages={[]} />;
}

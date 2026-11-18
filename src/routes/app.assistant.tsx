import { createFileRoute, Link, Outlet, useNavigate, useParams } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { MessageSquarePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useFinance } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/assistant")({
  head: () => ({
    meta: [
      { title: "WealthWise AI assistant — Wealth Wise" },
      { name: "description", content: "Chat with WealthWise AI about budgets, SIPs, savings and your spending — in 8 Indian languages." },
      { property: "og:title", content: "WealthWise AI assistant" },
      { property: "og:description", content: "Ask anything about your money, in your own language." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AssistantLayout,
});

export interface ThreadRow { id: string; title: string; updated_at: string }

export async function createThread(userId: string) {
  const { data, error } = await supabase.from("chat_threads").insert({ user_id: userId, title: "New conversation" }).select("id").single();
  if (error) {
    toast.error("Couldn't start a new conversation.");
    return null;
  }
  return data.id;
}

function AssistantLayout() {
  const { source, userId } = useFinance();
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as { threadId?: string };
  const [threads, setThreads] = useState<ThreadRow[]>([]);

  const load = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase.from("chat_threads").select("id,title,updated_at").order("updated_at", { ascending: false }).limit(100);
    if (!error) setThreads(data ?? []);
  }, [userId]);

  useEffect(() => {
    void load();
    const h = () => void load();
    window.addEventListener("ww:threads", h);
    return () => window.removeEventListener("ww:threads", h);
  }, [load, params.threadId]);

  const newChat = async () => {
    if (!userId) return;
    const id = await createThread(userId);
    if (id) void navigate({ to: "/app/assistant/$threadId", params: { threadId: id } });
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from("chat_threads").delete().eq("id", id);
    if (error) return void toast.error("Couldn't delete the conversation.");
    setThreads((ts) => ts.filter((x) => x.id !== id));
    if (params.threadId === id) void navigate({ to: "/app/assistant" });
  };

  return (
    <div className="-mx-4 -my-6 flex h-[calc(100dvh-3.5rem)] sm:-mx-6 lg:-my-8">
      {source === "account" && (
        <aside className="hidden w-64 shrink-0 flex-col border-r bg-sidebar/60 md:flex">
          <div className="p-3">
            <Button className="w-full" onClick={newChat}><MessageSquarePlus /> New chat</Button>
          </div>
          <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-3" aria-label="Conversations">
            {threads.length === 0 && <p className="px-2 py-4 text-xs text-muted-foreground">No saved conversations yet.</p>}
            {threads.map((th) => (
              <div key={th.id} className={cn("group flex items-center rounded-lg", params.threadId === th.id ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/60")}>
                <Link to="/app/assistant/$threadId" params={{ threadId: th.id }} className="min-w-0 flex-1 truncate px-3 py-2 text-sm">
                  {th.title}
                </Link>
                <button type="button" aria-label="Delete conversation" onClick={() => void remove(th.id)} className="mr-1 rounded p-1.5 text-muted-foreground opacity-0 transition hover:text-destructive group-hover:opacity-100 focus:opacity-100">
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </nav>
        </aside>
      )}
      <section className="min-w-0 flex-1">
        <Outlet />
      </section>
    </div>
  );
}

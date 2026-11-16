/**
 * Single source of truth for the signed-in user's or guest's finance data.
 * Guests: browser localStorage. Accounts: Lovable Cloud tables (RLS-scoped).
 * Every mutation updates state optimistically and persists immediately (auto-save).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./auth";
import { uid } from "./format";
import {
  emptyFinanceData,
  type Budget,
  type FamilyMember,
  type FinanceData,
  type Goal,
  type Investment,
  type Mode,
  type Transaction,
} from "./types";

const GUEST_KEY = "ww.guest.v1";
const MODE_KEY = "ww.mode";

export type NewTransaction = Omit<Transaction, "id" | "user_id" | "created_at">;
export type Source = "guest" | "account";

interface FinanceValue {
  ready: boolean;
  source: Source;
  userId: string | null;
  email: string | null;
  data: FinanceData;
  mode: Mode;
  setMode: (m: Mode) => void;
  /** Owner/editor of the family group (or guest). Viewers are read-only in Family mode. */
  canEditFamily: boolean;
  isFamilyOwner: boolean;
  refresh: () => Promise<void>;
  addTransaction: (t: NewTransaction) => Promise<void>;
  addTransactions: (ts: NewTransaction[]) => Promise<number>;
  updateTransaction: (id: string, patch: Partial<NewTransaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  setBudget: (mode: Mode, category: string, amount: number) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;
  addInvestment: (i: Omit<Investment, "id">) => Promise<void>;
  updateInvestment: (id: string, patch: Partial<Omit<Investment, "id">>) => Promise<void>;
  deleteInvestment: (id: string) => Promise<void>;
  addGoal: (g: Omit<Goal, "id">) => Promise<void>;
  updateGoal: (id: string, patch: Partial<Omit<Goal, "id">>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  createFamilyGroup: (name: string) => Promise<void>;
  renameFamilyGroup: (name: string) => Promise<void>;
  addMember: (m: Omit<FamilyMember, "id">) => Promise<void>;
  updateMember: (id: string, patch: Partial<Omit<FamilyMember, "id">>) => Promise<void>;
  removeMember: (id: string) => Promise<void>;
  /** Deletes every record this user owns (guest: clears browser storage). */
  deleteAllData: () => Promise<void>;
  /** Guest data waiting to be moved into a freshly signed-in account. */
  pendingGuestData: FinanceData | null;
  migrateGuestData: () => Promise<void>;
  discardGuestData: () => void;
}

const FinanceContext = createContext<FinanceValue | null>(null);

function readGuest(): FinanceData {
  try {
    const raw = window.localStorage.getItem(GUEST_KEY);
    if (!raw) return emptyFinanceData();
    return { ...emptyFinanceData(), ...(JSON.parse(raw) as Partial<FinanceData>) };
  } catch {
    return emptyFinanceData();
  }
}
const hasData = (d: FinanceData) => d.transactions.length + d.budgets.length + d.investments.length + d.goals.length + d.members.length > 0;

function fail(action: string, error: unknown) {
  console.error(action, error);
  const msg = error && typeof error === "object" && "message" in error ? String((error as { message: unknown }).message) : "";
  toast.error(`Couldn't ${action}. ${msg ? msg : "Please try again."}`);
}

// ---------- row mappers ----------
type Row = Record<string, unknown>;
const toTx = (r: Row): Transaction & { family_group_id?: string | null } => ({
  id: String(r.id),
  mode: r.mode as Mode,
  type: r.type as Transaction["type"],
  amount: Number(r.amount),
  date: String(r.date),
  description: String(r.description ?? ""),
  category: String(r.category ?? "other"),
  payment_method: (r.payment_method as Transaction["payment_method"]) ?? "upi",
  recurring: Boolean(r.recurring),
  member_name: (r.member_name as string | null) ?? null,
  split_members: (r.split_members as string[] | null) ?? [],
  counterparty: (r.counterparty as string | null) ?? null,
  status: (r.status as Transaction["status"]) ?? "paid",
  user_id: String(r.user_id),
  created_at: String(r.created_at ?? ""),
  family_group_id: (r.family_group_id as string | null) ?? null,
});
const toBudget = (r: Row): Budget => ({ id: String(r.id), mode: r.mode as Mode, category: String(r.category), amount: Number(r.amount) });
const toInv = (r: Row): Investment => ({
  id: String(r.id),
  name: String(r.name),
  type: r.type as Investment["type"],
  invested: Number(r.invested),
  current_value: Number(r.current_value),
  expected_return: Number(r.expected_return),
  risk: r.risk as Investment["risk"],
  start_date: String(r.start_date),
  monthly_sip: Number(r.monthly_sip),
});
const toGoal = (r: Row): Goal => ({
  id: String(r.id),
  mode: r.mode as Mode,
  kind: r.kind as Goal["kind"],
  title: String(r.title),
  target: Number(r.target),
  saved: Number(r.saved),
  deadline: (r.deadline as string | null) ?? null,
  meta: (r.meta as Goal["meta"]) ?? {},
});
const toMember = (r: Row): FamilyMember => ({
  id: String(r.id),
  name: String(r.name),
  email: (r.email as string | null) ?? null,
  role: r.role as FamilyMember["role"],
  spending_limit: Number(r.spending_limit),
});

const txRow = (t: Partial<NewTransaction>) => {
  const { ...rest } = t as Record<string, unknown>;
  delete rest.id;
  delete rest.user_id;
  delete rest.created_at;
  return rest;
};

export function FinanceProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<FinanceData>(emptyFinanceData);
  const [ready, setReady] = useState(false);
  const [mode, setModeState] = useState<Mode>("personal");
  const [pendingGuestData, setPendingGuestData] = useState<FinanceData | null>(null);
  const source: Source = user ? "account" : "guest";
  const userId = user?.id ?? null;
  const email = user?.email ?? null;
  const dataRef = useRef(data);
  dataRef.current = data;

  // Persist guest data on every change.
  useEffect(() => {
    if (ready && source === "guest") window.localStorage.setItem(GUEST_KEY, JSON.stringify(data));
  }, [data, ready, source]);

  useEffect(() => {
    const saved = window.localStorage.getItem(MODE_KEY);
    if (saved === "personal" || saved === "family" || saved === "business") setModeState(saved);
  }, []);

  const loadAccount = useCallback(async (uidValue: string, emailValue: string | null) => {
    const [txs, budgets, invs, goals, owned] = await Promise.all([
      supabase.from("transactions").select("*").order("date", { ascending: false }).limit(5000),
      supabase.from("budgets").select("*"),
      supabase.from("investments").select("*").order("created_at"),
      supabase.from("goals").select("*").order("created_at"),
      supabase.from("family_groups").select("*").order("created_at"),
    ]);
    const firstError = [txs, budgets, invs, goals, owned].find((r) => r.error)?.error;
    if (firstError) throw firstError;
    const groups = (owned.data ?? []) as Row[];
    const group = groups.find((g) => g.owner_id === uidValue) ?? groups[0] ?? null;
    let members: FamilyMember[] = [];
    let familyGroup: FinanceData["familyGroup"] = null;
    if (group) {
      const { data: mrows, error } = await supabase.from("family_members").select("*").eq("group_id", String(group.id)).order("created_at");
      if (error) throw error;
      members = (mrows ?? []).map((r) => toMember(r as Row));
      const me = members.find((m) => m.email && emailValue && m.email.toLowerCase() === emailValue.toLowerCase());
      familyGroup = {
        id: String(group.id),
        name: String(group.name),
        role: group.owner_id === uidValue ? "owner" : (me?.role ?? "viewer"),
      };
    }
    return {
      transactions: (txs.data ?? []).map((r) => toTx(r as Row)),
      budgets: (budgets.data ?? []).map((r) => toBudget(r as Row)),
      investments: (invs.data ?? []).map((r) => toInv(r as Row)),
      goals: (goals.data ?? []).map((r) => toGoal(r as Row)),
      members,
      familyGroup,
    } satisfies FinanceData;
  }, []);

  const refresh = useCallback(async () => {
    if (!userId) {
      setData(readGuest());
      return;
    }
    try {
      setData(await loadAccount(userId, email));
    } catch (e) {
      fail("load your data", e);
    }
  }, [userId, email, loadAccount]);

  // (Re)load whenever the signed-in identity changes.
  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    setReady(false);
    (async () => {
      if (!userId) {
        setData(readGuest());
        setPendingGuestData(null);
      } else {
        try {
          const loaded = await loadAccount(userId, email);
          if (cancelled) return;
          setData(loaded);
          const guest = readGuest();
          setPendingGuestData(hasData(guest) ? guest : null);
          const { data: profile } = await supabase.from("profiles").select("active_mode").eq("id", userId).maybeSingle();
          const pm = profile?.active_mode;
          if (!cancelled && (pm === "personal" || pm === "family" || pm === "business")) setModeState(pm);
        } catch (e) {
          fail("load your data", e);
        }
      }
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, userId, email, loadAccount]);

  const setMode = useCallback(
    (m: Mode) => {
      setModeState(m);
      window.localStorage.setItem(MODE_KEY, m);
      if (userId) void supabase.from("profiles").update({ active_mode: m }).eq("id", userId);
    },
    [userId],
  );

  const familyGroupId = data.familyGroup?.id ?? null;
  const withFamily = useCallback(
    (t: Partial<NewTransaction>) => (t.mode === "family" && familyGroupId ? { family_group_id: familyGroupId } : { family_group_id: null }),
    [familyGroupId],
  );

  // ---------- transactions ----------
  const addTransactions = useCallback(
    async (ts: NewTransaction[]) => {
      if (ts.length === 0) return 0;
      if (!userId) {
        const rows = ts.map((t) => ({ ...t, id: uid(), created_at: new Date().toISOString() }));
        setData((d) => ({ ...d, transactions: [...rows, ...d.transactions] }));
        return rows.length;
      }
      const payload = ts.map((t) => ({ ...txRow(t), ...withFamily(t), user_id: userId })) as never[];
      let inserted = 0;
      for (let i = 0; i < payload.length; i += 200) {
        const { data: rows, error } = await supabase.from("transactions").insert(payload.slice(i, i + 200)).select("*");
        if (error) {
          fail("save transactions", error);
          break;
        }
        const mapped = (rows ?? []).map((r) => toTx(r as Row));
        inserted += mapped.length;
        setData((d) => ({ ...d, transactions: [...mapped, ...d.transactions] }));
      }
      return inserted;
    },
    [userId, withFamily],
  );
  const addTransaction = useCallback(async (t: NewTransaction) => void (await addTransactions([t])), [addTransactions]);

  const updateTransaction = useCallback(
    async (id: string, patch: Partial<NewTransaction>) => {
      const prev = dataRef.current.transactions;
      setData((d) => ({ ...d, transactions: d.transactions.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
      if (!userId) return;
      const { error } = await supabase.from("transactions").update(txRow(patch) as never).eq("id", id);
      if (error) {
        setData((d) => ({ ...d, transactions: prev }));
        fail("update the transaction", error);
      }
    },
    [userId],
  );

  const deleteTransaction = useCallback(
    async (id: string) => {
      const prev = dataRef.current.transactions;
      setData((d) => ({ ...d, transactions: d.transactions.filter((t) => t.id !== id) }));
      if (!userId) return;
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) {
        setData((d) => ({ ...d, transactions: prev }));
        fail("delete the transaction", error);
      }
    },
    [userId],
  );

  // ---------- budgets ----------
  const setBudget = useCallback(
    async (m: Mode, category: string, amount: number) => {
      const existing = dataRef.current.budgets.find((b) => b.mode === m && b.category === category);
      if (!userId) {
        setData((d) => ({
          ...d,
          budgets: existing ? d.budgets.map((b) => (b.id === existing.id ? { ...b, amount } : b)) : [...d.budgets, { id: uid(), mode: m, category, amount }],
        }));
        return;
      }
      if (existing) {
        setData((d) => ({ ...d, budgets: d.budgets.map((b) => (b.id === existing.id ? { ...b, amount } : b)) }));
        const { error } = await supabase.from("budgets").update({ amount }).eq("id", existing.id);
        if (error) fail("update the budget", error);
      } else {
        const { data: row, error } = await supabase.from("budgets").insert({ mode: m, category, amount, user_id: userId }).select("*").single();
        if (error) return fail("save the budget", error);
        setData((d) => ({ ...d, budgets: [...d.budgets, toBudget(row as Row)] }));
      }
    },
    [userId],
  );
  const deleteBudget = useCallback(
    async (id: string) => {
      setData((d) => ({ ...d, budgets: d.budgets.filter((b) => b.id !== id) }));
      if (!userId) return;
      const { error } = await supabase.from("budgets").delete().eq("id", id);
      if (error) fail("remove the budget", error);
    },
    [userId],
  );

  // ---------- generic helpers for investments/goals ----------
  const addInvestment = useCallback(
    async (i: Omit<Investment, "id">) => {
      if (!userId) return setData((d) => ({ ...d, investments: [...d.investments, { ...i, id: uid() }] }));
      const { data: row, error } = await supabase.from("investments").insert({ ...i, user_id: userId }).select("*").single();
      if (error) return fail("save the investment", error);
      setData((d) => ({ ...d, investments: [...d.investments, toInv(row as Row)] }));
    },
    [userId],
  );
  const updateInvestment = useCallback(
    async (id: string, patch: Partial<Omit<Investment, "id">>) => {
      setData((d) => ({ ...d, investments: d.investments.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
      if (!userId) return;
      const { error } = await supabase.from("investments").update(patch).eq("id", id);
      if (error) fail("update the investment", error);
    },
    [userId],
  );
  const deleteInvestment = useCallback(
    async (id: string) => {
      setData((d) => ({ ...d, investments: d.investments.filter((x) => x.id !== id) }));
      if (!userId) return;
      const { error } = await supabase.from("investments").delete().eq("id", id);
      if (error) fail("delete the investment", error);
    },
    [userId],
  );

  const addGoal = useCallback(
    async (g: Omit<Goal, "id">) => {
      if (!userId) return setData((d) => ({ ...d, goals: [...d.goals, { ...g, id: uid() }] }));
      const family_group_id = g.mode === "family" ? familyGroupId : null;
      const { data: row, error } = await supabase
        .from("goals")
        .insert({ ...g, meta: g.meta as never, user_id: userId, family_group_id })
        .select("*")
        .single();
      if (error) return fail("save the goal", error);
      setData((d) => ({ ...d, goals: [...d.goals, toGoal(row as Row)] }));
    },
    [userId, familyGroupId],
  );
  const updateGoal = useCallback(
    async (id: string, patch: Partial<Omit<Goal, "id">>) => {
      setData((d) => ({ ...d, goals: d.goals.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
      if (!userId) return;
      const { error } = await supabase.from("goals").update({ ...patch, meta: patch.meta as never }).eq("id", id);
      if (error) fail("update the goal", error);
    },
    [userId],
  );
  const deleteGoal = useCallback(
    async (id: string) => {
      setData((d) => ({ ...d, goals: d.goals.filter((x) => x.id !== id) }));
      if (!userId) return;
      const { error } = await supabase.from("goals").delete().eq("id", id);
      if (error) fail("delete the goal", error);
    },
    [userId],
  );

  // ---------- family ----------
  const createFamilyGroup = useCallback(
    async (name: string) => {
      if (!userId) {
        setData((d) => ({ ...d, familyGroup: { id: uid(), name, role: "owner" } }));
        return;
      }
      const { data: row, error } = await supabase.from("family_groups").insert({ name, owner_id: userId }).select("*").single();
      if (error) return fail("create the family group", error);
      setData((d) => ({ ...d, familyGroup: { id: row.id, name: row.name, role: "owner" }, members: [] }));
    },
    [userId],
  );
  const renameFamilyGroup = useCallback(
    async (name: string) => {
      const g = dataRef.current.familyGroup;
      if (!g) return;
      setData((d) => ({ ...d, familyGroup: d.familyGroup ? { ...d.familyGroup, name } : null }));
      if (!userId) return;
      const { error } = await supabase.from("family_groups").update({ name }).eq("id", g.id);
      if (error) fail("rename the group", error);
    },
    [userId],
  );
  const addMember = useCallback(
    async (m: Omit<FamilyMember, "id">) => {
      const g = dataRef.current.familyGroup;
      if (!g) return;
      const clean = { ...m, email: m.email?.trim().toLowerCase() || null };
      if (!userId) return setData((d) => ({ ...d, members: [...d.members, { ...clean, id: uid() }] }));
      const { data: row, error } = await supabase.from("family_members").insert({ ...clean, group_id: g.id }).select("*").single();
      if (error) return fail("add the member", error);
      setData((d) => ({ ...d, members: [...d.members, toMember(row as Row)] }));
    },
    [userId],
  );
  const updateMember = useCallback(
    async (id: string, patch: Partial<Omit<FamilyMember, "id">>) => {
      setData((d) => ({ ...d, members: d.members.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
      if (!userId) return;
      const { error } = await supabase.from("family_members").update(patch).eq("id", id);
      if (error) fail("update the member", error);
    },
    [userId],
  );
  const removeMember = useCallback(
    async (id: string) => {
      setData((d) => ({ ...d, members: d.members.filter((x) => x.id !== id) }));
      if (!userId) return;
      const { error } = await supabase.from("family_members").delete().eq("id", id);
      if (error) fail("remove the member", error);
    },
    [userId],
  );

  const deleteAllData = useCallback(async () => {
    if (!userId) {
      window.localStorage.removeItem(GUEST_KEY);
      setData(emptyFinanceData());
      return;
    }
    const results = await Promise.all([
      supabase.from("transactions").delete().eq("user_id", userId),
      supabase.from("budgets").delete().eq("user_id", userId),
      supabase.from("investments").delete().eq("user_id", userId),
      supabase.from("goals").delete().eq("user_id", userId),
      supabase.from("chat_threads").delete().eq("user_id", userId),
    ]);
    const err = results.find((r) => r.error)?.error;
    if (err) return fail("delete your data", err);
    const { error } = await supabase.from("family_groups").delete().eq("owner_id", userId);
    if (error) return fail("delete your family group", error);
    await refresh();
  }, [userId, refresh]);

  const migrateGuestData = useCallback(async () => {
    const guest = pendingGuestData;
    if (!guest || !userId) return;
    try {
      const strip = <T extends { id: string }>(x: T) => {
        const { id: _id, ...rest } = x;
        return rest;
      };
      await addTransactions(guest.transactions.map((t) => strip(t) as NewTransaction));
      for (const b of guest.budgets) await setBudget(b.mode, b.category, b.amount);
      for (const i of guest.investments) await addInvestment(strip(i));
      for (const g of guest.goals) await addGoal(strip(g));
      window.localStorage.removeItem(GUEST_KEY);
      setPendingGuestData(null);
      toast.success("Your guest data is now saved in your account.");
    } catch (e) {
      fail("move your guest data", e);
    }
  }, [pendingGuestData, userId, addTransactions, setBudget, addInvestment, addGoal]);

  const discardGuestData = useCallback(() => {
    window.localStorage.removeItem(GUEST_KEY);
    setPendingGuestData(null);
  }, []);

  const role = data.familyGroup?.role;
  const value = useMemo<FinanceValue>(
    () => ({
      ready,
      source,
      userId,
      email,
      data,
      mode,
      setMode,
      canEditFamily: source === "guest" || !data.familyGroup || role === "owner" || role === "editor",
      isFamilyOwner: source === "guest" || role === "owner",
      refresh,
      addTransaction,
      addTransactions,
      updateTransaction,
      deleteTransaction,
      setBudget,
      deleteBudget,
      addInvestment,
      updateInvestment,
      deleteInvestment,
      addGoal,
      updateGoal,
      deleteGoal,
      createFamilyGroup,
      renameFamilyGroup,
      addMember,
      updateMember,
      removeMember,
      deleteAllData,
      pendingGuestData,
      migrateGuestData,
      discardGuestData,
    }),
    [
      ready, source, userId, email, data, mode, setMode, role, refresh, addTransaction, addTransactions, updateTransaction,
      deleteTransaction, setBudget, deleteBudget, addInvestment, updateInvestment, deleteInvestment, addGoal, updateGoal,
      deleteGoal, createFamilyGroup, renameFamilyGroup, addMember, updateMember, removeMember, deleteAllData, pendingGuestData,
      migrateGuestData, discardGuestData,
    ],
  );

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance() {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error("useFinance must be used inside <FinanceProvider>");
  return ctx;
}

/** Transactions for the active mode only. */
export function useModeTransactions() {
  const { data, mode } = useFinance();
  return useMemo(() => data.transactions.filter((t) => t.mode === mode), [data.transactions, mode]);
}

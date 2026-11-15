export type Mode = "personal" | "family" | "business";
export type TxType = "income" | "expense";
export type PaymentMethod = "upi" | "cash" | "debit_card" | "credit_card" | "net_banking" | "other";
export type Risk = "low" | "moderate" | "high";
export type InvestmentType =
  | "sip"
  | "mutual_fund"
  | "index_fund"
  | "stock"
  | "fd"
  | "rd"
  | "ppf"
  | "gold"
  | "bond"
  | "other";

export interface Transaction {
  id: string;
  mode: Mode;
  type: TxType;
  amount: number;
  date: string; // YYYY-MM-DD
  description: string;
  category: string;
  payment_method: PaymentMethod;
  recurring: boolean;
  member_name: string | null;
  split_members: string[];
  counterparty: string | null;
  status: "paid" | "pending";
  user_id?: string;
  created_at?: string;
}

export interface Budget {
  id: string;
  mode: Mode;
  category: string; // "_total" = overall monthly limit
  amount: number;
}

export interface Investment {
  id: string;
  name: string;
  type: InvestmentType;
  invested: number;
  current_value: number;
  expected_return: number; // % per year
  risk: Risk;
  start_date: string;
  monthly_sip: number;
}

export interface Goal {
  id: string;
  mode: Mode;
  kind: "goal" | "challenge";
  title: string;
  target: number;
  saved: number;
  deadline: string | null;
  meta: GoalMeta;
}

export interface GoalMeta {
  challenge?: "save_amount" | "reduce_category" | "emergency_fund" | "streak30";
  category?: string;
  percent?: number;
  month?: string; // YYYY-MM the challenge applies to
  checkins?: string[]; // YYYY-MM-DD
  [key: string]: unknown;
}

export interface FamilyMember {
  id: string;
  name: string;
  email: string | null;
  role: "owner" | "editor" | "viewer";
  spending_limit: number;
}

export interface FamilyGroup {
  id: string;
  name: string;
  role: "owner" | "editor" | "viewer";
}

export interface FinanceData {
  transactions: Transaction[];
  budgets: Budget[];
  investments: Investment[];
  goals: Goal[];
  members: FamilyMember[];
  familyGroup: FamilyGroup | null;
}

export const emptyFinanceData = (): FinanceData => ({
  transactions: [],
  budgets: [],
  investments: [],
  goals: [],
  members: [],
  familyGroup: null,
});

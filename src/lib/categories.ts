import {
  Utensils, ShoppingBag, Bus, GraduationCap, Clapperboard, HeartPulse, Home, Zap, Briefcase,
  TrendingUp, PiggyBank, CircleEllipsis, Wallet, Gift, Building2, Users, Megaphone, Wrench, type LucideIcon,
} from "lucide-react";

export interface CategoryDef {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string; // css var
}

export const EXPENSE_CATEGORIES: CategoryDef[] = [
  { id: "food", label: "Food & groceries", icon: Utensils, color: "var(--chart-2)" },
  { id: "shopping", label: "Shopping", icon: ShoppingBag, color: "var(--chart-6)" },
  { id: "transport", label: "Transportation", icon: Bus, color: "var(--chart-4)" },
  { id: "education", label: "Education", icon: GraduationCap, color: "var(--chart-5)" },
  { id: "entertainment", label: "Entertainment", icon: Clapperboard, color: "var(--chart-3)" },
  { id: "healthcare", label: "Healthcare", icon: HeartPulse, color: "oklch(0.65 0.17 10)" },
  { id: "rent", label: "Rent", icon: Home, color: "var(--chart-1)" },
  { id: "utilities", label: "Utilities", icon: Zap, color: "oklch(0.72 0.13 100)" },
  { id: "business", label: "Business expenses", icon: Briefcase, color: "oklch(0.55 0.08 250)" },
  { id: "salaries", label: "Salaries & staff", icon: Users, color: "oklch(0.6 0.1 200)" },
  { id: "marketing", label: "Marketing", icon: Megaphone, color: "oklch(0.66 0.15 340)" },
  { id: "operations", label: "Operations & supplies", icon: Wrench, color: "oklch(0.58 0.07 60)" },
  { id: "investments", label: "Investments", icon: TrendingUp, color: "oklch(0.6 0.12 175)" },
  { id: "savings", label: "Savings", icon: PiggyBank, color: "oklch(0.7 0.12 150)" },
  { id: "other", label: "Other expenses", icon: CircleEllipsis, color: "oklch(0.65 0.02 150)" },
];

export const INCOME_CATEGORIES: CategoryDef[] = [
  { id: "salary", label: "Salary", icon: Wallet, color: "var(--chart-1)" },
  { id: "business_income", label: "Business income", icon: Building2, color: "var(--chart-4)" },
  { id: "freelance", label: "Freelance", icon: Briefcase, color: "var(--chart-5)" },
  { id: "investment_income", label: "Investment returns", icon: TrendingUp, color: "var(--chart-2)" },
  { id: "gift", label: "Gifts & others", icon: Gift, color: "var(--chart-6)" },
];

export const ALL_CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];
export const EXPENSE_CATEGORY_IDS = EXPENSE_CATEGORIES.map((c) => c.id);
export const INCOME_CATEGORY_IDS = INCOME_CATEGORIES.map((c) => c.id);

export function getCategory(id: string): CategoryDef {
  return ALL_CATEGORIES.find((c) => c.id === id) ?? (EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1] as CategoryDef);
}

export const PAYMENT_METHODS = [
  { id: "upi", label: "UPI" },
  { id: "cash", label: "Cash" },
  { id: "debit_card", label: "Debit card" },
  { id: "credit_card", label: "Credit card" },
  { id: "net_banking", label: "Net banking" },
  { id: "other", label: "Other" },
] as const;

/** Simple keyword rules used offline / before AI, and as fallback. */
const RULES: Array<[RegExp, string]> = [
  [/swiggy|zomato|grocer|bigbasket|blinkit|zepto|dmart|restaurant|cafe|food|milk|vegetable|kirana|dominos|pizza/i, "food"],
  [/amazon|flipkart|myntra|ajio|meesho|shopping|mall|cloth|nykaa/i, "shopping"],
  [/uber|ola|rapido|metro|petrol|diesel|fuel|irctc|train|bus|flight|indigo|parking|fastag/i, "transport"],
  [/school|college|tuition|course|udemy|byju|book|exam|fees/i, "education"],
  [/netflix|prime|hotstar|spotify|movie|pvr|inox|bookmyshow|game/i, "entertainment"],
  [/hospital|pharma|medic|apollo|doctor|clinic|1mg|health|insurance/i, "healthcare"],
  [/rent|landlord|lease|pg\b|hostel/i, "rent"],
  [/electric|bescom|water|gas|broadband|wifi|jio|airtel|vi\b|recharge|dth|bill/i, "utilities"],
  [/salary paid|wages|staff/i, "salaries"],
  [/ads|advert|marketing|promotion/i, "marketing"],
  [/sip|mutual fund|zerodha|groww|upstox|stock|share|nps|ppf/i, "investments"],
  [/fd\b|fixed deposit|rd\b|recurring deposit|saving/i, "savings"],
  [/supplier|inventory|raw material|office|vendor|gst/i, "business"],
];
const INCOME_RULES: Array<[RegExp, string]> = [
  [/salary|payroll/i, "salary"],
  [/invoice|client|customer|sale|order/i, "business_income"],
  [/freelance|upwork|fiverr|project/i, "freelance"],
  [/dividend|interest|maturity|redemption/i, "investment_income"],
];

export function guessCategory(description: string, type: "income" | "expense"): string {
  const rules = type === "income" ? INCOME_RULES : RULES;
  for (const [re, cat] of rules) if (re.test(description)) return cat;
  return type === "income" ? "gift" : "other";
}

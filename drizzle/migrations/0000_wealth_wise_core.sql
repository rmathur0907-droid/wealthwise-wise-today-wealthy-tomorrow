
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  language text NOT NULL DEFAULT 'en',
  theme text NOT NULL DEFAULT 'light',
  active_mode text NOT NULL DEFAULT 'personal',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "own profile delete" ON public.profiles FOR DELETE TO authenticated USING (id = auth.uid());

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Family
CREATE TABLE public.family_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'My Family',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.family_groups TO authenticated;
GRANT ALL ON public.family_groups TO service_role;

CREATE TABLE public.family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.family_groups(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  role text NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner','editor','viewer')),
  spending_limit numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.family_members TO authenticated;
GRANT ALL ON public.family_members TO service_role;

CREATE OR REPLACE FUNCTION public.family_access(_group uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM public.family_groups g WHERE g.id = _group AND g.owner_id = auth.uid()) THEN 'owner'
    ELSE (SELECT m.role FROM public.family_members m
          WHERE m.group_id = _group AND m.email IS NOT NULL
            AND lower(m.email) = lower(coalesce(auth.jwt()->>'email',''))
          ORDER BY CASE m.role WHEN 'owner' THEN 0 WHEN 'editor' THEN 1 ELSE 2 END LIMIT 1)
  END
$$;

ALTER TABLE public.family_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "family groups visible to members" ON public.family_groups FOR SELECT TO authenticated USING (owner_id = auth.uid() OR public.family_access(id) IS NOT NULL);
CREATE POLICY "create own family group" ON public.family_groups FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "owner updates group" ON public.family_groups FOR UPDATE TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "owner deletes group" ON public.family_groups FOR DELETE TO authenticated USING (owner_id = auth.uid());

ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members visible to group" ON public.family_members FOR SELECT TO authenticated USING (public.family_access(group_id) IS NOT NULL);
CREATE POLICY "owner adds members" ON public.family_members FOR INSERT TO authenticated WITH CHECK (public.family_access(group_id) = 'owner');
CREATE POLICY "owner edits members" ON public.family_members FOR UPDATE TO authenticated USING (public.family_access(group_id) = 'owner');
CREATE POLICY "owner removes members" ON public.family_members FOR DELETE TO authenticated USING (public.family_access(group_id) = 'owner');

-- Transactions
CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  family_group_id uuid REFERENCES public.family_groups(id) ON DELETE CASCADE,
  mode text NOT NULL DEFAULT 'personal' CHECK (mode IN ('personal','family','business')),
  type text NOT NULL CHECK (type IN ('income','expense')),
  amount numeric NOT NULL CHECK (amount >= 0),
  date date NOT NULL DEFAULT current_date,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'other',
  payment_method text NOT NULL DEFAULT 'upi',
  recurring boolean NOT NULL DEFAULT false,
  member_name text,
  split_members text[] NOT NULL DEFAULT '{}',
  counterparty text,
  status text NOT NULL DEFAULT 'paid' CHECK (status IN ('paid','pending')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX transactions_user_idx ON public.transactions(user_id, date DESC);
CREATE INDEX transactions_family_idx ON public.transactions(family_group_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own or family transactions" ON public.transactions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR (family_group_id IS NOT NULL AND public.family_access(family_group_id) IS NOT NULL));
CREATE POLICY "insert own transactions" ON public.transactions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND (family_group_id IS NULL OR public.family_access(family_group_id) IN ('owner','editor')));
CREATE POLICY "update own or owner family transactions" ON public.transactions FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR (family_group_id IS NOT NULL AND public.family_access(family_group_id) = 'owner'));
CREATE POLICY "delete own or owner family transactions" ON public.transactions FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR (family_group_id IS NOT NULL AND public.family_access(family_group_id) = 'owner'));

-- Budgets
CREATE TABLE public.budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  mode text NOT NULL DEFAULT 'personal',
  category text NOT NULL,
  amount numeric NOT NULL CHECK (amount >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, mode, category)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.budgets TO authenticated;
GRANT ALL ON public.budgets TO service_role;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own budgets" ON public.budgets FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Investments
CREATE TABLE public.investments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'mutual_fund',
  invested numeric NOT NULL DEFAULT 0 CHECK (invested >= 0),
  current_value numeric NOT NULL DEFAULT 0 CHECK (current_value >= 0),
  expected_return numeric NOT NULL DEFAULT 0,
  risk text NOT NULL DEFAULT 'moderate' CHECK (risk IN ('low','moderate','high')),
  start_date date NOT NULL DEFAULT current_date,
  monthly_sip numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.investments TO authenticated;
GRANT ALL ON public.investments TO service_role;
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own investments" ON public.investments FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Goals and challenges
CREATE TABLE public.goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  family_group_id uuid REFERENCES public.family_groups(id) ON DELETE CASCADE,
  mode text NOT NULL DEFAULT 'personal',
  kind text NOT NULL DEFAULT 'goal' CHECK (kind IN ('goal','challenge')),
  title text NOT NULL,
  target numeric NOT NULL DEFAULT 0,
  saved numeric NOT NULL DEFAULT 0,
  deadline date,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.goals TO authenticated;
GRANT ALL ON public.goals TO service_role;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own or family goals" ON public.goals FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR (family_group_id IS NOT NULL AND public.family_access(family_group_id) IS NOT NULL));
CREATE POLICY "insert own goals" ON public.goals FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND (family_group_id IS NULL OR public.family_access(family_group_id) IN ('owner','editor')));
CREATE POLICY "update own or family goals" ON public.goals FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR (family_group_id IS NOT NULL AND public.family_access(family_group_id) IN ('owner','editor')));
CREATE POLICY "delete own or owner family goals" ON public.goals FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR (family_group_id IS NOT NULL AND public.family_access(family_group_id) = 'owner'));

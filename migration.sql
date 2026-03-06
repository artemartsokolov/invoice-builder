-- ===== Invoice Builder — Supabase Migration =====
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)

-- 1. Companies table
CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  reg_no TEXT,
  reg_label TEXT DEFAULT 'COMPANY REGISTRATION NO',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number INTEGER NOT NULL,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  client_name TEXT NOT NULL,
  company_id TEXT REFERENCES companies(id) ON DELETE SET NULL,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('processing', 'pending', 'done', 'error')),
  invoice_date TEXT,
  due_date TEXT,
  services JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(number, year)
);

-- 3. Expenses table (Phase 2)
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount DECIMAL(12,2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  category TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  screenshot_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. App state (single-row settings)
CREATE TABLE IF NOT EXISTS app_state (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  state JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Insert default companies
INSERT INTO companies (id, name, address, reg_no, reg_label) VALUES
  ('reviero', 'REVIERO TECHNOLOGIES LTD', '167-169 Great Portland Street
Fifth Floor
London
W1W 5PF', '14673847', 'COMPANY REGISTRATION NO'),
  ('navian', 'Navian Consulting AB', 'c/o KG10 I STOCKHOLM AB,
Kungsgatan 8,
1143 Stockholm', 'SE559083017901', 'VAT'),
  ('ssk', 'SSK Venture holdings AB', 'Kungsgatan 8,
111 43 Stockholm', '559397-4123', 'Org.nr')
ON CONFLICT (id) DO NOTHING;

-- 6. RLS — disable for single-user (you can enable later)
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_state ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access
CREATE POLICY "auth_all" ON companies FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON expenses FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON app_state FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 7. Storage bucket for bank screenshots (run separately or via dashboard)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', false);

-- 8. Create auth user (change password!)
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'artemartsokolov@gmail.com',
  crypt('ChangeMe123!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  now(),
  now(),
  '',
  '',
  '',
  ''
);

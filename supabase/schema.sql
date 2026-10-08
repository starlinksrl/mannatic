-- Supabase Schema for Mannatic / SchedulaPro

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. App Configuration
CREATE TABLE IF NOT EXISTS public.app_configurations (
    id TEXT PRIMARY KEY DEFAULT 'global',
    app_name TEXT,
    app_logo_url TEXT,
    resend_api_key TEXT,
    default_sender_email TEXT,
    gcs_project_id TEXT,
    gcs_client_email TEXT,
    gcs_private_key TEXT,
    gcs_bucket_name TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Companies
CREATE TABLE IF NOT EXISTS public.companies (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    name TEXT NOT NULL,
    creator_id TEXT,
    distributor_id TEXT,
    logo_url TEXT,
    address TEXT,
    city TEXT,
    referent_name TEXT,
    referent_phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    vat_number TEXT,
    tax_code TEXT,
    phone TEXT,
    unique_code TEXT,
    email TEXT,
    platform_url TEXT,
    theme TEXT DEFAULT 'default',
    font TEXT DEFAULT 'default',
    view_mode TEXT DEFAULT 'grid',
    resend_api_key TEXT,
    sender_email TEXT,
    company_scratchpad TEXT,
    cron_job_recipients JSONB DEFAULT '[]'::jsonb,
    whatsapp_access_token TEXT,
    whatsapp_phone_number_id TEXT,
    whatsapp_template_name TEXT,
    whatsapp_admin_phone TEXT
);

-- 3. Users
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY, -- matches auth.users.id or custom uid
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'Client',
    avatar_url TEXT DEFAULT '',
    company_id TEXT REFERENCES public.companies(id) ON DELETE CASCADE,
    address TEXT,
    phone TEXT,
    website TEXT,
    password TEXT,
    allowed_sectors JSONB DEFAULT '[]'::jsonb,
    simplified_dashboard BOOLEAN DEFAULT FALSE,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    client_notes TEXT,
    dashboard_layout JSONB DEFAULT '{}'::jsonb,
    push_subscriptions JSONB DEFAULT '[]'::jsonb,
    scratchpad TEXT,
    logo_url TEXT,
    vat_number TEXT,
    tax_code TEXT,
    unique_code TEXT,
    distributor_id TEXT,
    whatsapp_access_token TEXT,
    whatsapp_phone_number_id TEXT,
    whatsapp_template_name TEXT,
    whatsapp_admin_phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Interventions (and Scheduled Maintenances)
CREATE TABLE IF NOT EXISTS public.interventions (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    title TEXT NOT NULL,
    client_id TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'standard',
    description TEXT,
    priority TEXT NOT NULL DEFAULT 'Media',
    sla TEXT DEFAULT '24h',
    status TEXT NOT NULL DEFAULT 'Nuovo',
    assigned_operator_ids JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    due_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    time_spent NUMERIC,
    materials_used TEXT,
    cost NUMERIC,
    photos JSONB DEFAULT '[]'::jsonb,
    client_signature TEXT,
    updates JSONB DEFAULT '[]'::jsonb,
    attachments JSONB DEFAULT '[]'::jsonb,
    work_logs JSONB DEFAULT '[]'::jsonb,
    company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    is_maintenance BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    featured_order INT DEFAULT 0,
    -- Scheduled Maintenance fields
    recurrence_months INT DEFAULT 0,
    checklist JSONB DEFAULT '[]'::jsonb,
    next_due_date TIMESTAMPTZ
);

-- 5. Surveys
CREATE TABLE IF NOT EXISTS public.surveys (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    title TEXT NOT NULL,
    client_id TEXT NOT NULL,
    company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    assigned_operator_id TEXT,
    status TEXT DEFAULT 'Nuovo',
    notes TEXT,
    attachments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Appointments
CREATE TABLE IF NOT EXISTS public.appointments (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    title TEXT NOT NULL,
    client_id TEXT NOT NULL,
    address TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    date TIMESTAMPTZ,
    assigned_operator_id TEXT,
    notes TEXT,
    status TEXT DEFAULT 'Pianificato',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE
);

-- 7. Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id TEXT NOT NULL,
    company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    related_intervention_id TEXT,
    type TEXT DEFAULT 'generic'
);

-- 8. Support Tickets
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    client_id TEXT NOT NULL,
    client_name TEXT NOT NULL,
    company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'Aperto',
    messages JSONB DEFAULT '[]'::jsonb,
    ticket_type TEXT DEFAULT 'client_support'
);

-- 9. Distributor Quotes
CREATE TABLE IF NOT EXISTS public.distributor_quotes (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    distributor_id TEXT NOT NULL,
    distributor_name TEXT NOT NULL,
    company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    gcs_path TEXT NOT NULL,
    riferimento TEXT,
    scadenza DATE,
    description TEXT,
    text_content TEXT,
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Password Reset Tokens
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    company_id TEXT NOT NULL
);

-- 11. Autologin Tokens
CREATE TABLE IF NOT EXISTS public.autologin_tokens (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    company_id TEXT NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_company_id ON public.users(company_id);
CREATE INDEX IF NOT EXISTS idx_interventions_company_id ON public.interventions(company_id);
CREATE INDEX IF NOT EXISTS idx_interventions_client_id ON public.interventions(client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_company_id ON public.appointments(company_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_company_id ON public.support_tickets(company_id);
CREATE INDEX IF NOT EXISTS idx_distributor_quotes_company_id ON public.distributor_quotes(company_id);

-- Enable RLS on all tables
ALTER TABLE public.app_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distributor_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.autologin_tokens ENABLE ROW LEVEL SECURITY;

-- Default Permissive Policies
CREATE POLICY "Allow all access to app_configurations" ON public.app_configurations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to companies" ON public.companies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to users" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to interventions" ON public.interventions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to surveys" ON public.surveys FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to appointments" ON public.appointments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to notifications" ON public.notifications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to support_tickets" ON public.support_tickets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to distributor_quotes" ON public.distributor_quotes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to password_reset_tokens" ON public.password_reset_tokens FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to autologin_tokens" ON public.autologin_tokens FOR ALL USING (true) WITH CHECK (true);

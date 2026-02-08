-- Initial Migration
-- Core RPG Tables

CREATE TABLE IF NOT EXISTS "User" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_image_url TEXT,
    current_class TEXT DEFAULT 'Aprendiz',
    level INTEGER DEFAULT 1,
    current_xp INTEGER DEFAULT 0,
    gold_coins INTEGER DEFAULT 0,
    login_streak INTEGER DEFAULT 0,
    gamification JSONB DEFAULT '{}',
    attributes JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "FinTransaction" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by TEXT NOT NULL,
    date DATE NOT NULL,
    description TEXT,
    value NUMERIC(15, 2) NOT NULL,
    type TEXT CHECK (type IN ('income', 'expense')),
    category TEXT,
    account_id UUID,
    status TEXT DEFAULT 'confirmed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Account" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT,
    balance NUMERIC(15, 2) DEFAULT 0,
    institution TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "BudgetCategory" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by TEXT NOT NULL,
    name TEXT NOT NULL,
    expense_type TEXT DEFAULT 'variable',
    "limit" NUMERIC(15, 2) DEFAULT 0,
    budget NUMERIC(15, 2) DEFAULT 0,
    icon TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

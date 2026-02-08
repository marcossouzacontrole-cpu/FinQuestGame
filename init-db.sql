-- FinQuest Local Database Initialization

-- Enable common extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Account
CREATE TABLE IF NOT EXISTS "Account" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type TEXT,
    balance NUMERIC(15, 2) DEFAULT 0,
    pluggy_account_id TEXT,
    pluggy_item_id TEXT,
    icon TEXT,
    color TEXT,
    last_transaction_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT
);

-- 2. BudgetCategory
CREATE TABLE IF NOT EXISTS "BudgetCategory" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    "limit" NUMERIC(15, 2) DEFAULT 0,
    expenses JSONB DEFAULT '[]'::jsonb,
    icon TEXT,
    color TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT
);

-- 3. FinTransaction
CREATE TABLE IF NOT EXISTS "FinTransaction" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    value NUMERIC(15, 2) NOT NULL,
    description TEXT NOT NULL,
    category TEXT,
    type TEXT CHECK (type IN ('income', 'expense')),
    account_id UUID REFERENCES "Account"(id),
    pluggy_transaction_id TEXT,
    pluggy_account_id TEXT,
    budget_category_id UUID REFERENCES "BudgetCategory"(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT
);

-- 4. TransactionRule
CREATE TABLE IF NOT EXISTS "TransactionRule" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pattern TEXT NOT NULL,
    category TEXT,
    transaction_type TEXT,
    match_type TEXT DEFAULT 'contains',
    priority INTEGER DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT
);

-- 5. Goal
CREATE TABLE IF NOT EXISTS "Goal" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    target_value NUMERIC(15, 2) NOT NULL,
    current_value NUMERIC(15, 2) DEFAULT 0,
    deadline TIMESTAMP WITH TIME ZONE,
    category TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT
);

-- 6. Mission
CREATE TABLE IF NOT EXISTS "Mission" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    points INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending',
    type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT
);

-- 7. Achievement
CREATE TABLE IF NOT EXISTS "Achievement" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    unlocked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT
);

-- 8. Season
CREATE TABLE IF NOT EXISTS "Season" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    active BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_transaction_date ON "FinTransaction"(date);
CREATE INDEX IF NOT EXISTS idx_transaction_account ON "FinTransaction"(account_id);
CREATE INDEX IF NOT EXISTS idx_account_pluggy ON "Account"(pluggy_account_id);

-- Phase 4: Auth System & Multi-Tenancy
-- Tables for Identity Management

CREATE TABLE IF NOT EXISTS "UserAccount" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    provider TEXT NOT NULL, -- 'google', 'microsoft'
    provider_user_id TEXT NOT NULL,
    email TEXT NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider, provider_user_id)
);

CREATE TABLE IF NOT EXISTS "UserCredential" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Ensure all tables have created_by for multi-tenancy
-- Note: "User" table uses email as the identifier in 'created_by' for simplicity across OAuth/Email

DO $$ 
BEGIN 
    -- Check if columns exist before adding
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='FinTransaction' AND column_name='created_by') THEN
        ALTER TABLE "FinTransaction" ADD COLUMN created_by TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Account' AND column_name='created_by') THEN
        ALTER TABLE "Account" ADD COLUMN created_by TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='BudgetCategory' AND column_name='created_by') THEN
        ALTER TABLE "BudgetCategory" ADD COLUMN created_by TEXT;
    END IF;

    -- RPG Expansion Tables cleanup/creation
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='UserInventory' AND column_name='created_by') THEN
        ALTER TABLE "UserInventory" ADD COLUMN created_by TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Goal' AND column_name='created_by') THEN
        ALTER TABLE "Goal" ADD COLUMN created_by TEXT;
    END IF;
END $$;

-- Create indexes for performance on filtered queries
CREATE INDEX IF NOT EXISTS idx_fintransaction_created_by ON "FinTransaction"(created_by);
CREATE INDEX IF NOT EXISTS idx_account_created_by ON "Account"(created_by);
CREATE INDEX IF NOT EXISTS idx_budgetcategory_created_by ON "BudgetCategory"(created_by);
CREATE INDEX IF NOT EXISTS idx_userinventory_created_by ON "UserInventory"(created_by);
CREATE INDEX IF NOT EXISTS idx_goal_created_by ON "Goal"(created_by);
CREATE INDEX IF NOT EXISTS idx_user_email ON "User"(email);

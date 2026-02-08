-- Phase 2: RPG Expansion
-- Inventory and Boss Systems

CREATE TABLE IF NOT EXISTS "Item" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    price INTEGER DEFAULT 0,
    category TEXT, -- 'consumable', 'equipment', 'quest_item'
    effect_type TEXT, -- 'hp_boost', 'xp_multiplier', 'fee_reduction'
    effect_value NUMERIC(10, 2),
    icon TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "UserInventory" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email TEXT NOT NULL,
    item_id UUID REFERENCES "Item"(id),
    quantity INTEGER DEFAULT 1,
    is_equipped BOOLEAN DEFAULT false,
    acquired_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Boss" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    total_hp NUMERIC(15, 2), -- The total debt value
    current_hp NUMERIC(15, 2),
    level INTEGER DEFAULT 1,
    debt_id UUID, -- Link to FinTransaction or Debt entity
    type TEXT DEFAULT 'debt_keeper',
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed initial items
INSERT INTO "Item" (name, description, price, category, effect_type, effect_value, icon) VALUES
('Poção de Frugalidade', 'Ignora gastos com Lanches por 24h.', 50, 'consumable', 'ignore_category', 0, '🧪'),
('Escudo de Ferro', 'Reduz o impacto de juros no HP.', 150, 'equipment', 'fee_shield', 0.2, '🛡️'),
('Pergaminho de XP', 'Dobra o XP ganho em missões hoje.', 100, 'consumable', 'xp_boost', 2.0, '📜'),
('Espada do Pagamento', 'Dá dano extra em Bosses de Dívida.', 300, 'equipment', 'debt_damage', 1.5, '⚔️');

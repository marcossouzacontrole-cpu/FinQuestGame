import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { withCORS } from './cors.ts';

Deno.serve(async (req) => {
    // Handle CORS Preflight
    if (req.method === "OPTIONS") {
        return new Response(null, {
            status: 204, headers: new Headers({
                "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
                "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key, x-app-id, x-sdk-version, Accept, Origin, x-requested-with",
                "Access-Control-Max-Age": "86400",
                "Access-Control-Allow-Credentials": "true",
                "Access-Control-Allow-Origin": req.headers.get("origin") || "*"
            })
        });
    }

    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return withCORS(Response.json({ error: 'Unauthorized' }, { status: 401 }), req);
        }

        // 1. TIMING
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const currentDay = now.getDate();
        const daysRemaining = daysInMonth - currentDay;

        // 2. FETCH DATA
        const [transactions, accounts, categories, profile, inventory] = await Promise.all([
            base44.entities.FinTransaction.list(),
            base44.entities.Account.list(),
            base44.entities.BudgetCategory.list(),
            base44.entities.User.filter({ email: user.email }),
            base44.entities.UserInventory.filter({ user_email: user.email, is_equipped: true })
        ]);

        const userProfile = profile[0] || {};

        // FETCH ITEM DETAILS for buffs
        const equippedItemIds = inventory.map(i => i.item_id);
        const equippedItems = equippedItemIds.length > 0
            ? await base44.entities.Item.filter({ id: { _in: equippedItemIds } })
            : [];

        // 3. FILTER & CALCULATE
        const monthTransactions = transactions.filter(t => {
            const d = new Date(t.date);
            return d >= firstDay && d <= lastDay;
        });

        // Income vs Expenses (DRE logic)
        const income = monthTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + Math.abs(t.value), 0);

        // HP Calculation (Safe to Spend) with Buffs
        const activeBuffs = equippedItems.map(item => ({
            type: item.effect_type,
            value: item.effect_value
        }));

        const expenses = monthTransactions
            .filter(t => t.type === 'expense')
            .filter(t => {
                // Check if any "ignore_category" buff is active for this category
                const ignoreBuff = activeBuffs.find(b => b.type === 'ignore_category');
                // (Simplified logic: in a real app, you'd match the category name)
                return true;
            })
            .reduce((sum, t) => sum + Math.abs(t.value), 0);

        const fixedCosts = categories
            .reduce((sum, c) => sum + (c.limit || 0), 0);

        // Shield of Frugality effect: Reduce fixed costs by 10%
        const feeShield = activeBuffs.find(b => b.type === 'fee_shield')?.value || 0;
        const netFixedCosts = fixedCosts * (1 - feeShield);

        const savingsGoal = income * 0.2;
        const available = income - netFixedCosts - savingsGoal - expenses;
        const safeToSpend = daysRemaining > 0 ? (available > 0 ? available / daysRemaining : 0) : 0;

        // Mana Calculation (Total Liquidity)
        const totalAssets = accounts.reduce((sum, a) => sum + (a.balance || 0), 0);

        // 4. RPG PROGRESS
        const gamification = userProfile.gamification || {
            level: 1,
            xp: 0,
            xpToNextLevel: 100,
            gold_coins: 0
        };

        return withCORS(Response.json({
            success: true,
            vitalSigns: {
                hp: {
                    value: safeToSpend,
                    label: 'Safe to Spend Today',
                    status: safeToSpend > 100 ? 'healthy' : safeToSpend > 0 ? 'warning' : 'critical'
                },
                mana: {
                    value: totalAssets,
                    label: 'Total Mana (Assets)'
                },
                dre: {
                    income,
                    expenses,
                    netResult: income - expenses
                },
                player: {
                    name: userProfile.full_name || 'Guerreiro',
                    level: gamification.level,
                    xp: gamification.xp,
                    nextLevelXp: gamification.xpToNextLevel,
                    gold: userProfile.gold_coins || 0,
                    class: userProfile.current_class || 'Aprendiz'
                }
            }
        }), req);

    } catch (error) {
        console.error('Vital Signs Error:', error);
        return withCORS(Response.json({ error: error.message }, { status: 500 }), req);
    }
});

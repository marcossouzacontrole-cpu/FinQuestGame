import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 1. Fetch Debts and current Bosses
        const [debts, currentBosses] = await Promise.all([
            base44.entities.Debt.filter({ created_by: user.email }),
            base44.entities.Boss.list()
        ]);

        // 2. Map Debts to potential new Bosses
        const bosses = debts.map(debt => {
            // Find if a boss already exists for this debt
            const existingBoss = currentBosses.find(b => b.debt_id === debt.id);

            if (existingBoss) return existingBoss;

            // Generate a new Boss data on the fly (or you could store them)
            const intensity = (debt.interest_rate || 5) / 10;
            return {
                name: debt.description || 'Monstro da Dívida',
                total_hp: debt.total_amount || 1000,
                current_hp: debt.outstanding_balance || 500,
                level: Math.ceil(intensity * 10),
                image_url: 'https://img.freepik.com/free-photo/view-sinister-demon-monster-character-from-underworld_23-2151034475.jpg',
                debt_id: debt.id,
                type: debt.outstanding_balance > 5000 ? 'Epic' : 'Minion'
            };
        });

        return Response.json({
            success: true,
            arena: {
                location: 'Abismo das Finanças',
                bosses: bosses.filter(b => b.current_hp > 0)
            }
        });

    } catch (error) {
        console.error('Battle Arena Error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});

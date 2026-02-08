import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user already has an active battle pass
    const existing = await base44.entities.BattlePass.filter({
      created_by: user.email,
      status: 'active'
    });

    if (existing.length > 0) {
      return Response.json({ 
        success: false, 
        message: 'Usuário já tem um Battle Pass ativo'
      });
    }

    // Create new free battle pass for user
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 90);

    await base44.entities.BattlePass.create({
      season: 1,
      name: '⚔️ Season 1: Forjando Riquezas',
      status: 'active',
      current_tier: 0,
      purchase_date: new Date().toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      rewards_claimed: [],
      premium: false,
      total_xp_earned: 0
    });

    return Response.json({ 
      success: true,
      message: 'Battle Pass inicializado com sucesso!'
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { season, name, rewards } = await req.json();

    // Create battle pass for each user
    const allUsers = await base44.asServiceRole.entities.User.list();
    
    const battlePasses = allUsers.map(u => ({
      season,
      name,
      status: 'active',
      current_tier: 0,
      purchase_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      rewards_claimed: [],
      premium: false,
      total_xp_earned: 0
    }));

    await base44.asServiceRole.entities.BattlePass.bulkCreate(battlePasses);

    // Create season rewards
    const seasonRewards = rewards.map(r => ({
      season,
      ...r
    }));

    await base44.asServiceRole.entities.SeasonReward.bulkCreate(seasonRewards);

    return Response.json({ 
      success: true, 
      message: `Season ${season} criada com sucesso!`,
      users_count: allUsers.length,
      rewards_count: rewards.length
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
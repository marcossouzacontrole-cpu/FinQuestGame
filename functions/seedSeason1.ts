import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const rewards = [
      { tier: 1, name: 'Gold Starter', type: 'gold', value: 50, icon: '💰', free: true },
      { tier: 5, name: 'XP Boost', type: 'xp', value: 200, icon: '⚡', free: true },
      { tier: 10, name: 'Gold Pack', type: 'gold', value: 100, icon: '💎', free: false },
      { tier: 20, name: 'Legendary Skin', type: 'cosmetic', value: 1, icon: '👤', free: false },
      { tier: 30, name: 'Double XP', type: 'xp', value: 500, icon: '🔥', free: false },
      { tier: 50, name: 'VIP Badge', type: 'item', value: 1, icon: '👑', free: false },
      { tier: 75, name: 'Treasure Chest', type: 'gold', value: 250, icon: '🎁', free: false },
      { tier: 100, name: 'Mythic Aura', type: 'cosmetic', value: 1, icon: '✨', free: false }
    ];

    // Create all season rewards
    const seasonRewards = rewards.map(r => ({
      season: 1,
      ...r
    }));

    await base44.asServiceRole.entities.SeasonReward.bulkCreate(seasonRewards);

    return Response.json({ 
      success: true, 
      message: 'Season 1 criada com 8 rewards!'
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
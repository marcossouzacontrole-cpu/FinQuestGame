import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Buscar todas as missões do usuário
    const missions = await base44.entities.Mission.filter({ 
      created_by: user.email 
    });

    // Buscar dados financeiros para cálculo de progresso
    const [assets, debts, transactions, userData] = await Promise.all([
      base44.entities.Asset.filter({ created_by: user.email }),
      base44.entities.Debt.filter({ created_by: user.email }),
      base44.entities.FinTransaction.filter({ created_by: user.email }),
      base44.entities.User.filter({ email: user.email })
    ]);

    const userProfile = userData[0] || {};
    const netWorth = assets.reduce((sum, a) => sum + (a.value || 0), 0) - 
                     debts.reduce((sum, d) => sum + (d.outstanding_balance || 0), 0);

    // Agrupar missões por tier
    const timeline = {};
    
    for (const mission of missions) {
      const tier = mission.tier || 1;
      if (!timeline[tier]) {
        timeline[tier] = {
          tier,
          name: tier === 1 ? 'O Despertar' : tier === 2 ? 'A Muralha' : 'O Investidor',
          icon: tier === 1 ? '🌅' : tier === 2 ? '🛡️' : '💎',
          missions: []
        };
      }

      // Calcular progresso atual baseado no tipo de verificação
      let currentProgress = mission.current_progress || 0;
      
      switch (mission.verification_type) {
        case 'auto_net_worth':
          currentProgress = netWorth;
          break;
        case 'auto_transaction_count':
          currentProgress = transactions.length;
          break;
        case 'auto_savings_balance':
          const savings = assets.filter(a => a.type === 'investment' || a.type === 'cash');
          currentProgress = savings.reduce((sum, a) => sum + (a.value || 0), 0);
          break;
        case 'auto_debt_reduction':
          const currentDebt = debts.reduce((sum, d) => sum + (d.outstanding_balance || 0), 0);
          const previousDebt = userProfile.previous_debt_snapshot || currentDebt;
          currentProgress = previousDebt > 0 ? ((previousDebt - currentDebt) / previousDebt) * 100 : 0;
          break;
        case 'auto_streak':
          currentProgress = userProfile.login_streak || 0;
          break;
      }

      timeline[tier].missions.push({
        ...mission,
        current_progress: currentProgress,
        progress_percent: mission.target_value > 0 
          ? Math.min((currentProgress / mission.target_value) * 100, 100) 
          : 0
      });
    }

    // Converter para array e ordenar
    const timelineArray = Object.values(timeline).sort((a, b) => a.tier - b.tier);
    
    // Ordenar missões dentro de cada tier
    timelineArray.forEach(tier => {
      tier.missions.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
    });

    return Response.json({
      success: true,
      timeline: timelineArray,
      user_stats: {
        level: userProfile.level || 1,
        xp: userProfile.xp || 0,
        total_xp: userProfile.total_xp || 0,
        gold_coins: userProfile.gold_coins || 0,
        net_worth: netWorth
      }
    });

  } catch (error) {
    console.error('Error getting mission timeline:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
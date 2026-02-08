import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Get Mission Timeline
 * Retorna a estrutura completa de missões com progresso do usuário
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Buscar dados do usuário para métricas
    const [userProfile, assets, debts, transactions, missions] = await Promise.all([
      base44.entities.User.filter({ email: user.email }),
      base44.entities.Asset.filter({ created_by: user.email }),
      base44.entities.Debt.filter({ created_by: user.email }),
      base44.entities.FinTransaction.filter({ created_by: user.email }),
      base44.entities.Mission.filter({ created_by: user.email })
    ]);

    const userData = userProfile[0] || {};
    
    // Calcular Net Worth
    const totalAssets = assets.reduce((sum, a) => sum + (a.value || 0), 0);
    const totalDebts = debts.reduce((sum, d) => sum + (d.outstanding_balance || 0), 0);
    const netWorth = totalAssets - totalDebts;

    // Agrupar missões por tier
    const missionsByTier = {};
    for (const mission of missions) {
      const tier = mission.tier || 1;
      if (!missionsByTier[tier]) {
        missionsByTier[tier] = [];
      }
      missionsByTier[tier].push(mission);
    }

    // Construir timeline estruturada
    const timeline = [];
    const tierNames = {
      1: 'O Despertar',
      2: 'A Provação',
      3: 'A Glória'
    };

    for (let tierNum = 1; tierNum <= 3; tierNum++) {
      const tierMissions = (missionsByTier[tierNum] || [])
        .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

      // Atualizar progresso dinâmico para cada missão
      const missionsWithProgress = tierMissions.map((mission) => {
        let dynamicProgress = mission.current_progress || 0;

        // Calcular progresso baseado no tipo de verificação
        switch (mission.verification_type) {
          case 'auto_transaction_count':
            dynamicProgress = transactions.length;
            break;
          case 'auto_net_worth':
            dynamicProgress = netWorth;
            break;
          case 'auto_savings_balance':
            const savingsAccounts = assets.filter(a => 
              a.type === 'investment' || a.type === 'cash'
            );
            dynamicProgress = savingsAccounts.reduce((sum, a) => sum + (a.value || 0), 0);
            break;
          case 'auto_debt_reduction':
            dynamicProgress = totalDebts;
            break;
          case 'auto_streak':
            dynamicProgress = userData.login_streak || 0;
            break;
          case 'auto_import':
            dynamicProgress = transactions.length > 0 ? 1 : 0;
            break;
        }

        return {
          mission_id: mission.id,
          title: mission.title,
          description: mission.description,
          badge_icon: mission.badge_icon || '🎯',
          difficulty: mission.difficulty || 'easy',
          xp_reward: mission.xp_reward || 100,
          gold_reward: mission.gold_reward || 0,
          status: mission.status || 'locked',
          current_progress: dynamicProgress,
          target_value: mission.target_value || 1,
          progress_percent: mission.target_value > 0 
            ? Math.min((dynamicProgress / mission.target_value) * 100, 100) 
            : 0,
          verification_type: mission.verification_type,
          completed_date: mission.completed_date,
          order_index: mission.order_index || 0
        };
      });

      timeline.push({
        tier_id: `tier_${tierNum}`,
        tier_name: tierNames[tierNum],
        order_index: tierNum,
        missions: missionsWithProgress,
        completion_stats: {
          total: missionsWithProgress.length,
          completed: missionsWithProgress.filter(m => 
            m.status === 'completed' || m.status === 'claimed'
          ).length,
          active: missionsWithProgress.filter(m => m.status === 'active').length,
          locked: missionsWithProgress.filter(m => m.status === 'locked').length
        }
      });
    }

    return Response.json({
      success: true,
      timeline,
      user_stats: {
        email: user.email,
        level: userData.level || 1,
        xp: userData.xp || 0,
        total_xp: userData.total_xp || 0,
        gold_coins: userData.gold_coins || 0,
        net_worth: netWorth,
        total_assets: totalAssets,
        total_debts: totalDebts,
        login_streak: userData.login_streak || 0
      },
      summary: {
        total_tiers: timeline.length,
        total_missions: timeline.reduce((sum, t) => sum + t.missions.length, 0),
        completed_missions: timeline.reduce((sum, t) => 
          sum + t.completion_stats.completed, 0
        )
      }
    });

  } catch (error) {
    console.error('Error getting mission timeline:', error);
    return Response.json({ 
      success: false,
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});
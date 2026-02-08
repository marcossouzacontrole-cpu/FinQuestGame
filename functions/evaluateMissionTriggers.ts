import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Evaluate Mission Triggers
 * Verifica automaticamente missões baseadas em eventos financeiros
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. BUSCAR TODAS AS MISSÕES DO USUÁRIO
    const allMissions = await base44.entities.Mission.filter({
      created_by: user.email
    });

    const activeMissions = allMissions.filter(m => m.status === 'active');

    if (activeMissions.length === 0) {
      return Response.json({
        success: true,
        message: 'Nenhuma missão ativa para verificar',
        completed_count: 0,
        completed_missions: []
      });
    }

    // 2. BUSCAR DADOS FINANCEIROS PARA VERIFICAÇÃO
    const [assets, debts, transactions, userData] = await Promise.all([
      base44.entities.Asset.filter({ created_by: user.email }),
      base44.entities.Debt.filter({ created_by: user.email }),
      base44.entities.FinTransaction.filter({ created_by: user.email }),
      base44.entities.User.filter({ email: user.email })
    ]);

    const userProfile = userData[0] || {};
    
    // Calcular métricas
    const totalAssets = assets.reduce((sum, a) => sum + (a.value || 0), 0);
    const totalDebts = debts.reduce((sum, d) => sum + (d.outstanding_balance || 0), 0);
    const netWorth = totalAssets - totalDebts;
    const savingsBalance = assets
      .filter(a => a.type === 'investment' || a.type === 'cash')
      .reduce((sum, a) => sum + (a.value || 0), 0);

    const completedMissions = [];
    let totalXP = 0;
    let totalGold = 0;
    const missionsToUpdate = [];

    // 3. LOOP DE VERIFICAÇÃO
    for (const mission of activeMissions) {
      let shouldComplete = false;
      let currentValue = mission.current_progress || 0;

      // VERIFICAÇÃO POR TIPO DE VERIFICAÇÃO
      switch (mission.verification_type) {
        case 'auto_import':
          currentValue = transactions.length > 0 ? 1 : 0;
          if (currentValue >= mission.target_value) {
            shouldComplete = true;
          }
          break;

        case 'auto_transaction_count':
          currentValue = transactions.length;
          if (currentValue >= mission.target_value) {
            shouldComplete = true;
          }
          break;

        case 'auto_savings_balance':
          currentValue = savingsBalance;
          if (currentValue >= mission.target_value) {
            shouldComplete = true;
          }
          break;

        case 'auto_net_worth':
          currentValue = netWorth;
          if (currentValue >= mission.target_value) {
            shouldComplete = true;
          }
          break;

        case 'auto_debt_reduction':
          currentValue = totalDebts;
          const baselineDebt = userProfile.previous_debt_snapshot || totalDebts;
          const reduction = baselineDebt - totalDebts;
          const targetReduction = mission.target_value;
          
          // Se reduziu o percentual necessário
          if (baselineDebt > 0) {
            const reductionPercent = (reduction / baselineDebt) * 100;
            if (reductionPercent >= targetReduction) {
              shouldComplete = true;
            }
          }
          break;

        case 'auto_streak':
          currentValue = userProfile.login_streak || 0;
          if (currentValue >= mission.target_value) {
            shouldComplete = true;
          }
          break;
      }

      // 4. SE COMPLETOU: VERIFICAR SE PODE COMPLETAR (missões anteriores completas)
      if (shouldComplete && mission.status === 'active') {
        // Usar allMissions já carregado no início
        // Verificar se todas as missões anteriores (mesmo tier, order_index menor) estão completas
        const previousMissions = allMissions.filter(m => 
          m.tier === mission.tier && 
          (m.order_index || 0) < (mission.order_index || 0)
        );
        
        const allPreviousCompleted = previousMissions.every(m => 
          m.status === 'completed' || m.status === 'claimed'
        );
        
        // Se tier > 1, verificar se o tier anterior está completo
        let previousTierCompleted = true;
        if (mission.tier > 1) {
          const previousTierMissions = allMissions.filter(m => m.tier === mission.tier - 1);
          previousTierCompleted = previousTierMissions.every(m => 
            m.status === 'completed' || m.status === 'claimed'
          );
        }
        
        if (!allPreviousCompleted || !previousTierCompleted) {
          // Não pode completar ainda - missões anteriores não foram completadas
          continue;
        }
        
        const now = new Date().toISOString();

        // Marcar como completada (batched no final)
        mission._shouldUpdate = true;
        mission._newProgress = currentValue;
        mission._newStatus = 'completed';
        mission._completedDate = now;
        
        // Dar recompensas ao usuário
        const newXP = (userProfile.xp || 0) + mission.xp_reward;
        const newTotalXP = (userProfile.total_xp || 0) + mission.xp_reward;
        const currentLevel = userProfile.level || 1;
        const xpToNextLevel = currentLevel * 100;
        const leveledUp = newXP >= xpToNextLevel;
        const newLevel = leveledUp ? currentLevel + 1 : currentLevel;
        const remainingXP = leveledUp ? newXP - xpToNextLevel : newXP;

        await base44.entities.User.update(userProfile.id, {
          xp: remainingXP,
          total_xp: newTotalXP,
          level: newLevel,
          gold_coins: (userProfile.gold_coins || 0) + mission.gold_reward,
          skill_points: leveledUp ? (userProfile.skill_points || 0) + 1 : userProfile.skill_points,
          previous_debt_snapshot: totalDebts
        });

        totalXP += mission.xp_reward;
        totalGold += mission.gold_reward;

        completedMissions.push({
          mission_id: mission.id,
          title: mission.title,
          xp_reward: mission.xp_reward,
          gold_reward: mission.gold_reward,
          leveled_up: leveledUp,
          new_level: newLevel
        });
        
        missionsToUpdate.push(mission);
      }
    }

    // 5. BATCH UPDATE - atualizar todas as missões de uma vez
    if (missionsToUpdate.length > 0) {
      for (const mission of missionsToUpdate) {
        // Atualizar missão completada
        await base44.entities.Mission.update(mission.id, {
          status: mission._newStatus,
          current_progress: mission._newProgress,
          completed_date: mission._completedDate
        });
      }
    }

    return Response.json({
      success: true,
      completed_count: completedMissions.length,
      total_xp_gained: totalXP,
      total_gold_gained: totalGold,
      completed_missions: completedMissions
    });

  } catch (error) {
    console.error('Error evaluating mission triggers:', error);
    return Response.json({ 
      success: false,
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});
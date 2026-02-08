import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Buscar todas as missões ativas do usuário
    const activeMissions = await base44.entities.Mission.filter({
      created_by: user.email,
      status: 'active'
    });

    // Buscar dados do usuário para verificação
    const [transactions, assets, debts, userProfile] = await Promise.all([
      base44.entities.FinTransaction.filter({ created_by: user.email }),
      base44.entities.Asset.filter({ created_by: user.email }),
      base44.entities.Debt.filter({ created_by: user.email }),
      base44.entities.User.filter({ email: user.email })
    ]);

    const userData = userProfile[0] || {};
    const netWorth = assets.reduce((sum, a) => sum + (a.value || 0), 0) - 
                     debts.reduce((sum, d) => sum + (d.outstanding_balance || 0), 0);

    const completedMissions = [];
    const updatedUser = { ...userData };

    // Verificar cada missão ativa
    for (const mission of activeMissions) {
      let shouldComplete = false;
      let currentProgress = mission.current_progress || 0;

      switch (mission.verification_type) {
        case 'auto_transaction_count':
          currentProgress = transactions.length;
          if (currentProgress >= (mission.target_value || 0)) {
            shouldComplete = true;
          }
          break;

        case 'auto_net_worth':
          currentProgress = netWorth;
          if (currentProgress >= (mission.target_value || 0)) {
            shouldComplete = true;
          }
          break;

        case 'auto_savings_balance':
          const savingsAccounts = assets.filter(a => 
            a.type === 'investment' || a.type === 'cash'
          );
          currentProgress = savingsAccounts.reduce((sum, a) => sum + (a.value || 0), 0);
          if (currentProgress >= (mission.target_value || 0)) {
            shouldComplete = true;
          }
          break;

        case 'auto_debt_reduction':
          const currentDebt = debts.reduce((sum, d) => sum + (d.outstanding_balance || 0), 0);
          const previousDebt = userData.previous_debt_snapshot || currentDebt;
          const reductionPercent = previousDebt > 0 ? ((previousDebt - currentDebt) / previousDebt) * 100 : 0;
          currentProgress = reductionPercent;
          if (reductionPercent >= (mission.target_value || 0)) {
            shouldComplete = true;
          }
          break;

        case 'auto_import':
          const today = new Date().toISOString().split('T')[0];
          const todayTransactions = transactions.filter(t => 
            t.created_date && t.created_date.startsWith(today)
          );
          currentProgress = todayTransactions.length;
          if (currentProgress >= (mission.target_value || 1)) {
            shouldComplete = true;
          }
          break;

        case 'auto_category_spending':
          if (mission.verification_config?.category) {
            const categoryTransactions = transactions.filter(t => 
              t.category === mission.verification_config.category &&
              t.type === 'expense'
            );
            currentProgress = categoryTransactions.reduce((sum, t) => sum + Math.abs(t.value || 0), 0);
            if (currentProgress <= (mission.target_value || 0)) {
              shouldComplete = true;
            }
          }
          break;

        case 'auto_streak':
          currentProgress = userData.login_streak || 0;
          if (currentProgress >= (mission.target_value || 0)) {
            shouldComplete = true;
          }
          break;
      }

      // Atualizar progresso da missão
      await base44.entities.Mission.update(mission.id, {
        current_progress: currentProgress
      });

      // Se completou, dar recompensas
      if (shouldComplete && mission.status === 'active') {
        const now = new Date().toISOString();
        
        await base44.entities.Mission.update(mission.id, {
          status: 'completed',
          completed_date: now,
          auto_verified_at: now
        });

        // Adicionar XP e Gold
        const newXP = (userData.xp || 0) + (mission.xp_reward || 0);
        const newTotalXP = (userData.total_xp || 0) + (mission.xp_reward || 0);
        const currentLevel = userData.level || 1;
        const xpToNextLevel = currentLevel * 100;
        const leveledUp = newXP >= xpToNextLevel;
        const newLevel = leveledUp ? currentLevel + 1 : currentLevel;
        const remainingXP = leveledUp ? newXP - xpToNextLevel : newXP;

        updatedUser.xp = remainingXP;
        updatedUser.total_xp = newTotalXP;
        updatedUser.level = newLevel;
        updatedUser.gold_coins = (userData.gold_coins || 0) + (mission.gold_reward || 0);
        updatedUser.skill_points = leveledUp ? (userData.skill_points || 0) + 1 : userData.skill_points;

        completedMissions.push({
          ...mission,
          leveledUp,
          newLevel
        });

        // Desbloquear próximas missões
        const nextMissions = await base44.entities.Mission.filter({
          created_by: user.email,
          status: 'locked',
          tier: mission.tier
        });

        for (const nextMission of nextMissions) {
          const requiredIds = nextMission.required_mission_ids || [];
          if (requiredIds.includes(mission.id)) {
            await base44.entities.Mission.update(nextMission.id, {
              status: 'active'
            });
          }
        }
      }
    }

    // Atualizar snapshot de dívida para próxima verificação
    updatedUser.previous_debt_snapshot = debts.reduce((sum, d) => sum + (d.outstanding_balance || 0), 0);

    // Atualizar perfil do usuário
    if (completedMissions.length > 0) {
      await base44.entities.User.update(userData.id, updatedUser);
    }

    return Response.json({
      success: true,
      completedMissions,
      totalCompleted: completedMissions.length,
      userData: updatedUser
    });

  } catch (error) {
    console.error('Error verifying missions:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Buscar todos os dados
    const [userData, assets, debts, transactions, goals, budgets, missions] = await Promise.all([
      base44.entities.User.filter({ email: user.email }),
      base44.entities.Asset.filter({ created_by: user.email }),
      base44.entities.Debt.filter({ created_by: user.email }),
      base44.entities.FinTransaction.filter({ created_by: user.email }),
      base44.entities.Goal.filter({ created_by: user.email }),
      base44.entities.BudgetCategory.filter({ created_by: user.email }),
      base44.entities.Mission.filter({ created_by: user.email, type: 'campaign' })
    ]);

    const profile = userData[0] || {};
    const totalAssets = assets.reduce((sum, a) => sum + (a.value || 0), 0);
    const totalDebts = debts.reduce((sum, d) => sum + (d.outstanding_balance || 0), 0);
    const netWorth = totalAssets - totalDebts;
    
    // Calcular Net Worth anterior (estimado - baseado em dados históricos)
    const oldNetWorth = profile.previous_net_worth || netWorth * 0.95;
    const netWorthGrowth = oldNetWorth > 0 ? ((netWorth - oldNetWorth) / oldNetWorth) * 100 : 0;

    // Calcular métricas individuais (0-100)
    let score = 0;
    const insights = [];

    // 1. Net Worth Growth (25 pontos)
    let netWorthScore = 0;
    if (netWorthGrowth >= 10) netWorthScore = 25;
    else if (netWorthGrowth >= 5) netWorthScore = 20;
    else if (netWorthGrowth >= 2) netWorthScore = 15;
    else if (netWorthGrowth >= 0) netWorthScore = 10;
    else netWorthScore = 0;
    
    score += netWorthScore;
    if (netWorthGrowth < 0) {
      insights.push('⚠️ Seu patrimônio diminuiu - revise suas despesas');
    } else if (netWorthGrowth >= 10) {
      insights.push('🚀 Crescimento patrimonial excepcional!');
    }

    // 2. Debt Management (20 pontos)
    let debtScore = 0;
    const debtRatio = totalAssets > 0 ? (totalDebts / totalAssets) * 100 : 100;
    if (totalDebts === 0) {
      debtScore = 20;
      insights.push('🎯 Livre de dívidas - excelente!');
    } else if (debtRatio < 20) {
      debtScore = 15;
    } else if (debtRatio < 50) {
      debtScore = 10;
      insights.push('💡 Foque em reduzir suas dívidas para crescer mais rápido');
    } else {
      debtScore = 5;
      insights.push('⚠️ Dívidas altas - priorize a quitação');
    }
    score += debtScore;

    // 3. Budget Health (20 pontos)
    let budgetScore = 0;
    const totalBudget = budgets.reduce((sum, b) => sum + (b.budget || 0), 0);
    const totalSpent = budgets.reduce((sum, b) => {
      const expenses = (b.expenses || []).reduce((s, e) => s + (e.value || 0), 0);
      return sum + expenses;
    }, 0);
    
    const budgetHealth = totalBudget > 0 ? ((totalBudget - totalSpent) / totalBudget) * 100 : 50;
    
    if (budgetHealth >= 30) {
      budgetScore = 20;
      insights.push('💪 Orçamento controlado - você está no caminho certo!');
    } else if (budgetHealth >= 10) {
      budgetScore = 15;
    } else if (budgetHealth >= 0) {
      budgetScore = 10;
      insights.push('⚠️ Orçamento apertado - considere ajustar categorias');
    } else {
      budgetScore = 5;
      insights.push('🚨 Orçamento estourado - ação urgente necessária!');
    }
    score += budgetScore;

    // 4. Savings Rate (15 pontos)
    let savingsScore = 0;
    const cashAssets = assets.filter(a => a.type === 'cash' || a.type === 'investment').reduce((sum, a) => sum + a.value, 0);
    const savingsRate = totalAssets > 0 ? (cashAssets / totalAssets) * 100 : 0;
    
    if (savingsRate >= 30) {
      savingsScore = 15;
    } else if (savingsRate >= 20) {
      savingsScore = 12;
    } else if (savingsRate >= 10) {
      savingsScore = 8;
      insights.push('📈 Aumente sua reserva de emergência para mais segurança');
    } else {
      savingsScore = 4;
      insights.push('⚠️ Reserva baixa - priorize construir um fundo de emergência');
    }
    score += savingsScore;

    // 5. Goal Progress (10 pontos)
    let goalScore = 0;
    const activeGoals = goals.filter(g => g.status !== 'completed');
    const avgProgress = activeGoals.length > 0
      ? activeGoals.reduce((sum, g) => sum + ((g.current_amount / g.target_amount) * 100), 0) / activeGoals.length
      : 0;
    
    if (avgProgress >= 70) {
      goalScore = 10;
      insights.push('🎯 Quase lá! Suas metas estão próximas!');
    } else if (avgProgress >= 40) {
      goalScore = 7;
    } else if (avgProgress >= 20) {
      goalScore = 5;
    } else {
      goalScore = 3;
      if (activeGoals.length === 0) {
        insights.push('💡 Defina metas financeiras para ter foco!');
      }
    }
    score += goalScore;

    // 6. Activity & Consistency (10 pontos)
    let activityScore = 0;
    const streak = profile.login_streak || 0;
    const recentTransactions = transactions.filter(t => {
      const tDate = new Date(t.date);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return tDate >= weekAgo;
    }).length;

    if (streak >= 30) activityScore = 10;
    else if (streak >= 14) activityScore = 7;
    else if (streak >= 7) activityScore = 5;
    else activityScore = 3;

    if (recentTransactions === 0) {
      insights.push('📊 Registre suas transações para ter controle total');
    }
    score += activityScore;

    // Determinar Rank
    let rank = 'Iniciante';
    if (score >= 85) rank = 'Lendário';
    else if (score >= 70) rank = 'Épico';
    else if (score >= 50) rank = 'Raro';
    else if (score >= 30) rank = 'Intermediário';

    // Salvar score no perfil para histórico
    await base44.entities.User.update(profile.id, {
      previous_net_worth: netWorth,
      last_performance_score: score
    });

    return Response.json({
      success: true,
      total_score: Math.round(score),
      rank,
      metrics: {
        net_worth_growth: netWorthGrowth,
        debt_ratio: debtRatio,
        budget_health: budgetHealth,
        savings_rate: savingsRate,
        active_goals: activeGoals.length,
        streak: streak,
        recent_transactions: recentTransactions
      },
      breakdown: {
        net_worth_score: netWorthScore,
        debt_score: debtScore,
        budget_score: budgetScore,
        savings_score: savingsScore,
        goal_score: goalScore,
        activity_score: activityScore
      },
      insights: insights,
      net_worth: netWorth,
      total_assets: totalAssets,
      total_debts: totalDebts
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});
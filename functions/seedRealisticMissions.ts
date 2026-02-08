import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Cria missões realistas e úteis para o Battle Pass
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Verificar se já existem missões para evitar duplicatas
    const existingDailyMissions = await base44.asServiceRole.entities.DailyMission.list();
    const existingMilestones = await base44.asServiceRole.entities.FinancialMilestone.list();
    const existingTiers = await base44.asServiceRole.entities.MissionTier.list();
    
    if (existingDailyMissions.length > 0 || existingMilestones.length > 0 || existingTiers.length > 0) {
      return Response.json({ 
        success: false, 
        message: 'Missões já existem. Não é necessário recriar.' 
      });
    }

    // CRIAR TIERS
    const tier1 = await base44.asServiceRole.entities.MissionTier.create({
      name: 'Nível 1: O Despertar',
      order_index: 1,
      min_net_worth_required: 0,
      tier_icon: '🌅',
      description: 'Primeiros passos rumo ao controle financeiro',
      color: '#06b6d4'
    });

    const tier2 = await base44.asServiceRole.entities.MissionTier.create({
      name: 'Nível 2: O Chamado',
      order_index: 2,
      min_net_worth_required: 0,
      tier_icon: '🛡️',
      description: 'Construindo proteção e disciplina',
      color: '#8b5cf6'
    });

    const tier3 = await base44.asServiceRole.entities.MissionTier.create({
      name: 'Nível 3: O Investidor',
      order_index: 3,
      min_net_worth_required: 1000,
      tier_icon: '💎',
      description: 'Multiplicação de riqueza',
      color: '#f59e0b'
    });

    // MISSÕES TIER 1: O DESPERTAR
    const missions = [];

    missions.push(await base44.asServiceRole.entities.MissionDefinition.create({
      title: 'Conexão Inicial',
      description: 'Importe mais 1 transações bancárias para começar',
      xp_reward: 100,
      gold_reward: 50,
      tier_id: tier1.id,
      difficulty: 'easy',
      trigger_type: 'transaction_import',
      verification_logic: { target_value: 1 },
      order_in_tier: 1,
      badge_icon: '🔗',
      is_active: true
    }));

    missions.push(await base44.asServiceRole.entities.MissionDefinition.create({
      title: 'Primeiro Crescimento',
      description: 'Aumente seu patrimônio líquido em R$ 1',
      xp_reward: 150,
      gold_reward: 75,
      tier_id: tier1.id,
      difficulty: 'easy',
      trigger_type: 'net_worth_milestone',
      verification_logic: { target_value: 1, baseline: 0 },
      order_in_tier: 2,
      badge_icon: '📊',
      is_active: true
    }));

    missions.push(await base44.asServiceRole.entities.MissionDefinition.create({
      title: 'Visão Completa',
      description: 'Registre 25 transações para ter clareza financeira',
      xp_reward: 200,
      gold_reward: 100,
      tier_id: tier1.id,
      difficulty: 'easy',
      trigger_type: 'transaction_import',
      verification_logic: { target_value: 25 },
      order_in_tier: 3,
      badge_icon: '👁️',
      is_active: true
    }));

    // MISSÕES TIER 2: O CHAMADO (Proteção e Disciplina)
    missions.push(await base44.asServiceRole.entities.MissionDefinition.create({
      title: 'Caçador de Dívidas',
      description: 'Reduza suas dívidas em R$ 500 (das R$ 7357 para R$ 6857)',
      xp_reward: 300,
      gold_reward: 150,
      tier_id: tier2.id,
      difficulty: 'medium',
      trigger_type: 'debt_reduction',
      verification_logic: { target_value: 6857, baseline: 7357 },
      order_in_tier: 1,
      badge_icon: '💰',
      is_active: true
    }));

    missions.push(await base44.asServiceRole.entities.MissionDefinition.create({
      title: 'Evolução Financeira',
      description: 'Aumente seu patrimônio líquido em R$ 2752 (de R$ 15349 para R$ 21101)',
      xp_reward: 400,
      gold_reward: 200,
      tier_id: tier2.id,
      difficulty: 'medium',
      trigger_type: 'net_worth_milestone',
      verification_logic: { target_value: 2752, baseline: 0, is_increase: true },
      order_in_tier: 2,
      badge_icon: '💪',
      is_active: true
    }));

    missions.push(await base44.asServiceRole.entities.MissionDefinition.create({
      title: 'Mestre do Orçamento',
      description: 'Configure orçamentos para 5 categorias diferentes',
      xp_reward: 250,
      gold_reward: 125,
      tier_id: tier2.id,
      difficulty: 'medium',
      trigger_type: 'manual_action',
      verification_logic: { target_value: 5, check_type: 'category_budgets' },
      order_in_tier: 3,
      badge_icon: '📋',
      is_active: true
    }));

    missions.push(await base44.asServiceRole.entities.MissionDefinition.create({
      title: 'Guerreiro Constante',
      description: 'Mantenha uma sequência de 7 dias registrando transações',
      xp_reward: 350,
      gold_reward: 150,
      tier_id: tier2.id,
      difficulty: 'medium',
      trigger_type: 'streak_achievement',
      verification_logic: { target_value: 7 },
      order_in_tier: 4,
      badge_icon: '🔥',
      is_active: true
    }));

    missions.push(await base44.asServiceRole.entities.MissionDefinition.create({
      title: 'Reserva de Emergência',
      description: 'Acumule R$ 1.000 em poupança ou investimentos',
      xp_reward: 500,
      gold_reward: 250,
      tier_id: tier2.id,
      difficulty: 'hard',
      trigger_type: 'savings_target',
      verification_logic: { target_value: 1000 },
      order_in_tier: 5,
      badge_icon: '🛡️',
      is_active: true
    }));

    // MISSÕES TIER 3: O INVESTIDOR (Multiplicação)
    missions.push(await base44.asServiceRole.entities.MissionDefinition.create({
      title: 'Portfolio Inicial',
      description: 'Crie 3 ativos diferentes (investimentos, poupança, etc)',
      xp_reward: 600,
      gold_reward: 300,
      tier_id: tier3.id,
      difficulty: 'hard',
      trigger_type: 'balance_check',
      verification_logic: { target_value: 3, check_type: 'asset_count' },
      order_in_tier: 1,
      badge_icon: '📈',
      is_active: true
    }));

    missions.push(await base44.asServiceRole.entities.MissionDefinition.create({
      title: 'Renda Passiva',
      description: 'Registre R$ 100 em receitas de investimentos ou rendimentos',
      xp_reward: 800,
      gold_reward: 400,
      tier_id: tier3.id,
      difficulty: 'hard',
      trigger_type: 'manual_action',
      verification_logic: { target_value: 100, check_type: 'passive_income' },
      order_in_tier: 2,
      badge_icon: '💸',
      is_active: true
    }));

    missions.push(await base44.asServiceRole.entities.MissionDefinition.create({
      title: 'Patrimônio Sólido',
      description: 'Alcance R$ 10.000 de patrimônio líquido positivo',
      xp_reward: 1000,
      gold_reward: 500,
      tier_id: tier3.id,
      difficulty: 'legendary',
      trigger_type: 'net_worth_milestone',
      verification_logic: { target_value: 10000 },
      order_in_tier: 3,
      badge_icon: '💎',
      is_active: true
    }));

    missions.push(await base44.asServiceRole.entities.MissionDefinition.create({
      title: 'Liberdade Total',
      description: 'Elimine TODAS as suas dívidas (R$ 0 em passivos)',
      xp_reward: 2000,
      gold_reward: 1000,
      tier_id: tier3.id,
      difficulty: 'legendary',
      trigger_type: 'debt_reduction',
      verification_logic: { target_value: 0 },
      order_in_tier: 4,
      badge_icon: '👑',
      is_active: true
    }));

    missions.push(await base44.asServiceRole.entities.MissionDefinition.create({
      title: 'Mestre Financeiro',
      description: 'Mantenha resultado positivo (Loot > Dano) por 3 meses consecutivos',
      xp_reward: 2500,
      gold_reward: 1500,
      tier_id: tier3.id,
      difficulty: 'legendary',
      trigger_type: 'manual_action',
      verification_logic: { target_value: 3, check_type: 'positive_months' },
      order_in_tier: 5,
      badge_icon: '🏆',
      is_active: true
    }));

    // MISSÕES DIÁRIAS
    const dailyMissions = [
      {
        title: 'Registro Diário',
        description: 'Adicione pelo menos 1 transação hoje',
        mission_type: 'daily',
        xp_reward: 30,
        gold_reward: 10,
        trigger_type: 'add_transaction',
        target_value: 1,
        icon: '📝'
      },
      {
        title: 'Controle Orçamentário',
        description: 'Verifique seus orçamentos hoje',
        mission_type: 'daily',
        xp_reward: 40,
        gold_reward: 15,
        trigger_type: 'check_budget',
        target_value: 1,
        icon: '💰'
      },
      {
        title: 'Análise do Dia',
        description: 'Revise seu DRE hoje',
        mission_type: 'daily',
        xp_reward: 35,
        gold_reward: 12,
        trigger_type: 'review_dre',
        target_value: 1,
        icon: '📊'
      }
    ];

    // MISSÕES SEMANAIS
    const weeklyMissions = [
      {
        title: 'Semana Produtiva',
        description: 'Registre pelo menos 10 transações esta semana',
        mission_type: 'weekly',
        xp_reward: 150,
        gold_reward: 75,
        trigger_type: 'add_transaction',
        target_value: 10,
        icon: '🔥'
      },
      {
        title: 'Atualização de Metas',
        description: 'Atualize ou deposite em uma meta esta semana',
        mission_type: 'weekly',
        xp_reward: 120,
        gold_reward: 60,
        trigger_type: 'update_goal',
        target_value: 1,
        icon: '🎯'
      },
      {
        title: 'Caçador Semanal',
        description: 'Reduza uma dívida em qualquer valor esta semana',
        mission_type: 'weekly',
        xp_reward: 200,
        gold_reward: 100,
        trigger_type: 'reduce_debt',
        target_value: 1,
        icon: '⚔️'
      },
      {
        title: 'Organizador',
        description: 'Categorize todas as transações da semana corretamente',
        mission_type: 'weekly',
        xp_reward: 100,
        gold_reward: 50,
        trigger_type: 'categorize_expense',
        target_value: 5,
        icon: '🗂️'
      }
    ];

    // MARCOS FINANCEIROS
    const milestones = [
      // Investimentos
      {
        title: 'Primeiro Investidor',
        description: 'Alcance R$ 100 em investimentos',
        milestone_type: 'investment',
        target_value: 100,
        xp_reward: 200,
        gold_reward: 100,
        badge_icon: '💎',
        badge_color: '#06b6d4',
        rarity: 'common',
        order_index: 1
      },
      {
        title: 'Investidor Sério',
        description: 'Alcance R$ 1.000 em investimentos',
        milestone_type: 'investment',
        target_value: 1000,
        xp_reward: 500,
        gold_reward: 250,
        badge_icon: '📈',
        badge_color: '#8b5cf6',
        rarity: 'rare',
        order_index: 2
      },
      {
        title: 'Investidor Épico',
        description: 'Alcance R$ 10.000 em investimentos',
        milestone_type: 'investment',
        target_value: 10000,
        xp_reward: 2000,
        gold_reward: 1000,
        badge_icon: '💰',
        badge_color: '#f59e0b',
        rarity: 'epic',
        order_index: 3
      },
      {
        title: 'Investidor Lendário',
        description: 'Alcance R$ 50.000 em investimentos',
        milestone_type: 'investment',
        target_value: 50000,
        xp_reward: 5000,
        gold_reward: 2500,
        badge_icon: '👑',
        badge_color: '#FFD700',
        rarity: 'legendary',
        order_index: 4
      },
      // Patrimônio Líquido
      {
        title: 'Patrimônio Iniciante',
        description: 'Atinja R$ 5.000 de patrimônio líquido',
        milestone_type: 'net_worth',
        target_value: 5000,
        xp_reward: 300,
        gold_reward: 150,
        badge_icon: '🏠',
        badge_color: '#10b981',
        rarity: 'common',
        order_index: 5
      },
      {
        title: 'Patrimônio Sólido',
        description: 'Atinja R$ 25.000 de patrimônio líquido',
        milestone_type: 'net_worth',
        target_value: 25000,
        xp_reward: 1000,
        gold_reward: 500,
        badge_icon: '🏛️',
        badge_color: '#8b5cf6',
        rarity: 'rare',
        order_index: 6
      },
      {
        title: 'Patrimônio Épico',
        description: 'Atinja R$ 100.000 de patrimônio líquido',
        milestone_type: 'net_worth',
        target_value: 100000,
        xp_reward: 4000,
        gold_reward: 2000,
        badge_icon: '🏰',
        badge_color: '#f59e0b',
        rarity: 'epic',
        order_index: 7
      },
      // Poupança
      {
        title: 'Primeiro Poupador',
        description: 'Alcance R$ 500 em poupança',
        milestone_type: 'savings',
        target_value: 500,
        xp_reward: 250,
        gold_reward: 125,
        badge_icon: '🐷',
        badge_color: '#ec4899',
        rarity: 'common',
        order_index: 8
      },
      {
        title: 'Reserva de Emergência',
        description: 'Alcance R$ 3.000 em poupança',
        milestone_type: 'savings',
        target_value: 3000,
        xp_reward: 800,
        gold_reward: 400,
        badge_icon: '🛡️',
        badge_color: '#8b5cf6',
        rarity: 'rare',
        order_index: 9
      },
      // Livre de Dívidas
      {
        title: 'Libertação',
        description: 'Elimine TODAS as dívidas',
        milestone_type: 'debt_free',
        target_value: 0,
        xp_reward: 3000,
        gold_reward: 1500,
        badge_icon: '🦅',
        badge_color: '#FFD700',
        rarity: 'legendary',
        order_index: 10
      },
      // Streak
      {
        title: 'Disciplina Semanal',
        description: 'Mantenha 7 dias de streak',
        milestone_type: 'streak',
        target_value: 7,
        xp_reward: 300,
        gold_reward: 150,
        badge_icon: '🔥',
        badge_color: '#ef4444',
        rarity: 'common',
        order_index: 11
      },
      {
        title: 'Disciplina Mensal',
        description: 'Mantenha 30 dias de streak',
        milestone_type: 'streak',
        target_value: 30,
        xp_reward: 1000,
        gold_reward: 500,
        badge_icon: '⚡',
        badge_color: '#f59e0b',
        rarity: 'rare',
        order_index: 12
      },
      {
        title: 'Disciplina Lendária',
        description: 'Mantenha 100 dias de streak',
        milestone_type: 'streak',
        target_value: 100,
        xp_reward: 5000,
        gold_reward: 2500,
        badge_icon: '💫',
        badge_color: '#FFD700',
        rarity: 'legendary',
        order_index: 13
      }
    ];

    // Criar missões diárias e semanais (verificar duplicatas por título)
    for (const dm of dailyMissions) {
      const existing = await base44.asServiceRole.entities.DailyMission.filter({ title: dm.title });
      if (existing.length === 0) {
        await base44.asServiceRole.entities.DailyMission.create(dm);
      }
    }

    for (const wm of weeklyMissions) {
      const existing = await base44.asServiceRole.entities.DailyMission.filter({ title: wm.title });
      if (existing.length === 0) {
        await base44.asServiceRole.entities.DailyMission.create(wm);
      }
    }

    // Criar marcos financeiros (verificar duplicatas por título)
    for (const milestone of milestones) {
      const existing = await base44.asServiceRole.entities.FinancialMilestone.filter({ title: milestone.title });
      if (existing.length === 0) {
        await base44.asServiceRole.entities.FinancialMilestone.create(milestone);
      }
    }

    return Response.json({
      success: true,
      message: `Sistema completo criado com sucesso!`,
      tiers_created: 3,
      missions_created: missions.length,
      daily_missions: dailyMissions.length,
      weekly_missions: weeklyMissions.length,
      milestones: milestones.length
    });

  } catch (error) {
    console.error('Error seeding missions:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Initialize Season
 * Cria uma nova temporada de Battle Pass com missões
 * Pode ser chamado manualmente ou automaticamente
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Service role para criar dados do sistema
    const { season_number } = await req.json();
    const seasonNum = season_number || 1;

    // 1. VERIFICAR SE JÁ EXISTE TEMPORADA ATIVA
    const activeSeasons = await base44.asServiceRole.entities.Season.filter({ 
      status: 'active' 
    });

    if (activeSeasons.length > 0) {
      return Response.json({
        success: false,
        message: 'Já existe uma temporada ativa',
        current_season: activeSeasons[0]
      });
    }

    // 2. CRIAR NOVA TEMPORADA (3 meses de duração)
    const now = new Date();
    const endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() + 3);

    const seasonThemes = [
      { name: 'A Jornada Começa', theme: 'Despertar Financeiro', color: '#00FFFF' },
      { name: 'Fortaleza Dourada', theme: 'Construção de Riqueza', color: '#FFD700' },
      { name: 'Reino dos Sábios', theme: 'Maestria Financeira', color: '#9D4EDD' },
      { name: 'Era dos Titãs', theme: 'Poder e Legado', color: '#FF006E' },
      { name: 'Ascensão Eterna', theme: 'Liberdade Financeira', color: '#00FF41' }
    ];

    const themeIndex = (seasonNum - 1) % seasonThemes.length;
    const theme = seasonThemes[themeIndex];

    const season = await base44.asServiceRole.entities.Season.create({
      name: `Temporada ${seasonNum}: ${theme.name}`,
      season_number: seasonNum,
      start_date: now.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      status: 'active',
      theme: theme.theme,
      theme_color: theme.color,
      rewards_summary: `Recompensas exclusivas da ${theme.name}`
    });

    // 3. CRIAR OS 3 TIERS
    const tier1 = await base44.asServiceRole.entities.MissionTier.create({
      name: 'Nível 1: O Despertar',
      order_index: 1,
      min_net_worth_required: 0,
      tier_icon: '🌅',
      description: 'Organize suas finanças e dê o primeiro passo na jornada',
      color: '#00FFFF'
    });

    const tier2 = await base44.asServiceRole.entities.MissionTier.create({
      name: 'Nível 2: A Muralha',
      order_index: 2,
      min_net_worth_required: 500,
      tier_icon: '🛡️',
      description: 'Construa sua defesa financeira com poupança e segurança',
      color: '#8B4513'
    });

    const tier3 = await base44.asServiceRole.entities.MissionTier.create({
      name: 'Nível 3: A Conquista',
      order_index: 3,
      min_net_worth_required: 2000,
      tier_icon: '👑',
      description: 'Domine o reino dos investimentos e multiplique sua riqueza',
      color: '#FFD700'
    });

    // 4. CRIAR MISSÕES DO TIER 1
    const mission1A = await base44.asServiceRole.entities.MissionDefinition.create({
      title: 'Conexão Inicial',
      description: 'Importe o seu primeiro extrato bancário ou conecte uma conta',
      xp_reward: 100,
      gold_reward: 50,
      tier_id: tier1.id,
      difficulty: 'easy',
      trigger_type: 'transaction_import',
      verification_logic: { target_value: 1 },
      order_in_tier: 1,
      badge_icon: '🔗',
      is_active: true
    });

    const mission1B = await base44.asServiceRole.entities.MissionDefinition.create({
      title: 'O Primeiro Corte',
      description: 'Categorize 5 transações e comece a organizar suas finanças',
      xp_reward: 150,
      gold_reward: 20,
      tier_id: tier1.id,
      difficulty: 'easy',
      trigger_type: 'manual_action',
      verification_logic: { target_value: 5, action: 'categorize' },
      order_in_tier: 2,
      badge_icon: '✂️',
      required_missions: [mission1A.id],
      is_active: true
    });

    const mission1C = await base44.asServiceRole.entities.MissionDefinition.create({
      title: 'Visão Completa',
      description: 'Registre pelo menos 10 transações para ter uma visão clara do seu fluxo financeiro',
      xp_reward: 200,
      gold_reward: 30,
      tier_id: tier1.id,
      difficulty: 'easy',
      trigger_type: 'transaction_import',
      verification_logic: { target_value: 10 },
      order_in_tier: 3,
      badge_icon: '👁️',
      required_missions: [mission1B.id],
      is_active: true
    });

    // 5. CRIAR MISSÕES DO TIER 2
    const mission2A = await base44.asServiceRole.entities.MissionDefinition.create({
      title: 'Escudo de Bronze',
      description: 'Tenha um saldo positivo acumulado de pelo menos R$ 500',
      xp_reward: 300,
      gold_reward: 100,
      tier_id: tier2.id,
      difficulty: 'medium',
      trigger_type: 'balance_check',
      verification_logic: { target_value: 500 },
      order_in_tier: 1,
      badge_icon: '🛡️',
      required_missions: [mission1C.id],
      is_active: true
    });

    const mission2B = await base44.asServiceRole.entities.MissionDefinition.create({
      title: 'Caçador de Dívidas',
      description: 'Reduza o seu passivo total em pelo menos 5% comparado ao início',
      xp_reward: 500,
      gold_reward: 150,
      tier_id: tier2.id,
      difficulty: 'hard',
      trigger_type: 'debt_reduction',
      verification_logic: { target_value: 5 },
      order_in_tier: 2,
      badge_icon: '🎯',
      required_missions: [mission2A.id],
      is_active: true
    });

    const mission2C = await base44.asServiceRole.entities.MissionDefinition.create({
      title: 'Guardião da Poupança',
      description: 'Mantenha R$ 1000 em ativos de poupança ou investimento',
      xp_reward: 400,
      gold_reward: 120,
      tier_id: tier2.id,
      difficulty: 'medium',
      trigger_type: 'savings_target',
      verification_logic: { target_value: 1000 },
      order_in_tier: 3,
      badge_icon: '💰',
      required_missions: [mission2B.id],
      is_active: true
    });

    // 6. CRIAR MISSÕES DO TIER 3
    const mission3A = await base44.asServiceRole.entities.MissionDefinition.create({
      title: 'Investidor Iniciante',
      description: 'Atinja um patrimônio líquido de R$ 2000',
      xp_reward: 600,
      gold_reward: 200,
      tier_id: tier3.id,
      difficulty: 'medium',
      trigger_type: 'net_worth_milestone',
      verification_logic: { target_value: 2000 },
      order_in_tier: 1,
      badge_icon: '📈',
      required_missions: [mission2C.id],
      is_active: true
    });

    const mission3B = await base44.asServiceRole.entities.MissionDefinition.create({
      title: 'Mestre da Consistência',
      description: 'Mantenha uma sequência de login de 30 dias consecutivos',
      xp_reward: 800,
      gold_reward: 250,
      tier_id: tier3.id,
      difficulty: 'hard',
      trigger_type: 'streak_achievement',
      verification_logic: { target_value: 30 },
      order_in_tier: 2,
      badge_icon: '🔥',
      required_missions: [mission3A.id],
      is_active: true
    });

    const mission3C = await base44.asServiceRole.entities.MissionDefinition.create({
      title: 'Conquistador Supremo',
      description: 'Atinja um patrimônio líquido de R$ 5000 e torne-se um mestre financeiro',
      xp_reward: 1000,
      gold_reward: 500,
      tier_id: tier3.id,
      difficulty: 'legendary',
      trigger_type: 'net_worth_milestone',
      verification_logic: { target_value: 5000 },
      order_in_tier: 3,
      badge_icon: '👑',
      required_missions: [mission3B.id],
      is_active: true
    });

    return Response.json({
      success: true,
      season: season,
      tiers_created: 3,
      missions_created: 9,
      season_ends_in_days: Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)),
      message: `Temporada ${seasonNum} iniciada com sucesso! Termina em ${endDate.toLocaleDateString('pt-BR')}`
    });

  } catch (error) {
    console.error('Error initializing season:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verificar se já existem missões para este usuário
    const existingMissions = await base44.entities.Mission.filter({ 
      created_by: user.email,
      type: 'data_input'
    });

    if (existingMissions.length > 0) {
      return Response.json({ 
        success: false, 
        message: 'Missões já foram criadas para este usuário' 
      });
    }

    // TIER 1: O DESPERTAR (Organização e Primeiras Vitórias)
    const tier1Missions = [
      {
        title: 'O Primeiro Passo',
        description: 'Conecte uma conta bancária ou importe seu primeiro extrato',
        type: 'data_input',
        verification_type: 'auto_import',
        target_value: 1,
        xp_reward: 100,
        gold_reward: 20,
        difficulty: 'easy',
        tier: 1,
        order_index: 1,
        badge_icon: '🚀',
        status: 'active'
      },
      {
        title: 'Raio-X Financeiro',
        description: 'Registre pelo menos 10 transações no sistema',
        type: 'data_input',
        verification_type: 'auto_transaction_count',
        target_value: 10,
        xp_reward: 150,
        gold_reward: 30,
        difficulty: 'easy',
        tier: 1,
        order_index: 2,
        badge_icon: '📊',
        status: 'locked',
        required_mission_ids: []
      },
      {
        title: 'Poupador Iniciante',
        description: 'Acumule R$ 100,00 em contas de poupança ou investimento',
        type: 'savings_target',
        verification_type: 'auto_savings_balance',
        target_value: 100,
        xp_reward: 200,
        gold_reward: 50,
        difficulty: 'medium',
        tier: 1,
        order_index: 3,
        badge_icon: '💰',
        status: 'locked'
      }
    ];

    // TIER 2: A MURALHA (Proteção e Reserva)
    const tier2Missions = [
      {
        title: 'Escudo de Bronze',
        description: 'Atinja R$ 500,00 de patrimônio líquido positivo',
        type: 'net_worth_milestone',
        verification_type: 'auto_net_worth',
        target_value: 500,
        xp_reward: 300,
        gold_reward: 75,
        difficulty: 'medium',
        tier: 2,
        order_index: 4,
        badge_icon: '🛡️',
        status: 'locked'
      },
      {
        title: 'Caçador de Dívidas',
        description: 'Reduza suas dívidas em pelo menos 10%',
        type: 'debt_reduction',
        verification_type: 'auto_debt_reduction',
        target_value: 10,
        xp_reward: 400,
        gold_reward: 100,
        difficulty: 'hard',
        tier: 2,
        order_index: 5,
        badge_icon: '⚔️',
        status: 'locked'
      },
      {
        title: 'Guerreiro Constante',
        description: 'Mantenha uma sequência de 7 dias de login',
        type: 'category_discipline',
        verification_type: 'auto_streak',
        target_value: 7,
        xp_reward: 250,
        gold_reward: 60,
        difficulty: 'medium',
        tier: 2,
        order_index: 6,
        badge_icon: '🔥',
        status: 'locked'
      }
    ];

    // TIER 3: O INVESTIDOR (Multiplicação de Riqueza)
    const tier3Missions = [
      {
        title: 'Semente da Riqueza',
        description: 'Acumule R$ 1.000,00 em investimentos',
        type: 'savings_target',
        verification_type: 'auto_savings_balance',
        target_value: 1000,
        xp_reward: 500,
        gold_reward: 150,
        difficulty: 'hard',
        tier: 3,
        order_index: 7,
        badge_icon: '🌱',
        status: 'locked'
      },
      {
        title: 'Patrimônio em Ascensão',
        description: 'Alcance R$ 5.000,00 de patrimônio líquido',
        type: 'net_worth_milestone',
        verification_type: 'auto_net_worth',
        target_value: 5000,
        xp_reward: 1000,
        gold_reward: 300,
        difficulty: 'legendary',
        tier: 3,
        order_index: 8,
        badge_icon: '💎',
        status: 'locked'
      },
      {
        title: 'Liberdade Financeira',
        description: 'Elimine todas as suas dívidas (Patrimônio > 0 + 0 dívidas)',
        type: 'debt_reduction',
        verification_type: 'manual',
        target_value: 100,
        xp_reward: 2000,
        gold_reward: 500,
        difficulty: 'legendary',
        tier: 3,
        order_index: 9,
        badge_icon: '👑',
        status: 'locked'
      }
    ];

    // Criar todas as missões
    const allMissions = [...tier1Missions, ...tier2Missions, ...tier3Missions];
    const createdMissions = [];

    for (const mission of allMissions) {
      const created = await base44.entities.Mission.create(mission);
      createdMissions.push(created);
    }

    // Atualizar required_mission_ids para criar dependências
    if (createdMissions.length >= 2) {
      await base44.entities.Mission.update(createdMissions[1].id, {
        required_mission_ids: [createdMissions[0].id]
      });
    }
    
    if (createdMissions.length >= 3) {
      await base44.entities.Mission.update(createdMissions[2].id, {
        required_mission_ids: [createdMissions[1].id]
      });
    }

    return Response.json({
      success: true,
      message: `${createdMissions.length} missões do Battle Pass criadas com sucesso!`,
      missions: createdMissions
    });

  } catch (error) {
    console.error('Error seeding battle pass:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Setup Initial Missions for User
 * Cria os registros de progresso de missões quando um novo usuário entra no sistema
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verificar se já existem missões para este usuário
    const existingProgress = await base44.asServiceRole.entities.UserMissionProgress.filter({
      user_email: user.email
    });

    if (existingProgress.length > 0) {
      return Response.json({
        success: false,
        message: 'Usuário já possui missões inicializadas',
        count: existingProgress.length
      });
    }

    // Buscar todos os tiers ordenados
    const tiers = await base44.asServiceRole.entities.MissionTier.list('order_index');
    
    if (tiers.length === 0) {
      return Response.json({
        success: false,
        error: 'Nenhum tier encontrado. Configure os tiers primeiro.'
      }, { status: 400 });
    }

    // Buscar todas as definições de missões ativas
    const allMissionDefs = await base44.asServiceRole.entities.MissionDefinition.filter({
      is_active: true
    });

    // Agrupar por tier
    const missionsByTier = {};
    for (const mission of allMissionDefs) {
      if (!missionsByTier[mission.tier_id]) {
        missionsByTier[mission.tier_id] = [];
      }
      missionsByTier[mission.tier_id].push(mission);
    }

    // Ordenar missões dentro de cada tier
    for (const tierId in missionsByTier) {
      missionsByTier[tierId].sort((a, b) => (a.order_in_tier || 0) - (b.order_in_tier || 0));
    }

    const progressRecords = [];

    // Para cada tier
    for (let i = 0; i < tiers.length; i++) {
      const tier = tiers[i];
      const tierMissions = missionsByTier[tier.id] || [];

      for (let j = 0; j < tierMissions.length; j++) {
        const mission = tierMissions[j];
        
        // Primeira missão do primeiro tier começa ACTIVE
        // Todas as outras começam LOCKED
        const isFirstMission = (i === 0 && j === 0);
        const status = isFirstMission ? 'active' : 'locked';

        const progressRecord = {
          user_email: user.email,
          mission_definition_id: mission.id,
          status: status,
          current_value: 0,
          target_value: mission.verification_logic?.target_value || 
                        mission.verification_logic?.target_amount || 
                        0,
          started_at: isFirstMission ? new Date().toISOString() : null
        };

        progressRecords.push(progressRecord);
      }
    }

    // Criar todos os registros de progresso
    const created = [];
    for (const record of progressRecords) {
      const result = await base44.asServiceRole.entities.UserMissionProgress.create(record);
      created.push(result);
    }

    return Response.json({
      success: true,
      message: `${created.length} missões inicializadas com sucesso`,
      tiers: tiers.length,
      missions_per_tier: Object.keys(missionsByTier).map(tierId => ({
        tier_id: tierId,
        count: missionsByTier[tierId].length
      })),
      first_active_mission: created.find(r => r.status === 'active')
    });

  } catch (error) {
    console.error('Error setting up initial missions:', error);
    return Response.json({ 
      success: false,
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});
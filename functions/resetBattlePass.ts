import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Reset Battle Pass
 * Reseta completamente o Battle Pass do usuário e reinicia a Season
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. DELETAR TODAS AS MISSÕES DO USUÁRIO
    const userMissions = await base44.entities.Mission.filter({ 
      created_by: user.email 
    });
    
    for (const mission of userMissions) {
      await base44.entities.Mission.delete(mission.id);
    }

    // 2. RESETAR SEASON - deletar season ativa e criar nova
    const activeSeasons = await base44.asServiceRole.entities.Season.filter({ 
      status: 'active' 
    });

    for (const season of activeSeasons) {
      await base44.asServiceRole.entities.Season.delete(season.id);
    }

    // 3. CRIAR NOVA SEASON (3 meses)
    const now = new Date();
    const endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() + 3);

    const newSeason = await base44.asServiceRole.entities.Season.create({
      name: 'Temporada 1: A Jornada Começa',
      season_number: 1,
      start_date: now.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      status: 'active',
      theme: 'Despertar Financeiro',
      theme_color: '#00FFFF',
      rewards_summary: 'Recompensas exclusivas da Jornada Inicial'
    });

    // 4. GERAR 30 NOVAS MISSÕES
    const response = await base44.functions.invoke('generatePersonalizedMissions', { 
      reset_mode: true 
    });

    return Response.json({
      success: true,
      missions_deleted: userMissions.length,
      new_season: newSeason,
      missions_created: response.data?.count || 0,
      season_ends_in_days: Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)),
      message: `Battle Pass resetado! Nova temporada termina em ${endDate.toLocaleDateString('pt-BR')}`
    });

  } catch (error) {
    console.error('Error resetting battle pass:', error);
    return Response.json({ 
      success: false,
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});
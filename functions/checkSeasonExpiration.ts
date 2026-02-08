import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Check Season Expiration
 * Verifica se a temporada atual expirou e cria uma nova automaticamente
 * Deve ser chamado periodicamente (ex: diariamente)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const now = new Date();

    // 1. BUSCAR TEMPORADA ATIVA
    const activeSeasons = await base44.asServiceRole.entities.Season.filter({ 
      status: 'active' 
    });

    if (activeSeasons.length === 0) {
      return Response.json({
        success: true,
        message: 'Nenhuma temporada ativa encontrada',
        action: 'none'
      });
    }

    const currentSeason = activeSeasons[0];
    const endDate = new Date(currentSeason.end_date);
    const daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));

    // 2. SE EXPIROU, ENCERRAR E CRIAR NOVA
    if (now >= endDate) {
      // Marcar temporada como encerrada
      await base44.asServiceRole.entities.Season.update(currentSeason.id, {
        status: 'ended'
      });

      // Desativar todas as missões antigas
      const oldMissions = await base44.asServiceRole.entities.MissionDefinition.filter({
        is_active: true
      });

      for (const mission of oldMissions) {
        await base44.asServiceRole.entities.MissionDefinition.update(mission.id, {
          is_active: false
        });
      }

      // Criar nova temporada automaticamente
      const newSeasonNumber = currentSeason.season_number + 1;
      
      // Chamar a função de inicialização
      const initResponse = await fetch(`${req.url.split('/checkSeasonExpiration')[0]}/initializeSeason`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ season_number: newSeasonNumber })
      });

      const initData = await initResponse.json();

      return Response.json({
        success: true,
        action: 'season_renewed',
        old_season: currentSeason,
        new_season: initData.season,
        message: `Temporada ${currentSeason.season_number} encerrada. Nova temporada ${newSeasonNumber} iniciada!`
      });
    }

    // 3. AINDA ATIVA
    return Response.json({
      success: true,
      action: 'none',
      current_season: currentSeason,
      days_remaining: daysRemaining,
      message: `Temporada ${currentSeason.season_number} ainda ativa. Faltam ${daysRemaining} dias.`
    });

  } catch (error) {
    console.error('Error checking season expiration:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { question } = payload;

    if (!question) {
      return Response.json({ error: 'Question required' }, { status: 400 });
    }

    // Check cache first (questions respostas dentro de 24h são iguais)
    let profiles = await base44.entities.User.filter({ email: user.email });
    const profile = profiles?.[0];

    const questionCache = profile?.question_cache || {};
    const cacheKey = question.toLowerCase().substring(0, 50);

    if (questionCache[cacheKey] && questionCache[cacheKey].timestamp) {
      const cacheAge = (new Date() - new Date(questionCache[cacheKey].timestamp)) / (1000 * 60 * 60);
      if (cacheAge < 24) {
        return Response.json({
          success: true,
          answer: questionCache[cacheKey].answer,
          cached: true
        });
      }
    }

    // === KNOWLEDGE BASE LOCAL (SEM IA) ===
    const knowledgeBase = {
      // GAMIFICAÇÃO
      'como funciona pontos': 'Jovem buscador, cada ação sua ressoa no Reino! Ganhe +10 XP por transação e +50 por meta batida. Junte 100 XP para subir de nível!',
      'como ganhar badges': 'Conquiste Emblemas Lendários cumprindo missões diárias e dominando a Academy. Eles são sua prova de honra financeira!',
      'como sou no ranking': 'Sua posição no Grande Hall depende dos seus Pontos de Glória. Use o comando "Ranking" para ver quem lidera o reino!',

      // FINANÇAS BÁSICAS
      'o que é dre': 'O DRE é seu Mapa de Batalha mensal: Receitas vs Despesas. Se o saldo for positivo, seu reinado prospera!',
      'o que é balanço': 'O Balanço é seu Tesouro Real: Ativos (seus artefatos) menos Passivos (suas maldições/dívidas). O que sobra é seu Valor Real.',
      'como economizar': 'Rastreie cada moeda que sai da bolsa (use "Gasto X"). Tape os Vazamentos de Mana e acumule ouro para metas maiores!',

      // ACADEMY
      'como funciona academy': 'A Academy é onde você treina sua mente. Receba uma técnica milenar por dia e ganhe +30 XP ao dominá-la!',
    };

    // Buscar resposta na base de conhecimento
    let answer = null;
    const lowerQuestion = question.toLowerCase();
    for (const [key, value] of Object.entries(knowledgeBase)) {
      if (lowerQuestion.includes(key)) {
        answer = value;
        break;
      }
    }

    // Se não encontrou, usar IA (Persona Sir Coin)
    if (!answer) {
      // Fetch dados para contexto épico
      const transactions = await base44.entities.FinTransaction.filter({ created_by: user.email }, '-created_date', 15);
      const budgets = await base44.entities.Budget.filter({ created_by: user.email });
      const goals = await base44.entities.Goal.filter({ created_by: user.email });

      const contextStr = `
        Jogador: ${user.name}
        Transações Recentes: ${transactions.length}
        Orçamentos Ativos: ${budgets.length}
        Metas Lendárias: ${goals.length}
      `;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Você é o Sir Coin, o lendário mentor financeiro de um mundo RPG Cyberpunk. 
          Responda ao jogador com sabedoria, usando um tom épico e encorajador.
          Use termos como "Mana" para dinheiro, "Missão" para metas e "Guerreiro" para o usuário.
          Seja breve (máximo 3 frases).

          CONTEXTO DO REINO:
          ${contextStr}

          PERGUNTA DO JOGADOR:
          "${question}"`,
        system_prompt: "Você é o Sir Coin, um sábio mestre de economia comportamental em um contexto RPG. Sua missão é guiar o usuário para a prosperidade financeira com metáforas épicas e conselhos práticos.",
        add_context_from_internet: false
      });

      answer = response;

      // Cache a resposta
      questionCache[cacheKey] = {
        answer,
        timestamp: new Date().toISOString()
      };

      await base44.auth.updateMe({ question_cache: questionCache });
    }

    return Response.json({
      success: true,
      answer,
      cached: false
    });
  } catch (error) {
    console.error('Sir Coin error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
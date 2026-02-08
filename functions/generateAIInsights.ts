import { createClientFromRequest } from './local_sdk.ts';

Deno.serve(async (req) => {
  try {
    const base44 = await createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profiles = await base44.entities.User.filter({ email: user.email });
    const profile = profiles?.[0];

    if (!profile) {
      return Response.json({ error: 'Profile not found' }, { status: 404 });
    }

    const lastInsightTime = profile.last_ai_insight_at ? new Date(profile.last_ai_insight_at) : null;
    const now = new Date();
    const hoursSinceLastInsight = lastInsightTime ? (now.getTime() - lastInsightTime.getTime()) / (1000 * 60 * 60) : 24;

    if (hoursSinceLastInsight < 1 && profile.cached_ai_insights) {
      return Response.json({ success: true, insights: profile.cached_ai_insights, cached: true });
    }

    const transactions = await base44.entities.FinTransaction.filter({ created_by: user.email });
    const goals = await base44.entities.Goal.filter({ created_by: user.email });

    const isTransfer = (category: string) => {
      const cat = (category || '').toLowerCase();
      return cat.includes('transfer') || cat.includes('resgate') || cat.includes('pix');
    };

    const now30 = new Date();
    now30.setDate(now30.getDate() - 30);
    const recent30 = transactions.filter(t => new Date(t.date) >= now30 && !isTransfer(t.category));

    const expenses30 = recent30.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.value, 0);
    const income30 = recent30.filter(t => t.type === 'income').reduce((sum, t) => sum + t.value, 0);

    const categorySpending: Record<string, number> = {};
    recent30.filter(t => t.type === 'expense').forEach(t => {
      categorySpending[t.category] = (categorySpending[t.category] || 0) + Number(t.value);
    });

    const topCategories = Object.entries(categorySpending)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([cat, val]) => ({ category: cat, spent: val }));

    const summary = {
      topCategories,
      income30,
      expenses30,
      netResult: income30 - expenses30,
      goals: goals.map(g => ({ name: g.name, progress: `${((Number(g.current_amount) / Number(g.target_amount)) * 100).toFixed(1)}%` }))
    };

    const prompt = `
    Você é o Sir Coin, um mentor financeiro em um mundo Cyberpunk RPG. 
    Analise os seguintes dados do herói e forneça exatamente 3 insights táticos e 1 sugestão de missão.
    Use um tom sério, futurista e motivador.
    
    DADOS:
    ${JSON.stringify(summary, null, 2)}
    
    FORMATO DE RETORNO (JSON APENAS):
    [
      { "type": "overspending", "category": "nome", "recommendation": "texto" },
      { "type": "projection", "recommendation": "texto" },
      { "type": "goal_opportunity", "recommendation": "texto" },
      { "type": "mission_suggestion", "title": "Missão", "description": "texto", "points": 50 }
    ]
    `;

    let insights = [];
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    let aiEngine = "Groq (Cloud)";

    try {
      if (GROQ_API_KEY) {
        // Groq Cloud Implementation
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${GROQ_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" }
          })
        });
        const data = await response.json();
        const content = data.choices[0].message.content;
        const parsed = JSON.parse(content);
        insights = Array.isArray(parsed) ? parsed : (parsed.insights || Object.values(parsed)[0]);
      } else {
        // Fallback to local Ollama
        aiEngine = "Ollama (Local)";
        const ollamaResponse = await fetch('http://localhost:11434/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'llama3', prompt: prompt, stream: false, format: 'json' })
        });
        const result = await ollamaResponse.json();
        insights = JSON.parse(result.response);
      }
    } catch (llmError) {
      console.warn('AI Engine Offline, using Fallback:', llmError);
      aiEngine = "Rule-based Fallback";
      insights = [
        { type: 'overspending', category: topCategories[0]?.category || 'Geral', recommendation: 'Zonas de despesa crítica detectadas. Reduza consumo de energia/créditos.' },
        { type: 'projection', recommendation: `Mantenha seu saldo de R$ ${summary.netResult} para evitar falha no sistema.` }
      ];
    }

    await base44.entities.User.update(profile.id, {
      cached_ai_insights: insights,
      last_ai_insight_at: new Date().toISOString()
    });

    return Response.json({ success: true, insights, ai_engine: aiEngine });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
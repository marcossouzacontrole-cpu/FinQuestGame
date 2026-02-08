import { base44 } from './base44Client';

/**
 * AIGuidanceService - Centraliza as chamadas de Inteligência Artificial do "Sir Coin"
 * para fornecer orientações estratégicas contextuais baseadas em RPG.
 */
export const AIGuidanceService = {
    /**
     * Fornece conselhos estratégicos para uma categoria específica de orçamento.
     */
    getBudgetGuidance: async (categoryName, budget, spent, transactions = []) => {
        const context = `
      Categoria: "${categoryName}"
      Orçamento Alocado (Mana): R$ ${budget}
      Gasto Atual: R$ ${spent}
      Progresso: ${((spent / (budget || 1)) * 100).toFixed(1)}%
      Transações Recentes: ${JSON.stringify(transactions.slice(0, 3))}
    `;

        const prompt = `
      Você é o Sir Coin, um mentor financeiro lendário em um mundo RPG Cyberpunk.
      O jogador está visualizando seu "Orçamento de Batalha".
      
      Contexto da Categoria:
      ${context}
      
      Objetivo: Dê um conselho curto (máximo 2 parágrafos), épico e extremamente prático para o jogador economizar ou otimizar essa categoria. 
      Use metáforas de RPG (mana, poções, escudos, monstros) mas mantenha o valor financeiro claro.
      Responda em PORTUGUÊS (BRASIL).
    `;

        try {
            const response = await base44.integrations.Core.InvokeLLM({ prompt });
            return response;
        } catch (error) {
            console.error('Erro ao buscar orientação de IA:', error);
            return "Sir Coin está meditando no momento. Tente novamente mais tarde, jovem buscador.";
        }
    },

    /**
     * Realiza uma análise completa dos orçamentos e gastos reais para o painel de orçamentos.
     */
    performFullAnalysis: async (currentBudgets, avgSpendingByCategory) => {
        const prompt = `
      Analise os orçamentos e gastos reais do usuário e sugira melhorias para o FinQuest:

      ORÇAMENTOS ATUAIS:
      ${currentBudgets.map(b => `- ${b.name}: R$ ${b.current_budget.toFixed(2)}/mês (Tipo: ${b.expense_type})`).join('\n')}

      GASTOS REAIS (Últimos 90 dias - Média Mensal):
      ${avgSpendingByCategory.map(s => `- ${s.name}: R$ ${s.avgMonthly.toFixed(2)}`).join('\n')}

      TAREFA:
      1. Compare orçamentos com gastos reais.
      2. Identifique categorias com orçamento desequilibrado.
      3. Sugira ajustes específicos e novas categorias.
      4. Dê insights estratégicos no tom do Sir Coin (RPG).

      Retorne em JSON seguindo rigorosamente o esquema.
    `;

        try {
            const response = await base44.integrations.Core.InvokeLLM({
                prompt,
                response_json_schema: {
                    type: "object",
                    properties: {
                        adjustments: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    category: { type: "string" },
                                    current_budget: { type: "number" },
                                    suggested_budget: { type: "number" },
                                    reason: { type: "string" },
                                    priority: { type: "string" }
                                }
                            }
                        },
                        new_categories: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    name: { type: "string" },
                                    suggested_budget: { type: "number" },
                                    expense_type: { type: "string" },
                                    reason: { type: "string" }
                                }
                            }
                        },
                        insights: { type: "array", items: { type: "string" } },
                        total_savings_potential: { type: "number" }
                    }
                }
            });
            return response;
        } catch (error) {
            console.error('Erro na análise completa de IA:', error);
            throw error;
        }
    },

    /**
     * Gera um relatório de inteligência comportamental baseado nas transações.
     */
    getBehavioralReport: async (transactions) => {
        const summary = transactions.slice(0, 30).map(t => `${t.date}: ${t.description} (R$ ${t.value}, ${t.type}, ${t.category})`).join('\n');

        const prompt = `Você é o Arquivista Neural (Sir Coin) do FinQuest. Analise o comportamento financeiro do usuário.
      
      TRANSAÇÕES RECENTES:
      ${summary || 'Nenhuma transação registrada.'}
      
      OBJETIVO:
      Forneça um relatório de inteligência JSON com:
      1. "personality": O arquétipo do usuário (ex: "Guerreiro Impulsivo", "Curandeiro Cauteloso", "Mago da Economia").
      2. "findings": 3 observações sobre padrões.
      3. "manaLeaks": Gastos desnecessários (vazamentos de mana).
      4. "strategicMove": Ação para a próxima semana.`;

        try {
            const response = await base44.integrations.Core.InvokeLLM({
                prompt,
                system_prompt: "Você é uma inteligência artificial analítica de um futuro cyberpunk especializado em economia comportamental.",
                response_json_schema: {
                    type: "object",
                    properties: {
                        personality: { type: "string" },
                        findings: { type: "array", items: { type: "string" } },
                        manaLeaks: { type: "array", items: { type: "string" } },
                        strategicMove: { type: "string" }
                    }
                }
            });
            return response;
        } catch (error) {
            console.error('Erro no relatório comportamental:', error);
            throw error;
        }
    },

    /**
     * Fornece insights sobre o Patrimônio Líquido e metas de longo prazo.
     */
    getStrategicAdvice: async (netWorth, components = {}) => {
        const prompt = `
      Sir Coin analisando o "Poder de Batalha" (Patrimônio Líquido) do jogador: R$ ${netWorth}.
      Composição: ${JSON.stringify(components)}
      
      Dê uma orientação estratégica de longo prazo para fortalecer esse patrimônio. 
      Seja inspirador e técnico ao mesmo tempo.
      Responda em PORTUGUÊS (BRASIL).
    `;

        try {
            const response = await base44.integrations.Core.InvokeLLM({ prompt });
            return response;
        } catch (error) {
            console.error('Erro ao buscar conselho estratégico:', error);
            return "As estrelas financeiras estão nubladas. Continue sua jornada e pergunte novamente em breve.";
        }
    }
};

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    const body = await req.json().catch(() => ({}));

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. HARD RESET: Se solicitado, limpa a sujeira anterior para garantir geração limpa
    if (body.reset_mode) {
      const userMissions = await base44.entities.Mission.filter({ 
        created_by: user.email 
      });
      
      // Deleta em lotes para evitar timeout se houver muitas
      for (const mission of userMissions) {
        await base44.entities.Mission.delete(mission.id);
      }
    } else {
      // Fallback: Check simples se não for reset mode
      const existing = await base44.entities.Mission.filter({ created_by: user.email });
      if (existing.length > 0) {
        return Response.json({ success: false, message: 'Missões já existem e reset_mode não foi solicitado.' });
      }
    }

    // 2. DEFINIÇÃO DOS TIERS - MISSÕES MAIS DESAFIADORAS (30 missões)
    const missionsConfig = [
      // TIER 1 - O DESPERTAR (10 missões) - Foco em registro e primeiras economias
      { title: 'O Primeiro Passo', description: 'Conecte uma conta bancária ou importe seu primeiro extrato', type: 'data_input', verification_type: 'auto_import', target_value: 1, xp_reward: 100, gold_reward: 20, difficulty: 'easy', tier: 1, order_index: 1, badge_icon: '🚀', status: 'active' },
      { title: 'Raio-X Financeiro', description: 'Registre pelo menos 15 transações para mapear seus gastos', type: 'data_input', verification_type: 'auto_transaction_count', target_value: 15, xp_reward: 120, gold_reward: 25, difficulty: 'easy', tier: 1, order_index: 2, badge_icon: '📊', status: 'active' },
      { title: 'Controle Ativo', description: 'Registre pelo menos 30 transações no sistema', type: 'data_input', verification_type: 'auto_transaction_count', target_value: 30, xp_reward: 150, gold_reward: 30, difficulty: 'medium', tier: 1, order_index: 3, badge_icon: '📈', status: 'active' },
      { title: 'Primeira Reserva', description: 'Acumule R$ 200,00 em contas de poupança ou investimento', type: 'savings_target', verification_type: 'auto_savings_balance', target_value: 200, xp_reward: 180, gold_reward: 35, difficulty: 'medium', tier: 1, order_index: 4, badge_icon: '💵', status: 'active' },
      { title: 'Poupador Dedicado', description: 'Acumule R$ 500,00 em contas de poupança ou investimento', type: 'savings_target', verification_type: 'auto_savings_balance', target_value: 500, xp_reward: 250, gold_reward: 50, difficulty: 'medium', tier: 1, order_index: 5, badge_icon: '💰', status: 'active' },
      { title: 'Patrimônio Base', description: 'Atinja R$ 500,00 de patrimônio líquido positivo', type: 'net_worth_milestone', verification_type: 'auto_net_worth', target_value: 500, xp_reward: 250, gold_reward: 55, difficulty: 'medium', tier: 1, order_index: 6, badge_icon: '🏦', status: 'active' },
      { title: 'Analista Persistente', description: 'Registre pelo menos 50 transações no sistema', type: 'data_input', verification_type: 'auto_transaction_count', target_value: 50, xp_reward: 220, gold_reward: 45, difficulty: 'medium', tier: 1, order_index: 7, badge_icon: '📝', status: 'active' },
      { title: 'Fundo Inicial', description: 'Acumule R$ 800,00 em contas de poupança ou investimento', type: 'savings_target', verification_type: 'auto_savings_balance', target_value: 800, xp_reward: 300, gold_reward: 65, difficulty: 'medium', tier: 1, order_index: 8, badge_icon: '🏛️', status: 'active' },
      { title: 'Patrimônio Consolidado', description: 'Atinja R$ 1.000,00 de patrimônio líquido positivo', type: 'net_worth_milestone', verification_type: 'auto_net_worth', target_value: 1000, xp_reward: 320, gold_reward: 70, difficulty: 'hard', tier: 1, order_index: 9, badge_icon: '💎', status: 'active' },
      { title: 'Mestre do Registro', description: 'Registre pelo menos 75 transações no sistema', type: 'data_input', verification_type: 'auto_transaction_count', target_value: 75, xp_reward: 350, gold_reward: 80, difficulty: 'hard', tier: 1, order_index: 10, badge_icon: '🎯', status: 'active' },

      // TIER 2 - A PROVAÇÃO (10 missões) - Crescimento patrimonial e redução de dívidas
      { title: 'Escudo de Bronze', description: 'Atinja R$ 1.500,00 de patrimônio líquido positivo', type: 'net_worth_milestone', verification_type: 'auto_net_worth', target_value: 1500, xp_reward: 400, gold_reward: 90, difficulty: 'hard', tier: 2, order_index: 11, badge_icon: '🛡️', status: 'active' },
      { title: 'Reserva Sólida', description: 'Acumule R$ 1.200,00 em contas de poupança ou investimento', type: 'savings_target', verification_type: 'auto_savings_balance', target_value: 1200, xp_reward: 420, gold_reward: 95, difficulty: 'hard', tier: 2, order_index: 12, badge_icon: '💸', status: 'active' },
      { title: 'Primeiro Golpe', description: 'Reduza suas dívidas em pelo menos 10%', type: 'debt_reduction', verification_type: 'auto_debt_reduction', target_value: 10, xp_reward: 380, gold_reward: 85, difficulty: 'hard', tier: 2, order_index: 13, badge_icon: '⚡', status: 'active' },
      { title: 'Investidor Comprometido', description: 'Acumule R$ 2.000,00 em contas de poupança ou investimento', type: 'savings_target', verification_type: 'auto_savings_balance', target_value: 2000, xp_reward: 500, gold_reward: 110, difficulty: 'hard', tier: 2, order_index: 14, badge_icon: '📈', status: 'active' },
      { title: 'Patrimônio Avançado', description: 'Atinja R$ 2.500,00 de patrimônio líquido positivo', type: 'net_worth_milestone', verification_type: 'auto_net_worth', target_value: 2500, xp_reward: 550, gold_reward: 120, difficulty: 'hard', tier: 2, order_index: 15, badge_icon: '🏰', status: 'active' },
      { title: 'Caçador Implacável', description: 'Reduza suas dívidas em pelo menos 20%', type: 'debt_reduction', verification_type: 'auto_debt_reduction', target_value: 20, xp_reward: 520, gold_reward: 115, difficulty: 'hard', tier: 2, order_index: 16, badge_icon: '⚔️', status: 'active' },
      { title: 'Capital Crescente', description: 'Acumule R$ 3.000,00 em contas de poupança ou investimento', type: 'savings_target', verification_type: 'auto_savings_balance', target_value: 3000, xp_reward: 600, gold_reward: 135, difficulty: 'hard', tier: 2, order_index: 17, badge_icon: '💼', status: 'active' },
      { title: 'Patrimônio Robusto', description: 'Atinja R$ 3.500,00 de patrimônio líquido positivo', type: 'net_worth_milestone', verification_type: 'auto_net_worth', target_value: 3500, xp_reward: 650, gold_reward: 145, difficulty: 'hard', tier: 2, order_index: 18, badge_icon: '🏆', status: 'active' },
      { title: 'Exterminador de Dívidas', description: 'Reduza suas dívidas em pelo menos 30%', type: 'debt_reduction', verification_type: 'auto_debt_reduction', target_value: 30, xp_reward: 700, gold_reward: 150, difficulty: 'legendary', tier: 2, order_index: 19, badge_icon: '🗡️', status: 'active' },
      { title: 'Escudo de Prata', description: 'Atinja R$ 5.000,00 de patrimônio líquido positivo', type: 'net_worth_milestone', verification_type: 'auto_net_worth', target_value: 5000, xp_reward: 750, gold_reward: 160, difficulty: 'legendary', tier: 2, order_index: 20, badge_icon: '🛡️', status: 'active' },

      // TIER 3 - A GLÓRIA (10 missões) - Elite financeira e grandes conquistas
      { title: 'Investidor Elite', description: 'Acumule R$ 5.000,00 em investimentos', type: 'savings_target', verification_type: 'auto_savings_balance', target_value: 5000, xp_reward: 800, gold_reward: 180, difficulty: 'legendary', tier: 3, order_index: 21, badge_icon: '🌟', status: 'active' },
      { title: 'Patrimônio Sólido', description: 'Atinja R$ 7.500,00 de patrimônio líquido positivo', type: 'net_worth_milestone', verification_type: 'auto_net_worth', target_value: 7500, xp_reward: 900, gold_reward: 200, difficulty: 'legendary', tier: 3, order_index: 22, badge_icon: '💎', status: 'active' },
      { title: 'Libertador Total', description: 'Reduza suas dívidas em pelo menos 40%', type: 'debt_reduction', verification_type: 'auto_debt_reduction', target_value: 40, xp_reward: 850, gold_reward: 190, difficulty: 'legendary', tier: 3, order_index: 23, badge_icon: '🔓', status: 'active' },
      { title: 'Capital Substancial', description: 'Acumule R$ 8.000,00 em investimentos', type: 'savings_target', verification_type: 'auto_savings_balance', target_value: 8000, xp_reward: 1000, gold_reward: 220, difficulty: 'legendary', tier: 3, order_index: 24, badge_icon: '💼', status: 'active' },
      { title: 'Patrimônio de Ouro', description: 'Atinja R$ 10.000,00 de patrimônio líquido positivo', type: 'net_worth_milestone', verification_type: 'auto_net_worth', target_value: 10000, xp_reward: 1100, gold_reward: 240, difficulty: 'legendary', tier: 3, order_index: 25, badge_icon: '🥇', status: 'active' },
      { title: 'Erradicador Supremo', description: 'Reduza suas dívidas em pelo menos 50%', type: 'debt_reduction', verification_type: 'auto_debt_reduction', target_value: 50, xp_reward: 1050, gold_reward: 230, difficulty: 'legendary', tier: 3, order_index: 26, badge_icon: '💥', status: 'active' },
      { title: 'Fortuna Consolidada', description: 'Acumule R$ 12.000,00 em investimentos', type: 'savings_target', verification_type: 'auto_savings_balance', target_value: 12000, xp_reward: 1200, gold_reward: 270, difficulty: 'legendary', tier: 3, order_index: 27, badge_icon: '🏰', status: 'active' },
      { title: 'Titã Financeiro', description: 'Atinja R$ 15.000,00 de patrimônio líquido positivo', type: 'net_worth_milestone', verification_type: 'auto_net_worth', target_value: 15000, xp_reward: 1300, gold_reward: 290, difficulty: 'legendary', tier: 3, order_index: 28, badge_icon: '🏔️', status: 'active' },
      { title: 'Magnata Emergente', description: 'Acumule R$ 20.000,00 em investimentos', type: 'savings_target', verification_type: 'auto_savings_balance', target_value: 20000, xp_reward: 1500, gold_reward: 350, difficulty: 'legendary', tier: 3, order_index: 29, badge_icon: '👑', status: 'active' },
      { title: 'Lenda Imortal', description: 'Atinja R$ 25.000,00 de patrimônio líquido positivo', type: 'net_worth_milestone', verification_type: 'auto_net_worth', target_value: 25000, xp_reward: 2000, gold_reward: 500, difficulty: 'legendary', tier: 3, order_index: 30, badge_icon: '⭐', status: 'active' }
    ];

    // 3. EXECUÇÃO DA CRIAÇÃO
    const createdMissions = [];
    for (const mission of missionsConfig) {
      const created = await base44.entities.Mission.create(mission);
      createdMissions.push(created);
    }

    // 4. ENCADEAMENTO não é mais necessário - a lógica está no evaluateMissionTriggers

    return Response.json({
      success: true,
      count: createdMissions.length,
      message: 'Battle Pass regenerado com sucesso!'
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
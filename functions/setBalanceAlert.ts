import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { threshold_amount, alert_type = 'balance_below' } = await req.json();

    if (!threshold_amount) {
      return Response.json({ error: 'threshold_amount é obrigatório' }, { status: 400 });
    }

    // Salvar no perfil do usuário (User entity)
    await base44.auth.updateMe({
      balance_alert_threshold: parseFloat(threshold_amount),
      balance_alert_active: true
    });

    // Verificar condição atual
    const accounts = await base44.asServiceRole.entities.Account.filter({ 
      created_by: user.email 
    });

    const currentBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
    const alertTriggered = currentBalance < parseFloat(threshold_amount);

    return Response.json({
      success: true,
      alert_set: true,
      threshold: parseFloat(threshold_amount),
      current_balance: currentBalance,
      alert_triggered: alertTriggered,
      message: alertTriggered 
        ? `⚠️ ALERTA: Saldo abaixo de R$ ${threshold_amount}` 
        : `✅ Alerta configurado para R$ ${threshold_amount}`
    });

  } catch (error) {
    console.error('Erro ao configurar alerta:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
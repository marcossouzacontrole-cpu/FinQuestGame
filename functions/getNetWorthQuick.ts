import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [assets, debts, accounts] = await Promise.all([
      base44.asServiceRole.entities.Asset.filter({ created_by: user.email }),
      base44.asServiceRole.entities.Debt.filter({ created_by: user.email }),
      base44.asServiceRole.entities.Account.filter({ created_by: user.email })
    ]);

    const totalAssets = (assets || []).reduce((sum, a) => sum + (a.value || 0), 0);
    const totalDebts = (debts || []).reduce((sum, d) => sum + (d.outstanding_balance || 0), 0);
    const liquidBalance = (accounts || []).reduce((sum, acc) => sum + (acc.balance || 0), 0);

    const netWorth = totalAssets - totalDebts;

    return Response.json({
      success: true,
      net_worth: netWorth,
      total_assets: totalAssets,
      total_debts: totalDebts,
      liquid_balance: liquidBalance,
      debt_to_asset_ratio: totalAssets > 0 ? ((totalDebts / totalAssets) * 100).toFixed(1) : 0,
      health_score: netWorth > 0 ? 'positive' : 'negative'
    });

  } catch (error) {
    console.error('Erro ao calcular patrimônio:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
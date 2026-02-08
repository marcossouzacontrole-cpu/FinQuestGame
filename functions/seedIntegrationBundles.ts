import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete existing bundles first
    const existingBundles = await base44.asServiceRole.entities.IntegrationBundle.list();
    for (const bundle of existingBundles) {
      await base44.asServiceRole.entities.IntegrationBundle.delete(bundle.id);
    }

    const bundles = [
      {
        name: 'Automação Inteligente',
        description: 'Sincronize tudo automaticamente',
        category: 'automation',
        integrations: ['Gmail', 'Google Calendar', 'Slack'],
        price: 4.90,
        icon: '⚡',
        color: '#06b6d4',
        features: [
          'Importar faturas do Gmail',
          'Sincronizar com calendário',
          'Notificações no Slack'
        ]
      },
      {
        name: 'Análise de Dados',
        description: 'Relatórios avançados e análises',
        category: 'data',
        integrations: ['Google Sheets Pro', 'Notion Avançado'],
        price: 4.90,
        icon: '📊',
        color: '#10b981',
        features: [
          'Exportar em lote',
          'Relatórios customizados',
          'Análises automáticas'
        ]
      },

      {
        name: 'Suite Completa',
        description: 'Todas as integrações de uma vez',
        category: 'all',
        integrations: ['Gmail', 'Google Calendar', 'Google Sheets Pro', 'Notion Avançado', 'Slack', 'LinkedIn'],
        price: 9.90,
        icon: '🚀',
        color: '#f59e0b',
        features: [
          'Acesso total',
          'Sem limitações',
          'Suporte prioritário'
        ]
      }
    ];

    await base44.asServiceRole.entities.IntegrationBundle.bulkCreate(bundles);

    return Response.json({ 
      success: true,
      message: 'Bundles de integrações criados com sucesso!'
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clientId = Deno.env.get('PLUGGY_CLIENT_ID');
    const clientSecret = Deno.env.get('PLUGGY_CLIENT_SECRET');

    // Autenticar com tratamento de erro robusto
    if (!clientId || !clientSecret) {
      throw new Error('Pluggy credentials missing in environment (PLUGGY_CLIENT_ID / PLUGGY_CLIENT_SECRET)');
    }

    const authResponse = await fetch('https://api.pluggy.ai/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, clientSecret })
    });

    if (!authResponse.ok) {
      const errorData = await authResponse.text();
      throw new Error(`Pluggy auth failed: ${authResponse.status} - ${errorData}`);
    }

    const { apiKey } = await authResponse.json();

    // Buscar items do usuário
    const itemsResponse = await fetch(
      `https://api.pluggy.ai/items?clientUserId=${encodeURIComponent(user.email)}`,
      { headers: { 'X-API-KEY': apiKey } }
    );

    if (!itemsResponse.ok) {
      throw new Error(`Failed to list items: ${itemsResponse.status}`);
    }

    const { results: items } = await itemsResponse.json();

    const connections = items.map(item => ({
      id: item.id,
      connector_name: item.connector?.name || 'Banco',
      connector_logo: item.connector?.imageUrl,
      status: item.status,
      created_at: item.createdAt,
      last_updated: item.lastUpdatedAt
    }));

    return Response.json({
      success: true,
      connections,
      total: connections.length
    });

  } catch (error) {
    console.error('Erro ao listar conexões:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
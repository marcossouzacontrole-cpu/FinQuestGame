import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Usar API Key direta se disponível
    let apiKey = Deno.env.get('Pluggy_API');

    // Verificação diagnóstica
    const hasClientId = !!Deno.env.get('PLUGGY_CLIENT_ID');
    const hasClientSecret = !!Deno.env.get('PLUGGY_CLIENT_SECRET');
    console.log(`🔍 Diagnóstico de credenciais: CID: ${hasClientId}, SEC: ${hasClientSecret}`);

    if (!apiKey) {
      if (!hasClientId || !hasClientSecret) {
        return Response.json({
          error: 'Pluggy credentials not configured in environment',
          setup_required: true,
          diagnostics: { hasClientId, hasClientSecret }
        }, { status: 500 });
      }

      // Fallback para autenticação com client_id/client_secret
      const clientId = Deno.env.get('PLUGGY_CLIENT_ID');
      const clientSecret = Deno.env.get('PLUGGY_CLIENT_SECRET');

      // This check is now redundant due to the new check above, but keeping it for now
      // if (!clientId || !clientSecret) {
      //   return Response.json({
      //     error: 'Pluggy credentials not configured',
      //     setup_required: true
      //   }, { status: 500 });
      // }

      const authResponse = await fetch('https://api.pluggy.ai/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          clientSecret
        })
      });

      if (!authResponse.ok) {
        throw new Error('Pluggy authentication failed');
      }

      const authData = await authResponse.json();
      apiKey = authData.apiKey;
    }

    // Criar Connect Token para o usuário
    const connectTokenResponse = await fetch('https://api.pluggy.ai/connect_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey
      },
      body: JSON.stringify({
        clientUserId: user.email
      })
    });

    if (!connectTokenResponse.ok) {
      throw new Error('Failed to create connect token');
    }

    const { accessToken } = await connectTokenResponse.json();

    return Response.json({
      success: true,
      connect_token: accessToken,
      pluggy_url: `https://connect.pluggy.ai/?connectToken=${accessToken}`
    });

  } catch (error) {
    console.error('Erro ao criar connect token:', error);
    const missingKeys = [];
    if (!Deno.env.get('PLUGGY_CLIENT_ID')) missingKeys.push('PLUGGY_CLIENT_ID');
    if (!Deno.env.get('PLUGGY_CLIENT_SECRET')) missingKeys.push('PLUGGY_CLIENT_SECRET');

    return Response.json({
      error: error.message,
      setup_required: missingKeys.length > 0,
      missing_keys: missingKeys
    }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    // Validar webhook secret
    const webhookSecret = req.headers.get('x-webhook-secret') || new URL(req.url).searchParams.get('secret');
    const expectedSecret = Deno.env.get('PLUGGY_WEBHOOK_SECRET');
    
    if (webhookSecret !== expectedSecret) {
      console.log('Invalid webhook secret');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const base44 = createClientFromRequest(req);
    
    // Parse webhook payload
    const payload = await req.json();
    console.log('Pluggy Webhook Event:', JSON.stringify(payload, null, 2));

    const { event, data } = payload;

    // Processar diferentes tipos de eventos
    switch (event) {
      case 'item/updated':
      case 'item/created':
        // Sincronizar transações automaticamente quando item é atualizado/criado
        const itemId = data.id;
        console.log(`Auto-syncing transactions for item: ${itemId}`);
        
        // Invocar função de sincronização
        await base44.asServiceRole.functions.invoke('pluggySyncTransactions', {
          item_id: itemId
        });
        
        break;

      case 'item/error':
        console.log(`Item connection error: ${data.id}`, data.error);
        // Aqui você poderia enviar notificação ao usuário
        break;

      case 'transactions/added':
        console.log(`New transactions detected for item: ${data.itemId}`);
        // Sincronizar apenas este item
        await base44.asServiceRole.functions.invoke('pluggySyncTransactions', {
          item_id: data.itemId
        });
        break;

      default:
        console.log(`Unhandled event type: ${event}`);
    }

    return Response.json({ 
      success: true,
      message: 'Webhook processed successfully'
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});
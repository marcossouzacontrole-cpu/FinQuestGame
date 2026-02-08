import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accessToken = await base44.asServiceRole.connectors.getAccessToken('gmail');

    // Search for bank/invoice emails
    const queries = [
      'subject:(fatura OR invoice OR boleto OR cobrança)',
      'from:(noreply@nubank.com.br OR faturas@inter.co OR contato@c6bank.com.br)'
    ];

    const allMessages = [];

    for (const query of queries) {
      const searchResponse = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=20`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );

      const searchData = await searchResponse.json();
      if (searchData.messages) {
        allMessages.push(...searchData.messages);
      }
    }

    // Get details of each message
    const invoices = [];

    for (const msg of allMessages.slice(0, 10)) {
      const msgResponse = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );

      const msgData = await msgResponse.json();
      const headers = msgData.payload.headers;

      const subject = headers.find(h => h.name === 'Subject')?.value || '';
      const from = headers.find(h => h.name === 'From')?.value || '';
      const date = headers.find(h => h.name === 'Date')?.value || '';

      // Extract snippet for preview
      const snippet = msgData.snippet || '';

      // Try to parse value from subject/snippet
      const valueMatch = snippet.match(/R\$?\s*(\d+[\.,]\d{2})/);
      const extractedValue = valueMatch ? parseFloat(valueMatch[1].replace(',', '.')) : null;

      invoices.push({
        id: msg.id,
        subject,
        from,
        date: new Date(date).toISOString().slice(0, 10),
        snippet,
        extracted_value: extractedValue
      });
    }

    // If new invoices found, notify user via Sir Coin on WhatsApp
    if (invoices.length > 0) {
      const summary = invoices.map(inv => `- ${inv.from}: R$ ${inv.extracted_value?.toFixed(2) || '???'} (${inv.subject})`).join('\n');

      try {
        await base44.asServiceRole.conversations.sendMessage({
          agent_name: 'tactical_oracle',
          user_id: user.id || user.email,
          message: `⚔️ *ALERTA DO SIR COIN: O Olho Vigilante detectou novas faturas no seu Gmail!*\n\n${summary}\n\nDeseja que eu registre essas despesas no seu Orçamento de Batalha?`
        });
      } catch (notifyError) {
        console.error('Failed to notify via WhatsApp:', notifyError);
      }
    }

    return Response.json({
      success: true,
      invoices,
      count: invoices.length
    });

  } catch (error) {
    console.error('Gmail import error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
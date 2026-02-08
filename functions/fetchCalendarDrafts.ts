import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Busca eventos do Google Calendar e cria rascunhos para importação
 * Procura por eventos com #fin ou R$ nos próximos 30 dias
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Obter token do Google Calendar
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');

    // Buscar eventos dos próximos 30 dias
    const now = new Date();
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(now.getDate() + 30);

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
      `timeMin=${now.toISOString()}&` +
      `timeMax=${thirtyDaysLater.toISOString()}&` +
      `singleEvents=true&` +
      `orderBy=startTime`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch Calendar events: ${await response.text()}`);
    }

    const data = await response.json();
    const events = data.items || [];

    // Buscar transações já sincronizadas para evitar duplicatas
    const syncedTransactions = await base44.entities.ScheduledTransaction.filter({
      created_by: user.email
    });
    const syncedEventIds = new Set(syncedTransactions.map(t => t.google_event_id).filter(Boolean));

    // Buscar rascunhos já criados
    const existingDrafts = await base44.entities.CalendarDraft.filter({
      created_by: user.email,
      status: 'pending'
    });
    const draftEventIds = new Set(existingDrafts.map(d => d.google_event_id));

    const drafts = [];

    for (const event of events) {
      // Ignorar eventos já importados
      if (syncedEventIds.has(event.id) || draftEventIds.has(event.id)) {
        continue;
      }

      const title = event.summary || '';
      const description = event.description || '';
      const fullText = `${title} ${description}`;

      // Filtrar apenas eventos com #fin ou R$ ou padrões de valor
      const hasFinTag = /#fin/i.test(fullText);
      const hasMoneySymbol = /R\$|RS|BRL/i.test(fullText);
      const hasValuePattern = /\d+[,.]?\d*/.test(fullText);

      if (!hasFinTag && !hasMoneySymbol && !hasValuePattern) {
        continue;
      }

      // Extrair valor usando regex
      let extractedValue = null;
      const valueMatches = fullText.match(/R?\$?\s*(\d+[,.]?\d{0,2})/i);
      if (valueMatches) {
        const valueStr = valueMatches[1].replace(',', '.');
        extractedValue = parseFloat(valueStr);
      }

      // Sugerir tipo baseado em palavras-chave
      let suggestedType = 'expense';
      const incomeKeywords = ['salário', 'pagamento', 'receber', 'receita', 'ganho', 'renda'];
      const expenseKeywords = ['pagar', 'conta', 'fatura', 'despesa', 'compra'];

      if (incomeKeywords.some(keyword => fullText.toLowerCase().includes(keyword))) {
        suggestedType = 'income';
      } else if (expenseKeywords.some(keyword => fullText.toLowerCase().includes(keyword))) {
        suggestedType = 'expense';
      }

      // Criar rascunho
      const draft = await base44.entities.CalendarDraft.create({
        google_event_id: event.id,
        event_title: title,
        extracted_value: extractedValue,
        suggested_type: suggestedType,
        scheduled_date: event.start?.date || event.start?.dateTime?.split('T')[0]
      });

      drafts.push(draft);
    }

    return Response.json({
      success: true,
      drafts_created: drafts.length,
      drafts
    });

  } catch (error) {
    console.error('Error fetching calendar drafts:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { parseISO } from 'npm:date-fns';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { item_id } = await req.json();

    if (!item_id) {
      return Response.json({ error: 'item_id é obrigatório' }, { status: 400 });
    }

    const clientId = Deno.env.get('PLUGGY_CLIENT_ID');
    const clientSecret = Deno.env.get('PLUGGY_CLIENT_SECRET');

    // Autenticar
    if (!clientId || !clientSecret) {
      throw new Error('Configurações do Pluggy ausentes no ambiente');
    }

    const authResponse = await fetch('https://api.pluggy.ai/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, clientSecret })
    });

    if (!authResponse.ok) {
      throw new Error('Falha na autenticação com Pluggy - Verifique Client ID e Secret');
    }

    const { apiKey } = await authResponse.json();

    // Buscar contas
    const accountsResponse = await fetch(`https://api.pluggy.ai/accounts?itemId=${item_id}`, {
      headers: { 'X-API-KEY': apiKey }
    });

    if (!accountsResponse.ok) {
      throw new Error('Erro ao buscar contas no Pluggy');
    }

    const { results: accounts } = await accountsResponse.json();

    let totalImported = 0;
    const importedAccounts = [];

    // Para cada conta, buscar transações
    for (const account of accounts) {
      // 1. Criar/atualizar conta no FinQuest
      const existingAccounts = await base44.asServiceRole.entities.Account.filter({
        created_by: user.id // Usando ID do usuário para consistência
      });

      const existingAccount = existingAccounts.find(a => a.pluggy_account_id === account.id);

      if (!existingAccount) {
        await base44.asServiceRole.entities.Account.create({
          name: account.name || 'Conta Bancária',
          type: account.type || 'checking',
          balance: account.balance || 0,
          pluggy_account_id: account.id,
          pluggy_item_id: item_id,
          icon: '🏦',
          color: '#00FFFF'
        });
      } else {
        await base44.asServiceRole.entities.Account.update(existingAccount.id, {
          balance: account.balance || 0
        });
      }

      importedAccounts.push(account.name);

      // 2. Buscar transações com OTIMIZAÇÃO DELTA
      // Encontrar a data da última transação importada para este item
      const lastTransactions = await base44.asServiceRole.entities.FinTransaction.filter({
        pluggy_account_id: account.id
      }, '-date', 1);

      const lastDate = lastTransactions[0]?.date;
      const fromParam = lastDate ? `&from=${lastDate}` : '';

      const transactionsResponse = await fetch(
        `https://api.pluggy.ai/transactions?accountId=${account.id}&pageSize=500${fromParam}`,
        { headers: { 'X-API-KEY': apiKey } }
      );

      const { results: transactions } = await transactionsResponse.json();

      if (transactions && transactions.length > 0) {
        // BUSCAR REGRAS DO BANCO (MANDATÓRIO PARA O N8N)
        const rulesResponse = await base44.asServiceRole.entities.TransactionRule.list();
        const userRules = rulesResponse || [];

        // ENVIAR PARA O N8N FACTORY PARA CLASSIFICAÇÃO TÁTICA
        const n8nPayload = {
          rawData: transactions.map(t => `${t.date?.split('T')[0]} ${t.description} ${t.amount}`).join('\n'),
          rules: userRules,
          sourceAccountID: account.id,
          currentUserID: user.id,
          context: `pluggy_sync_${account.name}`
        };

        try {
          const classificationResponse = await fetch('http://localhost:5678/webhook/classify-transfer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(n8nPayload)
          });

          if (classificationResponse.ok) {
            const classifiedData = await classificationResponse.json();

            for (const trans of transactions) {
              const existingTrans = await base44.asServiceRole.entities.FinTransaction.filter({
                pluggy_transaction_id: trans.id
              });

              if (existingTrans.length === 0) {
                const classification = classifiedData.find(c => c.description.toLowerCase().includes(trans.description.toLowerCase())) || {};

                await base44.asServiceRole.entities.FinTransaction.create({
                  description: trans.description,
                  value: Math.abs(trans.amount),
                  date: trans.date?.split('T')[0],
                  type: trans.amount < 0 ? 'expense' : 'income',
                  category: classification.categoryName || trans.category || 'Outros',
                  pluggy_transaction_id: trans.id,
                  pluggy_account_id: account.id
                });
                totalImported++;
              }
            }
          }
        } catch (n8nError) {
          console.error('⚠️ Falha ao chamar n8n, usando fallback Pluggy:', n8nError);
          for (const trans of transactions) {
            const existingTrans = await base44.asServiceRole.entities.FinTransaction.filter({
              pluggy_transaction_id: trans.id
            });
            if (existingTrans.length === 0) {
              await base44.asServiceRole.entities.FinTransaction.create({
                description: trans.description,
                value: Math.abs(trans.amount),
                date: trans.date?.split('T')[0],
                type: trans.amount < 0 ? 'expense' : 'income',
                category: trans.category || 'Outros',
                pluggy_transaction_id: trans.id,
                pluggy_account_id: account.id
              });
              totalImported++;
            }
          }
        }
      }
    }

    return Response.json({
      success: true,
      total_imported: totalImported,
      accounts: importedAccounts,
      message: `${totalImported} transações importadas de ${importedAccounts.length} conta(s)`
    });

  } catch (error) {
    console.error('Erro ao sincronizar:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
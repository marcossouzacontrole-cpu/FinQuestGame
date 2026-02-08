import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { report_type } = await req.json();
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlesheets');

    // Fetch financial data
    const [transactions, assets, debts, accounts, categories] = await Promise.all([
      base44.entities.FinTransaction.filter({ created_by: user.email }),
      base44.entities.Asset.filter({ created_by: user.email }),
      base44.entities.Debt.filter({ created_by: user.email }),
      base44.entities.Account.filter({ created_by: user.email }),
      base44.entities.BudgetCategory.filter({ created_by: user.email })
    ]);

    // Create spreadsheet
    const createResponse = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: {
          title: `FinQuest - ${report_type === 'dre' ? 'DRE' : report_type === 'balance' ? 'Balanço Patrimonial' : 'Transações'} - ${new Date().toLocaleDateString('pt-BR')}`
        },
        sheets: [{ properties: { title: 'Dados' } }]
      })
    });

    const spreadsheet = await createResponse.json();
    const spreadsheetId = spreadsheet.spreadsheetId;

    let values = [];
    
    if (report_type === 'dre') {
      // DRE Report
      const currentMonth = new Date().toISOString().slice(0, 7);
      const monthlyTransactions = transactions.filter(t => t.date?.startsWith(currentMonth));
      
      const income = monthlyTransactions.filter(t => t.type === 'income');
      const expenses = monthlyTransactions.filter(t => t.type === 'expense');
      
      const totalIncome = income.reduce((sum, t) => sum + t.value, 0);
      const totalExpenses = expenses.reduce((sum, t) => sum + t.value, 0);
      const result = totalIncome - totalExpenses;

      values = [
        ['DEMONSTRAÇÃO DO RESULTADO DO EXERCÍCIO (DRE)'],
        [`Período: ${currentMonth}`],
        [],
        ['RECEITAS'],
        ...income.map(t => [t.description, `R$ ${t.value.toFixed(2)}`, t.category || '']),
        ['TOTAL RECEITAS', `R$ ${totalIncome.toFixed(2)}`],
        [],
        ['DESPESAS'],
        ...expenses.map(t => [t.description, `R$ ${t.value.toFixed(2)}`, t.category || '']),
        ['TOTAL DESPESAS', `R$ ${totalExpenses.toFixed(2)}`],
        [],
        ['RESULTADO', `R$ ${result.toFixed(2)}`, result >= 0 ? 'LUCRO' : 'PREJUÍZO']
      ];
    } else if (report_type === 'balance') {
      // Balance Sheet
      const totalAssets = [...assets, ...accounts].reduce((sum, a) => sum + (a.value || a.balance || 0), 0);
      const totalDebts = debts.reduce((sum, d) => sum + d.outstanding_balance, 0);
      const netWorth = totalAssets - totalDebts;

      values = [
        ['BALANÇO PATRIMONIAL'],
        [`Data: ${new Date().toLocaleDateString('pt-BR')}`],
        [],
        ['ATIVOS'],
        ...assets.map(a => [a.name, `R$ ${a.value.toFixed(2)}`, a.type]),
        ...accounts.map(a => [a.name, `R$ ${(a.balance || 0).toFixed(2)}`, 'Conta Bancária']),
        ['TOTAL ATIVOS', `R$ ${totalAssets.toFixed(2)}`],
        [],
        ['PASSIVOS'],
        ...debts.map(d => [d.creditor, `R$ ${d.outstanding_balance.toFixed(2)}`, d.type]),
        ['TOTAL PASSIVOS', `R$ ${totalDebts.toFixed(2)}`],
        [],
        ['PATRIMÔNIO LÍQUIDO', `R$ ${netWorth.toFixed(2)}`]
      ];
    } else if (report_type === 'transactions') {
      // Transactions
      values = [
        ['HISTÓRICO DE TRANSAÇÕES'],
        [],
        ['Data', 'Descrição', 'Valor', 'Tipo', 'Categoria', 'Conta'],
        ...transactions.slice(0, 500).map(t => [
          t.date || '',
          t.description || '',
          `R$ ${t.value.toFixed(2)}`,
          t.type === 'income' ? 'Receita' : 'Despesa',
          t.category || '',
          t.account_id || ''
        ])
      ];
    }

    // Write data to sheet
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Dados!A1:append?valueInputOption=RAW`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ values })
    });

    return Response.json({ 
      success: true, 
      spreadsheet_url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
      message: 'Relatório exportado com sucesso!'
    });

  } catch (error) {
    console.error('Export error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
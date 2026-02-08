import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verificar autenticação
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Receber dados da transação
    const { date, value, description, category, type, account_id, budget_category_id } = await req.json();

    // Validações
    if (!date || !value || !description || !type) {
      return Response.json({ 
        error: 'Campos obrigatórios: date, value, description, type' 
      }, { status: 400 });
    }

    if (!['income', 'expense'].includes(type)) {
      return Response.json({ 
        error: 'Type deve ser "income" ou "expense"' 
      }, { status: 400 });
    }

    // Garantir que despesas sejam negativas e receitas positivas
    const normalizedValue = type === 'expense' ? -Math.abs(value) : Math.abs(value);

    // Criar transação
    const transaction = await base44.entities.FinTransaction.create({
      date,
      value: normalizedValue,
      description,
      category: category || 'Sem Categoria',
      type,
      account_id: account_id || null,
      budget_category_id: budget_category_id || null
    });

    // Se tiver categoria de orçamento, adicionar despesa também lá
    if (budget_category_id && type === 'expense') {
      try {
        const budgetCategory = await base44.entities.BudgetCategory.filter({ id: budget_category_id });
        if (budgetCategory && budgetCategory.length > 0) {
          const cat = budgetCategory[0];
          const newExpense = {
            id: transaction.id,
            description,
            value: Math.abs(value),
            date
          };
          
          await base44.entities.BudgetCategory.update(budget_category_id, {
            expenses: [newExpense, ...(cat.expenses || [])]
          });
        }
      } catch (error) {
        console.error('Erro ao atualizar categoria de orçamento:', error);
      }
    }

    // Se tiver account_id, atualizar saldo da conta
    if (account_id) {
      try {
        const accountData = await base44.entities.Account.filter({ id: account_id });
        if (accountData && accountData.length > 0) {
          const account = accountData[0];
          const newBalance = (account.balance || 0) + normalizedValue;
          
          await base44.entities.Account.update(account_id, {
            balance: newBalance,
            last_transaction_date: date
          });
        }
      } catch (error) {
        console.error('Erro ao atualizar saldo da conta:', error);
      }
    }

    return Response.json({
      success: true,
      transaction
    }, { status: 201 });

  } catch (error) {
    console.error('Erro ao criar transação:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});
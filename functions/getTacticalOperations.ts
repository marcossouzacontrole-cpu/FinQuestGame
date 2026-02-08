import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verificar autenticação
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Pegar parâmetros opcionais (start_date e end_date)
    const { start_date, end_date } = await req.json().catch(() => ({}));

    // Calcular intervalo do mês atual se não fornecido
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    
    const defaultStartDate = `${currentYear}-${currentMonth}-01`;
    const lastDay = new Date(currentYear, now.getMonth() + 1, 0).getDate();
    const defaultEndDate = `${currentYear}-${currentMonth}-${lastDay}`;

    // Buscar todas as transações pendentes ou do período atual
    const allTransactions = await base44.asServiceRole.entities.Transaction.list();

    // Filtrar transações relevantes
    const relevantTransactions = allTransactions.filter(t => {
      // Sempre incluir transações pendentes (mesmo atrasadas)
      if (t.payment_status === 'PENDING') {
        return true;
      }

      // Incluir transações completadas do mês atual
      if (t.payment_status === 'COMPLETED') {
        const transactionDate = t.date || t.due_date;
        if (!transactionDate) return false;
        
        const txDate = new Date(transactionDate);
        const start = new Date(start_date || defaultStartDate);
        const end = new Date(end_date || defaultEndDate);
        
        return txDate >= start && txDate <= end;
      }

      return false;
    });

    // Ordenar: primeiro por urgência, depois por data de vencimento
    const sortedTransactions = relevantTransactions.sort((a, b) => {
      // Prioridade 1: Urgência
      if (a.is_urgent && !b.is_urgent) return -1;
      if (!a.is_urgent && b.is_urgent) return 1;

      // Prioridade 2: Data de vencimento
      const dateA = new Date(a.due_date || a.date || '9999-12-31');
      const dateB = new Date(b.due_date || b.date || '9999-12-31');
      
      return dateA - dateB;
    });

    // Formatar resposta
    const operations = sortedTransactions.map(t => ({
      id: t.id,
      title: t.description,
      amount: t.amount,
      due_date: t.due_date || t.date,
      status: t.payment_status || 'COMPLETED',
      type: t.transaction_type || (t.type === 'income' ? 'RECEIVABLE' : 'PAYABLE'),
      category_name: t.category_id || 'Sem Categoria',
      is_urgent: t.is_urgent || false,
      payment_method: t.payment_method
    }));

    return Response.json({
      success: true,
      operations,
      summary: {
        total_pending: operations.filter(o => o.status === 'PENDING').length,
        total_completed: operations.filter(o => o.status === 'COMPLETED').length,
        total_payable: operations.filter(o => o.type === 'PAYABLE' && o.status === 'PENDING').reduce((sum, o) => sum + o.amount, 0),
        total_receivable: operations.filter(o => o.type === 'RECEIVABLE' && o.status === 'PENDING').reduce((sum, o) => sum + o.amount, 0)
      }
    });

  } catch (error) {
    console.error('Erro ao buscar operações táticas:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});
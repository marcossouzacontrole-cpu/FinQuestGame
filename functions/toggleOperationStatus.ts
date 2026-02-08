import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verificar autenticação
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Pegar transaction_id do payload
    const { transaction_id } = await req.json();

    if (!transaction_id) {
      return Response.json({ 
        success: false,
        error: 'transaction_id é obrigatório' 
      }, { status: 400 });
    }

    // Buscar a transação atual
    const transactions = await base44.asServiceRole.entities.Transaction.filter({ 
      id: transaction_id 
    });

    if (!transactions || transactions.length === 0) {
      return Response.json({ 
        success: false,
        error: 'Transação não encontrada' 
      }, { status: 404 });
    }

    const transaction = transactions[0];
    const currentStatus = transaction.payment_status || 'COMPLETED';

    // Toggle do status
    let newStatus;
    let updateData = {};

    if (currentStatus === 'PENDING') {
      // Marcar como COMPLETED
      newStatus = 'COMPLETED';
      updateData = {
        payment_status: 'COMPLETED',
        date: new Date().toISOString().split('T')[0] // Data de hoje como efetivação
      };
    } else {
      // Voltar para PENDING
      newStatus = 'PENDING';
      updateData = {
        payment_status: 'PENDING'
        // Mantém a due_date original
      };
    }

    // Atualizar a transação
    await base44.asServiceRole.entities.Transaction.update(transaction_id, updateData);

    return Response.json({
      success: true,
      new_status: newStatus,
      transaction_id,
      message: newStatus === 'COMPLETED' ? '✅ Operação concluída!' : '⏳ Operação marcada como pendente'
    });

  } catch (error) {
    console.error('Erro ao alternar status:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});
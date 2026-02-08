import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { filters } = payload;

    if (!filters) {
      return Response.json({ error: 'Filters required' }, { status: 400 });
    }

    // Fetch all scheduled transactions for the user
    const allTransactions = await base44.entities.ScheduledTransaction.filter({
      created_by: user.email
    });

    // Apply filters
    let filtered = allTransactions;

    // Filter by category
    if (filters.category) {
      filtered = filtered.filter(t => t.category === filters.category);
    }

    // Filter by type (expense/income)
    if (filters.type) {
      filtered = filtered.filter(t => t.type === filters.type);
    }

    // Filter by status
    if (filters.status) {
      filtered = filtered.filter(t => t.status === filters.status);
    }

    // Filter by day of month (07 = 7th day of any month)
    if (filters.dayOfMonth) {
      filtered = filtered.filter(t => {
        const date = new Date(t.scheduled_date);
        return date.getDate() === parseInt(filters.dayOfMonth);
      });
    }

    // Filter by recurrence
    if (filters.recurrence) {
      filtered = filtered.filter(t => t.recurrence === filters.recurrence);
    }

    // Filter by date range
    if (filters.startDate) {
      const start = new Date(filters.startDate);
      filtered = filtered.filter(t => new Date(t.scheduled_date) >= start);
    }

    if (filters.endDate) {
      const end = new Date(filters.endDate);
      filtered = filtered.filter(t => new Date(t.scheduled_date) <= end);
    }

    // Delete all filtered transactions
    const deletedIds = [];
    for (const transaction of filtered) {
      await base44.entities.ScheduledTransaction.delete(transaction.id);
      deletedIds.push(transaction.id);
    }

    return Response.json({
      success: true,
      deletedCount: filtered.length,
      deletedIds: deletedIds,
      message: `${filtered.length} agendamento(s) removido(s) com sucesso!`
    });
  } catch (error) {
    console.error('Bulk delete error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
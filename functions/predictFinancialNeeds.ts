import { createClientFromRequest } from './local_sdk.ts';

Deno.serve(async (req) => {
  try {
    const base44 = await createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const allTransactions = await base44.entities.FinTransaction.filter(
      { created_by: user.email }
    );

    const scheduledTransactions = await base44.entities.ScheduledTransaction.filter(
      { created_by: user.email }
    );

    const now = new Date();
    const past90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const recent90 = allTransactions.filter(t => new Date(t.date) >= past90);

    const dayOfMonthPattern: Record<number, any> = {};
    recent90.forEach(t => {
      const dayOfMonth = new Date(t.date).getDate();
      if (!dayOfMonthPattern[dayOfMonth]) {
        dayOfMonthPattern[dayOfMonth] = {
          count: 0,
          totalExpense: 0,
          categories: {}
        };
      }
      dayOfMonthPattern[dayOfMonth].count += 1;
      if (t.type === 'expense') {
        const value = Number(t.value);
        dayOfMonthPattern[dayOfMonth].totalExpense += value;
        dayOfMonthPattern[dayOfMonth].categories[t.category] =
          (dayOfMonthPattern[dayOfMonth].categories[t.category] || 0) + value;
      }
    });

    const recurringDays = Object.entries(dayOfMonthPattern)
      .filter(([_, data]) => data.count >= 2)
      .map(([day, data]) => ({
        dayOfMonth: parseInt(day),
        frequency: data.count,
        avgExpense: data.totalExpense / data.count,
        topCategories: Object.entries(data.categories)
          .sort(([, a]: any, [, b]: any) => b - a)
          .slice(0, 2)
          .map(([cat, val]) => ({ category: cat, amount: val }))
      }))
      .sort((a, b) => b.frequency - a.frequency);

    const predictions: any[] = [];
    const todayDay = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    recurringDays.slice(0, 3).forEach(pattern => {
      let nextDay = pattern.dayOfMonth;
      if (nextDay <= todayDay) nextDay += daysInMonth;

      const nextDate = new Date(now);
      nextDate.setDate(nextDay);

      predictions.push({
        predictedDate: nextDate.toISOString().split('T')[0],
        daysFromNow: Math.floor((nextDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
        expectedExpense: pattern.avgExpense,
        topCategories: pattern.topCategories,
        confidence: Math.min(100, pattern.frequency * 33)
      });
    });

    const recommendations: any[] = [];
    if (predictions.length > 0) {
      const totalPredicted = predictions.reduce((sum, p) => sum + p.expectedExpense, 0);
      recommendations.push({
        type: 'upcoming_expenses',
        message: `Próximas 2 semanas: R$ ${totalPredicted.toFixed(0)} em despesas previsíveis.`,
        predictions
      });
    }

    const scheduledCategories = scheduledTransactions.map(t => t.category);
    const unscheduledPatterns = recurringDays
      .filter(p => !scheduledCategories.includes(p.topCategories[0]?.category))
      .slice(0, 1);

    if (unscheduledPatterns.length > 0) {
      const pattern = unscheduledPatterns[0];
      recommendations.push({
        type: 'schedule_suggestion',
        message: `Sugestão: Agende "${pattern.topCategories[0].category}" (recorre ~${pattern.frequency}x/mês)`,
        dayOfMonth: pattern.dayOfMonth
      });
    }

    return Response.json({ success: true, predictions, recommendations });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
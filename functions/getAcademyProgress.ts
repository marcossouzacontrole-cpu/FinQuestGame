import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let profiles = await base44.entities.User.filter({ email: user.email });
    const profile = profiles?.[0];

    if (!profile) {
      return Response.json({ error: 'Profile not found' }, { status: 404 });
    }

    const academyProgress = profile.academy_progress || {};
    const scheduledTopics = profile.scheduled_academy_topics || {};

    // Contar módulos completados
    const completedCount = Object.keys(academyProgress).length;
    const passedCount = Object.values(academyProgress).filter(p => p.passed).length;

    // Calcular streak (consecutivos)
    const dailyContent = await base44.entities.DailyContent.list('-created_date', 30);
    let streakDays = 0;
    
    dailyContent.forEach(content => {
      if (academyProgress[content.id]) {
        streakDays++;
      } else {
        streakDays = 0; // Reset se quebrar
      }
    });

    return Response.json({
      success: true,
      progress: {
        totalCompleted: completedCount,
        totalPassed: passedCount,
        passRate: completedCount > 0 ? Math.round((passedCount / completedCount) * 100) : 0,
        streakDays,
        scheduledTopics: Object.keys(scheduledTopics),
        badges: []
      },
      achievements: {
        unlocked: completedCount >= 5 ? ['student'] : [],
        next: completedCount >= 10 ? ['scholar'] : completedCount >= 5 ? ['scholar'] : ['student']
      }
    });
  } catch (error) {
    console.error('Get academy progress error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
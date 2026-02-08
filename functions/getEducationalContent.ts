import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { type = 'today' } = payload;

    const allContent = await base44.entities.DailyContent.list();

    let content;

    if (type === 'today') {
      const today = new Date().toISOString().split('T')[0];
      content = allContent.filter(c => c.date === today)[0];
    } else if (type === 'all') {
      content = allContent.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);
    } else {
      content = allContent.filter(c => c.category === type).slice(0, 5);
    }

    if (!content) {
      return Response.json({
        success: false,
        message: '📚 Nenhum conteúdo disponível no momento. Tente novamente mais tarde!'
      });
    }

    const formatContent = (item) => ({
      title: item.title,
      theme: item.theme,
      content: item.content_text?.substring(0, 300) + '...' || item.content_text,
      fullContent: item.content_text,
      quest: item.quest,
      category: item.category,
      readingTime: item.reading_time_minutes,
      xpReward: item.xp_reward,
      date: item.date
    });

    if (Array.isArray(content)) {
      return Response.json({
        success: true,
        contentList: content.map(formatContent)
      });
    }

    return Response.json({
      success: true,
      content: formatContent(content)
    });
  } catch (error) {
    console.error('Get educational content error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
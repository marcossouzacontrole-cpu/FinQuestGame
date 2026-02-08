import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { topic, frequency = 'weekly' } = payload;

    if (!topic) {
      return Response.json({ error: 'Topic required' }, { status: 400 });
    }

    // Topics válidos (sem IA - lista fixa)
    const validTopics = [
      'economia',
      'investimento',
      'orçamento',
      'mentalidade',
      'poupança',
      'dívida',
      'renda-extra',
      'aposentadoria'
    ];

    const topicLower = topic.toLowerCase();
    if (!validTopics.includes(topicLower)) {
      return Response.json({ 
        error: 'Tópico inválido', 
        validTopics 
      }, { status: 400 });
    }

    // Atualizar preferências do usuário
    let profiles = await base44.entities.User.filter({ email: user.email });
    const profile = profiles?.[0];

    if (!profile) {
      return Response.json({ error: 'Profile not found' }, { status: 404 });
    }

    const scheduledTopics = profile.scheduled_academy_topics || {};
    scheduledTopics[topicLower] = {
      scheduledAt: new Date().toISOString(),
      frequency
    };

    await base44.auth.updateMe({
      scheduled_academy_topics: scheduledTopics
    });

    return Response.json({
      success: true,
      message: `✅ "${topicLower}" agendado ${frequency === 'weekly' ? 'semanalmente' : 'diariamente'}!`,
      topic: topicLower,
      frequency
    });
  } catch (error) {
    console.error('Schedule topic error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
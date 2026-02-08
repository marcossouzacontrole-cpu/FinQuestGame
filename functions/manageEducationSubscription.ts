import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { action } = payload;

    // Get or create user's education preferences
    const profiles = await base44.entities.User.filter({ email: user.email });
    const profile = profiles && profiles.length > 0 ? profiles[0] : null;

    if (!profile) {
      return Response.json({ error: 'Profile not found' }, { status: 404 });
    }

    // For now, store preference in user data
    const preferences = profile.education_subscription || {
      enabled: false,
      categories: [],
      frequency: 'daily'
    };

    if (action === 'subscribe') {
      preferences.enabled = true;
      await base44.auth.updateMe({
        education_subscription: preferences
      });

      return Response.json({
        success: true,
        message: '✅ Você se inscreveu na Academia Diária! 📚\n\nReceberá conteúdo educacional todos os dias.\n\nComandos:\n• "Academia hoje" - conteúdo de hoje\n• "Economia" - dicas de economia\n• "Investimento" - guia de investimentos\n• "Orçamento" - gestão de orçamento\n• "Mentalidade" - mentalidade financeira'
      });
    } else if (action === 'unsubscribe') {
      preferences.enabled = false;
      await base44.auth.updateMe({
        education_subscription: preferences
      });

      return Response.json({
        success: true,
        message: '❌ Você se desinscrever da Academia. Pode voltar a qualquer momento! 👋'
      });
    } else if (action === 'status') {
      return Response.json({
        success: true,
        subscribed: preferences.enabled,
        message: preferences.enabled
          ? '✅ Você está inscrito na Academia Diária'
          : '❌ Você não está inscrito. Digite "Academia" para se inscrever!'
      });
    }

    return Response.json({ success: false, message: 'Ação inválida' });
  } catch (error) {
    console.error('Manage education subscription error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
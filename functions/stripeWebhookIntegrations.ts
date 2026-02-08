import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@13.11.0';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const signature = req.headers.get('stripe-signature');
    const body = await req.text();
    const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, secret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return Response.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Initialize Base44 AFTER signature validation
    const base44 = createClientFromRequest(req);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const { user_email, bundle_id, bundle_name } = session.metadata;

      if (!user_email || !bundle_id) {
        console.error('Missing metadata in webhook', session.metadata);
        return Response.json({ error: 'Missing metadata' }, { status: 400 });
      }

      // Fetch user
      const users = await base44.asServiceRole.entities.User.filter({ email: user_email });
      if (!users || users.length === 0) {
        console.error(`User not found: ${user_email}`);
        return Response.json({ error: 'User not found' }, { status: 404 });
      }

      const user = users[0];

      // Create integration bundle record
      await base44.asServiceRole.entities.UserIntegrations.create({
        bundle_id,
        bundle_name: bundle_name || 'Bundle',
        enabled_integrations: bundle_id === 'all' 
          ? ['Gmail', 'Google Calendar', 'Google Sheets Pro', 'Notion Avançado', 'Slack', 'LinkedIn']
          : bundle_id === 'automation'
          ? ['Gmail', 'Google Calendar', 'Slack']
          : ['Google Sheets Pro', 'Notion Avançado'],
        purchase_date: new Date().toISOString().split('T')[0],
        status: 'active',
        created_by: user_email
      });

      console.log(`✅ Bundle ${bundle_name} ativado para ${user_email}`);
    }

    return Response.json({ success: true });

  } catch (error) {
    console.error('Webhook error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
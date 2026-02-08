import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const signature = req.headers.get('stripe-signature');
    const body = await req.text();
    
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')
    );

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userEmail = session.metadata.user_email;

      // Find user
      const users = await base44.asServiceRole.entities.User.filter({ email: userEmail });
      if (!users || users.length === 0) {
        console.error('User not found:', userEmail);
        return Response.json({ received: true });
      }

      const user = users[0];
      
      // Check what was purchased based on amount
      const amountTotal = session.amount_total / 100;

      if (amountTotal === 19.90) {
        // Premium Plan - 30 days
        const premiumUntil = new Date();
        premiumUntil.setDate(premiumUntil.getDate() + 30);
        
        await base44.asServiceRole.entities.User.update(user.id, {
          premium_until: premiumUntil.toISOString(),
          gold_coins: (user.gold_coins || 0) + 100
        });
      } else if (amountTotal === 9.90) {
        // Small Gold Pack
        await base44.asServiceRole.entities.User.update(user.id, {
          gold_coins: (user.gold_coins || 0) + 100
        });
      } else if (amountTotal === 24.90) {
        // Medium Gold Pack
        await base44.asServiceRole.entities.User.update(user.id, {
          gold_coins: (user.gold_coins || 0) + 300
        });
      } else if (amountTotal === 49.90) {
        // Large Gold Pack
        await base44.asServiceRole.entities.User.update(user.id, {
          gold_coins: (user.gold_coins || 0) + 750
        });
      }

      console.log('Purchase processed for:', userEmail);
    }

    return Response.json({ received: true });

  } catch (error) {
    console.error('Webhook error:', error);
    return Response.json({ error: error.message }, { status: 400 });
  }
});
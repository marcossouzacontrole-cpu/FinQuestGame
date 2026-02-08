import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@13.11.0';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));

const BUNDLE_STRIPE_MAP = {
  'automation': 'price_1Sv53E5TMqhGwz2MXt5ncfXE',
  'data': 'price_1Sv53E5TMqhGwz2MVe8cLO3K',
  'all': 'price_1Sv53E5TMqhGwz2MgKnrl6g3'
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { bundleId, bundleCategory, bundleName } = await req.json();

    if (!bundleCategory || !BUNDLE_STRIPE_MAP[bundleCategory]) {
      return Response.json({ error: 'Bundle inválido' }, { status: 400 });
    }

    const priceId = BUNDLE_STRIPE_MAP[bundleCategory];

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${Deno.env.get('APP_URL')}/Integrations?payment=success&bundle=${bundleId}`,
      cancel_url: `${Deno.env.get('APP_URL')}/Integrations?payment=cancelled`,
      customer_email: user.email,
      metadata: {
        base44_app_id: Deno.env.get("BASE44_APP_ID"),
        user_email: user.email,
        bundle_id: bundleId,
        bundle_name: bundleName,
      },
    });

    console.log(`Checkout criado para ${user.email} - Bundle: ${bundleName}`);

    return Response.json({ 
      url: session.url,
      sessionId: session.id
    });

  } catch (error) {
    console.error('Erro ao criar checkout:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
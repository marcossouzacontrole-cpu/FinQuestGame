import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { itemId } = await req.json();

        // 1. Fetch Item and User Profile
        const [item, profiles] = await Promise.all([
            base44.entities.Item.get(itemId),
            base44.entities.User.filter({ email: user.email })
        ]);

        const profile = profiles[0];
        if (!profile || !item) {
            return Response.json({ error: 'Item or Profile not found' }, { status: 404 });
        }

        // 2. Check Gold
        if ((profile.gold_coins || 0) < item.price) {
            return Response.json({ error: 'Insufficient gold' }, { status: 400 });
        }

        // 3. Update Gold and Add to Inventory
        await Promise.all([
            base44.entities.User.update(profile.id, {
                gold_coins: profile.gold_coins - item.price
            }),
            base44.entities.UserInventory.create({
                user_email: user.email,
                item_id: itemId,
                quantity: 1,
                is_equipped: false
            })
        ]);

        return Response.json({
            success: true,
            message: `${item.name} purchased successfully!`,
            remainingGold: profile.gold_coins - item.price
        });

    } catch (error) {
        console.error('Purchase Error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});

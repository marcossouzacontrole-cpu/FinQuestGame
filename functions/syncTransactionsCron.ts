import { createClientFromRequest } from './local_sdk.ts';

// Esta é a função que o Deno Deploy executará automaticamente todo dia
// Replaces n8n in the cloud to save hosting costs
Deno.cron("Daily Financial Sync", "0 4 * * *", async () => {
    console.log("🚀 Starting Daily Financial Sync Cron Job...");

    // Usamos asServiceRole para poder listar todos os usuários e contas
    const sdk = await createClientFromRequest(null as any);
    const serviceRole = sdk.asServiceRole;

    try {
        // 1. Buscar todos os usuários
        const users = await serviceRole.entities.User.list();
        console.log(`👤 Found ${users.length} users to sync.`);

        const clientId = Deno.env.get('PLUGGY_CLIENT_ID');
        const clientSecret = Deno.env.get('PLUGGY_CLIENT_SECRET');

        if (!clientId || !clientSecret) {
            console.error("❌ PLUGGY_CLIENT_ID or SECRET missing.");
            return;
        }

        // 2. Autenticar no Pluggy (um token para todos os syncs desta rodada)
        const authRes = await fetch('https://api.pluggy.ai/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clientId, clientSecret })
        });
        const { apiKey } = await authRes.json();

        for (const user of users) {
            console.log(`🔍 Syncing user: ${user.email}...`);

            // 3. Buscar contas deste usuário
            const accounts = await serviceRole.entities.Account.filter({ created_by: user.id });

            for (const account of accounts) {
                if (!account.pluggy_account_id) continue;

                console.log(`🏦 Syncing account: ${account.name} (Pluggy ID: ${account.pluggy_account_id})`);

                // 4. Buscar transações (Delta Sync)
                const lastTrans = await serviceRole.entities.FinTransaction.filter({
                    pluggy_account_id: account.pluggy_account_id
                }, '-date', 1);

                const lastDate = lastTrans[0]?.date;
                const fromParam = lastDate ? `&from=${lastDate}` : '';

                const transRes = await fetch(
                    `https://api.pluggy.ai/transactions?accountId=${account.pluggy_account_id}&pageSize=500${fromParam}`,
                    { headers: { 'X-API-KEY': apiKey } }
                );
                const { results: transactions } = await transRes.json();

                if (transactions && transactions.length > 0) {
                    let count = 0;
                    for (const trans of transactions) {
                        const exists = await serviceRole.entities.FinTransaction.filter({
                            pluggy_transaction_id: trans.id
                        });

                        if (exists.length === 0) {
                            await serviceRole.entities.FinTransaction.create({
                                description: trans.description,
                                value: Math.abs(trans.amount),
                                date: trans.date?.split('T')[0],
                                type: trans.amount < 0 ? 'expense' : 'income',
                                category: trans.category || 'Outros',
                                pluggy_transaction_id: trans.id,
                                pluggy_account_id: account.pluggy_account_id,
                                created_by: user.id
                            });
                            count++;
                        }
                    }
                    console.log(`✅ Imported ${count} new transactions for ${account.name}`);

                    // 5. Atualizar saldo da conta no Neon
                    const accInfo = await fetch(`https://api.pluggy.ai/accounts/${account.pluggy_account_id}`, {
                        headers: { 'X-API-KEY': apiKey }
                    });
                    const accountData = await accInfo.json();
                    await serviceRole.entities.Account.update(account.id, {
                        balance: accountData.balance || 0
                    });
                }
            }
        }
        console.log("🎊 Daily Sync Finished successfully!");
    } catch (err) {
        console.error("❌ Cron Job Failed:", err);
    }
});

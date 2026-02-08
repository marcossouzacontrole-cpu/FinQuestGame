import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { query, search_type, limit = 20 } = await req.json();

    if (!query) {
      return Response.json({ error: 'query é obrigatório' }, { status: 400 });
    }

    // Buscar todas as transações do usuário
    const allTransactions = await base44.asServiceRole.entities.FinTransaction.filter({
      created_by: user.email
    }, '-created_date', 100);

    let results = [];

    // Determinar tipo de busca
    if (search_type === 'value' || !isNaN(parseFloat(query))) {
      // Busca por valor
      const searchValue = parseFloat(query);
      results = allTransactions.filter(trans => 
        Math.abs(trans.value - searchValue) < 0.01 // Tolerância de 1 centavo
      );
    } else if (search_type === 'category') {
      // Busca por categoria
      const searchTerm = query.toLowerCase();
      results = allTransactions.filter(trans => 
        trans.category && trans.category.toLowerCase().includes(searchTerm)
      );
    } else {
      // Busca geral (descrição, categoria, etc)
      const searchTerm = query.toLowerCase();
      results = allTransactions.filter(trans => {
        const description = (trans.description || '').toLowerCase();
        const category = (trans.category || '').toLowerCase();
        
        return description.includes(searchTerm) || category.includes(searchTerm);
      });
    }

    // Limitar resultados
    results = results.slice(0, limit);

    // Formatar para resposta
    const formattedResults = results.map((trans, index) => ({
      index: index + 1,
      id: trans.id,
      date: trans.date,
      description: trans.description,
      value: trans.value,
      type: trans.type,
      category: trans.category,
      account: trans.account_id
    }));

    return Response.json({
      success: true,
      query,
      total_found: results.length,
      results: formattedResults
    });

  } catch (error) {
    console.error('Erro ao buscar transações:', error);
    return Response.json({ 
      error: 'Erro ao buscar transações',
      details: error.message 
    }, { status: 500 });
  }
});
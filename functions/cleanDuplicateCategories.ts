import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Função para limpar emojis
    const cleanName = (name) => {
      return name.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{27BF}]|[\u{1F000}-\u{1F02F}]|[\u{1F0A0}-\u{1F0FF}]|[\u{1F100}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F900}-\u{1F9FF}]|[\u{2300}-\u{23FF}]|[\u{2B50}]|[\u{203C}-\u{3299}]/gu, '')
        .trim()
        .toLowerCase();
    };

    // Buscar todas as categorias do usuário
    const categories = await base44.asServiceRole.entities.BudgetCategory.filter({
      created_by: user.email
    });

    // Agrupar por nome limpo
    const categoryMap = new Map();
    const duplicates = [];

    for (const cat of categories) {
      const clean = cleanName(cat.name);
      
      if (categoryMap.has(clean)) {
        // Categoria duplicada encontrada
        const existing = categoryMap.get(clean);
        duplicates.push({
          toKeep: existing,
          toDelete: cat
        });
      } else {
        categoryMap.set(clean, cat);
      }
    }

    // Excluir duplicatas (mantém a mais antiga)
    let deletedCount = 0;
    for (const dup of duplicates) {
      try {
        await base44.asServiceRole.entities.BudgetCategory.delete(dup.toDelete.id);
        deletedCount++;
      } catch (error) {
        console.error(`Erro ao excluir categoria ${dup.toDelete.id}:`, error);
      }
    }

    return Response.json({
      success: true,
      total_categories: categories.length,
      duplicates_found: duplicates.length,
      deleted: deletedCount,
      remaining_unique: categoryMap.size,
      details: duplicates.map(d => ({
        kept: d.toKeep.name,
        deleted: d.toDelete.name
      }))
    });

  } catch (error) {
    console.error('Erro:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});
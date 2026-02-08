import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const categoryIconMap = {
  // Despesas - Alimentação
  'alimentacao': '🍽️',
  'alimentação': '🍽️',
  'comida': '🍽️',
  'restaurante': '🍽️',
  'supermercado': '🛒',
  'mercado': '🛒',
  'padaria': '🥖',
  'lanche': '🍔',
  'fast food': '🍔',
  
  // Despesas - Transporte
  'combustivel': '⛽',
  'combustível': '⛽',
  'gasolina': '⛽',
  'transporte': '🚗',
  'uber': '🚕',
  'taxi': '🚕',
  'onibus': '🚌',
  'ônibus': '🚌',
  'metro': '🚇',
  'metrô': '🚇',
  'estacionamento': '🅿️',
  'pedágio': '🛣️',
  'pedagio': '🛣️',
  
  // Despesas - Moradia
  'aluguel': '🏠',
  'condominio': '🏢',
  'condomínio': '🏢',
  'agua': '💧',
  'água': '💧',
  'luz': '💡',
  'energia': '⚡',
  'internet': '🌐',
  'telefone': '📞',
  'celular': '📱',
  'gas': '🔥',
  'gás': '🔥',
  
  // Despesas - Vestuário
  'roupa': '👔',
  'roupas': '👔',
  'vestuario': '👕',
  'vestuário': '👕',
  'calcado': '👟',
  'calçado': '👟',
  'sapato': '👞',
  
  // Despesas - Saúde
  'saude': '🏥',
  'saúde': '🏥',
  'medico': '👨‍⚕️',
  'médico': '👨‍⚕️',
  'farmacia': '💊',
  'farmácia': '💊',
  'remedio': '💊',
  'remédio': '💊',
  'academia': '💪',
  'dentista': '🦷',
  
  // Despesas - Educação
  'educacao': '📚',
  'educação': '📚',
  'escola': '🎓',
  'faculdade': '🎓',
  'curso': '📖',
  'livro': '📕',
  
  // Despesas - Lazer
  'lazer': '🎮',
  'entretenimento': '🎬',
  'cinema': '🎬',
  'streaming': '📺',
  'netflix': '📺',
  'spotify': '🎵',
  'musica': '🎵',
  'música': '🎵',
  'jogo': '🎮',
  'viagem': '✈️',
  'hotel': '🏨',
  
  // Despesas - Beleza
  'beleza': '💄',
  'cabelo': '💇',
  'salao': '💇‍♀️',
  'salão': '💇‍♀️',
  'estetica': '✨',
  'estética': '✨',
  
  // Despesas - Pet
  'pet': '🐾',
  'veterinario': '🐕',
  'veterinário': '🐕',
  'cachorro': '🐕',
  'gato': '🐈',
  
  // Despesas - Assinaturas
  'assinatura': '📋',
  'mensalidade': '📋',
  
  // Despesas - Impostos
  'imposto': '🏛️',
  'taxa': '🏛️',
  'ipva': '🚗',
  'iptu': '🏠',
  
  // Receitas
  'salario': '💰',
  'salário': '💰',
  'freelance': '💼',
  'freela': '💼',
  'renda': '💵',
  'bonus': '🎁',
  'bônus': '🎁',
  'investimento': '📈',
  'dividendo': '💹',
  'presente': '🎁',
  'venda': '💸',
  'lucro': '💹',
  'premio': '🏆',
  'prêmio': '🏆',
  
  // Genéricos
  'outros': '📋',
  'diverso': '📦',
  'diversos': '📦',
  'geral': '⚙️',
};

function findBestIcon(categoryName) {
  const nameLower = categoryName.toLowerCase().trim();
  
  // Busca exata
  if (categoryIconMap[nameLower]) {
    return categoryIconMap[nameLower];
  }
  
  // Busca parcial (se o nome da categoria contém alguma palavra-chave)
  for (const [key, icon] of Object.entries(categoryIconMap)) {
    if (nameLower.includes(key) || key.includes(nameLower)) {
      return icon;
    }
  }
  
  // Ícone padrão baseado no tipo
  return null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Buscar todas as categorias do usuário
    const categories = await base44.entities.BudgetCategory.filter({ 
      created_by: user.email 
    });

    let updatedCount = 0;
    const updates = [];

    for (const category of categories) {
      const newIcon = findBestIcon(category.name);
      
      // Só atualiza se encontrou um ícone e é diferente do atual
      if (newIcon && newIcon !== category.icon) {
        await base44.entities.BudgetCategory.update(category.id, {
          icon: newIcon
        });
        updatedCount++;
        updates.push({
          name: category.name,
          oldIcon: category.icon || 'nenhum',
          newIcon
        });
      }
    }

    return Response.json({
      success: true,
      message: `${updatedCount} categorias atualizadas`,
      updates
    });

  } catch (error) {
    console.error('Erro ao atualizar ícones:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { extractedText } = await req.json();

    // Validar se é C6 Bank
    const isC6Bank = extractedText.includes('C6BANK') || 
                     extractedText.includes('C6 Bank') ||
                     extractedText.includes('Extrato exportado');

    if (!isC6Bank) {
      return Response.json({ 
        success: false, 
        message: 'Não foi identificado como extrato do C6 Bank' 
      }, { status: 400 });
    }

    const transactions = [];
    
    // Normalizar texto: remover múltiplos espaços e quebras
    const normalizedText = extractedText
      .replace(/\r\n/g, '\n')
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n');
    
    let currentYear = new Date().getFullYear();
    
    // Mapa de meses
    const monthsMap = {
      'janeiro': 1, 'fevereiro': 2, 'março': 3, 'abril': 4,
      'maio': 5, 'junho': 6, 'julho': 7, 'agosto': 8,
      'setembro': 9, 'outubro': 10, 'novembro': 11, 'dezembro': 12
    };

    // REGEX PRINCIPAL: Captura TODAS as variações de formato C6
    // Suporta: DD/MM DD/MM Tipo Descrição Valor
    // Com ou sem espaços extras, com ou sem quebras de linha no meio
    const transactionRegex = /(\d{2})\/(\d{2})\s+(\d{2})\/(\d{2})\s+(Débito de Cartão|Saída PIX|Entrada PIX|Entradas|Pagamento|Outros gastos)\s+(.+?)\s+(-?R\$\s*[\d.,]+)(?=\s|$|\n)/gi;

    // Detectar ano pelos cabeçalhos de mês
    const monthHeaders = normalizedText.matchAll(/(Janeiro|Fevereiro|Março|Abril|Maio|Junho|Julho|Agosto|Setembro|Outubro|Novembro|Dezembro)\s+(\d{4})/gi);
    const yearsByPosition = [];
    for (const match of monthHeaders) {
      yearsByPosition.push({
        position: match.index,
        year: parseInt(match[2])
      });
    }

    let matches = [...normalizedText.matchAll(transactionRegex)];

    for (const match of matches) {
      const [fullMatch, lancDia, lancMes, contDia, contMes, tipo, descricao, valorStr] = match;
      
      // Encontrar o ano correto baseado na posição do match
      const matchPosition = match.index;
      let yearForThisTransaction = currentYear;
      
      for (let i = yearsByPosition.length - 1; i >= 0; i--) {
        if (yearsByPosition[i].position < matchPosition) {
          yearForThisTransaction = yearsByPosition[i].year;
          break;
        }
      }

      // Processar valor
      const cleanValue = valorStr
        .replace('R$', '')
        .replace(/\s/g, '')
        .replace(/\./g, '')
        .replace(',', '.');
      
      const value = parseFloat(cleanValue);

      if (isNaN(value) || value === 0) continue;

      // Usar data CONTÁBIL
      const date = `${yearForThisTransaction}-${contMes.padStart(2, '0')}-${contDia.padStart(2, '0')}`;

      // Limpar descrição
      let cleanDesc = descricao
        .replace(/Pix enviado para/gi, '')
        .replace(/Pix recebido de/gi, '')
        .trim();
      
      if (cleanDesc.length < 2) {
        cleanDesc = descricao.trim();
      }

      // Hash único
      const hashId = `c6_${date}_${Math.abs(value).toFixed(2)}_${cleanDesc.substring(0, 30)}`
        .replace(/\s/g, '_')
        .replace(/[^a-zA-Z0-9_.-]/g, '');

      transactions.push({
        date,
        description: cleanDesc.substring(0, 200),
        type: value < 0 ? 'expense' : 'income',
        value: Math.abs(value),
        amount: Math.abs(value),
        source: 'C6 Bank',
        hash_id: hashId
      });
    }

    // Verificar duplicatas
    const existingTransactions = await base44.entities.FinTransaction.filter({ 
      created_by: user.email 
    });
    
    const existingHashes = new Set(existingTransactions.map(t => t.hash_id).filter(h => h));
    const newTransactions = transactions.filter(t => !existingHashes.has(t.hash_id));
    const duplicates = transactions.length - newTransactions.length;

    return Response.json({
      success: true,
      transactions: newTransactions,
      total_extracted: transactions.length,
      duplicates_found: duplicates,
      message: duplicates > 0 
        ? `${newTransactions.length} novas transações (${duplicates} duplicatas ignoradas)`
        : `${newTransactions.length} transações extraídas com sucesso`
    });

  } catch (error) {
    console.error('Erro ao processar C6 Bank:', error);
    return Response.json({ 
      success: false, 
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});
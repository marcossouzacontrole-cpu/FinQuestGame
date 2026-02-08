import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { file_url, account_id } = await req.json();

    if (!file_url) {
      return Response.json({ error: 'file_url é obrigatório' }, { status: 400 });
    }

    // Fetch PDF content
    const fileResponse = await fetch(file_url);
    const pdfText = await fileResponse.text();

    // Converter meses por extenso para número
    const monthMap = {
      'janeiro': '01', 'fevereiro': '02', 'março': '03', 'abril': '04',
      'maio': '05', 'junho': '06', 'julho': '07', 'agosto': '08',
      'setembro': '09', 'outubro': '10', 'novembro': '11', 'dezembro': '12'
    };

    const transactions = [];
    const lines = pdfText.split('\n');
    let currentDate = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Detectar data: "X de [Mês] de YYYY Saldo do dia:"
      const dateMatch = line.match(/^(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})\s+Saldo do dia:/i);
      if (dateMatch) {
        const day = dateMatch[1].padStart(2, '0');
        const monthName = dateMatch[2].toLowerCase();
        const year = dateMatch[3];
        const month = monthMap[monthName] || '01';
        currentDate = `${year}-${month}-${day}`;
        continue;
      }

      if (!currentDate) continue;

      // Ignorar linhas de cabeçalho, rodapé, e saldos
      if (line.includes('SAC:') || 
          line.includes('Ouvidoria:') || 
          line.includes('Fale com a gente') ||
          line.includes('Saldo total') ||
          line.includes('Saldo disponível') ||
          line.includes('Saldo bloqueado') ||
          line.includes('CAIQUE AMARAL CARDOSO') ||
          line.includes('CPF/CNPJ:') ||
          line.includes('Período:') ||
          line === '') {
        continue;
      }

      // Ignorar Estorno e Aplicação de CDB (transferências internas)
      if (line.includes('Estorno:') || line.includes('Aplicacao:')) {
        continue;
      }

      // Parse Pix enviado
      let match = line.match(/Pix enviado:\s*"([^"]+)"\s+-R\$\s*([\d,.]+)/);
      if (match) {
        const description = match[1].trim();
        const value = parseFloat(match[2].replace(/\./g, '').replace(',', '.'));
        
        transactions.push({
          date: currentDate,
          description: `Pix enviado: ${description}`,
          value: Math.abs(value),
          type: 'expense',
          account_id: account_id || null,
          source: 'Banco Inter'
        });
        continue;
      }

      // Parse Pix recebido
      match = line.match(/Pix recebido:\s*"([^"]+)"\s+R\$\s*([\d,.]+)/);
      if (match) {
        const description = match[1].trim();
        const value = parseFloat(match[2].replace(/\./g, '').replace(',', '.'));
        
        transactions.push({
          date: currentDate,
          description: `Pix recebido: ${description}`,
          value: Math.abs(value),
          type: 'income',
          account_id: account_id || null,
          source: 'Banco Inter'
        });
        continue;
      }

      // Parse Compra no débito
      match = line.match(/Compra no debito:\s*"([^"]+)"\s+-R\$\s*([\d,.]+)/);
      if (match) {
        const description = match[1].trim();
        const value = parseFloat(match[2].replace(/\./g, '').replace(',', '.'));
        
        transactions.push({
          date: currentDate,
          description: `Compra débito: ${description}`,
          value: Math.abs(value),
          type: 'expense',
          account_id: account_id || null,
          source: 'Banco Inter'
        });
        continue;
      }

      // Parse Compra Seguro Premiavel
      match = line.match(/Compra Seguro Premiavel:\s*"([^"]+)"\s+-R\$\s*([\d,.]+)/);
      if (match) {
        const description = match[1].trim();
        const value = parseFloat(match[2].replace(/\./g, '').replace(',', '.'));
        
        transactions.push({
          date: currentDate,
          description: `Seguro: ${description}`,
          value: Math.abs(value),
          type: 'expense',
          account_id: account_id || null,
          source: 'Banco Inter'
        });
        continue;
      }

      // Parse Pix enviado devolvido
      match = line.match(/Pix enviado devolvido:\s*"([^"]+)"\s+-R\$\s*([\d,.]+)/);
      if (match) {
        const description = match[1].trim();
        const value = parseFloat(match[2].replace(/\./g, '').replace(',', '.'));
        
        transactions.push({
          date: currentDate,
          description: `Pix devolvido: ${description}`,
          value: Math.abs(value),
          type: 'expense',
          account_id: account_id || null,
          source: 'Banco Inter'
        });
        continue;
      }

      // Parse Pix recebido devolvido
      match = line.match(/Pix recebido devolvido:\s*"([^"]+)"\s+-R\$\s*([\d,.]+)/);
      if (match) {
        const description = match[1].trim();
        const value = parseFloat(match[2].replace(/\./g, '').replace(',', '.'));
        
        transactions.push({
          date: currentDate,
          description: `Pix recebido devolvido: ${description}`,
          value: Math.abs(value),
          type: 'expense',
          account_id: account_id || null,
          source: 'Banco Inter'
        });
        continue;
      }
    }

    // Remove duplicatas usando hash
    const uniqueTransactions = [];
    const seenHashes = new Set();

    for (const trans of transactions) {
      const hash = `${trans.date}_${trans.description}_${trans.value}_${trans.type}`;
      if (!seenHashes.has(hash)) {
        seenHashes.add(hash);
        uniqueTransactions.push({
          ...trans,
          hash_id: hash
        });
      }
    }

    // Bulk create transactions
    if (uniqueTransactions.length > 0) {
      await base44.entities.FinTransaction.bulkCreate(uniqueTransactions);
    }

    return Response.json({
      success: true,
      transactionsCreated: uniqueTransactions.length,
      transactions: uniqueTransactions
    });

  } catch (error) {
    console.error('Banco Inter processing error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
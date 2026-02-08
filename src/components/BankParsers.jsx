// Parsers específicos para cada banco

const formatDateToISO = (dateStr) => {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) return dateStr;
  
  const parts = dateStr.split(/[\/\-]/);
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }
  
  return new Date().toISOString().split('T')[0];
};

// Parser Mercado Pago - Formato Específico
export const parseMercadoPagoPDF = async (file) => {
  if (!window.pdfjsLib) {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    document.head.appendChild(script);
    await new Promise((resolve, reject) => {
      script.onload = resolve;
      script.onerror = reject;
    });
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }
  
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    fullText += content.items.map(item => item.str).join('___SEP___') + '\n';
  }
  
  fullText = fullText.replace(/___SEP___/g, ' ');
  
  const transactions = [];
  const lines = fullText.split('\n');
  
  // REGEX MELHORADO para Mercado Pago
  // Formato: DD-MM-YYYY DESCRIÇÃO ID R$ VALOR R$ SALDO
  const mpRegex = /(\d{2}-\d{2}-\d{4})\s+(.+?)\s+(\d{10,})\s+R\$\s*(-?[\d.]+,\d{2})\s+R\$\s*-?[\d.]+,\d{2}/g;
  
  for (const line of lines) {
    const cleanLine = line.trim();
    if (!cleanLine) continue;
    
    let match;
    while ((match = mpRegex.exec(cleanLine)) !== null) {
      const dateRaw = match[1].replace(/-/g, '/');
      const date = formatDateToISO(dateRaw);
      let description = match[2].trim();
      const amountStr = match[4].replace(/\./g, '').replace(',', '.');
      const amount = parseFloat(amountStr);

      if (!isNaN(amount) && Math.abs(amount) > 0) {
        transactions.push({
          date,
          description: description.substring(0, 150),
          amount: Math.abs(amount),
          type: amount < 0 ? 'expense' : 'income',
          source: 'Mercado Pago'
        });
      }
    }
  }
  
  return transactions.filter(t => 
    t.description.length > 3 && 
    !isNaN(t.amount) && 
    t.amount > 0
  );
};

// Parser C6 Bank - Via Backend (preferencial)
export const parseC6BankPDF = async (file, base44) => {
  if (!window.pdfjsLib) {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    document.head.appendChild(script);
    await new Promise((resolve, reject) => {
      script.onload = resolve;
      script.onerror = reject;
    });
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }
  
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    fullText += content.items.map(item => item.str).join('___SEP___') + '\n';
  }
  
  fullText = fullText.replace(/___SEP___/g, ' ');

  // Tentar backend primeiro
  try {
    const c6Result = await base44.functions.invoke('processC6BankStatement', {
      extractedText: fullText
    });

    if (c6Result.data?.success && c6Result.data?.transactions?.length > 0) {
      return c6Result.data.transactions.map(t => {
        if (t.date) {
          const transDate = new Date(t.date);
          t.month = transDate.getMonth();
          t.year = transDate.getFullYear();
          t.monthYear = `${transDate.getFullYear()}-${String(transDate.getMonth() + 1).padStart(2, '0')}`;
        }
        return t;
      });
    }
  } catch (error) {
    console.error('Erro no backend C6, tentando fallback:', error);
  }
  
  // Fallback: parser frontend
  const transactions = [];
  const lines = fullText.split('\n');
  let currentYear = new Date().getFullYear();
  
  const c6DateHeaderRegex = /(?:Janeiro|Fevereiro|Março|Abril|Maio|Junho|Julho|Agosto|Setembro|Outubro|Novembro|Dezembro)\s+(\d{4})/;
  const c6LineRegex = /"?(\d{2}\/\d{2})"?\s+(.+?)\s+R\$\s*(-?[\d.]+,\d{2})/;

  for (const line of lines) {
    const cleanLine = line.trim();
    if (!cleanLine) continue;

    const headerMatch = cleanLine.match(c6DateHeaderRegex);
    if (headerMatch) {
      currentYear = headerMatch[1];
      continue;
    }

    if (cleanLine.toLowerCase().includes('saldo') || 
        cleanLine.toLowerCase().includes('ouvidoria')) {
      continue;
    }

    const c6Match = cleanLine.match(c6LineRegex);
    if (c6Match) {
      const dayMonth = c6Match[1];
      const description = c6Match[2].replace(/^["']|["']$/g, '').trim();
      const rawValue = c6Match[3];

      if (description.length < 3) continue;

      const fullDateStr = `${dayMonth}/${currentYear}`;
      const date = formatDateToISO(fullDateStr);

      let cleanValueStr = rawValue.replace(/[R$\s.]/g, '').replace(',', '.');
      let amount = parseFloat(cleanValueStr);

      if (cleanLine.includes(`-${rawValue}`) || cleanLine.includes('-R$')) {
        amount = -Math.abs(amount);
      }

      if (!isNaN(amount) && amount !== 0) {
        transactions.push({
          date,
          description,
          amount: Math.abs(amount),
          type: amount < 0 ? 'expense' : 'income',
          source: 'C6 Bank'
        });
      }
    }
  }
  
  return transactions.filter(t => 
    t.description.length > 3 && 
    !isNaN(t.amount) && 
    t.amount > 0
  );
};

// Parser Nubank CSV
export const parseNubankCSV = (text) => {
  const lines = text.split('\n').filter(l => l.trim());
  const transactions = [];
  
  // Nubank CSV: date,category,title,amount
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (cols.length >= 4) {
      const dateRaw = cols[0]?.trim();
      const date = formatDateToISO(dateRaw);
      const description = cols[2]?.trim();
      const amountStr = cols[3]?.trim().replace(/[^\d,-]/g, '').replace(',', '.');
      const amount = parseFloat(amountStr);

      if (date && description && !isNaN(amount)) {
        transactions.push({ 
          date, 
          description, 
          amount: Math.abs(amount), 
          type: amount < 0 ? 'expense' : 'income',
          source: 'Nubank'
        });
      }
    }
  }
  
  return transactions;
};

// Parser CSV Genérico
export const parseGenericCSV = (text) => {
  const lines = text.split('\n').filter(l => l.trim());
  const transactions = [];
  
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(/[,;]/);
    if (cols.length >= 3) {
      const dateRaw = cols[0]?.trim();
      const date = formatDateToISO(dateRaw);
      const description = cols[1]?.trim();
      const amountStr = cols[2]?.trim().replace(/[^\d,-]/g, '').replace(',', '.');
      const amount = parseFloat(amountStr);

      if (date && description && !isNaN(amount)) {
        transactions.push({ 
          date, 
          description, 
          amount: Math.abs(amount), 
          type: amount < 0 ? 'expense' : 'income' 
        });
      }
    }
  }
  
  return transactions;
};

// Parser Banco Inter PDF - VERSÃO ULTRA ROBUSTA E OTIMIZADA
export const parseBancoInterPDF = async (file, base44) => {
  if (!window.pdfjsLib) {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    document.head.appendChild(script);
    await new Promise((resolve, reject) => {
      script.onload = resolve;
      script.onerror = reject;
    });
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }
  
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  console.log(`🏦 Banco Inter: Processando ${pdf.numPages} páginas...`);
  
  // ESTRATÉGIA: Extrair TODAS as transações usando REGEX GLOBAL no texto completo
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    fullText += content.items.map(item => item.str).join(' ') + '\n';
  }

  const monthMap = {
    'janeiro': '01', 'fevereiro': '02', 'março': '03', 'abril': '04',
    'maio': '05', 'junho': '06', 'julho': '07', 'agosto': '08',
    'setembro': '09', 'outubro': '10', 'novembro': '11', 'dezembro': '12',
    'Outubro': '10', 'Novembro': '11', 'Dezembro': '12'
  };

  const transactions = [];
  
  // REGEX GLOBAL para capturar TODAS as transações de uma vez
  
  // 1. Capturar blocos de data completos
  const dateBlockRegex = /(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})\s+Saldo do dia:\s*R\$\s*-?[\d,.]+(.+?)(?=\d{1,2}\s+de\s+\w+\s+de\s+\d{4}\s+Saldo do dia:|Fale com a gente|$)/gis;
  
  const dateBlocks = [...fullText.matchAll(dateBlockRegex)];
  
  console.log(`📅 Blocos de data encontrados: ${dateBlocks.length}`);
  
  let totalExtracted = 0;
  
  for (const block of dateBlocks) {
    const day = block[1].padStart(2, '0');
    const monthName = block[2];
    const year = block[3];
    const transactionsBlock = block[4];
    
    const month = monthMap[monthName.toLowerCase()] || monthMap[monthName] || '01';
    const currentDate = `${year}-${month}-${day}`;
    
    console.log(`📆 Processando ${currentDate}...`);
    
    // REGEX GLOBAL para cada tipo de transação dentro do bloco
    
    // Pix enviado
    const pixEnviadoRegex = /Pix enviado:\s*"([^"]+)"\s+-R\$\s*([\d,.]+)/gi;
    const pixEnviadoMatches = [...transactionsBlock.matchAll(pixEnviadoRegex)];
    
    for (const match of pixEnviadoMatches) {
      const description = match[1].trim();
      const valueStr = match[2].replace(/\./g, '').replace(',', '.');
      const value = parseFloat(valueStr);
      
      if (!isNaN(value) && value > 0) {
        transactions.push({
          date: currentDate,
          description: description,
          amount: value,
          type: 'expense',
          source: 'Banco Inter'
        });
        totalExtracted++;
      }
    }
    
    // Pix recebido
    const pixRecebidoRegex = /Pix recebido:\s*"([^"]+)"\s+R\$\s*([\d,.]+)/gi;
    const pixRecebidoMatches = [...transactionsBlock.matchAll(pixRecebidoRegex)];
    
    for (const match of pixRecebidoMatches) {
      const description = match[1].trim();
      const valueStr = match[2].replace(/\./g, '').replace(',', '.');
      const value = parseFloat(valueStr);
      
      if (!isNaN(value) && value > 0) {
        transactions.push({
          date: currentDate,
          description: description,
          amount: value,
          type: 'income',
          source: 'Banco Inter'
        });
        totalExtracted++;
      }
    }
    
    // Compra no débito
    const compraDebitoRegex = /Compra no debito:\s*"([^"]+)"\s+-R\$\s*([\d,.]+)/gi;
    const compraDebitoMatches = [...transactionsBlock.matchAll(compraDebitoRegex)];
    
    for (const match of compraDebitoMatches) {
      let description = match[1].trim();
      description = description.replace(/^No estabelecimento\s+/i, '');
      const valueStr = match[2].replace(/\./g, '').replace(',', '.');
      const value = parseFloat(valueStr);
      
      if (!isNaN(value) && value > 0) {
        transactions.push({
          date: currentDate,
          description: description,
          amount: value,
          type: 'expense',
          source: 'Banco Inter'
        });
        totalExtracted++;
      }
    }
    
    // Compra Seguro Premiavel
    const seguroRegex = /Compra Seguro Premiavel:\s*"([^"]+)"\s+-R\$\s*([\d,.]+)/gi;
    const seguroMatches = [...transactionsBlock.matchAll(seguroRegex)];
    
    for (const match of seguroMatches) {
      const description = match[1].trim();
      const valueStr = match[2].replace(/\./g, '').replace(',', '.');
      const value = parseFloat(valueStr);
      
      if (!isNaN(value) && value > 0) {
        transactions.push({
          date: currentDate,
          description: description,
          amount: value,
          type: 'expense',
          source: 'Banco Inter'
        });
        totalExtracted++;
      }
    }
    
    console.log(`  ✓ ${currentDate}: ${pixEnviadoMatches.length + pixRecebidoMatches.length + compraDebitoMatches.length + seguroMatches.length} transações`);
  }

  console.log(`✅ Banco Inter: ${totalExtracted} transações capturadas TOTAL`);
  
  // Deduplicação por hash
  const uniqueTransactions = [];
  const seenHashes = new Set();
  
  for (const trans of transactions) {
    const hash = `${trans.date}_${trans.description}_${trans.amount}_${trans.type}`;
    if (!seenHashes.has(hash)) {
      seenHashes.add(hash);
      uniqueTransactions.push(trans);
    }
  }

  console.log(`📊 Banco Inter: ${uniqueTransactions.length} transações únicas (após deduplicação)`);
  
  if (uniqueTransactions.length === 0) {
    console.error('❌ NENHUMA TRANSAÇÃO EXTRAÍDA! Verifique o formato do PDF.');
    console.log('📝 Primeiros 1000 caracteres do texto:', fullText.substring(0, 1000));
  }
  
  return uniqueTransactions;
};

// Parser OFX (Bradesco, Itaú)
export const parseOFX = (text, bankName = 'OFX') => {
  const transactions = [];
  const trnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  const matches = text.matchAll(trnRegex);
  
  for (const match of matches) {
    const block = match[1];
    const amountMatch = block.match(/<TRNAMT>([-\d.]+)/);
    const dateMatch = block.match(/<DTPOSTED>(\d{8})/);
    const memoMatch = block.match(/<MEMO>(.*?)(?:<|$)/);

    if (amountMatch && dateMatch && memoMatch) {
      const amount = parseFloat(amountMatch[1]);
      const dateRaw = dateMatch[1].replace(/(\d{4})(\d{2})(\d{2})/, '$3/$2/$1');
      const date = formatDateToISO(dateRaw);
      const description = memoMatch[1].trim();

      transactions.push({ 
        date, 
        description, 
        amount: Math.abs(amount), 
        type: amount < 0 ? 'expense' : 'income',
        source: bankName
      });
    }
  }
  
  return transactions;
};
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Zap, AlertTriangle, Check, Shield, TrendingDown, X, Plus, BookmarkPlus, Settings, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import TransactionRuleManager from './TransactionRuleManager';

// Função para padronizar datas no formato ISO (YYYY-MM-DD)
const formatDateToISO = (dateStr) => {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  
  // Se já estiver em YYYY-MM-DD, retorna
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) return dateStr;
  
  // Tenta converter DD/MM/YYYY ou DD-MM-YYYY
  const parts = dateStr.split(/[\/\-]/);
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }
  
  return new Date().toISOString().split('T')[0];
};

const NeonCard = ({ children, glowColor = 'cyan', className = '' }) => {
  const colors = {
    cyan: 'border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.15)] bg-slate-900/80',
    green: 'border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)] bg-slate-900/80',
    red: 'border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.15)] bg-slate-900/80',
    purple: 'border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.15)] bg-slate-900/80',
    gold: 'border-yellow-500/30 shadow-[0_0_20px_rgba(234,179,8,0.15)] bg-slate-900/80',
  };
  return (
    <div className={`rounded-2xl border backdrop-blur-xl p-6 relative overflow-hidden ${colors[glowColor] || colors.cyan} ${className}`}>
      {children}
    </div>
  );
};

const autoClassifyTransaction = (description, transactionType, existingCategories, rules) => {
  const lowerDesc = description.toLowerCase();
  
  // PRIORIDADE 1: Usar regras salvas pelo usuário
  if (rules && rules.length > 0) {
    for (const rule of rules) {
      if (rule.transaction_type !== transactionType || !rule.auto_apply) continue;
      
      const pattern = rule.pattern.toLowerCase();
      const matches = rule.match_type === 'exact' 
        ? lowerDesc === pattern 
        : lowerDesc.includes(pattern);
      
      if (matches) {
        return { category: rule.category, confidence: 0.95, source: 'rule' };
      }
    }
  }
  
  // PRIORIDADE 2: Keywords das categorias existentes
  for (const category of existingCategories) {
    const keywords = category.keywords || [];
    const categoryType = category.category_type || 'expense';
    
    const typeMatch = (transactionType === 'income' && categoryType === 'guardian') || 
                      (transactionType === 'expense' && categoryType === 'expense');
    
    if (typeMatch && keywords.some(keyword => lowerDesc.includes(keyword.toLowerCase()))) {
      return { category: category.name, confidence: 0.9, source: 'keyword' };
    }
  }
  
  // PRIORIDADE 3: Dicionário padrão expandido
  const EXPENSE_KEYWORDS = {
    'Alimentação': [
      'ifood', 'rappi', 'uber eats', 'restaurante', 'lanchonete', 'pizzaria', 'hamburgueria',
      'mercado', 'supermercado', 'padaria', 'acougue', 'hortifruti', 'quitanda',
      'cafe', 'cafeteria', 'bar', 'pub', 'choperia', 'food', 'delivery',
      'mcdonalds', 'burguer king', 'subway', 'outback', 'vivanda', 'carrefour', 'extra',
      'pao de acucar', 'assai', 'atacadao', 'makro'
    ],
    'Transporte': [
      'uber', '99', '99pop', 'taxi', 'cabify', 'lyft',
      'posto', 'shell', 'ipiranga', 'br distribuidora', 'petrobras',
      'gasolina', 'combustivel', 'alcool', 'etanol', 'diesel',
      'estacionamento', 'zona azul', 'estapar', 'valet',
      'pedagio', 'via facil', 'sem parar', 'conectcar', 'veloe',
      'onibus', 'metro', 'trem', 'cptm', 'sptrans', 'metra', 'uber trip'
    ],
    'Saúde': [
      'farmacia', 'drogaria', 'droga raia', 'drogasil', 'ultrafarma', 'pague menos',
      'hospital', 'clinica', 'consultorio', 'laboratorio', 'exame',
      'medico', 'dentista', 'psicologo', 'terapeuta', 'fisioterapia',
      'plano de saude', 'unimed', 'amil', 'sulamerica', 'bradesco saude', 'notredame',
      'otica', 'oculos', 'lentes', 'ortopedia'
    ],
    'Moradia': [
      'aluguel', 'condominio', 'iptu', 'sindico', 'administradora',
      'energia', 'luz', 'eletricidade', 'enel', 'light', 'cemig', 'copel', 'celesc',
      'agua', 'saneamento', 'sabesp', 'cedae', 'sanepar', 'embasa',
      'internet', 'net', 'claro', 'vivo', 'oi', 'tim', 'sky',
      'gas', 'ultragaz', 'liquigas', 'supergasbras'
    ],
    'Lazer': [
      'spotify', 'netflix', 'prime video', 'disney', 'hbo', 'globoplay', 'paramount',
      'youtube premium', 'deezer', 'apple music', 'amazon music',
      'cinema', 'cinemark', 'uci', 'moviecom', 'ingresso', 'kinoplex',
      'steam', 'playstation', 'xbox', 'nintendo', 'epic games', 'blizzard',
      'show', 'teatro', 'concerto', 'festival', 'evento',
      'academia', 'smartfit', 'bodytech', 'bioritmo', 'fitness'
    ],
    'Vestuário': [
      'zara', 'renner', 'c&a', 'riachuelo', 'marisa', 'centauro', 'netshoes',
      'nike', 'adidas', 'puma', 'roupa', 'calcado', 'sapato', 'tenis',
      'lojas americanas', 'magazine luiza', 'casas bahia'
    ],
    'Educação': [
      'escola', 'faculdade', 'universidade', 'curso', 'ensino',
      'livro', 'livraria', 'saraiva', 'cultura', 'material escolar',
      'udemy', 'coursera', 'alura', 'hotmart', 'eduzz'
    ],
    'Serviços': [
      'correios', 'cartorio', 'despachante', 'advocacia', 'contabilidade',
      'conserto', 'reparo', 'manutencao', 'assistencia tecnica',
      'limpeza', 'lavanderia', 'tinturaria', 'costureira'
    ],
    'Beleza': [
      'salao', 'cabeleireiro', 'barbeiro', 'manicure', 'pedicure',
      'estetica', 'spa', 'massagem', 'depilacao',
      'perfume', 'maquiagem', 'cosmetico', 'sephora', 'boticario', 'natura', 'avon'
    ],
    'Pet': [
      'veterinario', 'pet shop', 'petshop', 'racao', 'banho e tosa',
      'petz', 'cobasi', 'zee.dog'
    ],
    'Impostos': [
      'ipva', 'iptu', 'ir', 'imposto de renda', 'darf', 'tributo', 'taxa'
    ],
    'Seguros': [
      'seguro', 'porto seguro', 'bradesco seguros', 'sulamerica seguros',
      'itau seguros', 'mapfre', 'liberty seguros'
    ]
  };

  const INCOME_KEYWORDS = {
    'Salário': [
      'salario', 'pagamento', 'vencimento', 'remuneracao', 'ordenado',
      'pro labore', 'adiantamento', 'folha de pagamento', 'contracheque'
    ],
    'Rendimentos': [
      'rendimento', 'juros', 'rendimentos', 'dividendos', 'proventos',
      'cdb', 'lci', 'lca', 'tesouro', 'fundo', 'aplicacao'
    ],
    'Receitas': [
      'pix recebido', 'transferencia recebida', 'ted recebida', 'doc recebido',
      'deposito', 'credito', 'recebimento', 'venda', 'receita',
      'freelance', 'freela', 'servico prestado', 'consultoria', 'honorario'
    ],
    'Reembolso': [
      'reembolso', 'estorno', 'devolucao', 'ressarcimento', 'cashback'
    ]
  };
  
  const keywords = transactionType === 'income' ? INCOME_KEYWORDS : EXPENSE_KEYWORDS;
  
  for (const [category, keywordList] of Object.entries(keywords)) {
    if (keywordList.some(keyword => lowerDesc.includes(keyword))) {
      return { category, confidence: 0.7, source: 'default' };
    }
  }
  
  return { category: null, confidence: 0, source: null };
};

// Parser CSV
const parseCSV = (text) => {
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
        transactions.push({ date, description, amount: Math.abs(amount), type: amount < 0 ? 'expense' : 'income' });
      }
    }
  }
  
  return transactions;
};

// Parser OFX
const parseOFX = (text) => {
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

      transactions.push({ date, description, amount: Math.abs(amount), type: amount < 0 ? 'expense' : 'income' });
    }
  }
  
  return transactions;
};



// Parser PDF - Suporta C6 Bank (com contexto de ano) e Mercado Pago
const parsePDF = async (file) => {
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

  // TRY C6 BANK VIA BACKEND FIRST
  const isC6Bank = fullText.includes('C6BANK') || 
                   fullText.includes('C6 Bank') ||
                   fullText.includes('Extrato exportado');

  if (isC6Bank) {
    try {
      console.log('🏦 C6 Bank detectado, chamando backend...');
      console.log('Tamanho do texto extraído:', fullText.length);
      
      const c6Result = await base44.functions.invoke('processC6BankStatement', {
        extractedText: fullText
      });

      console.log('Resposta do backend:', c6Result.data);

      if (c6Result.data?.success && c6Result.data?.transactions?.length > 0) {
        toast.success(`🏦 C6 Bank detectado! ${c6Result.data.message}`, { duration: 4000 });
        const enrichedC6 = c6Result.data.transactions.map(t => {
          if (t.date) {
            const transDate = new Date(t.date);
            t.month = transDate.getMonth();
            t.year = transDate.getFullYear();
            t.monthYear = `${transDate.getFullYear()}-${String(transDate.getMonth() + 1).padStart(2, '0')}`;
          }
          return t;
        });
        console.log('✅ Transações processadas:', enrichedC6.length);
        return enrichedC6;
      } else {
        console.warn('Backend não retornou transações:', c6Result.data);
        toast.error(`Backend retornou: ${c6Result.data?.message || 'Nenhuma transação encontrada'}`);
      }
    } catch (c6Error) {
      console.error('❌ Erro ao processar C6 Bank via backend:', c6Error);
      toast.error(`Erro no processamento: ${c6Error.message}`);
    }
  }
  
  // FALLBACK: Parser Frontend para C6 e Mercado Pago
  const transactions = [];
  const lines = fullText.split('\n');
  
  let currentYear = new Date().getFullYear();
  
  // REGEX PATTERNS
  const mpRegex = /(\d{2}-\d{2}-\d{4})\s+(.+?)\s+(\d{10,})\s+R\$\s*(-?\d{1,3}(?:\.\d{3})*,\d{2})\s+R\$\s*-?\d{1,3}(?:\.\d{3})*,\d{2}/;
  const c6DateHeaderRegex = /(?:Janeiro|Fevereiro|Março|Abril|Maio|Junho|Julho|Agosto|Setembro|Outubro|Novembro|Dezembro)\s+(\d{4})|(\d{2}\/\d{2}\/(\d{4}))/;
  const c6LineRegex = /"?(\d{2}\/\d{2})"?.*?["']?([^"'\d][^"']{3,})["']?.*?R\$\s*(-?[\d.]*,\d{2})/;

  for (const line of lines) {
    const cleanLine = line.trim();
    if (!cleanLine) continue;

    // MERCADO PAGO
    const mpMatch = cleanLine.match(mpRegex);
    if (mpMatch) {
      const dateRaw = mpMatch[1].replace(/-/g, '/');
      const date = formatDateToISO(dateRaw);
      let description = mpMatch[2].trim();
      const amountStr = mpMatch[4].replace(/\./g, '').replace(',', '.');
      const amount = parseFloat(amountStr);

      if (!isNaN(amount) && Math.abs(amount) > 0) {
        transactions.push({
          date,
          description: description.substring(0, 100),
          amount: Math.abs(amount),
          type: amount < 0 ? 'expense' : 'income',
          source: 'Mercado Pago'
        });
      }
      continue;
    }

    // C6 BANK - Atualizar ano pelo contexto
    const headerMatch = cleanLine.match(c6DateHeaderRegex);
    if (headerMatch) {
      const foundYear = headerMatch[1] || headerMatch[3];
      if (foundYear) {
        currentYear = foundYear;
      }
    }

    // Ignorar linhas de saldo ou lixo
    if (cleanLine.toLowerCase().includes('saldo do dia') || 
        cleanLine.toLowerCase().includes('data lançamento') ||
        cleanLine.includes('ouvidoria')) {
      continue;
    }

    // C6 BANK - Processar linha de transação
    const c6Match = cleanLine.match(c6LineRegex);
    if (c6Match) {
      const dayMonth = c6Match[1];
      const rawDesc = c6Match[2];
      const rawValue = c6Match[3];

      const fullDateStr = `${dayMonth}/${currentYear}`;
      const date = formatDateToISO(fullDateStr);

      let description = rawDesc.replace(/^["']|["']$/g, '').trim();
      
      if (description.length < 3) continue;

      let cleanValueStr = rawValue.replace(/[R$\s.]/g, '').replace(',', '.');
      let amount = parseFloat(cleanValueStr);

      if (cleanLine.includes(`-"${rawValue}`) || cleanLine.includes(`-R$`) || cleanValueStr.startsWith('-')) {
        if (amount > 0) amount = -amount;
      }

      if (!isNaN(amount)) {
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
  
  // Deduplicação
  const uniqueTransactions = transactions.filter((t, index, self) =>
    index === self.findIndex((t2) => (
      t2.date === t.date && 
      t2.description === t.description && 
      t2.amount === t.amount
    ))
  );

  return uniqueTransactions.filter(t => 
    t.description.length > 3 && 
    !isNaN(t.amount) && 
    t.amount > 0 &&
    !t.description.includes('Saldo inicial') &&
    !t.description.includes('Saldo final')
  );
};

export default function BankStatementImporter({ onClose, onImport }) {
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState('selectBank');
  const [selectedBank, setSelectedBank] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [progress, setProgress] = useState(0);
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [isManagingRules, setIsManagingRules] = useState(false);
  const [newCategoryForm, setNewCategoryForm] = useState({ name: '', budget: '', frequency: 'monthly', color: '#00FFFF', category_type: 'expense' });
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStats, setImportStats] = useState({ current: 0, total: 0 });
  const [isCleaningDuplicates, setIsCleaningDuplicates] = useState(false);
  const [expandedMonths, setExpandedMonths] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, identified, unidentified
  const [filterCategory, setFilterCategory] = useState('all');
  const [autoApplyRules, setAutoApplyRules] = useState(true);
  const [selectedSheet, setSelectedSheet] = useState(0);
  const [availableSheets, setAvailableSheets] = useState([]);
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [aiSuggestionFor, setAiSuggestionFor] = useState(null);
  const [isGeneratingAISuggestion, setIsGeneratingAISuggestion] = useState(false);

  // Configuração de bancos suportados
  const SUPPORTED_BANKS = [
    { 
      id: 'c6bank', 
      name: 'C6 Bank', 
      icon: '🏦', 
      color: 'from-gray-600 to-slate-700',
      formats: ['PDF'],
      description: 'Extrato em PDF do C6 Bank'
    },
    { 
      id: 'mercadopago', 
      name: 'Mercado Pago', 
      icon: '💙', 
      color: 'from-blue-500 to-blue-600',
      formats: ['PDF'],
      description: 'Extrato em PDF do Mercado Pago'
    },
    { 
      id: 'nubank', 
      name: 'Nubank', 
      icon: '💜', 
      color: 'from-purple-600 to-purple-700',
      formats: ['CSV', 'PDF'],
      description: 'Extrato CSV ou PDF do Nubank'
    },
    { 
      id: 'inter', 
      name: 'Banco Inter', 
      icon: '🧡', 
      color: 'from-orange-500 to-orange-600',
      formats: ['PDF', 'CSV', 'OFX'],
      description: 'Extrato PDF, CSV ou OFX do Inter'
    },
    { 
      id: 'bradesco', 
      name: 'Bradesco', 
      icon: '🔴', 
      color: 'from-red-600 to-red-700',
      formats: ['OFX', 'PDF'],
      description: 'Extrato OFX ou PDF do Bradesco'
    },
    { 
      id: 'itau', 
      name: 'Itaú', 
      icon: '🟠', 
      color: 'from-orange-600 to-yellow-600',
      formats: ['OFX', 'PDF'],
      description: 'Extrato OFX ou PDF do Itaú'
    },
    { 
      id: 'generic', 
      name: 'Genérico', 
      icon: '📊', 
      color: 'from-cyan-500 to-blue-500',
      formats: ['CSV', 'OFX', 'XLSX'],
      description: 'CSV genérico ou planilha Excel'
    }
  ];

  const toggleMonth = (monthKey) => {
    setExpandedMonths(prev => ({
      ...prev,
      [monthKey]: !prev[monthKey]
    }));
  };
  
  const { data: currentUser } = useQuery({
    queryKey: ['base44User'],
    queryFn: () => base44.auth.me(),
  });

  const { data: budgetCategories = [] } = useQuery({
    queryKey: ['budgetCategories', currentUser?.email],
    queryFn: () => base44.entities.BudgetCategory.filter({ created_by: currentUser.email }),
    enabled: !!currentUser?.email
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts', currentUser?.email],
    queryFn: () => base44.entities.Account.filter({ created_by: currentUser.email }),
    enabled: !!currentUser?.email
  });

  const { data: rules = [] } = useQuery({
    queryKey: ['transactionRules', currentUser?.email],
    queryFn: () => base44.entities.TransactionRule.filter({ created_by: currentUser.email }, '-priority'),
    enabled: !!currentUser?.email
  });
  
  const FALLBACK_CATEGORIES = [
    { id: 'temp_alim', name: 'Alimentação', category_type: 'expense' },
    { id: 'temp_trans', name: 'Transporte', category_type: 'expense' },
    { id: 'temp_lazer', name: 'Lazer', category_type: 'expense' },
    { id: 'temp_salario', name: 'Salário', category_type: 'guardian' },
  ];
  
  const availableCategories = budgetCategories.length > 0 ? budgetCategories : FALLBACK_CATEGORIES;
  
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    if (!selectedBank) {
      toast.error('⚠️ Selecione um banco primeiro!');
      return;
    }

    // Verificar se é Excel/CSV com múltiplas abas
    const file = files[0];
    const ext = file.name.split('.').pop().toLowerCase();

    if (ext === 'xlsx' || ext === 'xls') {
      // Carregar biblioteca XLSX se necessário
      if (!window.XLSX) {
        const script = document.createElement('script');
        script.src = 'https://cdn.sheetjs.com/xlsx-0.20.0/package/dist/xlsx.full.min.js';
        await new Promise((resolve) => {
          script.onload = resolve;
          document.body.appendChild(script);
        });
      }

      const arrayBuffer = await file.arrayBuffer();
      const workbook = window.XLSX.read(arrayBuffer, { type: 'array' });

      if (workbook.SheetNames.length > 1) {
        setAvailableSheets(workbook.SheetNames);
        toast.info(`📊 ${workbook.SheetNames.length} abas detectadas! Selecione qual deseja importar.`, { duration: 5000 });

        // Processar todas as abas automaticamente
        setPhase('processing');
        setProgress(0);
        let allParsed = [];

        for (let i = 0; i < workbook.SheetNames.length; i++) {
          setProgress(((i / workbook.SheetNames.length) * 80));
          const sheet = workbook.Sheets[workbook.SheetNames[i]];
          const csvData = window.XLSX.utils.sheet_to_csv(sheet);
          const parsed = parseCSV(csvData);

          parsed.forEach(t => {
            t.source = `${file.name} - Aba: ${workbook.SheetNames[i]}`;
            if (t.date) {
              const transDate = new Date(t.date);
              t.month = transDate.getMonth();
              t.year = transDate.getFullYear();
              t.monthYear = `${transDate.getFullYear()}-${String(transDate.getMonth() + 1).padStart(2, '0')}`;
            }
          });

          allParsed = [...allParsed, ...parsed];
        }

        setProgress(90);

        // Aplicar regras automaticamente se ativado
        const enriched = allParsed.map((t, idx) => {
          let category = null;
          let confidence = 0;
          let source = null;

          if (autoApplyRules) {
            const classification = autoClassifyTransaction(t.description, t.type, availableCategories, rules);
            category = classification.category;
            confidence = classification.confidence;
            source = classification.source;
          }

          return {
            id: `temp_${idx}`,
            ...t,
            category,
            confidence,
            classificationSource: source,
            selected: true
          };
        });

        setProgress(100);
        setTransactions(enriched);

        const monthKeys = {};
        enriched.forEach(t => {
          if (t.monthYear) monthKeys[t.monthYear] = true;
        });
        setExpandedMonths(monthKeys);

        setPhase('review');

        const autoClassified = enriched.filter(t => t.category).length;
        toast.success(
          `✨ ${workbook.SheetNames.length} abas importadas! ${autoClassified} de ${enriched.length} transações classificadas.`,
          { duration: 4000 }
        );

        return;
      }
    }

    // Processamento com banco selecionado
    setPhase('processing');
    setProgress(0);

    try {
      let allParsed = [];
      const detectedBank = SUPPORTED_BANKS.find(b => b.id === selectedBank)?.name || 'Banco Selecionado';

      // Importar parsers
      const { 
        parseC6BankPDF, 
        parseMercadoPagoPDF, 
        parseNubankCSV, 
        parseGenericCSV, 
        parseOFX,
        parseBancoInterPDF
      } = await import('./BankParsers');

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.split('.').pop().toLowerCase();

        setProgress(((i / files.length) * 80));

        let parsed = [];

        try {
          // Roteamento específico por banco
          switch (selectedBank) {
            case 'c6bank':
              if (ext === 'pdf') {
                parsed = await parseC6BankPDF(file, base44);
              } else {
                toast.error('C6 Bank: apenas PDF é suportado');
              }
              break;

            case 'mercadopago':
              if (ext === 'pdf') {
                parsed = await parseMercadoPagoPDF(file);
              } else {
                toast.error('Mercado Pago: apenas PDF é suportado');
              }
              break;

            case 'nubank':
              if (ext === 'csv') {
                const text = await file.text();
                parsed = parseNubankCSV(text);
              } else if (ext === 'pdf') {
                toast.info('Nubank PDF: usando parser genérico');
                const text = await file.text();
                parsed = parseGenericCSV(text);
              } else {
                toast.error('Nubank: apenas CSV ou PDF');
              }
              break;

            case 'inter':
              if (ext === 'pdf') {
                parsed = await parseBancoInterPDF(file, base44);
              } else if (ext === 'ofx') {
                const text = await file.text();
                parsed = parseOFX(text, detectedBank);
              } else if (ext === 'csv') {
                const text = await file.text();
                parsed = parseGenericCSV(text);
              } else {
                toast.error(`${detectedBank}: PDF, OFX ou CSV esperado`);
              }
              break;

            case 'bradesco':
            case 'itau':
              if (ext === 'ofx') {
                const text = await file.text();
                parsed = parseOFX(text, detectedBank);
              } else if (ext === 'csv') {
                const text = await file.text();
                parsed = parseGenericCSV(text);
              } else {
                toast.error(`${detectedBank}: OFX ou CSV esperado`);
              }
              break;

            case 'generic':
              if (ext === 'csv') {
                const text = await file.text();
                parsed = parseGenericCSV(text);
              } else if (ext === 'ofx') {
                const text = await file.text();
                parsed = parseOFX(text, 'Genérico');
              } else if (ext === 'xlsx' || ext === 'xls') {
                // Excel já tratado anteriormente
                toast.info('Excel detectado, processando...');
              } else {
                toast.error('Formato não suportado');
              }
              break;

            default:
              toast.error('Banco não reconhecido');
              continue;
          }
        } catch (parseError) {
          console.error(`Erro ao parsear ${file.name}:`, parseError);
          toast.error(`Erro ao processar ${file.name}: ${parseError.message}`);
          continue;
        }
        
        // Adicionar mês/ano a cada transação
        parsed.forEach(t => {
          if (t.date) {
            const transDate = new Date(t.date);
            t.month = transDate.getMonth();
            t.year = transDate.getFullYear();
            t.monthYear = `${transDate.getFullYear()}-${String(transDate.getMonth() + 1).padStart(2, '0')}`;
          }
        });
        
        allParsed = [...allParsed, ...parsed];
      }
      
      setProgress(90);

      // Ordenar por data
      allParsed.sort((a, b) => new Date(a.date) - new Date(b.date));

      // Auto-classificar usando regras e categorias (se ativado)
      const enriched = allParsed.map((t, idx) => {
        let category = null;
        let confidence = 0;
        let source = null;

        if (autoApplyRules) {
          const classification = autoClassifyTransaction(t.description, t.type, availableCategories, rules);
          category = classification.category;
          confidence = classification.confidence;
          source = classification.source;
        }

        return {
          id: `temp_${idx}`,
          ...t,
          category,
          confidence,
          classificationSource: source,
          selected: true
        };
      });
      
      setProgress(100);
      setTransactions(enriched);
      
      // Expandir todos os meses por padrão
      const monthKeys = {};
      enriched.forEach(t => {
        if (t.monthYear) {
          monthKeys[t.monthYear] = true;
        }
      });
      setExpandedMonths(monthKeys);
      
      setPhase('review');
      
      // Exibir estatísticas de classificação
      const autoClassified = enriched.filter(t => t.category).length;
      const monthsCount = new Set(enriched.map(t => t.monthYear)).size;
      toast.success(
        `✨ ${detectedBank}: ${autoClassified} de ${enriched.length} transações classificadas automaticamente!\n📅 ${monthsCount} mês(es) importado(s)`,
        { duration: 4000 }
      );
      
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      alert('Erro ao processar arquivo. Verifique o formato.');
      setPhase('upload');
    }
  };
  
  const toggleSelection = (id) => {
    setTransactions(prev => prev.map(t => 
      t.id === id ? { ...t, selected: !t.selected } : t
    ));
  };
  
  const updateDescription = (id, newDescription) => {
    setTransactions(prev => prev.map(t => 
      t.id === id ? { ...t, description: newDescription } : t
    ));
  };

  const requestAIDescriptionSuggestion = async (transaction) => {
    setAiSuggestionFor(transaction.id);
    setIsGeneratingAISuggestion(true);

    try {
      const historicalTransactions = transactions
        .filter(t => t.description.toLowerCase().includes(transaction.description.toLowerCase().substring(0, 10)))
        .slice(0, 5);

      const prompt = `Analise esta transação e sugira uma descrição limpa e padronizada:

Descrição Original: "${transaction.description}"
Valor: R$ ${transaction.amount}
Tipo: ${transaction.type === 'income' ? 'Receita' : 'Despesa'}

Histórico Similar:
${historicalTransactions.map(t => `- "${t.description}" (${t.category || 'Sem categoria'})`).join('\n') || 'Nenhum histórico similar'}

REGRAS:
- Remova códigos, números de transação e informações redundantes
- Mantenha apenas o essencial: estabelecimento/pessoa/serviço
- Padronize nomes (ex: "IFOOD*RESTAURANTE ABC" → "iFood - Restaurante ABC")
- Seja conciso e claro
- Retorne APENAS a descrição limpa, sem explicações

Descrição sugerida:`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false
      });

      const suggestion = result.trim();

      if (suggestion) {
        const confirmed = confirm(
          `🤖 Sugestão de IA:\n\n` +
          `Original: "${transaction.description}"\n` +
          `Sugerida: "${suggestion}"\n\n` +
          `Deseja aplicar esta descrição?`
        );

        if (confirmed) {
          updateDescription(transaction.id, suggestion);
          toast.success('✨ Descrição atualizada pela IA!');
        }
      } else {
        toast.error('Não foi possível gerar sugestão');
      }
    } catch (error) {
      console.error('Erro ao gerar sugestão:', error);
      toast.error('Erro ao gerar sugestão');
    } finally {
      setIsGeneratingAISuggestion(false);
      setAiSuggestionFor(null);
    }
  };

  const updateCategory = (id, category) => {
    const transaction = transactions.find(t => t.id === id);
    if (!transaction) return;

    // Atualizar a transação atual
    setTransactions(prev => prev.map(t => 
      t.id === id ? { ...t, category, confidence: 1 } : t
    ));
    
    // Verificar se existem transações com histórico igual sem categoria
    const exactMatches = transactions.filter(t => 
      t.id !== id && 
      t.type === transaction.type &&
      !t.category && 
      t.description.toLowerCase().trim() === transaction.description.toLowerCase().trim()
    );
    
    if (exactMatches.length > 0) {
      const confirmed = confirm(
        `🔍 Encontramos ${exactMatches.length} transação(ões) com histórico igual:\n\n` +
        `"${transaction.description}"\n\n` +
        `Deseja aplicar a categoria "${category}" para todas?`
      );
      
      if (confirmed) {
        setTransactions(prev => prev.map(t => 
          exactMatches.some(em => em.id === t.id)
            ? { ...t, category, confidence: 0.95 }
            : t
        ));
        toast.success(`✨ Categoria aplicada para ${exactMatches.length + 1} transações!`);
      }
    }
  };

  const saveAsRule = async (transaction) => {
    if (!transaction.category) {
      toast.error('Selecione uma categoria primeiro');
      return;
    }

    const confirmed = confirm(
      `💾 Salvar Regra Permanente\n\n` +
      `Histórico: "${transaction.description}"\n` +
      `Categoria: ${transaction.category}\n\n` +
      `Esta regra será aplicada automaticamente em futuras importações.`
    );

    if (!confirmed) return;

    try {
      await base44.entities.TransactionRule.create({
        pattern: transaction.description,
        category: transaction.category,
        transaction_type: transaction.type,
        match_type: 'contains',
        auto_apply: true,
        priority: 10
      });

      // CORREÇÃO: Aplicar categoria instantaneamente em todas transações com mesmo histórico
      setTransactions(prev => prev.map(t => {
        // Se é a transação original ou tem o mesmo histórico e tipo
        const isSamePattern = t.description.toLowerCase().trim() === transaction.description.toLowerCase().trim();
        const isSameType = t.type === transaction.type;

        if (isSamePattern && isSameType) {
          return { ...t, category: transaction.category, confidence: 1, ruleSaved: true };
        }

        return t;
      }));

      queryClient.invalidateQueries(['transactionRules']);

      // Contar quantas transações foram afetadas
      const affectedCount = transactions.filter(t => 
        t.description.toLowerCase().trim() === transaction.description.toLowerCase().trim() &&
        t.type === transaction.type
      ).length;

      toast.success(`✨ Regra salva! ${affectedCount} transação(ões) classificada(s) automaticamente!`);
    } catch (error) {
      toast.error('Erro ao salvar regra');
    }
  };
  
  const createCategoryMutation = useMutation({
    mutationFn: (data) => base44.entities.BudgetCategory.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['budgetCategories']);
      toast.success('✨ Categoria criada!');
    }
  });
  
  const cleanDuplicates = async () => {
    if (!confirm('🧹 Limpar Categorias Duplicadas?\n\nO sistema vai identificar e remover categorias com nomes iguais (ignorando emojis), mantendo apenas a mais antiga de cada grupo.\n\nDeseja continuar?')) {
      return;
    }

    setIsCleaningDuplicates(true);
    try {
      const response = await base44.functions.invoke('cleanDuplicateCategories');
      
      if (response.data.success) {
        queryClient.invalidateQueries(['budgetCategories']);
        toast.success(
          `✓ Limpeza concluída!\n\n` +
          `${response.data.deleted} categoria(s) duplicada(s) removida(s)\n` +
          `${response.data.remaining_unique} categoria(s) únicas mantidas`,
          { duration: 5000 }
        );
      }
    } catch (error) {
      console.error('Erro ao limpar duplicatas:', error);
      toast.error('Erro ao limpar duplicatas');
    } finally {
      setIsCleaningDuplicates(false);
    }
  };

  const handleCreateCategory = async (transactionId = null) => {
    if (!newCategoryForm.name || !newCategoryForm.budget) {
      toast.error('Preencha nome e orçamento');
      return;
    }

    // Limpar emojis e espaços extras para validação
    const cleanName = (name) => name.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{27BF}]|[\u{1F000}-\u{1F02F}]|[\u{1F0A0}-\u{1F0FF}]|[\u{1F100}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F900}-\u{1F9FF}]|[\u{2300}-\u{23FF}]|[\u{2B50}]|[\u{203C}-\u{3299}]/gu, '').trim().toLowerCase();

    const newCategoryClean = cleanName(newCategoryForm.name);

    // Verificar se já existe uma categoria com o mesmo nome (ignorando emojis)
    const existingCategory = budgetCategories.find(cat => 
      cleanName(cat.name) === newCategoryClean
    );

    if (existingCategory) {
      toast.error(
        `⚠️ Categoria já existe!\n\n"${existingCategory.name}" já está cadastrada no sistema.`,
        { duration: 5000 }
      );
      return;
    }

    try {
      await createCategoryMutation.mutateAsync({
        name: newCategoryForm.name,
        budget: parseFloat(newCategoryForm.budget),
        frequency: newCategoryForm.frequency,
        color: newCategoryForm.color,
        category_type: newCategoryForm.category_type,
        expenses: [],
        keywords: []
      });

      await queryClient.refetchQueries(['budgetCategories']);

      if (transactionId) {
        setTransactions(prev => prev.map(t => 
          t.id === transactionId ? { ...t, category: newCategoryForm.name, confidence: 1 } : t
        ));
      }

      setIsCreatingCategory(false);
      setNewCategoryForm({ name: '', budget: '', frequency: 'monthly', color: '#00FFFF', category_type: 'expense' });
    } catch (error) {
      console.error('Erro ao criar categoria:', error);
    }
  };
  
  const confirmImportMutation = useMutation({
    mutationFn: async (transactionsToImport) => {
      if (!selectedAccountId) {
        throw new Error('Selecione uma conta bancária primeiro');
      }

      const results = { saved: [], categoriesUpdated: 0, errors: [] };
      const total = transactionsToImport.length;

      setIsImporting(true);
      setImportProgress(0);
      setImportStats({ current: 0, total });

      // 1. Atualizar Saldo da Conta
      const selectedAccount = accounts.find(a => a.id === selectedAccountId);
      if (selectedAccount) {
        const netChange = transactionsToImport.reduce((sum, t) => {
          return sum + (t.type === 'income' ? t.amount : -t.amount);
        }, 0);

        await base44.entities.Account.update(selectedAccountId, {
          balance: selectedAccount.balance + netChange
        });
      }

      // Agrupar transações por categoria para atualização em lote
      const categoryUpdates = {};

      for (let i = 0; i < transactionsToImport.length; i++) {
        const trans = transactionsToImport[i];
        const isoDate = formatDateToISO(trans.date);

        try {
          setImportStats({ current: i + 1, total });
          setImportProgress(((i + 1) / total) * 100);

          // 2. Salvar em FinTransaction (Para DRE e Relatórios)
          await base44.entities.FinTransaction.create({
            date: isoDate,
            description: trans.description,
            value: Math.abs(trans.amount),
            category: trans.category,
            type: trans.type,
            account_id: selectedAccountId,
            source: trans.source || 'Importação Manual',
            hash_id: trans.hash_id || `manual_${isoDate}_${trans.amount}_${trans.description.substring(0, 20)}`.replace(/\s/g, '_')
          });

          // 3. Preparar atualização de BudgetCategory (Para Orçamentos)
          if (trans.category) {
            const matchedCategory = budgetCategories.find(c => c.name === trans.category);

            if (matchedCategory) {
              if (!categoryUpdates[matchedCategory.id]) {
                categoryUpdates[matchedCategory.id] = {
                  original: matchedCategory,
                  newExpenses: []
                };
              }

              categoryUpdates[matchedCategory.id].newExpenses.push({
                id: `imp_${Date.now()}_${i}`,
                description: trans.description,
                value: Math.abs(trans.amount),
                date: isoDate
              });
            }
          }

          results.saved.push(trans);
        } catch (error) {
          console.error('Erro ao salvar transação:', error);
          results.errors.push({ transaction: trans, error: error.message });
        }
      }

      // 4. Atualizar BudgetCategories em lote
      const updatePromises = Object.values(categoryUpdates).map(update => {
        const combinedExpenses = [
          ...update.newExpenses,
          ...(update.original.expenses || [])
        ];

        return base44.entities.BudgetCategory.update(update.original.id, {
          expenses: combinedExpenses
        });
      });

      await Promise.all(updatePromises);
      results.categoriesUpdated = updatePromises.length;

      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries(['budgetCategories']);
      queryClient.invalidateQueries(['accounts']);
      queryClient.invalidateQueries(['finTransactions']);
      queryClient.invalidateQueries(['netWorthSummary']);
      
      setIsImporting(false);
      setSelectedAccountId(null);
      
      const totalDamage = results.saved.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
      const totalLoot = results.saved.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      
      toast.success(
        `⚔️ Importação Concluída!\n\n` +
        `📊 ${results.saved.length} transações registradas\n` +
        `📂 ${results.categoriesUpdated} categorias atualizadas\n` +
        `💀 Dano: R$ ${totalDamage.toFixed(2)}\n` +
        `💰 Loot: R$ ${totalLoot.toFixed(2)}`,
        { duration: 8000 }
      );
      
      if (onImport) onImport(results.saved);
      if (onClose) onClose();
    },
    onError: (error) => {
      setIsImporting(false);
      toast.error('💥 Falha na batalha: ' + error.message);
    }
  });
  
  const handleConfirmImport = () => {
    if (!selectedAccountId) {
      toast.error('⚠️ Selecione uma conta bancária primeiro!');
      return;
    }

    const selected = transactions.filter(t => t.selected);

    if (selected.length === 0) {
      toast.error('⚠️ Selecione ao menos uma transação!');
      return;
    }

    // CORREÇÃO: Considerar 'Não classificado' como sem categoria
    const uncategorized = selected.filter(t => !t.category || t.category === 'Não classificado');

    if (uncategorized.length > 0) {
      toast.error(`⚠️ ${uncategorized.length} transação(ões) sem categoria! Classifique todas antes de importar.`);
      return;
    }

    confirmImportMutation.mutate(selected);
  };

  const incomeTransactions = transactions.filter(t => t.type === 'income');
  const expenseTransactions = transactions.filter(t => t.type === 'expense');
  
  return (
    <>
      {/* Loading Screen - Gamificado */}
      <AnimatePresence>
        {isImporting && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/98 backdrop-blur-xl">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="text-center max-w-md"
            >
              <motion.div
                animate={{ 
                  rotate: [0, 360],
                  scale: [1, 1.2, 1]
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-24 h-24 mx-auto mb-6 relative"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 blur-2xl opacity-60 animate-pulse" />
                <div className="relative w-24 h-24 bg-gradient-to-br from-cyan-500 to-purple-500 rounded-full flex items-center justify-center border-4 border-white/20">
                  <Zap className="w-12 h-12 text-white" />
                </div>
              </motion.div>

              <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-wider">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400">
                  Processando Batalha
                </span>
              </h2>
              
              <p className="text-slate-400 mb-6 font-mono text-sm">
                Salvando {importStats.current} de {importStats.total} eventos...
              </p>

              <div className="relative w-full h-4 bg-slate-800 rounded-full overflow-hidden border border-cyan-500/30">
                <motion.div
                  className="h-full bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${importProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white font-black text-xs drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]">
                    {importProgress.toFixed(0)}%
                  </span>
                </div>
              </div>

              <motion.p
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="text-cyan-400 text-xs mt-4 uppercase tracking-widest"
              >
                ⚡ Alimentando Sistema Neural ⚡
              </motion.p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/95 backdrop-blur-md p-2 sm:p-4">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-slate-900 border border-cyan-500/30 rounded-2xl max-w-6xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden shadow-[0_0_100px_rgba(6,182,212,0.2)]"
        >
          <div className="sticky top-0 bg-slate-900/95 backdrop-blur-xl border-b border-cyan-500/20 p-3 sm:p-6 z-10">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center animate-pulse flex-shrink-0">
                  <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-base sm:text-2xl font-black text-white uppercase tracking-wider truncate">Neural Data Link</h2>
                  <p className="text-[10px] sm:text-xs text-slate-400 uppercase tracking-widest hidden sm:block">Importação e Classificação Inteligente</p>
                </div>
              </div>
              <div className="flex items-center gap-1 sm:gap-3 flex-shrink-0">
                {phase === 'review' && (
                  <>
                    <div className="flex items-center gap-2 bg-purple-500/10 border border-purple-500/30 rounded-lg px-3 py-2">
                      <input
                        type="checkbox"
                        id="auto-apply-rules"
                        checked={autoApplyRules}
                        onChange={(e) => setAutoApplyRules(e.target.checked)}
                        className="w-4 h-4 cursor-pointer"
                      />
                      <label htmlFor="auto-apply-rules" className="text-purple-400 text-xs sm:text-sm font-bold cursor-pointer">
                        🤖 Auto-aplicar regras
                      </label>
                    </div>
                    <Button
                      onClick={cleanDuplicates}
                      disabled={isCleaningDuplicates}
                      variant="outline"
                      size="sm"
                      className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10 text-xs sm:text-sm min-h-[36px] sm:min-h-[40px]"
                    >
                      {isCleaningDuplicates ? (
                        <>
                          <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin mr-1 sm:mr-2" />
                          <span className="hidden sm:inline">Limpando...</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                          <span className="hidden sm:inline">Limpar Duplicatas</span>
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => setIsManagingRules(true)}
                      variant="outline"
                      size="sm"
                      className="border-cyan-500/50 text-cyan-400 text-xs sm:text-sm min-h-[36px] sm:min-h-[40px]"
                    >
                      <Settings className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                      <span className="hidden sm:inline">Gerenciar Regras</span>
                    </Button>
                  </>
                )}
                <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>
          
          <div className="overflow-y-auto max-h-[calc(90vh-100px)]">
            {phase === 'selectBank' && (
              <div className="p-6 space-y-8">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-black text-white mb-2 uppercase">Selecione seu Banco</h3>
                  <p className="text-slate-400">
                    Escolha o banco do extrato que você vai importar para garantir 100% de precisão
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
                  {SUPPORTED_BANKS.map(bank => (
                    <motion.button
                      key={bank.id}
                      onClick={() => {
                        setSelectedBank(bank.id);
                        setPhase('upload');
                        toast.success(`✓ ${bank.name} selecionado!`, { duration: 2000 });
                      }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={`bg-gradient-to-br ${bank.color} p-6 rounded-2xl border-2 border-white/20 hover:border-white/40 transition-all shadow-xl hover:shadow-2xl`}
                    >
                      <div className="text-5xl mb-3">{bank.icon}</div>
                      <h4 className="text-white font-black text-lg mb-2">{bank.name}</h4>
                      <p className="text-white/80 text-xs mb-3">{bank.description}</p>
                      <div className="flex flex-wrap gap-1 justify-center">
                        {bank.formats.map(format => (
                          <span key={format} className="text-[10px] bg-white/20 text-white px-2 py-1 rounded">
                            {format}
                          </span>
                        ))}
                      </div>
                    </motion.button>
                  ))}
                </div>

                <NeonCard glowColor="purple" className="max-w-2xl mx-auto">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-purple-400 mt-1 flex-shrink-0" />
                    <div className="text-sm text-slate-300">
                      <p className="font-bold mb-2">🎯 Importação Otimizada por Banco</p>
                      <ul className="text-xs text-slate-400 space-y-1">
                        <li>✅ Parser específico para cada instituição financeira</li>
                        <li>🎯 100% de precisão na captura de transações</li>
                        <li>⚡ Processamento otimizado e mais rápido</li>
                        <li>🛡️ Validação inteligente de dados</li>
                      </ul>
                    </div>
                  </div>
                </NeonCard>
              </div>
            )}

            {phase === 'upload' && (
              <div className="p-6 space-y-8">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-3 mb-6">
                    <button
                      onClick={() => {
                        setSelectedBank(null);
                        setPhase('selectBank');
                      }}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-slate-300 text-sm transition-all"
                    >
                      ← Trocar Banco
                    </button>
                    <div className={`bg-gradient-to-br ${SUPPORTED_BANKS.find(b => b.id === selectedBank)?.color} px-6 py-3 rounded-xl border-2 border-white/20`}>
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{SUPPORTED_BANKS.find(b => b.id === selectedBank)?.icon}</span>
                        <div className="text-left">
                          <p className="text-white font-black text-lg">{SUPPORTED_BANKS.find(b => b.id === selectedBank)?.name}</p>
                          <p className="text-white/80 text-xs">{SUPPORTED_BANKS.find(b => b.id === selectedBank)?.formats.join(', ')}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-slate-400 mb-6">
                    Envie seu extrato para análise automática com IA
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 max-w-2xl mx-auto mb-6 sm:mb-8">
                    {[
                      { type: 'PDF', icon: '📄', color: 'from-red-500 to-pink-500' },
                      { type: 'CSV', icon: '📊', color: 'from-green-500 to-emerald-500' },
                      { type: 'OFX', icon: '💳', color: 'from-blue-500 to-cyan-500' }
                    ].map(format => (
                      <div key={format.type} className={`bg-gradient-to-br ${format.color} p-3 sm:p-4 rounded-xl border-2 border-white/20`}>
                        <div className="text-3xl sm:text-4xl mb-1 sm:mb-2">{format.icon}</div>
                        <p className="text-white font-bold text-sm sm:text-base">{format.type}</p>
                      </div>
                    ))}
                  </div>
                  
                  <input
                    type="file"
                    accept=".pdf,.csv,.ofx,.xlsx,.xls"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload">
                    <Button asChild className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-sm sm:text-lg px-6 sm:px-8 py-4 sm:py-6 cursor-pointer min-h-[56px] w-full sm:w-auto">
                      <span className="flex items-center justify-center gap-2">
                        <Upload className="w-5 h-5" />
                        <span className="hidden sm:inline">SELECIONAR EXTRATO(S)</span>
                        <span className="sm:hidden">SELECIONAR ARQUIVO</span>
                      </span>
                    </Button>
                  </label>
                  <div className="space-y-2 mt-3">
                    <p className="text-cyan-400 text-sm">
                      💡 Você pode selecionar vários extratos do mesmo banco de uma vez
                    </p>
                    <p className="text-purple-400 text-xs">
                      ✨ Novidade: Arquivos Excel com múltiplas abas são processados automaticamente!
                    </p>
                  </div>
                </div>
                
                <NeonCard glowColor="cyan" className="max-w-2xl mx-auto">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-cyan-400 mt-1 flex-shrink-0" />
                    <div className="text-sm text-slate-300">
                      <p className="font-bold mb-2">🧠 Classificação Inteligente Ativa</p>
                      <ul className="text-xs text-slate-400 space-y-1">
                        <li>✅ Aprende com suas regras salvas e histórico</li>
                        <li>🤖 Sugestões de IA para nomes de transações</li>
                        <li>📊 Suporte a múltiplas abas/planilhas Excel</li>
                        <li>⚡ Auto-aplicação de regras em tempo real</li>
                      </ul>
                    </div>
                  </div>
                </NeonCard>
              </div>
            )}
            
            {phase === 'processing' && (
              <div className="p-4 sm:p-6 text-center py-12 sm:py-16">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6"
                >
                  <Zap className="w-16 h-16 sm:w-20 sm:h-20 text-cyan-400" />
                </motion.div>
                <h3 className="text-lg sm:text-2xl font-black text-white mb-3 sm:mb-4">
                  Decodificando e Analisando...
                </h3>
                <div className="max-w-md mx-auto px-4">
                  <div className="h-2 sm:h-3 bg-slate-800 rounded-full overflow-hidden mb-2">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <p className="text-cyan-400 font-mono text-xs sm:text-sm">{progress}% COMPLETO</p>
                </div>
              </div>
            )}
            
            {phase === 'review' && (
              <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
                <div className="sticky top-0 bg-slate-900/95 backdrop-blur-xl z-10 -mx-3 sm:-mx-6 px-3 sm:px-6 py-3 border-b border-cyan-500/20">
                  <div className="flex flex-col gap-3">
                    <div>
                      <h3 className="text-base sm:text-xl font-black text-white">CLASSIFICAÇÃO DE TRANSAÇÕES</h3>
                      <p className="text-xs sm:text-sm text-slate-400">
                        {transactions.filter(t => t.selected).length} selecionadas • {transactions.filter(t => t.category).length} classificadas
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                      <Select value={selectedAccountId || ''} onValueChange={setSelectedAccountId}>
                        <SelectTrigger className="w-full sm:w-[200px] bg-slate-800 border-slate-700 text-white min-h-[48px] sm:min-h-[44px] text-sm">
                          <SelectValue placeholder="Selecione a conta" />
                        </SelectTrigger>
                      <SelectContent className="z-[100] bg-slate-900 border-slate-700">
                        {accounts.length === 0 ? (
                          <div className="px-3 py-2 text-slate-400 text-sm">
                            Nenhuma conta disponível
                          </div>
                        ) : (
                          accounts.map(acc => (
                            <SelectItem key={acc.id} value={acc.id} className="text-white hover:bg-slate-800 cursor-pointer">
                              {acc.icon || '💰'} {acc.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={handleConfirmImport}
                      disabled={!selectedAccountId || transactions.filter(t => t.selected && t.category).length === 0}
                      className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 w-full sm:w-auto min-h-[48px] sm:min-h-[44px] text-sm sm:text-base font-bold"
                    >
                      <Check className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                      <span className="hidden sm:inline">CONFIRMAR IMPORTAÇÃO</span>
                      <span className="sm:hidden">CONFIRMAR</span>
                    </Button>
                    </div>
                    </div>
                    </div>

                    {/* Informações de Múltiplas Abas */}
                    {availableSheets.length > 1 && (
                      <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-3 sm:p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
                          <p className="text-purple-400 font-bold text-xs sm:text-sm">
                            📊 {availableSheets.length} abas importadas
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1.5 sm:gap-2">
                          {availableSheets.map((sheetName, idx) => (
                            <span key={idx} className="text-[10px] sm:text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded border border-purple-500/30">
                              {sheetName}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Campo de Busca Avançado */}
                    <div className="bg-slate-800/50 border border-cyan-500/30 rounded-xl p-3 sm:p-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                    <div className="sm:col-span-2">
                      <Input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="🔍 Buscar por histórico, valor ou data"
                        className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 text-sm min-h-[44px]"
                      />
                    </div>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="bg-slate-900 border-slate-700 text-white text-sm min-h-[44px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-[100] bg-slate-900 border-slate-700">
                        <SelectItem value="all" className="text-white">📋 Todas</SelectItem>
                        <SelectItem value="identified" className="text-white">✅ Identificadas</SelectItem>
                        <SelectItem value="unidentified" className="text-white">⚠️ Não Identificadas</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={filterCategory} onValueChange={setFilterCategory}>
                      <SelectTrigger className="bg-slate-900 border-slate-700 text-white text-sm min-h-[44px]">
                        <SelectValue placeholder="Categoria" />
                      </SelectTrigger>
                      <SelectContent className="z-[100] bg-slate-900 border-slate-700">
                        <SelectItem value="all" className="text-white">🏷️ Todas Categorias</SelectItem>
                        {availableCategories.map(cat => (
                          <SelectItem key={cat.id} value={cat.name} className="text-white">
                            {cat.icon || '📁'} {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {searchTerm && (
                    <p className="text-xs text-cyan-400 mt-2">
                      {transactions.filter(t => {
                        const search = searchTerm.toLowerCase();
                        return t.description.toLowerCase().includes(search) ||
                               t.date.includes(search) ||
                               t.amount.toString().includes(search);
                      }).length} transação(ões) encontrada(s)
                    </p>
                  )}
                </div>

                {/* Agrupamento por Mês */}
                {(() => {
                  // Filtrar transações baseado na busca, status e categoria
                  const filteredTransactions = transactions.filter(t => {
                    // Filtro de busca
                    if (searchTerm) {
                      const search = searchTerm.toLowerCase();
                      const matchesSearch = 
                        t.description.toLowerCase().includes(search) ||
                        t.date.includes(search) ||
                        t.amount.toString().includes(search);
                      if (!matchesSearch) return false;
                    }
                    
                    // Filtro de status
                    if (filterStatus === 'identified') {
                      if (!t.category || t.category === 'Não classificado') return false;
                    } else if (filterStatus === 'unidentified') {
                      if (t.category && t.category !== 'Não classificado') return false;
                    }
                    
                    // Filtro de categoria
                    if (filterCategory !== 'all') {
                      if (t.category !== filterCategory) return false;
                    }
                    
                    return true;
                  });

                  const byMonth = filteredTransactions.reduce((acc, t) => {
                    const key = t.monthYear || 'unknown';
                    if (!acc[key]) acc[key] = { identified: [], unidentified: [] };
                    
                    if (t.category && t.category !== 'Não classificado') {
                      acc[key].identified.push(t);
                    } else {
                      acc[key].unidentified.push(t);
                    }
                    return acc;
                  }, {});
                  
                  const sortedMonths = Object.keys(byMonth).sort();
                  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                                     'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
                  
                  return sortedMonths.map(monthKey => {
                    const [year, month] = monthKey.split('-');
                    const monthName = monthNames[parseInt(month) - 1];
                    const monthData = byMonth[monthKey];
                    const totalMonth = monthData.identified.length + monthData.unidentified.length;
                    
                    const isExpanded = expandedMonths[monthKey];
                    
                    return (
                      <div key={monthKey} className="border-2 border-purple-500/30 rounded-2xl overflow-hidden bg-slate-900/30 mb-4">
                        <button
                          onClick={() => toggleMonth(monthKey)}
                          className="w-full flex items-center justify-between p-5 bg-gradient-to-r from-purple-900/40 to-slate-900/40 hover:from-purple-900/60 hover:to-slate-900/60 transition-all"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                              <Calendar className="w-6 h-6 text-purple-400" />
                            </div>
                            <div className="text-left">
                              <h3 className="text-white font-black text-lg uppercase tracking-wider">{monthName} {year}</h3>
                              <div className="flex items-center gap-4 mt-1 text-xs">
                                <span className="text-green-400 font-bold">{monthData.identified.length} ✓ Identificadas</span>
                                <span className="text-slate-600">•</span>
                                <span className="text-orange-400 font-bold">{monthData.unidentified.length} ⚠ Pendentes</span>
                                <span className="text-slate-600">•</span>
                                <span className="text-purple-400 font-mono">Total: {totalMonth}</span>
                              </div>
                            </div>
                          </div>
                          <motion.div
                            animate={{ rotate: isExpanded ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <TrendingDown className="w-6 h-6 text-purple-400" />
                          </motion.div>
                        </button>
                        
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3 }}
                              className="overflow-hidden"
                            >
                              <div className="p-3 sm:p-6 grid grid-cols-1 gap-4 sm:gap-6">
                          {/* IDENTIFICADAS DO MÊS */}
                          <div className="space-y-2 sm:space-y-3">
                            <div className="flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-2 sm:p-3">
                              <Check className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
                              <h4 className="text-white font-bold uppercase text-xs sm:text-sm">
                                ✓ Identificadas ({monthData.identified.length})
                              </h4>
                            </div>

                            <div className="space-y-2 max-h-[300px] sm:max-h-[400px] overflow-y-auto pr-1">
                              {monthData.identified.map(transaction => (
                                <TransactionCard
                                  key={transaction.id}
                                  transaction={transaction}
                                  availableCategories={availableCategories}
                                  onToggle={toggleSelection}
                                  onUpdateCategory={updateCategory}
                                  onSaveRule={saveAsRule}
                                  onUpdateDescription={updateDescription}
                                  onRequestAISuggestion={requestAIDescriptionSuggestion}
                                  isGeneratingAI={isGeneratingAISuggestion && aiSuggestionFor === transaction.id}
                                  autoApplyRules={autoApplyRules}
                                  onCreateCategory={(type, id) => {
                                    setNewCategoryForm({ 
                                      name: '', 
                                      budget: '', 
                                      frequency: 'monthly', 
                                      color: type === 'income' ? '#39FF14' : '#FF00FF',
                                      category_type: type === 'income' ? 'guardian' : 'expense',
                                      transactionId: id
                                    });
                                    setIsCreatingCategory(true);
                                  }}
                                />
                              ))}
                              {monthData.identified.length === 0 && (
                                <div className="text-center py-8">
                                  <Check className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                                  <p className="text-slate-500 text-xs">Nenhuma identificada</p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* NÃO IDENTIFICADAS DO MÊS */}
                          <div className="space-y-2 sm:space-y-3">
                            <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-2 sm:p-3">
                              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 animate-pulse" />
                              <h4 className="text-white font-bold uppercase text-xs sm:text-sm">
                                ⚠ Pendentes ({monthData.unidentified.length})
                              </h4>
                            </div>

                            <div className="space-y-2 max-h-[300px] sm:max-h-[400px] overflow-y-auto pr-1">
                              {monthData.unidentified.map(transaction => (
                                <TransactionCard
                                  key={transaction.id}
                                  transaction={transaction}
                                  availableCategories={availableCategories}
                                  onToggle={toggleSelection}
                                  onUpdateCategory={updateCategory}
                                  onSaveRule={saveAsRule}
                                  onUpdateDescription={updateDescription}
                                  onRequestAISuggestion={requestAIDescriptionSuggestion}
                                  isGeneratingAI={isGeneratingAISuggestion && aiSuggestionFor === transaction.id}
                                  autoApplyRules={autoApplyRules}
                                  onCreateCategory={(type, id) => {
                                    setNewCategoryForm({ 
                                      name: '', 
                                      budget: '', 
                                      frequency: 'monthly', 
                                      color: type === 'income' ? '#39FF14' : '#FF00FF',
                                      category_type: type === 'income' ? 'guardian' : 'expense',
                                      transactionId: id
                                    });
                                    setIsCreatingCategory(true);
                                  }}
                                />
                              ))}
                              {monthData.unidentified.length === 0 && (
                                <div className="text-center py-8">
                                  <Check className="w-8 h-8 text-green-400 mx-auto mb-2" />
                                  <p className="text-green-400 text-xs font-bold">🎉 Todas OK!</p>
                                </div>
                              )}
                              </div>
                            </div>
                          </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Modal: Create Category */}
      <AnimatePresence>
        {isCreatingCategory && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/95 backdrop-blur-md p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-cyan-500/30 rounded-2xl max-w-md w-full p-6 shadow-[0_0_100px_rgba(6,182,212,0.2)]"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-white uppercase">Nova Categoria</h3>
                <button onClick={() => setIsCreatingCategory(false)} className="text-slate-500 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setNewCategoryForm({...newCategoryForm, category_type: 'guardian', color: '#39FF14'})}
                    className={`p-4 rounded-xl border-2 ${
                      newCategoryForm.category_type === 'guardian'
                        ? 'bg-green-500/20 border-green-500'
                        : 'bg-slate-800 border-slate-700'
                    }`}
                  >
                    <div className="text-3xl mb-2">💰</div>
                    <p className="text-white font-bold text-sm">RECEITA</p>
                  </button>
                  
                  <button
                    onClick={() => setNewCategoryForm({...newCategoryForm, category_type: 'expense', color: '#FF00FF'})}
                    className={`p-4 rounded-xl border-2 ${
                      newCategoryForm.category_type === 'expense'
                        ? 'bg-red-500/20 border-red-500'
                        : 'bg-slate-800 border-slate-700'
                    }`}
                  >
                    <div className="text-3xl mb-2">💀</div>
                    <p className="text-white font-bold text-sm">DESPESA</p>
                  </button>
                </div>
              
                <Input
                  value={newCategoryForm.name}
                  onChange={(e) => setNewCategoryForm({...newCategoryForm, name: e.target.value})}
                  placeholder="Nome da categoria"
                  className="bg-slate-800 border-slate-700 text-white"
                />

                <Input
                  type="number"
                  value={newCategoryForm.budget}
                  onChange={(e) => setNewCategoryForm({...newCategoryForm, budget: e.target.value})}
                  placeholder="Orçamento mensal"
                  className="bg-slate-800 border-slate-700 text-white"
                  step="0.01"
                />

                <Button
                  onClick={() => handleCreateCategory(newCategoryForm.transactionId)}
                  disabled={!newCategoryForm.name || !newCategoryForm.budget}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-500"
                >
                  Criar
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Rule Manager */}
      <AnimatePresence>
        {isManagingRules && (
          <TransactionRuleManager onClose={() => setIsManagingRules(false)} />
        )}
      </AnimatePresence>
    </>
  );
}

// Componente de Card de Transação (Separado para reutilização)
function TransactionCard({ 
  transaction, 
  availableCategories, 
  onToggle, 
  onUpdateCategory, 
  onSaveRule, 
  onCreateCategory,
  onUpdateDescription,
  onRequestAISuggestion,
  isGeneratingAI,
  autoApplyRules
}) {
  const isIncome = transaction.type === 'income';
  const validCategories = availableCategories.filter(c => 
    isIncome ? c.category_type === 'guardian' : c.category_type === 'expense'
  );

  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState(transaction.description);

  return (
    <div className={`p-3 rounded-lg border ${
      transaction.selected 
        ? isIncome ? 'bg-green-900/10 border-green-500/30' : 'bg-red-900/10 border-red-500/30'
        : 'bg-slate-800/30 border-slate-700'
    }`}>
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={transaction.selected}
          onChange={() => onToggle(transaction.id)}
          className="mt-1 w-4 h-4 flex-shrink-0 cursor-pointer"
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              {isEditingDescription ? (
                <div className="flex gap-2 mb-1">
                  <input
                    type="text"
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    className="flex-1 bg-slate-900 border border-cyan-500/50 text-white text-xs px-2 py-1 rounded focus:outline-none focus:border-cyan-500"
                    autoFocus
                  />
                  <button
                    onClick={() => {
                      onUpdateDescription(transaction.id, editedDescription);
                      setIsEditingDescription(false);
                      toast.success('📝 Descrição atualizada!');
                    }}
                    className="px-2 py-1 bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 text-green-400 rounded text-xs"
                  >
                    ✓
                  </button>
                  <button
                    onClick={() => {
                      setEditedDescription(transaction.description);
                      setIsEditingDescription(false);
                    }}
                    className="px-2 py-1 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-400 rounded text-xs"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-white text-sm font-medium truncate flex-1">{transaction.description}</p>
                  <button
                    onClick={() => setIsEditingDescription(true)}
                    className="text-cyan-400 hover:text-cyan-300 text-xs flex-shrink-0"
                    title="Editar descrição"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => onRequestAISuggestion(transaction)}
                    disabled={isGeneratingAI}
                    className="text-purple-400 hover:text-purple-300 text-xs flex-shrink-0 disabled:opacity-50"
                    title="Sugerir com IA"
                  >
                    {isGeneratingAI ? '⏳' : '🤖'}
                  </button>
                </div>
              )}
              <p className="text-[10px] text-slate-500 font-mono">{transaction.date}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <p className={`text-lg font-black font-mono ${isIncome ? 'text-green-400' : 'text-red-400'}`}>
                {isIncome ? '+' : '-'} R$ {transaction.amount.toFixed(2)}
              </p>
              {transaction.confidence > 0 && (
                <div className="flex items-center gap-1 text-cyan-400 text-[10px]">
                  <Zap className="w-2.5 h-2.5" />
                  {transaction.confidence > 0.9 ? 'Alta' : 'Média'}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select 
              value={transaction.category || 'none'} 
              onValueChange={(val) => {
                const newCategory = val === 'none' ? null : val;
                onUpdateCategory(transaction.id, newCategory);

                // Auto-criar regra se configurado
                if (autoApplyRules && newCategory && !transaction.ruleSaved) {
                  setTimeout(() => {
                    const shouldSave = confirm(
                      `💡 Auto-salvar regra?\n\n` +
                      `"${transaction.description}" → ${newCategory}\n\n` +
                      `Futuras transações similares serão classificadas automaticamente.`
                    );
                    if (shouldSave) {
                      onSaveRule(transaction);
                    }
                  }, 300);
                }
              }}
            >
              <SelectTrigger className="h-8 text-xs bg-slate-800 border-slate-700 text-white flex-1 min-h-[36px]">
                <SelectValue placeholder="Selecionar categoria" />
              </SelectTrigger>
              <SelectContent className="z-[100]">
                <SelectItem value="none">🔍 Não Classificado</SelectItem>
                {validCategories.map(cat => (
                  <SelectItem key={cat.id} value={cat.name}>
                    {cat.icon || (isIncome ? '💰' : '💀')} {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <button
              onClick={() => onCreateCategory(transaction.type, transaction.id)}
              className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg border border-slate-600 text-cyan-400 flex-shrink-0"
              title="Criar nova categoria"
            >
              <Plus className="w-3 h-3" />
            </button>

            {transaction.category && !transaction.ruleSaved && (
              <button
                onClick={() => onSaveRule(transaction)}
                className="p-2 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg border border-purple-500/50 text-purple-400 flex-shrink-0"
                title="Salvar como regra permanente"
              >
                <BookmarkPlus className="w-3 h-3" />
              </button>
            )}
            {transaction.ruleSaved && (
              <div className="p-2 bg-green-500/20 rounded-lg border border-green-500/50 text-green-400 text-[10px] font-bold flex-shrink-0">
                ✓ SALVO
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
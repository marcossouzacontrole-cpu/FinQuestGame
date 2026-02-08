import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Sparkles, AlertCircle, Check, Zap, Brain, ArrowRight, Loader2, Shield, Skull } from 'lucide-react';
import { motion } from 'framer-motion';
import NeonCard from './NeonCard';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// INSIRA SUA CHAVE API DO GEMINI AQUI
const GEMINI_API_KEY = "";

export default function UniversalDataImporter({ type = 'both' }) {
  const queryClient = useQueryClient();
  const isBothMode = type === 'both';
  const isGuardian = type === 'guardian' || isBothMode;
  const emoji = isBothMode ? '⚔️' : (type === 'guardian' ? '🛡️' : '💀');
  const displayName = isBothMode ? 'Guardião/Inimigo' : (type === 'guardian' ? 'Guardião' : 'Inimigo');
  
  const [xlsxLoaded, setXlsxLoaded] = useState(false);
  const [phase, setPhase] = useState(1); // 1: Upload, 2: Mapping, 3: Conflicts
  const [fileData, setFileData] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [columnMapping, setColumnMapping] = useState(
    isBothMode
      ? { 
          type: '', 
          name: '', value: '', date: '',
          creditor: '', currentBalance: '', originalValue: '', interestRate: '', dueDate: '', description: '',
          category: '' // Categoria compartilhada para ambos
        }
      : isGuardian 
        ? { type: '', name: '', value: '', category: '', date: '' }
        : { type: '', creditor: '', currentBalance: '', originalValue: '', interestRate: '', dueDate: '', category: '', description: '' }
  );
  const [aiThinking, setAiThinking] = useState(false);
  const [conflictItems, setConflictItems] = useState([]);
  const [currentConflictIndex, setCurrentConflictIndex] = useState(0);
  const [aiSuggestions, setAiSuggestions] = useState({});
  const [showMapDropdown, setShowMapDropdown] = useState(false);

  // Fetch existing categories and merge with defaults
  const { data: budgetCategories = [] } = useQuery({
    queryKey: ['budgetCategories'],
    queryFn: () => base44.entities.BudgetCategory.list()
  });

  const existingCategories = React.useMemo(() => {
    const defaults = isGuardian ? [
      { id: 'cash', name: 'Dinheiro' },
      { id: 'investment', name: 'Investimentos' },
      { id: 'real_estate', name: 'Imóvel' },
      { id: 'vehicle', name: 'Veículo' },
      { id: 'savings', name: 'Poupança' },
      { id: 'crypto', name: 'Criptomoedas' },
      { id: 'stocks', name: 'Ações' },
      { id: 'funds', name: 'Fundos' },
      { id: 'other', name: 'Outros Ativos' }
    ] : [
      { id: 'credit_card', name: 'Cartão de Crédito' },
      { id: 'loan', name: 'Empréstimo' },
      { id: 'financing', name: 'Financiamento' },
      { id: 'overdraft', name: 'Cheque Especial' },
      { id: 'installment', name: 'Parcelamento' },
      { id: 'mortgage', name: 'Hipoteca' },
      { id: 'student_loan', name: 'Crédito Estudantil' },
      { id: 'other', name: 'Outras Dívidas' }
    ];

    // Merge with custom categories from database
    const uniqueNames = new Set(defaults.map(d => d.name.toLowerCase()));
    const customCategories = budgetCategories
      .filter(cat => !uniqueNames.has(cat.name.toLowerCase()))
      .map(cat => ({ id: cat.id, name: cat.name }));

    return [...defaults, ...customCategories];
  }, [isGuardian, budgetCategories]);

  // Load SheetJS from CDN
  useEffect(() => {
    if (window.XLSX) {
      setXlsxLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.sheetjs.com/xlsx-0.20.0/package/dist/xlsx.full.min.js';
    script.onload = () => setXlsxLoaded(true);
    script.onerror = () => {
      toast.error('Erro ao carregar biblioteca de leitura de planilhas');
    };
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  // Call Gemini API
  const callGemini = async (prompt) => {
    if (!GEMINI_API_KEY) {
      throw new Error('Configure GEMINI_API_KEY no componente');
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.1,
            topK: 1,
            topP: 1,
            maxOutputTokens: 2048,
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error('Erro ao conectar com IA');
    }

    const data = await response.json();
    const text = data.candidates[0].content.parts[0].text;
    
    // Extract JSON from response
    const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1] || jsonMatch[0]);
    }
    
    return JSON.parse(text);
  };

  // Handle file upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!xlsxLoaded) {
      toast.error('Aguarde o carregamento da biblioteca...');
      return;
    }

    toast.info('Lendo arquivo...');

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = window.XLSX.read(data, { type: 'array' });
        
        if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
          toast.error('Arquivo não contém planilhas válidas');
          return;
        }

        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = window.XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

        if (!jsonData || jsonData.length < 1) {
          toast.error('Planilha vazia');
          return;
        }

        const headers = jsonData[0].map(h => String(h || '').trim()).filter(h => h);
        
        if (headers.length === 0) {
          toast.error('Nenhum cabeçalho encontrado na primeira linha');
          return;
        }

        const rows = jsonData.slice(1).filter(row => row && row.some(cell => cell !== null && cell !== undefined && cell !== ''));

        if (rows.length === 0) {
          toast.error('Nenhuma linha de dados encontrada');
          return;
        }

        setHeaders(headers);
        setRows(rows);
        setFileData(jsonData);
        
        toast.success(`✅ ${rows.length} linhas detectadas!`);
        
        // Force phase change
        setTimeout(() => {
          setPhase(2);
        }, 100);
      } catch (error) {
        console.error('Erro ao processar arquivo:', error);
        toast.error('Erro ao ler arquivo', {
          description: error.message
        });
      }
    };

    reader.onerror = () => {
      toast.error('Erro ao ler arquivo');
    };

    reader.readAsArrayBuffer(file);
  };

  // AI Auto-Mapping
  const handleAIMapping = async () => {
    setAiThinking(true);
    try {
      const prompt = isGuardian ? `Analise os cabeçalhos desta planilha de ATIVOS e identifique as colunas:

CABEÇALHOS: ${JSON.stringify(headers)}
PRIMEIRA LINHA DE DADOS: ${JSON.stringify(rows[0])}

Retorne APENAS um JSON no formato:
{
  "name": <índice da coluna de nome/descrição do ativo>,
  "value": <índice da coluna de valor/saldo>,
  "category": <índice da coluna de tipo/categoria (ou null)>,
  "date": <índice da coluna de data (ou null)>
}

Procure por palavras-chave:
- Nome: "nome", "descrição", "ativo", "item", "description"
- Valor: "valor", "saldo", "amount", "R$", "quantia"
- Categoria: "tipo", "classe", "categoria", "classificação"
- Data: "data", "date", "aporte"` : `Analise os cabeçalhos desta planilha de DÍVIDAS e identifique as colunas:

CABEÇALHOS: ${JSON.stringify(headers)}
PRIMEIRA LINHA DE DADOS: ${JSON.stringify(rows[0])}

Retorne APENAS um JSON no formato:
{
  "creditor": <índice da coluna de credor/banco>,
  "currentBalance": <índice da coluna de saldo devedor/valor atual>,
  "originalValue": <índice da coluna de valor original (ou null)>,
  "interestRate": <índice da coluna de taxa/juros (ou null)>,
  "dueDate": <índice da coluna de vencimento/data>,
  "category": <índice da coluna de tipo/categoria (ou null)>,
  "description": <índice da coluna de descrição/obs (ou null)>
}

Procure por palavras-chave:
- Credor: "credor", "banco", "instituição", "cartão"
- Saldo Devedor: "saldo devedor", "valor atual", "dívida", "débito"
- Valor Original: "valor original", "total", "contratado"
- Taxa: "taxa", "juros", "%", "a.m."
- Vencimento: "vencimento", "data", "dia pagamento"
- Categoria: "tipo", "classificação", "categoria"
- Descrição: "descrição", "obs", "detalhes"`;

      const result = await callGemini(prompt);
      
      if (isGuardian) {
        setColumnMapping({
          name: result.name !== null ? headers[result.name] : '',
          value: result.value !== null ? headers[result.value] : '',
          category: result.category !== null ? headers[result.category] : '',
          date: result.date !== null ? headers[result.date] : ''
        });
      } else {
        setColumnMapping({
          creditor: result.creditor !== null ? headers[result.creditor] : '',
          currentBalance: result.currentBalance !== null ? headers[result.currentBalance] : '',
          originalValue: result.originalValue !== null ? headers[result.originalValue] : '',
          interestRate: result.interestRate !== null ? headers[result.interestRate] : '',
          dueDate: result.dueDate !== null ? headers[result.dueDate] : '',
          category: result.category !== null ? headers[result.category] : '',
          description: result.description !== null ? headers[result.description] : ''
        });
      }

      toast.success('✨ Mapeamento mágico concluído!');
    } catch (error) {
      toast.error('Erro no mapeamento IA', {
        description: error.message
      });
    } finally {
      setAiThinking(false);
    }
  };

  // Helper function to process a specific type
  const processTypeData = async (dataRows, isGuardianType) => {
    console.log('🔄 Processando tipo:', isGuardianType ? 'Guardian' : 'Enemy');
    console.log('📊 Linhas a processar:', dataRows.length);
    
    const items = dataRows.map((row, index) => {
      console.log(`📋 Processando linha ${index + 1}:`, row);
      if (isGuardianType) {
        const nameIdx = headers.indexOf(columnMapping.name);
        const valueIdx = headers.indexOf(columnMapping.value);
        const categoryIdx = columnMapping.category ? headers.indexOf(columnMapping.category) : -1;
        const dateIdx = columnMapping.date ? headers.indexOf(columnMapping.date) : -1;

        console.log(`  🗺️ Mapeamento Guardian - name: ${nameIdx}, value: ${valueIdx}, category: ${categoryIdx}`);

        return {
          name: String(row[nameIdx] || '').trim(),
          value: parseFloat(String(row[valueIdx] || '0').replace(/[^\d.,]/g, '').replace(',', '.')) || 0,
          category: categoryIdx >= 0 ? String(row[categoryIdx] || 'Dinheiro').trim() : 'Dinheiro',
          date: dateIdx >= 0 && row[dateIdx] ? new Date(row[dateIdx]).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
        };
      } else {
        const creditorIdx = headers.indexOf(columnMapping.creditor);
        const currentBalanceIdx = headers.indexOf(columnMapping.currentBalance);
        const originalValueIdx = columnMapping.originalValue ? headers.indexOf(columnMapping.originalValue) : -1;
        const interestRateIdx = columnMapping.interestRate ? headers.indexOf(columnMapping.interestRate) : -1;
        const dueDateIdx = columnMapping.dueDate ? headers.indexOf(columnMapping.dueDate) : -1;
        const categoryIdx = columnMapping.category ? headers.indexOf(columnMapping.category) : -1;
        const descriptionIdx = columnMapping.description ? headers.indexOf(columnMapping.description) : -1;

        console.log(`  🗺️ Mapeamento Enemy - creditor: ${creditorIdx}, currentBalance: ${currentBalanceIdx}, category: ${categoryIdx}`);
        console.log(`  📊 ColumnMapping:`, columnMapping);

        const currentBalance = parseFloat(String(row[currentBalanceIdx] || '0').replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
        
        const item = {
          creditor: String(row[creditorIdx] || '').trim(),
          currentBalance: currentBalance,
          originalValue: originalValueIdx >= 0 
            ? parseFloat(String(row[originalValueIdx] || '0').replace(/[^\d.,]/g, '').replace(',', '.')) || currentBalance
            : currentBalance,
          interestRate: interestRateIdx >= 0 
            ? parseFloat(String(row[interestRateIdx] || '0').replace(/[^\d.,]/g, '').replace(',', '.')) || 0
            : 0,
          dueDate: dueDateIdx >= 0 && row[dueDateIdx] 
            ? new Date(row[dueDateIdx]).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0],
          category: categoryIdx >= 0 ? String(row[categoryIdx] || 'Outro').trim() : 'Outro',
          description: descriptionIdx >= 0 ? String(row[descriptionIdx] || '').trim() : ''
        };
        
        console.log(`  ✅ Item criado:`, item);
        return item;
      }
    }).filter(item => {
      const isValid = isGuardianType 
        ? (item.name && item.value > 0)
        : (item.creditor && item.currentBalance > 0);
      
      if (!isValid) {
        console.warn('⚠️ Item inválido filtrado:', item);
      }
      
      return isValid;
    });
    
    console.log('✅ Items processados:', items.length, items);

    // Check for category conflicts (skip default categories)
    const itemsWithConflict = [];
    const itemsReady = [];
    const defaultCategories = isGuardian 
      ? ['dinheiro', 'investimentos', 'investimento', 'imóvel', 'imovel', 'veículo', 'veiculo', 'poupança', 'poupanca', 'criptomoedas', 'ações', 'acoes', 'fundos', 'outros ativos', 'outro', 'geral']
      : ['cartão de crédito', 'cartao de credito', 'empréstimo', 'emprestimo', 'financiamento', 'cheque especial', 'parcelamento', 'hipoteca', 'crédito estudantil', 'credito estudantil', 'outras dívidas', 'outras dividas', 'outro', 'geral'];

    for (const item of items) {
      const categoryLower = item.category.toLowerCase();
      const isDefaultCategory = defaultCategories.includes(categoryLower);
      const categoryExists = existingCategories.some(
        cat => cat.name.toLowerCase() === categoryLower
      );

      if (!categoryExists && !isDefaultCategory) {
        itemsWithConflict.push(item);
      } else {
        itemsReady.push(item);
      }
    }

    console.log('📦 Items prontos:', itemsReady.length);
    console.log('⚠️ Items com conflito:', itemsWithConflict.length);
    
    // Save items without conflicts
    if (itemsReady.length > 0) {
      console.log('💾 Salvando items prontos...');
      try {
        await saveItems(itemsReady, isGuardianType);
        console.log('✅ Items salvos com sucesso!');
      } catch (error) {
        console.error('❌ Erro ao salvar items:', error);
        toast.error('Erro ao salvar dados', { description: error.message });
        return;
      }
    }

    // Handle conflicts with AI suggestions
    if (itemsWithConflict.length > 0) {
      console.log('🔀 Mudando para fase de conflitos...');
      setConflictItems(itemsWithConflict);
      setCurrentConflictIndex(0);
      setPhase(3);
      await getAISuggestion(itemsWithConflict[0].category);
    } else {
      console.log('🎉 Tipo processado com sucesso!');
      const typeEmoji = isGuardianType ? '🛡️' : '💀';
      const typeName = isGuardianType ? 'Guardião' : 'Inimigo';
      toast.success(`${typeEmoji} ${items.length} ${typeName}${items.length > 1 ? 's' : ''} importado${items.length > 1 ? 's' : ''}!`);
    }
  };

  // Process data and check for conflicts
  const processData = async () => {
    console.log('🔄 Iniciando processamento...', { columnMapping, isGuardian, isBothMode });
    
    // Validation
    if (isBothMode) {
      if (!columnMapping.type || !columnMapping.name || !columnMapping.value || !columnMapping.creditor || !columnMapping.currentBalance) {
        console.error('❌ Validação falhou: campos obrigatórios não preenchidos');
        toast.error('Preencha: Tipo, Nome, Valor, Credor e Saldo Devedor');
        return;
      }
    } else if (isGuardian) {
      if (!columnMapping.name || !columnMapping.value) {
        console.error('❌ Validação falhou: campos obrigatórios não preenchidos');
        toast.error('Selecione pelo menos Nome e Valor');
        return;
      }
    } else {
      if (!columnMapping.creditor || !columnMapping.currentBalance || !columnMapping.category) {
        console.error('❌ Validação falhou: campos obrigatórios não preenchidos', columnMapping);
        toast.error('Selecione Credor, Saldo Devedor e Categoria');
        return;
      }
    }
    
    console.log('✅ Validação passou, processando linhas...');
    
    // Process both types separately if in both mode
    if (isBothMode && columnMapping.type && columnMapping.type !== '') {
      const typeIdx = headers.indexOf(columnMapping.type);
      if (typeIdx >= 0) {
        console.log('🔍 Modo DUPLO ativado - processando Guardiões E Inimigos separadamente');
        
        // Process Guardians
        const guardianRows = rows.filter(row => {
          const typeValue = String(row[typeIdx] || '').toLowerCase().trim();
          return typeValue.includes('guardião') || typeValue.includes('guardiao') || 
                 typeValue.includes('guardian') || typeValue.includes('ativo') || 
                 typeValue.includes('asset');
        });
        
        // Process Enemies
        const enemyRows = rows.filter(row => {
          const typeValue = String(row[typeIdx] || '').toLowerCase().trim();
          return typeValue.includes('inimigo') || typeValue.includes('enemy') ||
                 typeValue.includes('divida') || typeValue.includes('dívida') || 
                 typeValue.includes('debt');
        });
        
        console.log(`✅ Detectados: ${guardianRows.length} Guardiões + ${enemyRows.length} Inimigos`);
        
        // Process guardians first
        if (guardianRows.length > 0) {
          await processTypeData(guardianRows, true);
        }
        
        // Then process enemies
        if (enemyRows.length > 0) {
          await processTypeData(enemyRows, false);
        }
        
        queryClient.invalidateQueries(['assets']);
        queryClient.invalidateQueries(['debts']);
        toast.success(`⚔️ Importação completa! ${guardianRows.length} Guardiões + ${enemyRows.length} Inimigos`);
        resetImporter();
        return;
      }
    }
    
    // Single mode processing
    await processTypeData(rows, isGuardian);
    
    if (!isBothMode) {
      queryClient.invalidateQueries(['assets']);
      queryClient.invalidateQueries(['debts']);
      resetImporter();
    }
  };

  // Get AI suggestion for category
  const getAISuggestion = async (unknownCategory) => {
    setAiThinking(true);
    try {
      const categoryNames = existingCategories.map(c => c.name);
      const prompt = `Analise esta categoria desconhecida e decida se deve ser criada ou mapeada:

CATEGORIA DESCONHECIDA: "${unknownCategory}"
CATEGORIAS EXISTENTES: ${JSON.stringify(categoryNames)}

Retorne APENAS um JSON no formato:
{
  "action": "create" ou "map",
  "mapTo": "<nome da categoria existente>" (apenas se action for "map"),
  "reason": "<justificativa curta em português>"
}

Exemplo: Se a categoria for "Coinbase" e existir "Investimentos", retorne:
{
  "action": "map",
  "mapTo": "Investimentos",
  "reason": "Coinbase é uma plataforma de investimentos em criptomoedas"
}`;

      const result = await callGemini(prompt);
      setAiSuggestions(prev => ({ ...prev, [unknownCategory]: result }));
    } catch (error) {
      toast.error('Erro ao consultar IA');
    } finally {
      setAiThinking(false);
    }
  };

  // Handle conflict decision
  const handleConflictDecision = async (action, mapTo = null) => {
    const currentItem = conflictItems[currentConflictIndex];

    if (action === 'create') {
      await base44.entities.BudgetCategory.create({
        name: currentItem.category,
        budget: 0,
        color: '#FF00FF'
      });
      queryClient.invalidateQueries(['budgetCategories']);
      await saveItems([currentItem], isGuardian);
    } else if (action === 'map' && mapTo) {
      await saveItems([{ ...currentItem, category: mapTo }], isGuardian);
    }

    // Move to next conflict
    if (currentConflictIndex < conflictItems.length - 1) {
      setCurrentConflictIndex(currentConflictIndex + 1);
      const nextCategory = conflictItems[currentConflictIndex + 1].category;
      if (!aiSuggestions[nextCategory]) {
        await getAISuggestion(nextCategory);
      }
    } else {
      queryClient.invalidateQueries(['assets']);
      queryClient.invalidateQueries(['debts']);
      queryClient.invalidateQueries(['budgetCategories']);
      toast.success(`${emoji} Importação completa!`);
      resetImporter();
    }
  };

  // Game Engine: Process imported data with gamification
  const saveItems = async (items, isGuardianType) => {
    const entityName = isGuardianType ? 'Asset' : 'Debt';
    const currentUser = await base44.auth.me();
    
    // Fetch existing items to check for duplicates
    const existingItems = isGuardianType 
      ? await base44.entities.Asset.filter({ created_by: currentUser.email })
      : await base44.entities.Debt.filter({ created_by: currentUser.email });
    
    // Filter out duplicates
    const uniqueItems = items.filter(item => {
      if (isGuardianType) {
        return !existingItems.some(existing => 
          existing.name.toLowerCase().trim() === item.name.toLowerCase().trim()
        );
      } else {
        return !existingItems.some(existing => 
          existing.creditor.toLowerCase().trim() === item.creditor.toLowerCase().trim()
        );
      }
    });
    
    if (uniqueItems.length === 0) {
      toast.warning('⚠️ Nenhum item novo para importar', {
        description: 'Todos os itens já existem no sistema'
      });
      return;
    }
    
    if (uniqueItems.length < items.length) {
      const duplicateCount = items.length - uniqueItems.length;
      toast.info(`🔄 ${duplicateCount} item${duplicateCount > 1 ? 's' : ''} duplicado${duplicateCount > 1 ? 's' : ''} ignorado${duplicateCount > 1 ? 's' : ''}`);
    }
    
    const entityData = uniqueItems.map(item => {
      if (isGuardianType) {
        // Mapear categoria para tipo seguindo ordem de liquidez
        let assetType = 'cash'; // Padrão: mais líquido
        const catLower = item.category.toLowerCase();
        
        if (catLower.includes('invest') || catLower.includes('aplicação') || catLower.includes('aplicacao') || 
            catLower.includes('fundo') || catLower.includes('ação') || catLower.includes('acoes') || 
            catLower.includes('cripto') || catLower.includes('renda fixa')) {
          assetType = 'investment';
        } else if (catLower.includes('veiculo') || catLower.includes('veículo') || catLower.includes('carro') || 
                   catLower.includes('moto') || catLower.includes('automóvel')) {
          assetType = 'vehicle';
        } else if (catLower.includes('imovel') || catLower.includes('imóvel') || catLower.includes('casa') || 
                   catLower.includes('apartamento') || catLower.includes('terreno')) {
          assetType = 'real_estate';
        }
        
        return {
          name: item.name,
          value: item.value,
          type: assetType,
          acquisition_date: item.date
        };
      } else {
        return {
          creditor: item.creditor,
          outstanding_balance: item.currentBalance,
          total_amount: item.originalValue,
          interest_rate: item.interestRate,
          type: item.category.toLowerCase().includes('cartao') || item.category.toLowerCase().includes('credito') ? 'credit_card' :
                item.category.toLowerCase().includes('financiamento') ? 'financing' :
                item.category.toLowerCase().includes('emprestimo') ? 'loan' : 'other',
          due_date: item.dueDate,
          description: item.description || ''
        };
      }
    });

    // Save to database
    const createdEntities = await base44.entities[entityName].bulkCreate(entityData);

    // Trigger Game Engine Side Effects
    await triggerGameEngineEffects(uniqueItems, createdEntities, entityName);
  };

  // Quest Engine: Auto-generate missions based on imported data
  const triggerGameEngineEffects = async (items, createdEntities, entityName) => {
    const currentUser = await base44.auth.me();
    const userData = await base44.entities.User.filter({ email: currentUser.email });
    const user = userData[0];

    if (!user) return;

    // Calculate total imported value
    const isGuardianType = entityName === 'Asset';
    const totalValue = items.reduce((sum, item) => sum + (isGuardianType ? item.value : item.currentBalance), 0);

    if (isGuardianType) {
      // Guardian (Asset) Side Effects
      const highValueAssets = items.filter(item => (isGuardianType ? item.value : item.currentBalance) >= 10000);
      
      // Generate missions for high-value assets
      for (const asset of highValueAssets) {
        await base44.entities.Mission.create({
          title: `Fortalecer ${asset.name}`,
          description: `Realize um aporte mensal neste ativo para maximizar seu poder de guardião`,
          type: 'campaign',
          xp_reward: 150,
          gold_reward: 30,
          status: 'active',
          difficulty: 'medium',
          badge_icon: '🛡️'
        });
      }

      // Award XP for Guardian Power (HP Recovery)
      const xpGain = Math.floor(totalValue / 100); // 1 XP per R$ 100
      const newXP = (user.xp || 0) + xpGain;
      const newLevel = Math.floor(newXP / 100) + 1;

      await base44.entities.User.update(user.id, {
        xp: newXP % 100,
        level: newLevel,
        total_xp: (user.total_xp || 0) + xpGain,
        total_wealth: (user.total_wealth || 0) + totalValue
      });

      toast.success(`🛡️ Guardiões invocados! +${xpGain} XP`, {
        description: `HP Financeiro aumentou em R$ ${totalValue.toLocaleString()}`
      });

    } else {
      // Enemy (Debt) Side Effects
      const criticalDebts = items.filter(item => item.currentBalance >= 1000);
      
      // Generate missions for critical debts
      for (const debt of criticalDebts) {
        await base44.entities.Mission.create({
          title: `Neutralizar ${debt.creditor}`,
          description: `Elimine esta ameaça para fortalecer sua posição financeira`,
          type: 'campaign',
          xp_reward: 200,
          gold_reward: 50,
          status: 'active',
          difficulty: debt.currentBalance >= 5000 ? 'hard' : 'medium',
          badge_icon: '⚔️'
        });
      }

      // Calculate "damage" to financial HP
      const damage = totalValue;
      const newWealth = (user.total_wealth || 0) - damage;

      await base44.entities.User.update(user.id, {
        total_wealth: Math.max(0, newWealth)
      });

      toast.warning(`💀 Inimigos detectados!`, {
        description: `Dano de R$ ${totalValue.toLocaleString()} causado ao seu HP Financeiro`
      });

      // Critical Hit Alert
      if (criticalDebts.length > 0) {
        toast.error(`⚠️ ALERTA CRÍTICO!`, {
          description: `${criticalDebts.length} dívida${criticalDebts.length > 1 ? 's' : ''} de alto valor detectada${criticalDebts.length > 1 ? 's' : ''}!`
        });
      }
    }
  };

  const resetImporter = () => {
    setPhase(1);
    setFileData(null);
    setHeaders([]);
    setRows([]);
    setColumnMapping(
      isBothMode
        ? { 
            type: '', 
            name: '', value: '', date: '',
            creditor: '', currentBalance: '', originalValue: '', interestRate: '', dueDate: '', description: '',
            category: ''
          }
        : isGuardian 
          ? { type: '', name: '', value: '', category: '', date: '' }
          : { type: '', creditor: '', currentBalance: '', originalValue: '', interestRate: '', dueDate: '', category: '', description: '' }
    );
    setConflictItems([]);
    setCurrentConflictIndex(0);
    setAiSuggestions({});
    setShowMapDropdown(false);
    
    // Reset file input
    const fileInput = document.getElementById('file-upload');
    if (fileInput) fileInput.value = '';
  };

  const currentConflict = conflictItems[currentConflictIndex];
  const currentSuggestion = currentConflict ? aiSuggestions[currentConflict.category] : null;

  return (
    <div className="space-y-6">
      {/* Phase 1: Upload */}
      {phase === 1 && (
        <div className="relative overflow-hidden rounded-xl border-2 border-cyan-500/30 bg-[#1a1a2e]">
          <div className="relative z-10 p-6">
            {/* Header Compacto */}
            <div className="flex items-center gap-3 mb-4">
              <Zap className="w-6 h-6 text-cyan-400" />
              <div>
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <span className="text-green-400">IMPORTAÇÃO</span>
                  <span className="text-red-400">INTELIGENTE</span>
                </h2>
                <p className="text-gray-400 text-xs">
                  Importe seus ativos e dívidas em massa
                </p>
              </div>
            </div>

            {/* Instruções */}
            <div className="bg-cyan-900/20 border border-cyan-500/30 rounded-lg p-4 mb-4">
              <p className="text-cyan-400 font-bold text-sm mb-2">📋 Como Importar:</p>
              <ol className="text-gray-300 text-xs space-y-1 list-decimal list-inside">
                <li>Baixe o modelo de planilha abaixo</li>
                <li>Preencha com seus dados (Ativos e/ou Dívidas)</li>
                <li>Faça upload do arquivo preenchido</li>
                <li>A IA organizará tudo automaticamente!</li>
              </ol>
            </div>

            {/* Estrutura da Planilha */}
            <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4 mb-4">
              <p className="text-purple-400 font-bold text-sm mb-2">📊 Colunas Obrigatórias:</p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-green-400 font-bold mb-1">🛡️ Ativos (Guardiões):</p>
                  <ul className="text-gray-300 space-y-0.5">
                    <li>• <strong>Tipo:</strong> "ativo" ou "guardiao"</li>
                    <li>• <strong>Nome:</strong> Ex: "Poupança", "Investimento CDB"</li>
                    <li>• <strong>Valor:</strong> Saldo atual (R$)</li>
                    <li>• <strong>Categoria:</strong> Investimento, Dinheiro, etc</li>
                  </ul>
                </div>
                <div>
                  <p className="text-red-400 font-bold mb-1">💀 Dívidas (Inimigos):</p>
                  <ul className="text-gray-300 space-y-0.5">
                    <li>• <strong>Tipo:</strong> "divida" ou "inimigo"</li>
                    <li>• <strong>Credor:</strong> Nome do banco/cartão</li>
                    <li>• <strong>Saldo Devedor:</strong> Valor atual (R$)</li>
                    <li>• <strong>Categoria:</strong> Cartão, Empréstimo, etc</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Download Template */}
            <div className="mb-4">
              <Button
                onClick={() => {
                  // Criar CSV modelo
                  const csvContent = `Tipo,Nome,Valor,Categoria,Credor,Saldo Devedor,Data
ativo,Conta Corrente,5000,Dinheiro,,,2025-01-01
ativo,Investimento CDB,10000,Investimento,,,2025-01-01
divida,,,,Nubank,2500,Cartão de Crédito,2025-02-15
divida,,,,Santander,15000,Financiamento,2025-12-28`;
                  
                  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                  const link = document.createElement('a');
                  link.href = URL.createObjectURL(blob);
                  link.download = 'modelo_importacao_finquest.csv';
                  link.click();
                  
                  toast.success('📥 Modelo baixado!', {
                    description: 'Preencha o arquivo e faça upload'
                  });
                }}
                variant="outline"
                className="w-full border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10"
              >
                <ArrowRight className="w-4 h-4 mr-2 rotate-90" />
                Baixar Modelo de Planilha (.CSV)
              </Button>
            </div>

            {/* Upload Zone Compacto */}
            <input
              type="file"
              id="file-upload"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileUpload}
              disabled={!xlsxLoaded}
              className="hidden"
            />

            <label htmlFor="file-upload" className="cursor-pointer block">
              <motion.div
                whileHover={{ scale: 1.01 }}
                className="relative bg-gradient-to-r from-green-900/30 to-red-900/30 border-2 border-dashed border-cyan-500/50 rounded-xl p-8 transition-all hover:border-cyan-400 hover:shadow-[0_0_20px_rgba(0,255,255,0.3)]"
              >
                <div className="flex items-center justify-center gap-4 mb-3">
                  <div className="text-4xl">🛡️</div>
                  <div className="text-2xl">⚔️</div>
                  <div className="text-4xl">💀</div>
                </div>

                <div className="text-center">
                  <p className="text-white font-bold text-lg mb-1">
                    {xlsxLoaded ? 'Clique para selecionar arquivo' : 'Carregando...'}
                  </p>
                  <p className="text-gray-400 text-sm">
                    CSV, Excel (.xlsx, .xls)
                  </p>
                </div>
              </motion.div>
            </label>
          </div>
        </div>
      )}

      {/* Phase 2: Mapping */}
      {phase === 2 && (
        <NeonCard glowColor="cyan">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Brain className="w-10 h-10 text-cyan-400" />
              <div>
                <h2 className="text-2xl font-black text-white">
                  MAPEAMENTO INTELIGENTE
                </h2>
                <p className="text-gray-400 text-sm">
                  {rows.length} linhas detectadas
                </p>
              </div>
            </div>
            <Button
              onClick={handleAIMapping}
              disabled={aiThinking}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              {aiThinking ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  IA Pensando...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  ✨ Mapeamento Mágico IA
                </>
              )}
            </Button>
          </div>

          <div className="space-y-4">
            <div className="bg-cyan-900/20 border border-cyan-500/30 rounded-lg p-4">
              <p className="text-cyan-400 font-bold mb-2">Colunas Detectadas:</p>
              <div className="flex flex-wrap gap-2">
                {headers.map((header, i) => (
                  <span key={i} className="bg-cyan-500/20 border border-cyan-500/50 rounded px-3 py-1 text-sm text-cyan-400">
                    {header}
                  </span>
                ))}
              </div>
            </div>

            {isBothMode ? (
              // Both Mode: Guardian + Enemy Fields
              <div className="space-y-6">
                <div className="bg-cyan-900/20 border border-cyan-500/30 rounded-lg p-4">
                  <h3 className="text-cyan-400 font-bold mb-3">Coluna de Identificação</h3>
                  <div>
                    <label className="text-white font-bold mb-2 block flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-400" />
                      Tipo (Ativo/Dívida) *
                    </label>
                    <Select value={columnMapping.type} onValueChange={(v) => setColumnMapping({...columnMapping, type: v})}>
                      <SelectTrigger className="bg-[#0a0a1a] border-cyan-500/30 text-white">
                        <SelectValue placeholder="Selecione a coluna que identifica o tipo..." />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a2e] border-cyan-500/30">
                        {headers.map((h, i) => (
                          <SelectItem key={i} value={h} className="text-white hover:bg-cyan-500/20 cursor-pointer">{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-gray-400 text-xs mt-1">Esta coluna deve conter: "ativo", "guardião", "dívida" ou "inimigo"</p>
                  </div>
                </div>

                <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
                  <h3 className="text-green-400 font-bold mb-3 flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Campos para Guardiões (Ativos)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-white font-bold mb-2 block flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-400" />
                        Nome do Ativo
                      </label>
                      <Select value={columnMapping.name} onValueChange={(v) => setColumnMapping({...columnMapping, name: v})}>
                        <SelectTrigger className="bg-[#0a0a1a] border-cyan-500/30 text-white">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a1a2e] border-cyan-500/30">
                          {headers.map((h, i) => (
                            <SelectItem key={i} value={h} className="text-white hover:bg-cyan-500/20 cursor-pointer">{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-white font-bold mb-2 block flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-400" />
                        Valor
                      </label>
                      <Select value={columnMapping.value} onValueChange={(v) => setColumnMapping({...columnMapping, value: v})}>
                        <SelectTrigger className="bg-[#0a0a1a] border-cyan-500/30 text-white">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a1a2e] border-cyan-500/30">
                          {headers.map((h, i) => (
                            <SelectItem key={i} value={h} className="text-white hover:bg-cyan-500/20 cursor-pointer">{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-white font-bold mb-2 block">Data</label>
                      <Select value={columnMapping.date} onValueChange={(v) => setColumnMapping({...columnMapping, date: v})}>
                        <SelectTrigger className="bg-[#0a0a1a] border-cyan-500/30 text-white">
                          <SelectValue placeholder="Opcional" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a1a2e] border-cyan-500/30">
                          <SelectItem value={null} className="text-gray-400 hover:bg-cyan-500/20 cursor-pointer">Sem data</SelectItem>
                          {headers.map((h, i) => (
                            <SelectItem key={i} value={h} className="text-white hover:bg-cyan-500/20 cursor-pointer">{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                  <h3 className="text-red-400 font-bold mb-3 flex items-center gap-2">
                    <Skull className="w-5 h-5" />
                    Campos para Inimigos (Dívidas)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-white font-bold mb-2 block flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-400" />
                        Credor
                      </label>
                      <Select value={columnMapping.creditor} onValueChange={(v) => setColumnMapping({...columnMapping, creditor: v})}>
                        <SelectTrigger className="bg-[#0a0a1a] border-cyan-500/30 text-white">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a1a2e] border-cyan-500/30">
                          {headers.map((h, i) => (
                            <SelectItem key={i} value={h} className="text-white hover:bg-cyan-500/20 cursor-pointer">{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-white font-bold mb-2 block flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-400" />
                        Saldo Devedor
                      </label>
                      <Select value={columnMapping.currentBalance} onValueChange={(v) => setColumnMapping({...columnMapping, currentBalance: v})}>
                        <SelectTrigger className="bg-[#0a0a1a] border-cyan-500/30 text-white">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a1a2e] border-cyan-500/30">
                          {headers.map((h, i) => (
                            <SelectItem key={i} value={h} className="text-white hover:bg-cyan-500/20 cursor-pointer">{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-white font-bold mb-2 block">Vencimento</label>
                      <Select value={columnMapping.dueDate} onValueChange={(v) => setColumnMapping({...columnMapping, dueDate: v})}>
                        <SelectTrigger className="bg-[#0a0a1a] border-cyan-500/30 text-white">
                          <SelectValue placeholder="Opcional" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a1a2e] border-cyan-500/30">
                          <SelectItem value={null} className="text-gray-400 hover:bg-cyan-500/20 cursor-pointer">Sem vencimento</SelectItem>
                          {headers.map((h, i) => (
                            <SelectItem key={i} value={h} className="text-white hover:bg-cyan-500/20 cursor-pointer">{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
                  <h3 className="text-purple-400 font-bold mb-3">Categoria (Compartilhada)</h3>
                  <p className="text-gray-400 text-sm mb-3">Esta coluna define o tipo específico de cada item (ex: "Investimento", "Cartão de Crédito")</p>
                  <div>
                    <label className="text-white font-bold mb-2 block">Categoria</label>
                    <Select value={columnMapping.category} onValueChange={(v) => setColumnMapping({...columnMapping, category: v})}>
                      <SelectTrigger className="bg-[#0a0a1a] border-cyan-500/30 text-white">
                        <SelectValue placeholder="Opcional" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a2e] border-cyan-500/30">
                        <SelectItem value={null} className="text-gray-400 hover:bg-cyan-500/20 cursor-pointer">Sem categoria</SelectItem>
                        {headers.map((h, i) => (
                          <SelectItem key={i} value={h} className="text-white hover:bg-cyan-500/20 cursor-pointer">{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ) : isGuardian ? (
              // Guardian (Asset) Fields
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-white font-bold mb-2 block flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-400" />
                    Tipo (Ativo/Dívida)
                  </label>
                  <Select value={columnMapping.type} onValueChange={(v) => setColumnMapping({...columnMapping, type: v})}>
                    <SelectTrigger className="bg-[#0a0a1a] border-cyan-500/30 text-white">
                      <SelectValue placeholder="Opcional" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a2e] border-cyan-500/30">
                      <SelectItem value={null} className="text-gray-400 hover:bg-cyan-500/20 cursor-pointer">Todos são {displayName}s</SelectItem>
                      {headers.map((h, i) => (
                        <SelectItem key={i} value={h} className="text-white hover:bg-cyan-500/20 cursor-pointer">{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-white font-bold mb-2 block flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-400" />
                    Nome do Ativo
                  </label>
                  <Select value={columnMapping.name} onValueChange={(v) => setColumnMapping({...columnMapping, name: v})}>
                    <SelectTrigger className="bg-[#0a0a1a] border-cyan-500/30 text-white">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a2e] border-cyan-500/30">
                      {headers.map((h, i) => (
                        <SelectItem key={i} value={h} className="text-white hover:bg-cyan-500/20 cursor-pointer">{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-white font-bold mb-2 block flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-400" />
                    Valor / Saldo
                  </label>
                  <Select value={columnMapping.value} onValueChange={(v) => setColumnMapping({...columnMapping, value: v})}>
                    <SelectTrigger className="bg-[#0a0a1a] border-cyan-500/30 text-white">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a2e] border-cyan-500/30">
                      {headers.map((h, i) => (
                        <SelectItem key={i} value={h} className="text-white hover:bg-cyan-500/20 cursor-pointer">{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-white font-bold mb-2 block flex items-center gap-2">
                    Categoria
                  </label>
                  <Select value={columnMapping.category} onValueChange={(v) => setColumnMapping({...columnMapping, category: v})}>
                    <SelectTrigger className="bg-[#0a0a1a] border-cyan-500/30 text-white">
                      <SelectValue placeholder="Opcional" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a2e] border-cyan-500/30">
                      <SelectItem value={null} className="text-gray-400 hover:bg-cyan-500/20 cursor-pointer">Sem categoria</SelectItem>
                      {headers.map((h, i) => (
                        <SelectItem key={i} value={h} className="text-white hover:bg-cyan-500/20 cursor-pointer">{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-white font-bold mb-2 block flex items-center gap-2">
                    Data
                  </label>
                  <Select value={columnMapping.date} onValueChange={(v) => setColumnMapping({...columnMapping, date: v})}>
                    <SelectTrigger className="bg-[#0a0a1a] border-cyan-500/30 text-white">
                      <SelectValue placeholder="Opcional" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a2e] border-cyan-500/30">
                      <SelectItem value={null} className="text-gray-400 hover:bg-cyan-500/20 cursor-pointer">Sem data</SelectItem>
                      {headers.map((h, i) => (
                        <SelectItem key={i} value={h} className="text-white hover:bg-cyan-500/20 cursor-pointer">{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              // Enemy (Debt) Fields
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-white font-bold mb-2 block flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-400" />
                      Tipo (Ativo/Dívida)
                    </label>
                    <Select value={columnMapping.type} onValueChange={(v) => setColumnMapping({...columnMapping, type: v})}>
                      <SelectTrigger className="bg-[#0a0a1a] border-cyan-500/30 text-white">
                        <SelectValue placeholder="Opcional" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a2e] border-cyan-500/30">
                        <SelectItem value={null} className="text-gray-400 hover:bg-cyan-500/20 cursor-pointer">Todos são {displayName}s</SelectItem>
                        {headers.map((h, i) => (
                          <SelectItem key={i} value={h} className="text-white hover:bg-cyan-500/20 cursor-pointer">{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-white font-bold mb-2 block flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-400" />
                      Credor / Banco
                    </label>
                    <Select value={columnMapping.creditor} onValueChange={(v) => setColumnMapping({...columnMapping, creditor: v})}>
                      <SelectTrigger className="bg-[#0a0a1a] border-cyan-500/30 text-white">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a2e] border-cyan-500/30">
                        {headers.map((h, i) => (
                          <SelectItem key={i} value={h} className="text-white hover:bg-cyan-500/20 cursor-pointer">{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-white font-bold mb-2 block flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-400" />
                      Saldo Devedor
                    </label>
                    <Select value={columnMapping.currentBalance} onValueChange={(v) => setColumnMapping({...columnMapping, currentBalance: v})}>
                      <SelectTrigger className="bg-[#0a0a1a] border-cyan-500/30 text-white">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a2e] border-cyan-500/30">
                        {headers.map((h, i) => (
                          <SelectItem key={i} value={h} className="text-white hover:bg-cyan-500/20 cursor-pointer">{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-white font-bold mb-2 block flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-400" />
                      Categoria / Tipo *
                    </label>
                    <Select value={columnMapping.category} onValueChange={(v) => setColumnMapping({...columnMapping, category: v})}>
                      <SelectTrigger className="bg-[#0a0a1a] border-cyan-500/30 text-white">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a2e] border-cyan-500/30">
                        {headers.map((h, i) => (
                          <SelectItem key={i} value={h} className="text-white hover:bg-cyan-500/20 cursor-pointer">{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-white font-bold mb-2 block flex items-center gap-2">
                      Vencimento
                    </label>
                    <Select value={columnMapping.dueDate} onValueChange={(v) => setColumnMapping({...columnMapping, dueDate: v})}>
                      <SelectTrigger className="bg-[#0a0a1a] border-cyan-500/30 text-white">
                        <SelectValue placeholder="Opcional" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a2e] border-cyan-500/30">
                        <SelectItem value={null} className="text-gray-400 hover:bg-cyan-500/20 cursor-pointer">Sem vencimento</SelectItem>
                        {headers.map((h, i) => (
                          <SelectItem key={i} value={h} className="text-white hover:bg-cyan-500/20 cursor-pointer">{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-white font-bold mb-2 block flex items-center gap-2">
                      Valor Original
                    </label>
                    <Select value={columnMapping.originalValue} onValueChange={(v) => setColumnMapping({...columnMapping, originalValue: v})}>
                      <SelectTrigger className="bg-[#0a0a1a] border-cyan-500/30 text-white">
                        <SelectValue placeholder="Opcional" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a2e] border-cyan-500/30">
                        <SelectItem value={null} className="text-gray-400 hover:bg-cyan-500/20 cursor-pointer">Usar saldo devedor</SelectItem>
                        {headers.map((h, i) => (
                          <SelectItem key={i} value={h} className="text-white hover:bg-cyan-500/20 cursor-pointer">{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-white font-bold mb-2 block flex items-center gap-2">
                      Taxa de Juros
                    </label>
                    <Select value={columnMapping.interestRate} onValueChange={(v) => setColumnMapping({...columnMapping, interestRate: v})}>
                      <SelectTrigger className="bg-[#0a0a1a] border-cyan-500/30 text-white">
                        <SelectValue placeholder="Opcional" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a2e] border-cyan-500/30">
                        <SelectItem value={null} className="text-gray-400 hover:bg-cyan-500/20 cursor-pointer">Sem juros</SelectItem>
                        {headers.map((h, i) => (
                          <SelectItem key={i} value={h} className="text-white hover:bg-cyan-500/20 cursor-pointer">{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="text-white font-bold mb-2 block flex items-center gap-2">
                    Descrição / Observações
                  </label>
                  <Select value={columnMapping.description} onValueChange={(v) => setColumnMapping({...columnMapping, description: v})}>
                    <SelectTrigger className="bg-[#0a0a1a] border-cyan-500/30 text-white">
                      <SelectValue placeholder="Opcional" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a2e] border-cyan-500/30">
                      <SelectItem value={null} className="text-gray-400 hover:bg-cyan-500/20 cursor-pointer">Sem descrição</SelectItem>
                      {headers.map((h, i) => (
                        <SelectItem key={i} value={h} className="text-white hover:bg-cyan-500/20 cursor-pointer">{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={() => resetImporter()}
                variant="outline"
                className="border-gray-500/50 text-gray-400"
              >
                Cancelar
              </Button>
              <Button
                onClick={processData}
                className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
              >
                Processar Dados
              </Button>
            </div>
          </div>
        </NeonCard>
      )}

      {/* Phase 3: Conflicts */}
      {phase === 3 && currentConflict && (
        <NeonCard glowColor="yellow">
          <div className="flex items-center gap-3 mb-6">
            <AlertCircle className="w-10 h-10 text-yellow-400" />
            <div>
              <h2 className="text-2xl font-black text-white">
                NOVA FACÇÃO DETECTADA
              </h2>
              <p className="text-gray-400 text-sm">
                Item {currentConflictIndex + 1} de {conflictItems.length}
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-purple-900/20 border border-purple-500/30 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center text-2xl">
                  {emoji}
                </div>
                <div>
                  <p className="text-white font-bold">{isGuardian ? currentConflict.name : currentConflict.creditor}</p>
                  <p className="text-cyan-400">R$ {(isGuardian ? currentConflict.value : currentConflict.currentBalance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                <p className="text-yellow-400 font-bold text-sm">
                  📂 Categoria: "{currentConflict.category}"
                </p>
              </div>
            </div>

            {/* AI Suggestion */}
            {aiThinking && (
              <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                  <div>
                    <p className="text-purple-400 font-bold">IA Analisando...</p>
                    <p className="text-gray-400 text-sm">Consultando conselheiro tático</p>
                  </div>
                </div>
              </div>
            )}

            {currentSuggestion && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-cyan-900/20 border border-cyan-500/30 rounded-lg p-4"
              >
                <div className="flex items-start gap-3">
                  <Brain className="w-6 h-6 text-cyan-400 flex-shrink-0 mt-1 animate-pulse" />
                  <div>
                    <p className="text-cyan-400 font-bold mb-1">💡 Conselho Tático da IA:</p>
                    <p className="text-white text-sm">{currentSuggestion.reason}</p>
                  </div>
                </div>
              </motion.div>
            )}

            <div className="space-y-3">
              <p className="text-white font-bold text-center">Como deseja proceder?</p>
              
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => handleConflictDecision('create')}
                  className={`h-auto py-4 ${
                    currentSuggestion?.action === 'create'
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 ring-2 ring-green-400 shadow-[0_0_20px_rgba(34,197,94,0.5)]'
                      : 'bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800'
                  }`}
                >
                  <Check className="w-5 h-5 mr-2" />
                  <div className="text-left">
                    <div className="font-bold">Criar Nova</div>
                    <div className="text-xs opacity-80">Nova categoria</div>
                  </div>
                </Button>

                <Button
                  onClick={() => {
                    if (currentSuggestion?.action === 'map' && currentSuggestion.mapTo) {
                      handleConflictDecision('map', currentSuggestion.mapTo);
                    } else {
                      setShowMapDropdown(!showMapDropdown);
                    }
                  }}
                  className={`h-auto py-4 ${
                    currentSuggestion?.action === 'map' || showMapDropdown
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 ring-2 ring-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.5)]'
                      : 'bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800'
                  }`}
                >
                  <ArrowRight className="w-5 h-5 mr-2" />
                  <div className="text-left">
                    <div className="font-bold">
                      {currentSuggestion?.action === 'map' && currentSuggestion.mapTo ? `→ ${currentSuggestion.mapTo}` : 'Mapear'}
                    </div>
                    <div className="text-xs opacity-80">Usar existente</div>
                  </div>
                </Button>
              </div>

              {(currentSuggestion?.action === 'map' || showMapDropdown) && (
                <div className="bg-cyan-900/20 border border-cyan-500/30 rounded-lg p-4">
                  <p className="text-cyan-400 font-bold text-sm mb-3">
                    {currentSuggestion?.action === 'map' && currentSuggestion.mapTo 
                      ? 'Ou escolha outra categoria:' 
                      : 'Escolha uma categoria existente:'}
                  </p>
                  <Select onValueChange={(v) => {
                    handleConflictDecision('map', v);
                    setShowMapDropdown(false);
                  }}>
                    <SelectTrigger className="bg-[#0a0a1a] border-cyan-500/30 text-white">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a2e] border-cyan-500/30">
                      {existingCategories.map(cat => (
                        <SelectItem key={cat.id} value={cat.name} className="text-white hover:bg-cyan-500/20 cursor-pointer">
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        </NeonCard>
      )}
    </div>
  );
}
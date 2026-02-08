import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import BudgetCharts from './BudgetCharts';
import { 
  ScanLine, 
  FileUp, 
  Loader2, 
  CheckCircle2, 
  DollarSign, 
  Calendar, 
  Building2, 
  Tag, 
  X,
  Plus,
  Pencil,
  Receipt,
  Trash2,
  BrainCircuit,
  Sparkles
} from 'lucide-react';
import AIBudgetOptimizer from './AIBudgetOptimizer';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import NeonCard from './NeonCard';
import RecurringExpenseManager from './RecurringExpenseManager';
import { format, parseISO, addWeeks, addMonths, addYears, isBefore, isSameDay } from 'date-fns';
import { Wand2 } from 'lucide-react';

// Initial state with 'expenses' array instead of simple 'spent' number
const INITIAL_CATEGORIES = [
  { 
    id: 'moradia', 
    name: 'Moradia', 
    budget: 2000, 
    frequency: 'monthly',
    color: '#FF00FF', 
    keywords: ['imobiliaria', 'condominio', 'luz', 'agua', 'energia'],
    expenses: [
      { id: '1', description: 'Aluguel', value: 1500, date: new Date().toISOString().split('T')[0] }
    ] 
  },
  { 
    id: 'transporte', 
    name: 'Transporte', 
    budget: 800, 
    frequency: 'monthly',
    color: '#00FFFF', 
    keywords: ['posto', 'combustivel', 'uber', '99', 'transporte', 'auto'],
    expenses: [
      { id: '2', description: 'Gasolina', value: 300, date: new Date().toISOString().split('T')[0] },
      { id: '3', description: 'Uber', value: 150, date: new Date().toISOString().split('T')[0] }
    ]
  },
  { 
    id: 'alimentacao', 
    name: 'Alimentação', 
    budget: 1200, 
    frequency: 'monthly',
    color: '#39FF14', 
    keywords: ['restaurante', 'supermercado', 'mercado', 'lanchonete', 'food', 'ifood'],
    expenses: [
      { id: '4', description: 'Supermercado Semanal', value: 800, date: new Date().toISOString().split('T')[0] }
    ]
  },
  { 
    id: 'cafe', 
    name: 'Café Diário', 
    budget: 300, 
    frequency: 'daily',
    color: '#FFA500', 
    keywords: ['cafe', 'padaria', 'lanche'],
    expenses: []
  },
  { 
    id: 'viagem', 
    name: 'Viagem Anual', 
    budget: 10000, 
    frequency: 'yearly',
    color: '#B026FF', 
    keywords: ['passagem', 'hotel'],
    expenses: []
  }
];

export default function BudgetTracker() {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { data: categories = [], isLoading: isLoadingCategories } = useQuery({
    queryKey: ['budgetCategories'],
    queryFn: async () => {
      const data = await base44.entities.BudgetCategory.list();
      if (data.length === 0) {
        // Seed initial data if empty
        try {
            await Promise.all(INITIAL_CATEGORIES.map(cat => 
            base44.entities.BudgetCategory.create({
                name: cat.name,
                budget: cat.budget,
                frequency: cat.frequency,
                color: cat.color,
                keywords: cat.keywords,
                expenses: []
            })
            ));
            return await base44.entities.BudgetCategory.list();
        } catch (e) {
            console.error("Error seeding data", e);
            return [];
        }
      }
      return data;
    }
  });

  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isSuggestingCategory, setIsSuggestingCategory] = useState(false);
  const [showRecurringManager, setShowRecurringManager] = useState(false);
  
  // Temporal Phase Shift State
  const [viewMode, setViewMode] = useState('monthly'); // daily, weekly, monthly, yearly
  
  // New States for Modal Management
  const [selectedCategory, setSelectedCategory] = useState(null); // For viewing details
  const [isAddingManual, setIsAddingManual] = useState(null); // Category ID for manual add
  const [isEditingCategory, setIsEditingCategory] = useState(null); // Category object for editing
  
  // Form States
  const [manualExpense, setManualExpense] = useState({ description: '', value: '', date: new Date().toISOString().split('T')[0], debtId: '', accountId: '' });
  const [editingExpense, setEditingExpense] = useState(null);
  const [expenseDateFilter, setExpenseDateFilter] = useState({ start: '', end: '' });
  
  // Sync date from URL params if present (from Calendar widget)
  useEffect(() => {
    const dateParam = searchParams.get('date');
    if (dateParam) {
      setManualExpense(prev => ({ ...prev, date: dateParam }));
      // Optionally open the manual add modal if specific date is clicked? 
      // For now, just syncing the state is enough for when the user opens it.
    }
  }, [searchParams]);

  const [editCategoryForm, setEditCategoryForm] = useState({ name: '', budget: '', frequency: 'monthly' });
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryForm, setNewCategoryForm] = useState({ name: '', budget: '', frequency: 'monthly', color: '#00FFFF' });

  const fileInputRef = useRef(null);

  // Calculate spent total dynamically
  const getSpent = (cat) => cat.expenses.reduce((acc, curr) => acc + curr.value, 0);

  // Fetch recurring expenses for processing
  const { data: recurringExpenses = [] } = useQuery({
    queryKey: ['recurringExpenses'],
    queryFn: () => base44.entities.RecurringExpense.list(),
  });

  // Fetch debts for payment linking
  const { data: debts = [] } = useQuery({
    queryKey: ['debts'],
    queryFn: () => base44.entities.Debt.list(),
  });

  // Fetch accounts for transaction linking
  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => base44.entities.Account.list(),
  });

  // Process Recurring Expenses Effect
  useEffect(() => {
    if (categories.length > 0 && recurringExpenses.length > 0) {
      processRecurringExpenses();
    }
  }, [categories.length, recurringExpenses.length]);

  const processRecurringExpenses = async () => {
    const today = new Date();
    const updates = [];
    const categoryUpdates = {};
    const transactionsToCreate = []; // Novo array para transações

    for (const expense of recurringExpenses) {
      if (!expense.active) continue;

      let nextDue = parseISO(expense.next_due_date);
      let modified = false;

      while (isBefore(nextDue, today) || isSameDay(nextDue, today)) {
        const isoDate = format(nextDue, 'yyyy-MM-dd');
        
        // 1. Prepara atualização visual da Categoria
        const newExpense = {
          id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          description: `${expense.description} (Recorrente)`,
          value: expense.value,
          date: isoDate
        };

        if (!categoryUpdates[expense.category_id]) {
          categoryUpdates[expense.category_id] = [];
        }
        categoryUpdates[expense.category_id].push(newExpense);

        // 2. CORREÇÃO: Prepara criação da FinTransaction para o DRE/Relatórios
        const catName = categories.find(c => c.id === expense.category_id)?.name || 'Recorrente';
        
        transactionsToCreate.push({
            date: isoDate,
            description: `${expense.description} (Automático)`,
            value: Number(expense.value),
            category: catName,
            type: 'expense',
            account_id: null
        });

        // Avança a data
        if (expense.frequency === 'weekly') nextDue = addWeeks(nextDue, 1);
        else if (expense.frequency === 'yearly') nextDue = addYears(nextDue, 1);
        else nextDue = addMonths(nextDue, 1);

        modified = true;
      }

      if (modified) {
        updates.push(base44.entities.RecurringExpense.update(expense.id, {
          next_due_date: format(nextDue, 'yyyy-MM-dd'),
          last_processed_date: new Date().toISOString()
        }));
      }
    }

    if (updates.length > 0) {
      // Atualiza categorias (Orçamento Visual)
      for (const [catId, newExpenses] of Object.entries(categoryUpdates)) {
        const category = categories.find(c => c.id === catId);
        if (category) {
          await updateCategoryMutation.mutateAsync({
            id: category.id,
            data: { expenses: [...newExpenses, ...category.expenses] }
          });
        }
      }
      
      // Cria as transações reais (Relatórios/DRE)
      await Promise.all(transactionsToCreate.map(t => base44.entities.FinTransaction.create(t)));
      
      // Atualiza datas das recorrências
      await Promise.all(updates);
      
      queryClient.invalidateQueries(['recurringExpenses']);
      queryClient.invalidateQueries(['finTransactions']);
      toast.success(`${updates.length} despesas recorrentes processadas e lançadas no DRE!`);
    }
  };

  // AI Category Suggestion with History Learning
  const suggestCategoryAI = async (description, amount = null, date = null) => {
    if (!description) return null;
    setIsSuggestingCategory(true);

    try {
      // Build history context (Learn from past)
      const history = categories.flatMap(cat => 
        cat.expenses.slice(0, 10).map(e => ({
            desc: e.description,
            val: e.value,
            date: e.date,
            cat: cat.name,
            catId: cat.id
        }))
      ).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 30);

      const prompt = `
        Atue como um assistente financeiro especialista. Analise a despesa e sugira a categoria ideal.
        
        DESPESA ATUAL:
        Descrição: "${description}"
        Valor: ${amount || '?'}
        Data: ${date || '?'}

        CATEGORIAS EXISTENTES:
        ${categories.map(c => `- ${c.name} (ID: ${c.id})`).join('\n')}

        HISTÓRICO DE APRENDIZADO (Padrões do Usuário):
        ${history.map(h => `- "${h.desc}" (R$${h.val}) em ${h.date} -> ${h.cat}`).join('\n')}

        INSTRUÇÕES:
        1. Analise o histórico para identificar padrões do usuário (ex: se "Uber" sempre vai para "Transporte").
        2. Se encaixar em uma categoria existente, retorne o ID.
        3. Se for algo totalmente novo que não se encaixa, sugira um nome para NOVA categoria.

        Retorne JSON:
        {
            "categoryId": "id_existente" ou null,
            "newCategoryName": "Nome Sugerido" (apenas se categoryId for null),
            "reason": "Breve motivo da sugestão"
        }
      `;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
            type: "object",
            properties: {
                categoryId: { type: ["string", "null"] },
                newCategoryName: { type: ["string", "null"] },
                reason: { type: "string" }
            }
        }
      });
      
      setIsSuggestingCategory(false);
      return result;
    } catch (error) {
      console.error("AI Suggestion failed", error);
      setIsSuggestingCategory(false);
      return null;
    }
  };

  const handleSuggestCategoryClick = async () => {
    const categoryId = await suggestCategoryAI(manualExpense.description, manualExpense.value);
    if (categoryId) {
      // Find the category object to confirm user sees the name? 
      // Since we store manualExpense separate from the category selection in the modal (state isAddingManual holds cat ID),
      // we need to update isAddingManual if we want to switch the selected category in context of the modal...
      // BUT, the manual modal is opened FOR a specific category usually.
      // If this function is used inside the "Add Manual Expense" modal, we might want to let user change category there.
      // However, current UI structure: Modal is "Add Manual Expense TO [Category]".
      // Let's adapt the modal to allow category switching or just update the implicit context?
      // Actually, let's just return the ID and let the caller handle it.
      
      // Wait, the current modal fixes the category. Let's update the modal later to allow category selection if needed.
      // For now let's use this for the "Scan" flow mainly.
    }
  };

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BudgetCategory.update(id, data),
    onSuccess: () => {
        queryClient.invalidateQueries(['budgetCategories']);
        toast.success('Atualizado com sucesso!');
    },
    onError: () => toast.error('Erro ao salvar')
  });

  const createCategoryMutation = useMutation({
    mutationFn: (data) => base44.entities.BudgetCategory.create(data),
    onSuccess: () => {
        queryClient.invalidateQueries(['budgetCategories']);
        toast.success('Categoria criada!');
        setIsCreatingCategory(false);
        setNewCategoryForm({ name: '', budget: '', color: '#00FFFF' });
    }
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id) => base44.entities.BudgetCategory.delete(id),
    onSuccess: () => {
        queryClient.invalidateQueries(['budgetCategories']);
        toast.success('Categoria removida!');
        setIsEditingCategory(null);
    }
  });

  const handleFileChange = async (e, targetCategoryId = null) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    toast.info("Enviando arquivo para análise inteligente...");

    try {
      // 1. Upload File
      const uploadRes = await base44.integrations.Core.UploadFile({
        file: file
      });

      if (!uploadRes || !uploadRes.file_url) throw new Error("Upload failed");

      // 2. Extract Data with AI
      toast.info("IA analisando comprovante...");
      const extractionRes = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: uploadRes.file_url,
        json_schema: {
          type: "object",
          properties: {
            total_amount: { type: "number", description: "Valor total da despesa" },
            date: { type: "string", format: "date", description: "Data da despesa YYYY-MM-DD" },
            merchant_name: { type: "string", description: "Nome do estabelecimento" },
            category: { 
              type: "string", 
              enum: [...categories.map(c => c.id), "outros"],
              description: "Categoria sugerida baseada no item" 
            }
          },
          required: ["total_amount", "merchant_name"]
        }
      });

      if (extractionRes.status === 'error') throw new Error(extractionRes.details);

      const data = extractionRes.output;
      let categoryId = targetCategoryId || data.category || 'outros';
      let newCategorySuggestion = null;

      // Refine with History-based AI
      try {
        const refined = await suggestCategoryAI(data.merchant_name, data.total_amount, data.date);
        if (refined) {
           if (refined.categoryId && categories.find(c => c.id === refined.categoryId)) {
               categoryId = refined.categoryId;
               toast.success(`Categoria refinada: ${categories.find(c => c.id === categoryId)?.name}`);
           } else if (refined.newCategoryName) {
               newCategorySuggestion = refined.newCategoryName;
               toast.info(`Sugestão de nova categoria: ${refined.newCategoryName}`);
           }
        }
      } catch (e) {
        console.log("Refinement skipped");
      }
      
      setScannedData({
        value: data.total_amount || '',
        date: data.date || new Date().toISOString().split('T')[0],
        establishment: data.merchant_name || 'Despesa',
        categoryId: categoryId,
        fileUrl: uploadRes.file_url,
        newCategorySuggestion,
        debtId: '',
        accountId: '' // Initialize accountId
      });

      setShowConfirmation(true);
      toast.success("Dados processados!");

    } catch (error) {
      console.error(error);
      toast.error("Erro na leitura inteligente. Tente manual.");
      
      setScannedData({
        value: '',
        date: new Date().toISOString().split('T')[0],
        establishment: '',
        categoryId: targetCategoryId || 'outros',
        accountId: '',
        isErrorFallback: true
      });
      setShowConfirmation(true);

    } finally {
      setIsScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveExpense = async () => {
    if (!scannedData) return;

    if (!scannedData.date) {
      toast.error("A data da despesa é obrigatória para os relatórios!");
      return;
    }
    
    if (!scannedData.value || scannedData.value <= 0) {
      toast.error("O valor da despesa é obrigatório!");
      return;
    }

    if (!scannedData.accountId) {
      toast.error("Selecione uma conta bancária!");
      return;
    }

    const newExpense = {
      id: Date.now().toString(),
      description: scannedData.establishment || 'Despesa sem nome',
      value: Number(scannedData.value),
      date: scannedData.date
    };

    const category = categories.find(c => c.id === scannedData.categoryId);
    if (category) {
        // 1. Atualiza o Orçamento Visual (Array interno)
        await updateCategoryMutation.mutateAsync({
            id: category.id,
            data: { expenses: [newExpense, ...(category.expenses || [])] }
        });

        // 2. Cria o registro financeiro para os Relatórios/DRE
        await base44.entities.FinTransaction.create({
            date: scannedData.date,
            description: scannedData.establishment || 'Despesa Scanner',
            value: Number(scannedData.value),
            category: category.name,
            type: 'expense',
            account_id: scannedData.accountId
        });

        // 3. Atualiza saldo da conta
        const account = accounts.find(a => a.id === scannedData.accountId);
        if (account) {
            await base44.entities.Account.update(account.id, {
                balance: account.balance - Number(scannedData.value)
            });
        }

        // 4. Verifica dívidas
        if (scannedData.debtId) {
            const debt = debts.find(d => d.id === scannedData.debtId);
            if (debt) {
                const newBalance = Math.max(0, debt.outstanding_balance - parseFloat(scannedData.value));
                await base44.entities.Debt.update(debt.id, {
                    outstanding_balance: newBalance
                });
                queryClient.invalidateQueries(['debts']);
                queryClient.invalidateQueries(['netWorthSummary']);
                toast.success(`💥 Ataque Crítico! Inimigo ${debt.creditor} recebeu ${scannedData.value} de dano!`);
            }
        }
    }
    
    // Forçar atualização dos relatórios
    queryClient.invalidateQueries(['finTransactions']);
    queryClient.invalidateQueries(['accounts']);
    queryClient.invalidateQueries(['netWorthSummary']);
    
    setShowConfirmation(false);
    setScannedData(null);
  };

  const handleAddManualExpense = async () => {
    if (!manualExpense.description || !manualExpense.value) {
      toast.error('Preencha descrição e valor');
      return;
    }

    if (!manualExpense.date) {
      toast.error('A data é obrigatória!');
      return;
    }

    if (!manualExpense.accountId) {
      toast.error('Selecione uma conta bancária!');
      return;
    }

    const newExpense = {
      id: Date.now().toString(),
      description: manualExpense.description,
      value: parseFloat(manualExpense.value),
      date: manualExpense.date
    };

    const category = categories.find(c => c.id === isAddingManual);
    if (category) {
        // 1. Atualiza o Orçamento Visual
        await updateCategoryMutation.mutateAsync({
            id: category.id,
            data: { expenses: [newExpense, ...(category.expenses || [])] }
        });

        // 2. Sincroniza com Relatórios/DRE
        await base44.entities.FinTransaction.create({
            date: manualExpense.date,
            description: manualExpense.description,
            value: parseFloat(manualExpense.value),
            category: category.name,
            type: 'expense',
            account_id: manualExpense.accountId
        });

        // 3. Atualiza saldo da conta
        const account = accounts.find(a => a.id === manualExpense.accountId);
        if (account) {
            await base44.entities.Account.update(account.id, {
                balance: account.balance - parseFloat(manualExpense.value)
            });
        }

        // 4. Verifica dívidas
        if (manualExpense.debtId) {
            const debt = debts.find(d => d.id === manualExpense.debtId);
            if (debt) {
                const newBalance = Math.max(0, debt.outstanding_balance - parseFloat(manualExpense.value));
                await base44.entities.Debt.update(debt.id, {
                    outstanding_balance: newBalance
                });
                queryClient.invalidateQueries(['debts']);
                queryClient.invalidateQueries(['netWorthSummary']); 
                toast.success(`💥 Dano Crítico! Inimigo ${debt.creditor} sofreu ${manualExpense.value} de dano!`);
            }
        }
    }

    // Forçar atualização dos relatórios
    queryClient.invalidateQueries(['finTransactions']);
    queryClient.invalidateQueries(['accounts']);
    queryClient.invalidateQueries(['netWorthSummary']);

    setIsAddingManual(null);
    setManualExpense({ description: '', value: '', date: new Date().toISOString().split('T')[0], debtId: '', accountId: '' });
  };

  const handleUpdateCategory = () => {
    if (!editCategoryForm.name || !editCategoryForm.budget) return;
    
    updateCategoryMutation.mutate({
        id: isEditingCategory.id,
        data: { 
            name: editCategoryForm.name, 
            budget: parseFloat(editCategoryForm.budget),
            frequency: editCategoryForm.frequency
        }
    });
    setIsEditingCategory(null);
  };

  const handleCreateCategory = () => {
    if (!newCategoryForm.name || !newCategoryForm.budget) {
      toast.error('Preencha nome e orçamento');
      return;
    }

    createCategoryMutation.mutate({
      name: newCategoryForm.name,
      budget: parseFloat(newCategoryForm.budget),
      frequency: newCategoryForm.frequency,
      color: newCategoryForm.color,
      expenses: [],
      keywords: []
    });
  };

  const handleDeleteCategory = (categoryId) => {
    deleteCategoryMutation.mutate(categoryId);
  };

  const handleDeleteExpense = (categoryId, expenseId) => {
    const category = categories.find(c => c.id === categoryId);
    if (category) {
        updateCategoryMutation.mutate({
            id: category.id,
            data: { expenses: category.expenses.filter(e => e.id !== expenseId) }
        });
    }
  };

  const handleUpdateExpense = () => {
    if (!editingExpense || !editingExpense.description || !editingExpense.value) {
      toast.error('Preencha todos os campos');
      return;
    }

    const category = categories.find(c => c.id === selectedCategory.id);
    if (category) {
      const updatedExpenses = category.expenses.map(e => 
        e.id === editingExpense.id 
          ? { ...e, description: editingExpense.description, value: parseFloat(editingExpense.value), date: editingExpense.date } 
          : e
      );
      
      updateCategoryMutation.mutate({
        id: category.id,
        data: { expenses: updatedExpenses }
      });
      
      // Update local selected category to reflect changes immediately in UI if needed, 
      // but react-query should handle it. We just need to close the modal.
      setSelectedCategory(prev => ({ ...prev, expenses: updatedExpenses }));
      setEditingExpense(null);
      toast.success('Despesa atualizada!');
    }
  };

  return (
    <div className="space-y-6">
      {/* AI Budget Optimizer Card */}
      <NeonCard glowColor="blue" className="relative overflow-hidden">
        <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-500/30">
                <BrainCircuit className="w-6 h-6 text-blue-400" />
            </div>
            <div>
                <h2 className="text-xl font-black text-white">Centro de Inteligência Financeira</h2>
                <p className="text-gray-400 text-sm">Otimização de orçamento baseada em IA</p>
            </div>
        </div>
        <div className="bg-[#0a0a1a]/50 rounded-xl border border-gray-800 p-2">
            <AIBudgetOptimizer categories={categories} />
        </div>
      </NeonCard>

      {/* HUD Temporal: Phase Shift Selector */}
      <div className="flex justify-center">
        <div className="inline-flex bg-[#0a0a1a] p-1.5 rounded-xl border border-cyan-500/30 shadow-[0_0_15px_rgba(0,255,255,0.1)]">
            {[
                { id: 'daily', label: 'DIÁRIO', color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
                { id: 'weekly', label: 'SEMANAL', color: 'text-green-400', bg: 'bg-green-500/20' },
                { id: 'monthly', label: 'MENSAL', color: 'text-blue-400', bg: 'bg-blue-500/20' },
                { id: 'yearly', label: 'ANUAL', color: 'text-purple-400', bg: 'bg-purple-500/20' }
            ].map((mode) => (
                <button
                    key={mode.id}
                    onClick={() => setViewMode(mode.id)}
                    className={`
                        px-6 py-2 rounded-lg font-bold font-mono text-xs transition-all duration-300 flex items-center gap-2
                        ${viewMode === mode.id 
                            ? `${mode.bg} ${mode.color} shadow-[0_0_10px_currentColor] scale-105 border border-${mode.color.split('-')[1]}-500/50` 
                            : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
                        }
                    `}
                >
                    {viewMode === mode.id && <span className="animate-pulse">●</span>}
                    {mode.label}
                </button>
            ))}
        </div>
      </div>

      {/* Global Scanner Button */}
      <NeonCard glowColor="cyan" className="relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start justify-between gap-6">
          <div className="flex-1">
            <h2 className="text-2xl font-black text-white flex items-center gap-2">
              <ScanLine className="w-6 h-6 text-cyan-400" />
              Orçamento de Batalha
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              Módulo de controle financeiro e digitalização de faturas.
            </p>
          </div>

          <div className="flex flex-col gap-4 w-full md:w-auto items-end">
            <div className="flex items-center gap-4">
              <Button
                  onClick={() => setIsCreatingCategory(true)}
                  className="bg-gray-800 border border-gray-700 hover:bg-gray-700 text-white px-6 py-6 rounded-xl flex items-center gap-2"
              >
                  <Plus className="w-5 h-5 text-cyan-400" />
                  Nova Categoria
              </Button>
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={(e) => handleFileChange(e, null)} 
                accept="image/*" 
                className="hidden" 
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isScanning}
                className={`
                  relative overflow-hidden group px-6 py-6 rounded-xl
                  ${isScanning ? 'bg-gray-800' : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500'}
                  border border-cyan-500/50 shadow-[0_0_20px_rgba(0,255,255,0.3)]
                `}
              >
                {isScanning ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
                    <span className="text-cyan-400 font-bold">ANALISANDO...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <FileUp className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
                    <span className="text-white font-bold">SCAN MASTER IA</span>
                  </div>
                )}
              </Button>
            </div>

            <div className="w-full">
              <div className="flex justify-end items-center mb-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span className="text-sm text-gray-400">Automação de Gastos</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowRecurringManager(!showRecurringManager)}
                    className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                  >
                    {showRecurringManager ? 'Ocultar Recorrências' : 'Gerenciar Despesas Recorrentes'}
                  </Button>
                  </div>

                  {showRecurringManager && (
                <div className="bg-[#0a0a1a]/60 rounded-xl p-4 border border-purple-500/20 animate-in fade-in slide-in-from-top-2 w-full md:min-w-[500px]">
                  <RecurringExpenseManager categories={categories} />
                </div>
              )}
            </div>
          </div>
        </div>
        {isScanning && (
          <div className="mt-6">
            <Progress value={scanProgress} className="h-2 bg-gray-800" indicatorClassName="bg-cyan-400" />
            <p className="text-xs text-cyan-400 mt-2 text-center font-mono animate-pulse">PROCESSANDO DADOS...</p>
          </div>
        )}
      </NeonCard>



      {/* Categories Grid with Phase Shift Filter */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories
          .filter(cat => {
             // Default to 'monthly' if no frequency set (legacy support)
             const freq = cat.frequency || 'monthly';
             return freq === viewMode;
          })
          .map(cat => {
          const spent = getSpent(cat);
          const percent = Math.min((spent / cat.budget) * 100, 100);
          const isOver = spent > cat.budget;
          
          return (
            <div 
              key={cat.id}
              onClick={() => setSelectedCategory(cat)}
              className="bg-[#0f0f1e] border border-gray-800 rounded-2xl p-5 relative overflow-hidden group hover:border-gray-600 transition-all cursor-pointer hover:shadow-lg hover:shadow-cyan-500/10 animate-in zoom-in-95 duration-300"
            >
              <div 
                className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none"
                style={{ backgroundColor: cat.color }}
              />

              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-white text-xl tracking-wide">
                    {cat.name}
                </h3>
                
                <div className="flex items-center gap-2">
                    {/* Frequency Badge */}
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-gray-800 border border-gray-700 text-gray-400">
                        {cat.frequency || 'monthly'}
                    </span>

                    <span className="font-bold text-sm px-3 py-1 rounded-full bg-gray-900/50 border border-gray-700" style={{ color: isOver ? '#FF0000' : cat.color }}>
                        {percent.toFixed(0)}%
                    </span>
                    <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-6 w-6 text-gray-600 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsEditingCategory(cat);
                            setEditCategoryForm({ 
                                name: cat.name, 
                                budget: cat.budget,
                                frequency: cat.frequency || 'monthly'
                            });
                        }}
                    >
                        <Pencil className="w-3 h-3" />
                    </Button>
                </div>
              </div>

              <div className="flex justify-between text-sm text-gray-400 mb-3 font-medium">
                  <span className={isOver ? "text-red-400" : ""}>
                    Gasto: R$ {spent.toFixed(2)}
                  </span>
                  <span>Meta: R$ {cat.budget.toFixed(2)}</span>
              </div>

              <div className="h-3 bg-gray-900 rounded-full overflow-hidden border border-gray-800 mb-5">
                  <div 
                    className="h-full transition-all duration-500 shadow-[0_0_10px_currentColor]"
                    style={{ width: `${percent}%`, backgroundColor: isOver ? '#FF0000' : cat.color, color: isOver ? '#FF0000' : cat.color }}
                  />
              </div>

              {/* Action Buttons inside Category */}
              <div className="grid grid-cols-2 gap-3 opacity-80 group-hover:opacity-100 transition-opacity">
                <Button
                    size="sm"
                    className="bg-gray-800 hover:bg-gray-700 text-xs border border-gray-700 rounded-lg h-9"
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsAddingManual(cat.id);
                    }}
                >
                    <Plus className="w-3 h-3 mr-2" />
                    Manual
                </Button>
                <Button
                    size="sm"
                    className="bg-gray-800 hover:bg-gray-700 text-xs border border-gray-700 rounded-lg h-9"
                    onClick={(e) => {
                        e.stopPropagation();
                        // Trigger file input for this category specific scan
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.onchange = (ev) => handleFileChange(ev, cat.id);
                        input.click();
                    }}
                >
                    <ScanLine className="w-3 h-3 mr-2" />
                    Scan IA
                </Button>
              </div>
            </div>
          );
        })}
        
        {/* Empty State for Current View Mode */}
        {categories.filter(cat => (cat.frequency || 'monthly') === viewMode).length === 0 && (
            <div className="col-span-full py-12 text-center border border-dashed border-gray-800 rounded-2xl bg-[#0a0a1a]/30">
                <p className="text-gray-500 mb-4">Nenhuma categoria configurada para o modo <span className="text-cyan-400 font-bold uppercase">{viewMode}</span>.</p>
                <Button 
                    onClick={() => {
                        setIsCreatingCategory(true);
                        setNewCategoryForm(prev => ({ ...prev, frequency: viewMode }));
                    }}
                    className="bg-cyan-900/20 text-cyan-400 hover:bg-cyan-900/40 border border-cyan-500/30"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Categoria {viewMode === 'daily' ? 'Diária' : viewMode === 'weekly' ? 'Semanal' : viewMode === 'monthly' ? 'Mensal' : 'Anual'}
                </Button>
            </div>
        )}
      </div>

      {/* Charts Section */}
      <div className="mb-8 mt-8">
        <BudgetCharts categories={categories} />
      </div>

      {/* Modal: View Category Details (Expenses List) */}
      {selectedCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setSelectedCategory(null)}>
          <NeonCard glowColor="cyan" className="w-full max-w-2xl relative max-h-[80vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6 p-1">
                <div>
                    <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                        {selectedCategory.name}
                        <span className="text-xs font-normal text-gray-400 bg-gray-800 px-2 py-1 rounded-full border border-gray-700">
                            {selectedCategory.expenses.length} registros
                        </span>
                    </h3>
                    <p className="text-gray-400 text-sm">Histórico de gastos</p>
                </div>
                <button onClick={() => setSelectedCategory(null)} className="text-gray-400 hover:text-white"><X className="w-6 h-6" /></button>
            </div>

            {/* Date Filter */}
            <div className="flex gap-2 mb-4 bg-gray-900/50 p-2 rounded-lg">
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">De</label>
                <input 
                  type="date" 
                  className="w-full bg-gray-800 border border-gray-700 rounded p-1 text-white text-xs"
                  value={expenseDateFilter.start}
                  onChange={e => setExpenseDateFilter(prev => ({ ...prev, start: e.target.value }))}
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">Até</label>
                <input 
                  type="date" 
                  className="w-full bg-gray-800 border border-gray-700 rounded p-1 text-white text-xs"
                  value={expenseDateFilter.end}
                  onChange={e => setExpenseDateFilter(prev => ({ ...prev, end: e.target.value }))}
                />
              </div>
              {(expenseDateFilter.start || expenseDateFilter.end) && (
                <button 
                  onClick={() => setExpenseDateFilter({ start: '', end: '' })}
                  className="self-end mb-1 text-xs text-cyan-400 hover:text-cyan-300 underline px-2"
                >
                  Limpar
                </button>
              )}
            </div>

            <div className="overflow-y-auto flex-1 space-y-2 pr-2">
                {selectedCategory.expenses.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <Receipt className="w-12 h-12 mx-auto mb-2 opacity-20" />
                        <p>Nenhum gasto registrado nesta categoria.</p>
                    </div>
                ) : (
                    selectedCategory.expenses
                      .filter(expense => {
                        if (expenseDateFilter.start && new Date(expense.date) < new Date(expenseDateFilter.start)) return false;
                        if (expenseDateFilter.end && new Date(expense.date) > new Date(expenseDateFilter.end)) return false;
                        return true;
                      })
                      .sort((a, b) => new Date(b.date) - new Date(a.date))
                      .map(expense => (
                        <div key={expense.id} className="flex items-center justify-between bg-[#0a0a1a] p-3 rounded-lg border border-gray-800 hover:border-gray-700 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-gray-800 rounded-lg text-cyan-400">
                                    <DollarSign className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-white font-semibold text-sm">{expense.description}</p>
                                    <p className="text-gray-500 text-xs flex items-center gap-1">
                                        <Calendar className="w-3 h-3" /> {expense.date}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-white font-bold mr-2">R$ {expense.value.toFixed(2)}</span>
                                <button 
                                    onClick={() => setEditingExpense(expense)}
                                    className="text-cyan-500 hover:bg-cyan-500/10 p-1.5 rounded-md transition-colors"
                                    title="Editar gasto"
                                >
                                    <Pencil className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={() => handleDeleteExpense(selectedCategory.id, expense.id)}
                                    className="text-red-500 hover:bg-red-500/10 p-1.5 rounded-md transition-colors"
                                    title="Remover gasto"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Expense Edit Modal Overlay */}
            {editingExpense && (
              <div className="absolute inset-0 bg-black/90 backdrop-blur-sm z-10 flex items-center justify-center p-4">
                <NeonCard glowColor="cyan" className="w-full max-w-sm">
                  <h4 className="text-lg font-bold text-white mb-4">Editar Despesa</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Descrição</label>
                      <input 
                        className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white"
                        value={editingExpense.description}
                        onChange={e => setEditingExpense({...editingExpense, description: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Valor (R$)</label>
                      <input 
                        type="number"
                        className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white"
                        value={editingExpense.value}
                        onChange={e => setEditingExpense({...editingExpense, value: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Data</label>
                      <input 
                        type="date"
                        className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white"
                        value={editingExpense.date}
                        onChange={e => setEditingExpense({...editingExpense, date: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button variant="outline" className="flex-1" onClick={() => setEditingExpense(null)}>Cancelar</Button>
                    <Button className="flex-1 bg-cyan-600" onClick={handleUpdateExpense}>Salvar</Button>
                  </div>
                </NeonCard>
              </div>
            )}
            
            <div className="pt-4 mt-4 border-t border-gray-800 flex justify-between items-center">
                 <div className="text-sm text-gray-400">
                    Total Gasto: <span className="text-white font-bold text-lg">R$ {getSpent(selectedCategory).toFixed(2)}</span>
                 </div>
                 <Button onClick={() => setSelectedCategory(null)} variant="outline" className="border-gray-700">Fechar</Button>
            </div>
          </NeonCard>
        </div>
      )}

      {/* Modal: Add Manual Expense */}
      {isAddingManual && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <NeonCard glowColor="green" className="w-full max-w-md relative">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Plus className="w-5 h-5 text-green-400" />
                    Adicionar Gasto Manual
                </h3>
                <p className="text-gray-400 text-sm mb-4">
                    Categoria: <span className="text-green-400 font-bold">{categories.find(c => c.id === isAddingManual)?.name}</span>
                </p>
                
                <div className="space-y-3">
                    <div>
                        <label className="text-xs text-gray-500 mb-1 flex justify-between">
                          <span>Descrição</span>
                          <button 
                            onClick={async () => {
                              if (!manualExpense.description) return toast.error("Digite algo para a IA analisar");
                              const result = await suggestCategoryAI(manualExpense.description, manualExpense.value, manualExpense.date);

                              if (result) {
                                  if (result.categoryId) {
                                      const catName = categories.find(c => c.id === result.categoryId)?.name;
                                      toast.success(`Sugestão: ${catName}`, { description: result.reason });

                                      if (result.categoryId !== isAddingManual) {
                                          toast.info(`Esta despesa parece pertencer a "${catName}". Considere trocar.`, {
                                            action: {
                                              label: "Trocar",
                                              onClick: () => {
                                                setIsAddingManual(result.categoryId);
                                                toast.success("Categoria alterada!");
                                              }
                                            }
                                          });
                                      }
                                  } else if (result.newCategoryName) {
                                      toast.info(`Sugestão de Nova Categoria: ${result.newCategoryName}`, {
                                          description: result.reason,
                                          action: {
                                              label: "Criar",
                                              onClick: () => {
                                                  setIsCreatingCategory(true);
                                                  setNewCategoryForm(prev => ({...prev, name: result.newCategoryName}));
                                                  toast.success("Preenchendo nova categoria...");
                                              }
                                          }
                                      });
                                  }
                              }
                            }}
                            className="text-purple-400 hover:text-purple-300 flex items-center gap-1"
                            disabled={isSuggestingCategory}
                          >
                            {isSuggestingCategory ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                            IA Check
                          </button>
                        </label>
                        <input 
                            type="text" 
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white focus:border-green-500 focus:outline-none"
                            placeholder="Ex: Almoço"
                            value={manualExpense.description}
                            onChange={e => setManualExpense({...manualExpense, description: e.target.value})}
                        />
                    </div>
                    <div className="flex gap-3">
                        <div className="flex-1">
                            <label className="text-xs text-gray-500 mb-1 block">Valor (R$)</label>
                            <input 
                                type="number" 
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white focus:border-green-500 focus:outline-none"
                                placeholder="0.00"
                                value={manualExpense.value}
                                onChange={e => setManualExpense({...manualExpense, value: e.target.value})}
                            />
                        </div>
                        <div className="flex-1">
                            <label className="text-xs text-gray-500 mb-1 block">Data</label>
                            <input 
                                type="date" 
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white focus:border-green-500 focus:outline-none"
                                value={manualExpense.date}
                                onChange={e => setManualExpense({...manualExpense, date: e.target.value})}
                            />
                        </div>
                    </div>
                    
                    <div>
                        <label className="text-xs text-gray-500 mb-1 block flex items-center gap-2">
                            <span className="text-cyan-400">💰 Conta Bancária</span>
                            <span className="text-[10px] bg-red-800 px-1 rounded text-red-200">Obrigatório</span>
                        </label>
                        <select
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white focus:border-cyan-500 focus:outline-none"
                            value={manualExpense.accountId || ''}
                            onChange={e => setManualExpense({...manualExpense, accountId: e.target.value})}
                        >
                            <option value="">-- Selecione uma conta --</option>
                            {accounts.map(acc => (
                                <option key={acc.id} value={acc.id}>
                                    {acc.icon || '💰'} {acc.name} (R$ {acc.balance.toFixed(2)})
                                </option>
                            ))}
                        </select>
                    </div>
                    
                    {debts.length > 0 && (
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block flex items-center gap-2">
                                <span className="text-red-400">☠️ Abater Inimigo (Dívida)</span>
                                <span className="text-[10px] bg-gray-800 px-1 rounded">Opcional</span>
                            </label>
                            <select
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white focus:border-red-500 focus:outline-none"
                                value={manualExpense.debtId || ''}
                                onChange={e => setManualExpense({...manualExpense, debtId: e.target.value})}
                            >
                                <option value="">-- Nenhum --</option>
                                {debts.map(debt => (
                                    <option key={debt.id} value={debt.id}>
                                        {debt.creditor} (R$ {debt.outstanding_balance.toFixed(2)})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                <div className="flex gap-3 mt-6">
                    <Button 
                        variant="outline" 
                        className="flex-1 border-gray-600"
                        onClick={() => setIsAddingManual(null)}
                    >
                        Cancelar
                    </Button>
                    <Button 
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                        onClick={handleAddManualExpense}
                    >
                        Adicionar
                    </Button>
                </div>
            </NeonCard>
        </div>
      )}

      {/* Modal: Edit Category */}
      {isEditingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <NeonCard glowColor="magenta" className="w-full max-w-md relative">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Pencil className="w-5 h-5 text-magenta-400" />
                    Editar Categoria
                </h3>
                
                <div className="space-y-3">
                    <div>
                        <label className="text-xs text-gray-500 mb-1 block">Nome da Categoria</label>
                        <input 
                            type="text" 
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white focus:border-magenta-500 focus:outline-none"
                            value={editCategoryForm.name}
                            onChange={e => setEditCategoryForm({...editCategoryForm, name: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 mb-1 block">Orçamento (R$)</label>
                        <input 
                            type="number" 
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white focus:border-magenta-500 focus:outline-none"
                            value={editCategoryForm.budget}
                            onChange={e => setEditCategoryForm({...editCategoryForm, budget: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 mb-1 block">Periodicidade</label>
                        <select 
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white focus:border-magenta-500 focus:outline-none"
                            value={editCategoryForm.frequency}
                            onChange={e => setEditCategoryForm({...editCategoryForm, frequency: e.target.value})}
                        >
                            <option value="daily">Diário</option>
                            <option value="weekly">Semanal</option>
                            <option value="monthly">Mensal</option>
                            <option value="yearly">Anual</option>
                        </select>
                    </div>
                </div>

                <div className="flex flex-col gap-3 mt-6">
                    <div className="flex gap-3">
                        <Button 
                            variant="outline" 
                            className="flex-1 border-gray-600"
                            onClick={() => setIsEditingCategory(null)}
                        >
                            Cancelar
                        </Button>
                        <Button 
                            className="flex-1 bg-magenta-600 hover:bg-magenta-700 text-white"
                            onClick={handleUpdateCategory}
                        >
                            Salvar
                        </Button>
                    </div>
                    <Button 
                        variant="ghost" 
                        className="w-full text-red-500 hover:text-red-400 hover:bg-red-500/10"
                        onClick={() => handleDeleteCategory(isEditingCategory.id)}
                    >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Excluir Categoria
                    </Button>
                </div>
            </NeonCard>
        </div>
      )}

      {/* Modal: Create Category */}
      {isCreatingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <NeonCard glowColor="cyan" className="w-full max-w-md relative">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Plus className="w-5 h-5 text-cyan-400" />
                    Nova Categoria
                </h3>
                
                <div className="space-y-3">
                    <div>
                        <label className="text-xs text-gray-500 mb-1 block">Nome da Categoria</label>
                        <input 
                            type="text" 
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white focus:border-cyan-500 focus:outline-none"
                            placeholder="Ex: Educação"
                            value={newCategoryForm.name}
                            onChange={e => setNewCategoryForm({...newCategoryForm, name: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 mb-1 block">Orçamento (R$)</label>
                        <input 
                            type="number" 
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white focus:border-cyan-500 focus:outline-none"
                            placeholder="0.00"
                            value={newCategoryForm.budget}
                            onChange={e => setNewCategoryForm({...newCategoryForm, budget: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 mb-1 block">Periodicidade</label>
                        <select 
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white focus:border-cyan-500 focus:outline-none"
                            value={newCategoryForm.frequency}
                            onChange={e => setNewCategoryForm({...newCategoryForm, frequency: e.target.value})}
                        >
                            <option value="daily">Diário</option>
                            <option value="weekly">Semanal</option>
                            <option value="monthly">Mensal</option>
                            <option value="yearly">Anual</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 mb-1 block">Cor Neon</label>
                        <div className="flex gap-2 flex-wrap">
                            {['#FF00FF', '#00FFFF', '#39FF14', '#FF0000', '#FFA500', '#FFFF00', '#0000FF'].map(color => (
                                <button
                                    key={color}
                                    onClick={() => setNewCategoryForm({...newCategoryForm, color})}
                                    className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${newCategoryForm.color === color ? 'border-white scale-110' : 'border-transparent'}`}
                                    style={{ backgroundColor: color }}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 mt-6">
                    <Button 
                        variant="outline" 
                        className="flex-1 border-gray-600"
                        onClick={() => setIsCreatingCategory(false)}
                    >
                        Cancelar
                    </Button>
                    <Button 
                        className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white"
                        onClick={handleCreateCategory}
                    >
                        Criar
                    </Button>
                </div>
            </NeonCard>
        </div>
      )}

      {/* Modal: Confirmation for Scan */}
      {showConfirmation && scannedData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <NeonCard glowColor="magenta" className="w-full max-w-lg relative animate-in fade-in zoom-in duration-300">
            <button 
              onClick={() => setShowConfirmation(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-magenta-400" />
              Confirmar Extração
            </h3>

            <div className="space-y-4">
              <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-700 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-magenta-500/20 rounded-lg text-magenta-400">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 block">Estabelecimento</label>
                    <input 
                      type="text" 
                      value={scannedData.establishment}
                      onChange={(e) => setScannedData({...scannedData, establishment: e.target.value})}
                      className="bg-transparent text-white font-semibold w-full focus:outline-none border-b border-gray-700 focus:border-magenta-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/20 rounded-lg text-green-400">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 block">Valor (R$)</label>
                    <input 
                      type="number" 
                      value={scannedData.value}
                      onChange={(e) => setScannedData({...scannedData, value: parseFloat(e.target.value)})}
                      className="bg-transparent text-white font-bold text-lg w-full focus:outline-none border-b border-gray-700 focus:border-green-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 block">Data</label>
                    <input 
                      type="date" 
                      value={scannedData.date}
                      onChange={(e) => setScannedData({...scannedData, date: e.target.value})}
                      className="bg-transparent text-white w-full focus:outline-none border-b border-gray-700 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-500/20 rounded-lg text-yellow-400">
                    <Tag className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 block flex justify-between">
                      <span>Categoria Sugerida</span>
                      {scannedData.newCategorySuggestion && (
                          <span 
                              className="text-cyan-400 cursor-pointer hover:underline"
                              onClick={() => {
                                  setIsCreatingCategory(true);
                                  setNewCategoryForm(prev => ({...prev, name: scannedData.newCategorySuggestion}));
                                  setShowConfirmation(false);
                              }}
                          >
                              ✨ Criar "{scannedData.newCategorySuggestion}"
                          </span>
                      )}
                    </label>
                    <select 
                      value={scannedData.categoryId}
                      onChange={(e) => setScannedData({...scannedData, categoryId: e.target.value})}
                      className="bg-gray-800 text-white w-full p-2 rounded mt-1 border border-gray-700 focus:border-yellow-500 outline-none"
                    >
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                      <option value="outros">Outros</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2 border-t border-gray-800">
                  <div className="p-2 bg-cyan-500/20 rounded-lg text-cyan-400">
                    <span className="text-lg">💰</span>
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 block flex items-center gap-2">
                      <span>Conta Bancária</span>
                      <span className="text-[10px] bg-red-800 px-1 rounded text-red-200">Obrigatório</span>
                    </label>
                    <select 
                      value={scannedData.accountId || ''}
                      onChange={(e) => setScannedData({...scannedData, accountId: e.target.value})}
                      className="bg-gray-800 text-white w-full p-2 rounded mt-1 border border-gray-700 focus:border-cyan-500 outline-none text-sm"
                    >
                      <option value="">-- Selecione uma conta --</option>
                      {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>
                            {acc.icon || '💰'} {acc.name} (R$ {acc.balance.toFixed(2)})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {debts.length > 0 && (
                    <div className="flex items-center gap-3 pt-2 border-t border-gray-800">
                      <div className="p-2 bg-red-500/20 rounded-lg text-red-400">
                        <span className="text-lg">☠️</span>
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-gray-500 block">Abater Inimigo (Dívida)</label>
                        <select 
                          value={scannedData.debtId || ''}
                          onChange={(e) => setScannedData({...scannedData, debtId: e.target.value})}
                          className="bg-gray-800 text-white w-full p-2 rounded mt-1 border border-gray-700 focus:border-red-500 outline-none text-sm"
                        >
                          <option value="">-- Não é pagamento de dívida --</option>
                          {debts.map(debt => (
                            <option key={debt.id} value={debt.id}>
                                {debt.creditor} (R$ {debt.outstanding_balance.toFixed(2)})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <Button 
                  variant="outline" 
                  onClick={() => setShowConfirmation(false)}
                  className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSaveExpense}
                  className="flex-1 bg-gradient-to-r from-magenta-600 to-purple-600 hover:from-magenta-500 hover:to-purple-500 text-white font-bold shadow-[0_0_15px_rgba(255,0,255,0.4)]"
                >
                  Confirmar & Salvar
                </Button>
              </div>
            </div>
          </NeonCard>
        </div>
      )}
    </div>
  );
}
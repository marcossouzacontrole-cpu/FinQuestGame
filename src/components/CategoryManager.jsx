import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Shield, Skull, Save, X, Sparkles, Vault } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import NeonCard from './NeonCard';
import { toast } from 'sonner';

export default function CategoryManager() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [filterRecurrence, setFilterRecurrence] = useState('all');
  const [filterName, setFilterName] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    category_type: 'guardian',
    color: '#00FFFF',
    icon: '💎',
    budget: 0,
    expense_type: 'cost_of_sales',
    income_type: 'operational_revenue',
    expense_recurrence: 'variable'
  });

  const { data: currentUser } = useQuery({
    queryKey: ['base44User'],
    queryFn: () => base44.auth.me(),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['budgetCategories', currentUser?.email],
    queryFn: () => base44.entities.BudgetCategory.filter({ created_by: currentUser.email }),
    enabled: !!currentUser?.email
  });

  const { data: collectibleItems = [] } = useQuery({
    queryKey: ['collectibleItems'],
    queryFn: () => base44.entities.CollectibleItem.list()
  });

  // Aplicar filtros
  const filteredCategories = categories.filter(cat => {
    let matches = true;
    if (filterType !== 'all' && cat.category_type !== filterType) matches = false;
    if (filterRecurrence !== 'all' && cat.expense_recurrence !== filterRecurrence) matches = false;
    if (filterName && !cat.name.toLowerCase().includes(filterName.toLowerCase())) matches = false;
    return matches;
  });

  const guardianCategories = filteredCategories.filter(cat => cat.category_type === 'guardian');
  const enemyCategories = filteredCategories.filter(cat => cat.category_type === 'expense');
  const patrimonialCategories = filteredCategories.filter(cat => cat.category_type === 'patrimonial');

  const createCategory = useMutation({
    mutationFn: (data) => base44.entities.BudgetCategory.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['budgetCategories']);
      setShowForm(false);
      resetForm();
      toast.success('Categoria criada!');
    }
  });

  const updateCategory = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BudgetCategory.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['budgetCategories']);
      setShowForm(false);
      resetForm();
      toast.success('Categoria atualizada!');
    }
  });

  const deleteCategory = useMutation({
    mutationFn: (id) => base44.entities.BudgetCategory.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['budgetCategories']);
      toast.success('Categoria removida');
    }
  });

  const bulkDeleteCategories = useMutation({
    mutationFn: async (categoryIds) => {
      await Promise.all(categoryIds.map(id => base44.entities.BudgetCategory.delete(id)));
      return categoryIds.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries(['budgetCategories']);
      setShowBulkDelete(false);
      setSelectedCategories([]);
      setFilterType('all');
      setFilterRecurrence('all');
      setFilterName('');
      toast.success(`🗑️ ${count} categoria${count > 1 ? 's' : ''} removida${count > 1 ? 's' : ''}!`);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!categoryForm.name) {
      toast.error('Preencha o nome da categoria');
      return;
    }

    if (editingCategory) {
      updateCategory.mutate({ id: editingCategory.id, data: categoryForm });
    } else {
      createCategory.mutate(categoryForm);
    }
  };

  const resetForm = () => {
    setCategoryForm({
      name: '',
      category_type: 'guardian',
      color: '#00FFFF',
      icon: '💎',
      budget: 0,
      expense_type: 'cost_of_sales',
      income_type: 'operational_revenue',
      expense_recurrence: 'variable'
    });
    setEditingCategory(null);
  };

  const CategoryCard = ({ category, type, showCheckbox = false }) => {
    const isSelected = selectedCategories.includes(category.id);

    const getClassificationLabel = () => {
      if (type === 'patrimonial') {
        return '🏛️ Fato Permutativo';
      } else if (type === 'guardian') {
        const labels = {
          operational_revenue: '💼 Salário',
          other_operational_income: '⚡ Reembolso',
          investment_income: '📈 Rendimento',
          equity_method: '🤝 Equiv. Patrimonial',
          other_income: '✨ Loot Épico'
        };
        return labels[category.income_type] || '💼 Salário';
      } else {
        const recurrenceLabels = {
          fixed: '🛡️ Dano Fixo',
          variable: '⚡ Dano Variável',
          eventual: '💥 Dano Crítico'
        };
        return recurrenceLabels[category.expense_recurrence] || '⚡ Dano Variável';
      }
    };

    return (
      <div className={`bg-[#0a0a1a] border rounded-lg p-4 flex items-center justify-between ${
        isSelected ? 'border-red-500/60 bg-red-500/10' : 'border-cyan-500/30'
      }`}>
        <div className="flex items-center gap-3">
          {showCheckbox && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedCategories([...selectedCategories, category.id]);
                } else {
                  setSelectedCategories(selectedCategories.filter(id => id !== category.id));
                }
              }}
              className="w-5 h-5 rounded border-cyan-500/30 bg-[#0a0a1a] text-red-500 focus:ring-red-500"
            />
          )}
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center text-2xl"
            style={{ backgroundColor: category.color + '20', borderColor: category.color, borderWidth: 2 }}
          >
            {category.icon || (type === 'guardian' ? '🛡️' : type === 'patrimonial' ? '🏛️' : '💀')}
          </div>
          <div>
            <h3 className="text-white font-bold">{category.name}</h3>
            <p className="text-gray-400 text-xs">
              {getClassificationLabel()}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setEditingCategory(category);
              setCategoryForm({
                name: category.name,
                category_type: category.category_type,
                color: category.color,
                icon: category.icon || '💎',
                budget: category.budget,
                expense_type: category.expense_type || 'cost_of_sales',
                income_type: category.income_type || 'operational_revenue',
                expense_recurrence: category.expense_recurrence || 'variable'
              });
              setShowForm(true);
            }}
            className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20"
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (window.confirm(`Remover categoria "${category.name}"?`)) {
                deleteCategory.mutate(category.id);
              }
            }}
            className="border-red-500/30 text-red-400 hover:bg-red-500/20"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-white">Gerenciar Categorias</h2>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowBulkDelete(!showBulkDelete)}
            variant="outline"
            className="border-red-500/30 text-red-400 hover:bg-red-500/20"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Excluir em Massa
          </Button>
          <Dialog open={showForm} onOpenChange={(open) => {
            setShowForm(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-cyan-500 to-magenta-500 hover:from-cyan-600 hover:to-magenta-600">
                <Plus className="w-4 h-4 mr-2" />
                Nova Categoria
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#1a1a2e] border-cyan-500/30">
              <DialogHeader>
                <DialogTitle className="text-white">
                  {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-gray-400 text-sm mb-1 block">Nome *</label>
                  <Input
                    placeholder="Ex: Criptomoedas, Consórcio"
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({...categoryForm, name: e.target.value})}
                    className="bg-[#0a0a1a] border-cyan-500/30 text-white"
                    required
                  />
                </div>

                <div>
                  <label className="text-gray-400 text-sm mb-1 block">Tipo *</label>
                  <Select 
                    value={categoryForm.category_type} 
                    onValueChange={(value) => setCategoryForm({...categoryForm, category_type: value})}
                  >
                    <SelectTrigger className="bg-[#0a0a1a] border-cyan-500/30 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="guardian">🛡️ Guardião (Receita)</SelectItem>
                      <SelectItem value="expense">💀 Despesa</SelectItem>
                      <SelectItem value="enemy">⚔️ Inimigo (Dívida)</SelectItem>
                      <SelectItem value="patrimonial">🏛️ Patrimonial (Não afeta DRE)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {categoryForm.category_type === 'patrimonial' && (
                  <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                    <p className="text-purple-400 text-sm font-bold mb-2 flex items-center gap-2">
                      <Vault className="w-4 h-4" />
                      ℹ️ Categoria Patrimonial
                    </p>
                    <p className="text-slate-400 text-xs">
                      Esta categoria representa <strong>fatos permutativos</strong> que afetam apenas o Balanço Patrimonial, 
                      não aparecendo no DRE. Exemplos: transferências entre contas, aplicações/resgates, compra de ativos.
                    </p>
                  </div>
                )}

                {categoryForm.category_type === 'expense' && (
                  <div>
                    <label className="text-gray-400 text-sm mb-1 block">Tipo de Gasto *</label>
                    <Select 
                      value={categoryForm.expense_recurrence} 
                      onValueChange={(value) => setCategoryForm({...categoryForm, expense_recurrence: value})}
                    >
                      <SelectTrigger className="bg-[#0a0a1a] border-cyan-500/30 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">🛡️ Dano Fixo (Todo mês - aluguel, escola, assinaturas)</SelectItem>
                        <SelectItem value="variable">⚡ Dano Variável (Frequente - alimentação, transporte)</SelectItem>
                        <SelectItem value="eventual">💥 Dano Crítico (Eventual - viagens, presentes)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {categoryForm.category_type === 'guardian' && (
                  <div>
                    <label className="text-gray-400 text-sm mb-1 block">Tipo de Receita *</label>
                    <Select 
                      value={categoryForm.income_type} 
                      onValueChange={(value) => setCategoryForm({...categoryForm, income_type: value})}
                    >
                      <SelectTrigger className="bg-[#0a0a1a] border-cyan-500/30 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="operational_revenue">💼 Salário (Salário, Freelance, Vendas)</SelectItem>
                        <SelectItem value="other_operational_income">⚡ Reembolso (Comissões, Bonificações, Cashback)</SelectItem>
                        <SelectItem value="investment_income">📈 Rendimento (Dividendos, Juros, Investimentos)</SelectItem>
                        <SelectItem value="equity_method">🤝 Equivalência Patrimonial</SelectItem>
                        <SelectItem value="other_income">✨ Loot Épico (Prêmios, Sorteios, Outros)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <label className="text-gray-400 text-sm mb-1 block flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    Ícone
                  </label>
                  <Tabs defaultValue="emoji" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 bg-[#0a0a1a] border border-cyan-500/30">
                      <TabsTrigger value="emoji">Emoji</TabsTrigger>
                      <TabsTrigger value="collection">Coleção</TabsTrigger>
                    </TabsList>
                    <TabsContent value="emoji" className="mt-2">
                      <Input
                        type="text"
                        placeholder="Ex: 💎 🏦 🚗"
                        value={categoryForm.icon}
                        onChange={(e) => setCategoryForm({...categoryForm, icon: e.target.value})}
                        className="bg-[#0a0a1a] border-cyan-500/30 text-white text-center text-2xl"
                        maxLength={2}
                      />
                    </TabsContent>
                    <TabsContent value="collection" className="mt-2">
                      <div className="grid grid-cols-6 gap-2 max-h-32 overflow-y-auto bg-[#0a0a1a] border border-cyan-500/30 rounded-lg p-2">
                        {collectibleItems.map(item => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setCategoryForm({...categoryForm, icon: item.icon})}
                            className={`text-3xl p-2 rounded hover:bg-cyan-500/20 transition-colors ${categoryForm.icon === item.icon ? 'bg-cyan-500/30 ring-2 ring-cyan-400' : ''}`}
                            title={item.name}
                          >
                            {item.icon}
                          </button>
                        ))}
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>

                <div>
                  <label className="text-gray-400 text-sm mb-1 block">Cor</label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={categoryForm.color}
                      onChange={(e) => setCategoryForm({...categoryForm, color: e.target.value})}
                      className="w-12 h-10 bg-[#0a0a1a] border-cyan-500/30 p-1"
                    />
                    <Input
                      type="text"
                      value={categoryForm.color}
                      onChange={(e) => setCategoryForm({...categoryForm, color: e.target.value})}
                      className="flex-1 bg-[#0a0a1a] border-cyan-500/30 text-white"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowForm(false);
                      resetForm();
                    }}
                    className="flex-1 border-gray-600 text-gray-400"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-1 bg-gradient-to-r from-cyan-500 to-magenta-500"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {editingCategory ? 'Atualizar' : 'Criar'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filtros */}
      <NeonCard glowColor="cyan" className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="text-cyan-400 font-bold text-sm uppercase">Filtros</span>
          </div>
          
          <div className="flex flex-wrap gap-3 flex-1">
            <Input
              placeholder="🔍 Buscar por nome..."
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              className="w-[200px] bg-[#0a0a1a] border-cyan-500/30 text-white"
            />

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[200px] bg-[#0a0a1a] border-cyan-500/30 text-white">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Tipos</SelectItem>
                <SelectItem value="guardian">🛡️ Guardiões</SelectItem>
                <SelectItem value="expense">💀 Despesas</SelectItem>
                <SelectItem value="enemy">⚔️ Inimigos</SelectItem>
                <SelectItem value="patrimonial">🏛️ Patrimoniais</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterRecurrence} onValueChange={setFilterRecurrence}>
              <SelectTrigger className="w-[200px] bg-[#0a0a1a] border-cyan-500/30 text-white">
                <SelectValue placeholder="Recorrência" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Recorrências</SelectItem>
                <SelectItem value="fixed">🛡️ Dano Fixo</SelectItem>
                <SelectItem value="variable">⚡ Dano Variável</SelectItem>
                <SelectItem value="eventual">💥 Dano Crítico</SelectItem>
              </SelectContent>
            </Select>

            {(filterType !== 'all' || filterRecurrence !== 'all' || filterName) && (
              <Button
                onClick={() => {
                  setFilterType('all');
                  setFilterRecurrence('all');
                  setFilterName('');
                }}
                variant="outline"
                size="sm"
                className="border-gray-600 text-gray-400"
              >
                <X className="w-4 h-4 mr-1" />
                Limpar
              </Button>
            )}
          </div>

          <div className="text-gray-400 text-sm">
            {filteredCategories.length} de {categories.length} categorias
          </div>
        </div>
      </NeonCard>

      {/* Modal de Exclusão em Massa */}
      {showBulkDelete && (
        <NeonCard glowColor="red" className="border-2 border-red-500/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Trash2 className="w-6 h-6 text-red-500" />
              <h3 className="text-xl font-black text-red-400 uppercase">Exclusão em Massa</h3>
            </div>
            <Button
              onClick={() => {
                if (filteredCategories.length === selectedCategories.length) {
                  setSelectedCategories([]);
                } else {
                  setSelectedCategories(filteredCategories.map(cat => cat.id));
                }
              }}
              variant="outline"
              size="sm"
              className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20"
            >
              {filteredCategories.length === selectedCategories.length ? 'Desmarcar Todas' : 'Selecionar Todas'}
            </Button>
          </div>

          <div className="mb-6 max-h-96 overflow-y-auto space-y-2">
            {filteredCategories.length > 0 ? (
              filteredCategories.map(cat => (
                <CategoryCard key={cat.id} category={cat} type={cat.category_type} showCheckbox={true} />
              ))
            ) : (
              <p className="text-slate-400 text-center py-8">Nenhuma categoria encontrada com os filtros aplicados</p>
            )}
          </div>

          <div className="flex items-center justify-between gap-4">
            <p className="text-slate-400 text-sm">
              {selectedCategories.length} categoria(s) selecionada(s) para exclusão
            </p>
            
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setShowBulkDelete(false);
                  setSelectedCategories([]);
                  setFilterType('all');
                  setFilterRecurrence('all');
                  setFilterName('');
                }}
                variant="outline"
                className="border-gray-600 text-gray-400"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (selectedCategories.length === 0) {
                    toast.error('Selecione pelo menos uma categoria');
                    return;
                  }

                  if (window.confirm(`Deseja realmente excluir ${selectedCategories.length} categoria(s)?\n\nEsta ação não pode ser desfeita.`)) {
                    bulkDeleteCategories.mutate(selectedCategories);
                  }
                }}
                disabled={selectedCategories.length === 0}
                className="bg-red-500 hover:bg-red-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir Selecionadas
              </Button>
            </div>
          </div>
        </NeonCard>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Guardian Categories */}
        <NeonCard glowColor="green">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-6 h-6 text-green-400" />
            <h3 className="text-xl font-bold text-white">Guardiões (Receitas)</h3>
            <span className="text-gray-400 text-sm ml-auto">{guardianCategories.length}</span>
          </div>
          <div className="space-y-3">
            {guardianCategories.length > 0 ? (
              guardianCategories.map(cat => (
                <CategoryCard key={cat.id} category={cat} type="guardian" showCheckbox={false} />
              ))
            ) : (
              <p className="text-gray-400 text-center py-8 text-sm">
                Nenhuma categoria personalizada
              </p>
            )}
          </div>
        </NeonCard>

        {/* Enemy Categories */}
        <NeonCard glowColor="gold">
          <div className="flex items-center gap-2 mb-4">
            <Skull className="w-6 h-6 text-red-400" />
            <h3 className="text-xl font-bold text-white">Inimigos (Despesas)</h3>
            <span className="text-gray-400 text-sm ml-auto">{enemyCategories.length}</span>
          </div>
          <div className="space-y-3">
            {enemyCategories.length > 0 ? (
              enemyCategories.map(cat => (
                <CategoryCard key={cat.id} category={cat} type="enemy" showCheckbox={false} />
              ))
            ) : (
              <p className="text-gray-400 text-center py-8 text-sm">
                Nenhuma categoria personalizada
              </p>
            )}
          </div>
        </NeonCard>
      </div>

      {/* Patrimonial Categories */}
      {patrimonialCategories.length > 0 && (
        <NeonCard glowColor="purple">
          <div className="flex items-center gap-2 mb-4">
            <Vault className="w-6 h-6 text-purple-400" />
            <h3 className="text-xl font-bold text-white">🏛️ Patrimoniais (Não afetam DRE)</h3>
            <span className="text-gray-400 text-sm ml-auto">{patrimonialCategories.length}</span>
          </div>
          <div className="space-y-3">
            {patrimonialCategories.map(cat => (
              <CategoryCard key={cat.id} category={cat} type="patrimonial" showCheckbox={false} />
            ))}
          </div>
          <p className="text-purple-400/60 text-xs mt-4 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
            💡 Estas categorias representam movimentações patrimoniais que não impactam o resultado (DRE), apenas o Balanço.
          </p>
        </NeonCard>
      )}
    </div>
  );
}
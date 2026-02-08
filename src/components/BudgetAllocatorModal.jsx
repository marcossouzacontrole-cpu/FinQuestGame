import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Check, Zap, Shield, Sparkles, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { subDays, parseISO, isWithinInterval } from 'date-fns';
import { toast } from 'sonner';

export default function BudgetAllocatorModal({ totalMana, envelopes, onSave, onClose }) {
  const [localEnvelopes, setLocalEnvelopes] = useState([...envelopes]);
  const [treasuryTotal, setTreasuryTotal] = useState(totalMana);
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch historical transactions
  const { data: finTransactions = [] } = useQuery({
    queryKey: ['finTransactions'],
    queryFn: () => base44.entities.FinTransaction.list('-created_date')
  });

  // Calculate historical averages
  const historicalData = useMemo(() => {
    const last90Days = subDays(new Date(), 90);
    const relevantTransactions = finTransactions.filter(t => {
      const transDate = parseISO(t.date);
      return isWithinInterval(transDate, { start: last90Days, end: new Date() });
    });

    // Calculate average income (for treasury suggestion)
    const incomes = relevantTransactions.filter(t => t.type === 'income');
    const avgMonthlyIncome = incomes.length > 0 
      ? incomes.reduce((sum, t) => sum + Math.abs(t.value), 0) / 3 
      : 0;

    // Calculate average expenses by category
    const categoryAverages = {};
    envelopes.forEach(envelope => {
      const categoryTransactions = relevantTransactions.filter(
        t => t.type === 'expense' && t.category === envelope.name
      );
      const total = categoryTransactions.reduce((sum, t) => sum + Math.abs(t.value), 0);
      categoryAverages[envelope.name] = categoryTransactions.length > 0 ? total / 3 : 0;
    });

    return { avgMonthlyIncome, categoryAverages };
  }, [finTransactions, envelopes]);

  // Calcular alocação total e mana livre dinamicamente
  const allocatedMana = useMemo(() => {
    return localEnvelopes.reduce((sum, env) => sum + (env.allocated_amount || 0), 0);
  }, [localEnvelopes]);

  const freeMana = treasuryTotal - allocatedMana;
  const isCritical = freeMana < 0;
  const hasUnallocated = freeMana > 0;

  const handleAmountChange = (id, value) => {
    const numValue = parseFloat(value) || 0;
    setLocalEnvelopes(prev => prev.map(env => 
      env.id === id ? { ...env, allocated_amount: numValue } : env
    ));
  };

  const handleSmartDistribution = () => {
    setIsGenerating(true);
    
    setTimeout(() => {
      const { categoryAverages } = historicalData;
      let totalSuggested = 0;
      
      // Calculate total of suggestions
      Object.values(categoryAverages).forEach(avg => {
        totalSuggested += avg;
      });
      
      // Apply suggestions with proportional adjustment if exceeds treasury
      const needsAdjustment = totalSuggested > treasuryTotal;
      const adjustmentRatio = needsAdjustment ? treasuryTotal / totalSuggested : 1;
      
      setLocalEnvelopes(prev => prev.map(env => {
        const suggestedValue = (categoryAverages[env.name] || 0) * adjustmentRatio;
        return { ...env, allocated_amount: Math.round(suggestedValue * 100) / 100 };
      }));
      
      setIsGenerating(false);
      
      if (needsAdjustment) {
        toast.success('🔮 Distribuição ajustada para caber no orçamento disponível!');
      } else {
        toast.success('✨ Distribuição baseada na sua média dos últimos 90 dias!');
      }
    }, 800);
  };

  const handleConfirm = () => {
    if (isCritical) {
      alert('⚠️ Mana Insuficiente! Reduza os valores dos envelopes.');
      return;
    }
    onSave(localEnvelopes);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Campo Mestre - Tesouro Disponível */}
      <div className="bg-gradient-to-r from-yellow-900/20 to-orange-900/20 border-2 border-yellow-500/50 rounded-xl p-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-yellow-400 text-sm font-bold uppercase tracking-widest flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Renda Mensal Estimada
            </label>
            {historicalData.avgMonthlyIncome > 0 && (
              <span className="text-xs text-slate-400">
                Média: R$ {historicalData.avgMonthlyIncome.toFixed(2)}
              </span>
            )}
          </div>
          
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-yellow-500 text-xl">R$</span>
            <Input
              type="number"
              value={treasuryTotal}
              onChange={(e) => setTreasuryTotal(parseFloat(e.target.value) || 0)}
              className="bg-slate-900 border-yellow-500/50 text-white pl-12 pr-4 h-14 text-3xl font-mono font-black focus:border-yellow-400"
              step="0.01"
              min="0"
            />
          </div>
          
          <p className="text-xs text-slate-500 text-center">
            Ajuste conforme sua previsão de entrada para este mês
          </p>
        </div>
      </div>

      {/* Botão de Distribuição Inteligente */}
      <Button
        onClick={handleSmartDistribution}
        disabled={isGenerating}
        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 h-12 text-base font-bold"
      >
        {isGenerating ? (
          <>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <Sparkles className="w-5 h-5 mr-2" />
            </motion.div>
            Calculando...
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5 mr-2" />
            🔮 Sugerir com Base no Histórico
          </>
        )}
      </Button>

      {/* Status de Mana */}
      <div className={`p-6 rounded-xl border-2 transition-all ${
        isCritical 
          ? 'bg-red-900/20 border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.3)]' 
          : hasUnallocated
          ? 'bg-green-900/20 border-green-500/50 shadow-[0_0_30px_rgba(16,185,129,0.2)]'
          : 'bg-cyan-900/20 border-cyan-500/50 shadow-[0_0_30px_rgba(6,182,212,0.2)]'
      }`}>
        <div className="text-center">
          <p className="text-xs uppercase tracking-widest text-slate-400 mb-2">
            {isCritical ? '⚠️ Acima do Orçamento' : hasUnallocated ? '💰 Livre para Investir/Poupar' : '✓ Distribuído'}
          </p>
          <motion.div 
            className={`text-5xl font-black ${
              isCritical ? 'text-red-500' : hasUnallocated ? 'text-green-400' : 'text-cyan-400'
            }`}
            animate={isCritical ? { scale: [1, 1.05, 1] } : {}}
            transition={{ duration: 0.5, repeat: isCritical ? Infinity : 0 }}
          >
            R$ {Math.abs(freeMana).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </motion.div>
          <div className="flex justify-center items-center gap-4 text-sm font-mono text-slate-400 mt-3">
            <span>Tesouro: R$ {treasuryTotal.toLocaleString()}</span>
            <span className="text-slate-600">|</span>
            <span>Alocado: R$ {allocatedMana.toLocaleString()}</span>
          </div>

          {isCritical && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-center gap-2 mt-4 text-red-400 font-bold text-sm"
            >
              <AlertTriangle className="w-5 h-5 animate-pulse" />
              ORÇAMENTO EXCEDIDO! Reduza os envelopes ou aumente o tesouro.
            </motion.div>
          )}
        </div>
      </div>

      {/* Lista de Envelopes */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <Shield className="w-4 h-4 text-cyan-400" />
          Envelopes de Orçamento
        </h3>

        {localEnvelopes.map((envelope, index) => {
          const historicalAvg = historicalData.categoryAverages[envelope.name] || 0;
          const currentValue = envelope.allocated_amount || 0;
          const hasHistorical = historicalAvg > 0;
          
          let trendIcon = null;
          let trendColor = 'text-slate-500';
          
          if (hasHistorical && currentValue > 0) {
            const diff = currentValue - historicalAvg;
            const percentDiff = (diff / historicalAvg) * 100;
            
            if (percentDiff > 10) {
              trendIcon = <TrendingUp className="w-4 h-4" />;
              trendColor = 'text-orange-400';
            } else if (percentDiff < -10) {
              trendIcon = <TrendingDown className="w-4 h-4" />;
              trendColor = 'text-green-400';
            } else {
              trendIcon = <Minus className="w-4 h-4" />;
              trendColor = 'text-cyan-400';
            }
          }
          
          return (
            <motion.div 
              key={envelope.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`bg-slate-800/50 border rounded-xl p-4 hover:border-cyan-500/50 transition-all ${
                isCritical && currentValue > 0 ? 'border-red-500/50' : 'border-slate-700'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-white font-bold text-sm mb-1 block flex items-center gap-2">
                    {envelope.name}
                    {trendIcon && (
                      <span className={`${trendColor}`} title="Tendência vs. histórico">
                        {trendIcon}
                      </span>
                    )}
                  </label>
                  {hasHistorical ? (
                    <p className="text-xs text-slate-500">
                      Média histórica: R$ {historicalAvg.toFixed(2)}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500">Sem histórico recente</p>
                  )}
                </div>

                <div className="w-40">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">R$</span>
                    <Input
                      type="number"
                      value={envelope.allocated_amount}
                      onChange={(e) => handleAmountChange(envelope.id, e.target.value)}
                      className={`bg-slate-900 text-white pl-10 pr-4 h-10 text-right font-mono font-bold focus:border-cyan-500 ${
                        isCritical && currentValue > 0 ? 'border-red-500' : 'border-slate-600'
                      }`}
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {envelope.allocated_amount > 0 ? (
                    <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                      <Check className="w-5 h-5 text-green-400" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 bg-slate-700/50 rounded-full flex items-center justify-center">
                      <Zap className="w-4 h-4 text-slate-500" />
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Botões de Ação */}
      <div className="flex gap-4 pt-4 border-t border-slate-800">
        <Button
          onClick={onClose}
          variant="outline"
          className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-800"
        >
          Cancelar
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={isCritical}
          className={`flex-1 ${
            isCritical 
              ? 'bg-gray-600 cursor-not-allowed' 
              : 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600'
          }`}
        >
          <Check className="w-4 h-4 mr-2" />
          Confirmar Alocação
        </Button>
      </div>
    </div>
  );
}
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, ArrowRight, AlertTriangle, CheckCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';

const ShieldRepairModal = ({ damagedCategory, availableCategories, onConfirm, onClose }) => {
  const [sourceCategory, setSourceCategory] = useState(null);
  const [transferAmount, setTransferAmount] = useState(0);

  // Calcular o déficit do escudo danificado
  const deficit = damagedCategory.spent - damagedCategory.budgeted;

  // Filtrar categorias que têm saldo disponível
  const validSources = availableCategories.filter(cat => {
    if (cat.id === damagedCategory.id) return false;
    const remaining = cat.budgeted - cat.spent;
    return remaining > 0;
  });

  const selectedSource = validSources.find(c => c.id === sourceCategory);
  const maxTransfer = selectedSource ? (selectedSource.budgeted - selectedSource.spent) : 0;

  const handleConfirm = () => {
    if (!selectedSource || transferAmount <= 0) {
      return;
    }

    onConfirm({
      fromCategory: selectedSource,
      toCategory: damagedCategory,
      amount: transferAmount
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/95 backdrop-blur-md p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-slate-900 border border-red-500/30 rounded-2xl max-w-lg w-full p-6 shadow-[0_0_100px_rgba(239,68,68,0.3)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg flex items-center justify-center animate-pulse">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-wider">Reparo de Escudo</h2>
              <p className="text-xs text-slate-400 uppercase tracking-widest">Transferência Tática de Energia</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Escudo Danificado */}
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-red-400 font-bold text-sm">🚨 ESCUDO COMPROMETIDO</span>
            <span className="text-red-500 font-black text-lg">-R$ {deficit.toFixed(2)}</span>
          </div>
          <p className="text-white font-bold">{damagedCategory.name}</p>
          <p className="text-xs text-slate-400">
            Gasto: R$ {damagedCategory.spent.toFixed(2)} / Orçamento: R$ {damagedCategory.budgeted.toFixed(2)}
          </p>
        </div>

        {/* Seleção de Fonte */}
        <div className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 uppercase font-bold mb-2 block">
              Drenar Energia de Qual Escudo?
            </label>
            
            {validSources.length === 0 ? (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-center">
                <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                <p className="text-amber-400 text-sm font-bold">
                  Nenhum escudo com energia disponível para transferência
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Considere adicionar mais fundos ou reduzir gastos
                </p>
              </div>
            ) : (
              <Select value={sourceCategory} onValueChange={setSourceCategory}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Selecionar escudo de origem" />
                </SelectTrigger>
                <SelectContent>
                  {validSources.map(cat => {
                    const available = cat.budgeted - cat.spent;
                    return (
                      <SelectItem key={cat.id} value={cat.id}>
                        <div className="flex items-center justify-between gap-3">
                          <span>{cat.name}</span>
                          <span className="text-emerald-400 font-mono text-xs">
                            +R$ {available.toFixed(2)}
                          </span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            )}
          </div>

          {selectedSource && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <div>
                <label className="text-xs text-slate-400 uppercase font-bold mb-2 block">
                  Quantidade de Energia a Transferir
                </label>
                <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                  <div className="flex justify-between mb-3">
                    <span className="text-slate-400 text-sm">R$ 0</span>
                    <span className="text-cyan-400 font-black text-lg">R$ {transferAmount.toFixed(2)}</span>
                    <span className="text-slate-400 text-sm">R$ {maxTransfer.toFixed(2)}</span>
                  </div>
                  <Slider
                    value={[transferAmount]}
                    onValueChange={(val) => setTransferAmount(val[0])}
                    max={Math.min(maxTransfer, deficit)}
                    step={10}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Preview da Transferência */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex-1">
                    <p className="text-slate-400 text-xs mb-1">DE</p>
                    <p className="text-white font-bold">{selectedSource.name}</p>
                    <p className="text-red-400 font-mono">-R$ {transferAmount.toFixed(2)}</p>
                  </div>
                  
                  <ArrowRight className="w-6 h-6 text-cyan-400 mx-4" />
                  
                  <div className="flex-1 text-right">
                    <p className="text-slate-400 text-xs mb-1">PARA</p>
                    <p className="text-white font-bold">{damagedCategory.name}</p>
                    <p className="text-emerald-400 font-mono">+R$ {transferAmount.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {transferAmount >= deficit && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <p className="text-emerald-400 text-xs font-bold">
                    ✅ Escudo será totalmente reparado!
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Ações */}
        <div className="flex gap-3 mt-6">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 border-slate-600 text-slate-300"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedSource || transferAmount <= 0}
            className="flex-1 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Shield className="w-4 h-4 mr-2" />
            Confirmar Reparo
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default ShieldRepairModal;
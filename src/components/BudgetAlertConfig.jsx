import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Plus, Trash2, Check, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function BudgetAlertConfig({ categories = [] }) {
  const [isCreating, setIsCreating] = useState(false);
  const [newAlert, setNewAlert] = useState({
    category_name: '',
    alert_threshold_percent: 80,
    is_active: true,
    notification_type: 'warning'
  });

  const queryClient = useQueryClient();

  const { data: alerts = [] } = useQuery({
    queryKey: ['budgetAlerts'],
    queryFn: () => base44.entities.BudgetAlert.list()
  });

  const createAlertMutation = useMutation({
    mutationFn: (data) => base44.entities.BudgetAlert.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['budgetAlerts']);
      setIsCreating(false);
      setNewAlert({
        category_name: '',
        alert_threshold_percent: 80,
        is_active: true,
        notification_type: 'warning'
      });
      toast.success('🔔 Alerta criado com sucesso!');
    }
  });

  const deleteAlertMutation = useMutation({
    mutationFn: (id) => base44.entities.BudgetAlert.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['budgetAlerts']);
      toast.success('Alerta removido');
    }
  });

  const toggleAlertMutation = useMutation({
    mutationFn: ({ id, is_active }) => base44.entities.BudgetAlert.update(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries(['budgetAlerts']);
    }
  });

  const handleCreateAlert = () => {
    if (!newAlert.category_name) {
      toast.error('Selecione uma categoria');
      return;
    }
    createAlertMutation.mutate(newAlert);
  };

  const availableCategories = categories.filter(c => 
    c.category_type === 'expense' && 
    !alerts.some(a => a.category_name === c.name)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center">
            <Bell className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-white font-black text-xl uppercase">Alertas de Orçamento</h3>
            <p className="text-slate-400 text-sm">Configure notificações automáticas</p>
          </div>
        </div>
        <button
          onClick={() => setIsCreating(!isCreating)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold rounded-xl transition-all"
        >
          <Plus className="w-5 h-5" />
          Novo Alerta
        </button>
      </div>

      {/* Create Form */}
      <AnimatePresence>
        {isCreating && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-6 bg-slate-800/50 border border-yellow-500/30 rounded-xl">
              <h4 className="text-white font-bold uppercase mb-4">Criar Novo Alerta</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <select
                  value={newAlert.category_name}
                  onChange={(e) => setNewAlert({ ...newAlert, category_name: e.target.value })}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                >
                  <option value="">Selecione a categoria</option>
                  {availableCategories.map(cat => (
                    <option key={cat.id} value={cat.name}>
                      {cat.icon || '💰'} {cat.name}
                    </option>
                  ))}
                </select>

                <div>
                  <label className="text-slate-400 text-xs uppercase font-bold block mb-1">
                    Limite de Alerta (%)
                  </label>
                  <input
                    type="range"
                    min="50"
                    max="100"
                    step="5"
                    value={newAlert.alert_threshold_percent}
                    onChange={(e) => setNewAlert({ ...newAlert, alert_threshold_percent: parseInt(e.target.value) })}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>50%</span>
                    <span className="text-yellow-400 font-bold">{newAlert.alert_threshold_percent}%</span>
                    <span>100%</span>
                  </div>
                </div>

                <select
                  value={newAlert.notification_type}
                  onChange={(e) => setNewAlert({ ...newAlert, notification_type: e.target.value })}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                >
                  <option value="warning">⚠️ Aviso (Aproximando)</option>
                  <option value="critical">🚨 Crítico (Excedido)</option>
                </select>
              </div>

              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleCreateAlert}
                  disabled={createAlertMutation.isPending}
                  className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold py-2 rounded-lg transition-all disabled:opacity-50"
                >
                  <Check className="w-4 h-4 inline mr-2" />
                  Criar Alerta
                </button>
                <button
                  onClick={() => setIsCreating(false)}
                  className="px-6 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 rounded-lg transition-all"
                >
                  <X className="w-4 h-4 inline" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Alert List */}
      <div className="space-y-3">
        {alerts.length === 0 ? (
          <div className="text-center py-12 bg-slate-800/30 border border-slate-700 rounded-xl">
            <Bell className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">Nenhum alerta configurado</p>
            <p className="text-slate-500 text-sm">Configure alertas para ser notificado sobre seus gastos</p>
          </div>
        ) : (
          alerts.map((alert) => {
            const category = categories.find(c => c.name === alert.category_name);
            return (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-xl border-2 transition-all ${
                  alert.is_active 
                    ? alert.notification_type === 'critical'
                      ? 'bg-red-500/10 border-red-500/50'
                      : 'bg-yellow-500/10 border-yellow-500/50'
                    : 'bg-slate-800/30 border-slate-700 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <button
                      onClick={() => toggleAlertMutation.mutate({ id: alert.id, is_active: !alert.is_active })}
                      className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all ${
                        alert.is_active 
                          ? 'bg-yellow-500 text-white' 
                          : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      <Bell className="w-5 h-5" />
                    </button>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{category?.icon || '💰'}</span>
                        <h4 className="text-white font-bold">{alert.category_name}</h4>
                      </div>
                      <div className="flex items-center gap-3 text-sm mt-1">
                        <span className="text-slate-400">
                          Alerta em <span className="text-yellow-400 font-bold">{alert.alert_threshold_percent}%</span>
                        </span>
                        <span className="text-slate-600">•</span>
                        <span className={`font-bold ${
                          alert.notification_type === 'critical' ? 'text-red-400' : 'text-yellow-400'
                        }`}>
                          {alert.notification_type === 'critical' ? '🚨 Crítico' : '⚠️ Aviso'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm('Deseja remover este alerta?')) {
                        deleteAlertMutation.mutate(alert.id);
                      }
                    }}
                    className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-red-400"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
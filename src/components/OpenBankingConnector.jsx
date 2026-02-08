import { useState } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Building2, Plus, RefreshCw, CheckCircle, AlertCircle,
  Loader2, Zap, Shield, Clock
} from 'lucide-react';

const NeonCard = ({ children, glowColor = 'cyan', className = '' }) => {
  const colors = {
    cyan: 'border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.15)] bg-slate-900/80',
    green: 'border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)] bg-slate-900/80',
    purple: 'border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.15)] bg-slate-900/80',
  };
  return (
    <div className={`rounded-2xl border backdrop-blur-xl p-6 relative overflow-hidden ${colors[glowColor]} ${className}`}>
      {children}
    </div>
  );
};

export default function OpenBankingConnector() {
  const [isConnecting, setIsConnecting] = useState(false);
  const queryClient = useQueryClient();

  const { data: connections, isLoading } = useQuery({
    queryKey: ['pluggyConnections'],
    queryFn: async () => {
      const response = await base44.functions.invoke('pluggyListConnections', {});
      return response.data;
    },
    retry: false
  });

  const connectMutation = useMutation({
    mutationFn: async () => {
      console.log('🚀 Iniciando pluggyCreateConnectToken...');
      const response = await base44.functions.invoke('pluggyCreateConnectToken', {});
      console.log('📦 Resposta da função:', response);
      return response.data;
    },
    onSuccess: (data) => {
      console.log('🎯 Sucesso na mutação:', data);

      if (data.setup_required || !data.connect_token) {
        toast.error('⚙️ Configure as credenciais do Pluggy no .env primeiro');
        console.error('❌ Falta de configuração:', data);
        return;
      }

      console.log('✅ Token gerado:', data.connect_token);
      setIsConnecting(true);

      // Criar iframe do Pluggy Connect com URL correta
      const connectUrl = `https://connect.pluggy.ai/?connectToken=${data.connect_token}`;
      console.log('🔗 Abrindo URL do Pluggy:', connectUrl);

      const iframe = document.createElement('iframe');
      iframe.src = connectUrl;
      iframe.id = 'pluggy-connect-iframe';
      iframe.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 90%;
        max-width: 500px;
        height: 90%;
        max-height: 700px;
        border: none;
        border-radius: 16px;
        z-index: 9999;
        box-shadow: 0 0 60px rgba(0, 0, 0, 0.5);
      `;

      const overlay = document.createElement('div');
      overlay.id = 'pluggy-connect-overlay';
      overlay.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.8);
        z-index: 9998;
        backdrop-filter: blur(8px);
      `;

      document.body.appendChild(overlay);
      document.body.appendChild(iframe);
      console.log('🖼️ Iframe e Overlay injetados no DOM');

      const handleMessage = (event) => {
        if (event.origin !== 'https://connect.pluggy.ai') return;

        console.log('📨 Evento Pluggy:', event.data);

        // Processamento de eventos remain unchanged...
        const eventType = event.data.event || event.data.type;
        if (eventType === 'success') {
          iframe.remove();
          overlay.remove();
          toast.success('✅ Banco conectado com sucesso!');
          queryClient.invalidateQueries({ queryKey: ['pluggyConnections'] });
          setIsConnecting(false);
          window.removeEventListener('message', handleMessage);
        } else if (eventType === 'error') {
          console.error('❌ Erro no Widget:', event.data);
          iframe.remove();
          overlay.remove();
          toast.error('Erro ao conectar banco');
          setIsConnecting(false);
          window.removeEventListener('message', handleMessage);
        } else if (eventType === 'close') {
          iframe.remove();
          overlay.remove();
          setIsConnecting(false);
          window.removeEventListener('message', handleMessage);
        }
      };

      window.addEventListener('message', handleMessage);

      overlay.onclick = () => {
        console.log('🖱️ Clique no overlay, fechando...');
        iframe.remove();
        overlay.remove();
        setIsConnecting(false);
        window.removeEventListener('message', handleMessage);
      };
    },
    onError: (error) => {
      console.error('💥 Erro Crítico na Mutação:', error);
      toast.error('Erro ao conectar banco: ' + (error.message || 'Erro desconhecido'));
      setIsConnecting(false);
    }
  });

  const syncMutation = useMutation({
    mutationFn: async (itemId) => {
      const response = await base44.functions.invoke('pluggySyncTransactions', { item_id: itemId });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(`✅ ${data.message}`);
      queryClient.invalidateQueries({ queryKey: ['finTransactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
    onError: () => {
      toast.error('Erro ao sincronizar transações');
    }
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <NeonCard glowColor="purple">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white uppercase tracking-wider">Open Banking</h2>
              <p className="text-slate-400 text-sm">Conecte seus bancos automaticamente</p>
            </div>
          </div>

          <button
            onClick={() => connectMutation.mutate()}
            disabled={connectMutation.isPending || isConnecting}
            className="flex items-center gap-2 px-6 py-3 bg-purple-600/20 border border-purple-500/50 text-purple-400 font-bold rounded-xl hover:bg-purple-500 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {connectMutation.isPending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Carregando...
              </>
            ) : (
              <>
                <Plus className="w-5 h-5" />
                Conectar Banco
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-slate-800/50 rounded-xl p-4 border border-cyan-500/20">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-cyan-400" />
              <div>
                <p className="text-white font-bold">Segurança</p>
                <p className="text-slate-400 text-xs">Criptografia bancária</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-4 border border-green-500/20">
            <div className="flex items-center gap-3">
              <Zap className="w-8 h-8 text-green-400" />
              <div>
                <p className="text-white font-bold">Automático</p>
                <p className="text-slate-400 text-xs">Importação em tempo real</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-4 border border-purple-500/20">
            <div className="flex items-center gap-3">
              <Building2 className="w-8 h-8 text-purple-400" />
              <div>
                <p className="text-white font-bold">Multi-banco</p>
                <p className="text-slate-400 text-xs">Todos em um lugar</p>
              </div>
            </div>
          </div>
        </div>
      </NeonCard>

      {/* Connections List */}
      <NeonCard>
        <h3 className="text-xl font-black text-white mb-6 uppercase tracking-wider flex items-center gap-3">
          <Building2 className="w-6 h-6 text-cyan-400" />
          Bancos Conectados
        </h3>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          </div>
        ) : connections?.connections?.length > 0 ? (
          <div className="space-y-4">
            {connections.connections.map((conn) => (
              <motion.div
                key={conn.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 hover:border-cyan-500/50 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {conn.connector_logo ? (
                      <img src={conn.connector_logo} alt={conn.connector_name} className="w-12 h-12 rounded-lg" />
                    ) : (
                      <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-white" />
                      </div>
                    )}

                    <div>
                      <p className="text-white font-bold">{conn.connector_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {conn.status === 'UPDATED' ? (
                          <>
                            <CheckCircle className="w-4 h-4 text-green-400" />
                            <span className="text-green-400 text-xs">Conectado</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-4 h-4 text-yellow-400" />
                            <span className="text-yellow-400 text-xs">{conn.status}</span>
                          </>
                        )}
                        <span className="text-slate-500 text-xs">•</span>
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span className="text-slate-500 text-xs">
                          {new Date(conn.last_updated).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => syncMutation.mutate(conn.id)}
                    disabled={syncMutation.isPending}
                    className="flex items-center gap-2 px-4 py-2 bg-cyan-600/20 border border-cyan-500/50 text-cyan-400 font-bold rounded-lg hover:bg-cyan-500 hover:text-white transition-all disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                    Sincronizar
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Building2 className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 mb-6">Nenhum banco conectado ainda</p>
            <button
              onClick={() => connectMutation.mutate()}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-all"
            >
              Conectar Primeiro Banco
            </button>
          </div>
        )}
      </NeonCard>

      {/* Info Card */}
      <NeonCard glowColor="green">
        <h4 className="text-lg font-bold text-white mb-4">🏦 Bancos Suportados</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {['Nubank', 'Inter', 'C6 Bank', 'PicPay', 'Bradesco', 'Itaú', 'Santander', 'Banco do Brasil'].map(bank => (
            <div key={bank} className="bg-slate-800/30 rounded-lg p-3 text-center">
              <p className="text-white text-sm font-semibold">{bank}</p>
            </div>
          ))}
        </div>
        <p className="text-slate-400 text-xs mt-4">+ 200 instituições financeiras brasileiras</p>
      </NeonCard>
    </div>
  );
}
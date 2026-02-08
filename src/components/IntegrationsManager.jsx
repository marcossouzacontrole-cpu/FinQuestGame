import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { MessageCircle, Calendar, CheckCircle2, Clock, ArrowRight, Zap, Shield } from 'lucide-react';
import { toast } from 'sonner';


const IntegrationCard = ({ icon: Icon, title, description, isActive, isConnecting, onConnect, provider }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative group"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-blue-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500" />
      
      <div className={`relative rounded-2xl border backdrop-blur-xl p-6 transition-all duration-300 ${
        isActive 
          ? 'border-green-500/50 bg-green-900/10 shadow-[0_0_20px_rgba(34,197,94,0.2)]' 
          : 'border-slate-600/30 bg-slate-900/50 hover:border-cyan-500/50 hover:shadow-[0_0_20px_rgba(6,182,212,0.15)]'
      }`}>
        
        {/* Status Badge */}
        <div className="absolute top-4 right-4">
          {isActive ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 border border-green-500/50 rounded-full">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <span className="text-xs font-bold text-green-400">Ativo</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-600/20 border border-slate-600/50 rounded-full">
              <Clock className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-bold text-slate-400">Inativo</span>
            </div>
          )}
        </div>

        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
            isActive
              ? 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-[0_0_15px_rgba(34,197,94,0.4)]'
              : 'bg-gradient-to-br from-slate-700 to-slate-800 group-hover:from-cyan-600 group-hover:to-blue-600'
          }`}>
            <Icon className={`w-6 h-6 ${isActive ? 'text-white' : 'text-slate-300 group-hover:text-white'}`} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-black text-white mb-1">{title}</h3>
            <p className="text-sm text-slate-400">{description}</p>
          </div>
        </div>

        {/* Features List */}
        <div className="space-y-2 mb-5">
          {provider === 'whatsapp' && (
            <>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <Shield className="w-3.5 h-3.5 text-yellow-400" />
                Scanner OCR de comprovantes
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <Shield className="w-3.5 h-3.5 text-yellow-400" />
                Relatórios DRE e Balanço Patrimonial
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <Shield className="w-3.5 h-3.5 text-yellow-400" />
                Busca inteligente de transações
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <Shield className="w-3.5 h-3.5 text-yellow-400" />
                Comandos rápidos e gamificados
              </div>
            </>
          )}
          {provider === 'googlecalendar' && (
            <>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <Zap className="w-3.5 h-3.5 text-blue-400" />
                Sincronize automaticamente agendamentos
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <Zap className="w-3.5 h-3.5 text-blue-400" />
                Veja receitas e despesas no seu calendário
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <Zap className="w-3.5 h-3.5 text-blue-400" />
                Receba notificações de pagamentos
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <Zap className="w-3.5 h-3.5 text-blue-400" />
                Sincronização bidirecional
              </div>
            </>
          )}
        </div>

        {/* Action Button */}
        <button
          onClick={onConnect}
          disabled={isConnecting}
          className={`w-full py-2.5 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${
            isActive
              ? 'bg-green-600/20 border border-green-500/50 text-green-400 hover:bg-green-600/30'
              : 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] disabled:opacity-50'
          }`}
        >
          {isConnecting ? (
            <>
              <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
              Conectando...
            </>
          ) : isActive ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Conectado
            </>
          ) : (
            <>
              <ArrowRight className="w-4 h-4" />
              Conectar Agora
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
};

export default function IntegrationsManager() {
  const [connecting, setConnecting] = useState(null);

  const { data: currentUser } = useQuery({
    queryKey: ['base44User'],
    queryFn: () => base44.auth.me(),
  });

  // Check WhatsApp connection status
  const { data: whatsappConversations } = useQuery({
    queryKey: ['whatsappIntegration', currentUser?.email],
    queryFn: async () => {
      try {
        const conversations = await base44.agents.listConversations({ agent_name: 'tactical_oracle' });
        return conversations || [];
      } catch (error) {
        return [];
      }
    },
    enabled: !!currentUser
  });

  const handleWhatsAppConnect = async () => {
    try {
      setConnecting('whatsapp');
      const whatsappURL = base44.agents.getWhatsAppConnectURL('tactical_oracle');
      window.open(whatsappURL, '_blank', 'width=800,height=600');
      toast.success('⚔️ Tactical Oracle ativado! Escaneie o QR Code');
    } catch (error) {
      toast.error('Erro ao conectar WhatsApp');
    } finally {
      setConnecting(null);
    }
  };



  const handleGoogleCalendarConnect = async () => {
    try {
      setConnecting('calendar');
      // Google Calendar já está autorizado, então apenas confirmar
      toast.success('✅ Google Calendar já está conectado!');
      setTimeout(() => setConnecting(null), 2000);
    } catch (error) {
      toast.error('Erro ao conectar Google Calendar');
      setConnecting(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Epic */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-purple-900/40 via-cyan-900/40 to-blue-900/40 border border-purple-500/50 rounded-2xl p-8"
      >
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 via-cyan-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white mb-2">
              Integrações Poderosas
            </h1>
            <p className="text-slate-300">
              Conecte FinQuest às suas ferramentas favoritas e potencialize sua gestão financeira
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mt-6">
          <div className="bg-slate-900/50 rounded-lg p-3 border border-cyan-500/30">
            <p className="text-xs text-slate-400 uppercase font-bold">Integrações Ativas</p>
            <p className="text-2xl font-black text-cyan-400 mt-1">{(whatsappConversations?.length > 0 ? 1 : 0) + 1}</p>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3 border border-purple-500/30">
            <p className="text-xs text-slate-400 uppercase font-bold">Disponíveis</p>
            <p className="text-2xl font-black text-purple-400 mt-1">2</p>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3 border border-green-500/30">
            <p className="text-xs text-slate-400 uppercase font-bold">Status</p>
            <p className="text-sm font-bold text-green-400 mt-1">✅ Pronto</p>
          </div>
        </div>
      </motion.div>

      {/* Integration Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <IntegrationCard
          icon={MessageCircle}
          title="WhatsApp - Tactical Oracle"
          description="Assistente IA gamificado para gestão via WhatsApp"
          isActive={whatsappConversations?.length > 0}
          isConnecting={connecting === 'whatsapp'}
          onConnect={handleWhatsAppConnect}
          provider="whatsapp"
        />

        <IntegrationCard
          icon={Calendar}
          title="Google Calendar"
          description="Sincronize agendamentos financeiros"
          isActive={true}
          isConnecting={connecting === 'calendar'}
          onConnect={handleGoogleCalendarConnect}
          provider="googlecalendar"
        />
      </div>

      {/* Info Cards */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-4">
          <h4 className="font-bold text-green-300 mb-2">⚔️ Tactical Oracle</h4>
          <p className="text-xs text-slate-300">
            Use comandos gamificados no WhatsApp: envie fotos de recibos, peça relatórios DRE e consulte saldo instantaneamente!
          </p>
        </div>

        <div className="bg-purple-900/20 border border-purple-500/30 rounded-xl p-4">
          <h4 className="font-bold text-purple-300 mb-2">🔄 Sincronização</h4>
          <p className="text-xs text-slate-300">
            Todas as mudanças são sincronizadas automaticamente entre FinQuest e suas integrações
          </p>
        </div>
      </motion.div>
    </div>
  );
}
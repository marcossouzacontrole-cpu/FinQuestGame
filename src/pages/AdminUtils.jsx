import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Loader2, Trophy, Target, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import NeonCard from '../components/NeonCard';

export default function AdminUtils() {
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['base44User'],
    queryFn: () => base44.auth.me()
  });

  const generateMissions = async () => {
    setIsGenerating(true);
    try {
      const response = await base44.functions.invoke('seedRealisticMissions', { clear_existing: false });
      
      if (response.data.success) {
        toast.success('🎉 Missões Geradas com Sucesso!', {
          description: `${response.data.missions_created} missões principais, ${response.data.daily_missions} diárias, ${response.data.weekly_missions} semanais, ${response.data.milestones} marcos financeiros`
        });
      } else {
        toast.error('Erro ao gerar missões');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erro ao gerar missões: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateScroll = async () => {
    setIsGenerating(true);
    try {
      const response = await base44.functions.invoke('generateDailyScrollWhatsApp', {});
      
      if (response.data.success) {
        toast.success('📜 Pergaminho Gerado!', {
          description: response.data.content.title + '\n\n💡 Usuários receberão no WhatsApp quando solicitarem "Academia hoje"'
        });
      } else {
        toast.error('Erro ao gerar pergaminho');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erro ao gerar pergaminho: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-white">Acesso negado. Apenas admins podem acessar esta página.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-4xl font-black text-white text-center mb-8">
        🔧 Painel de Administração
      </h1>

      <NeonCard glowColor="purple">
        <div className="flex items-center gap-3 mb-4">
          <Trophy className="w-6 h-6 text-purple-400" />
          <h2 className="text-xl font-bold text-white">Gerar Sistema de Missões</h2>
        </div>
        <p className="text-slate-400 mb-6">
          Cria o sistema completo de missões: Battle Pass (3 tiers), missões diárias (3), missões semanais (4) e marcos financeiros (13 conquistas).
        </p>
        <Button
          onClick={generateMissions}
          disabled={isGenerating}
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-4"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Gerando Missões...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 mr-2" />
              Gerar Todas as Missões
            </>
          )}
        </Button>
      </NeonCard>

      <NeonCard glowColor="cyan">
        <div className="flex items-center gap-3 mb-4">
          <Target className="w-6 h-6 text-cyan-400" />
          <h2 className="text-xl font-bold text-white">Gerar Pergaminho Diário</h2>
        </div>
        <p className="text-slate-400 mb-6">
          Cria conteúdo educacional do dia. Usuários recebem via WhatsApp quando solicitarem 'Academia hoje'.
        </p>
        <Button
          onClick={generateScroll}
          disabled={isGenerating}
          className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-bold py-4"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Gerando Pergaminho...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 mr-2" />
              Gerar Pergaminho
            </>
          )}
        </Button>
      </NeonCard>
    </div>
  );
}
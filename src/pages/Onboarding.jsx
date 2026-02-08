import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { ChevronRight, ChevronLeft, Sparkles, Loader2, Zap, Shield, DollarSign, Brain, Target, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import NeonCard from '../components/NeonCard';
import CampaignIntro from '../components/CampaignIntro';
import MenuTutorial from '../components/MenuTutorial';
import OnboardingIntro from '../components/OnboardingIntro';
import { toast } from 'sonner';

export default function Onboarding() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showIntro, setShowIntro] = useState(true);
  const [step, setStep] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showCampaignIntro, setShowCampaignIntro] = useState(false);
  const [showMenuTutorial, setShowMenuTutorial] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);

  // Fetch current user
  const { data: currentUser } = useQuery({
    queryKey: ['base44User'],
    queryFn: () => base44.auth.me(),
  });

  // Check if user already completed onboarding
  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ['userFinancialProfile', currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return [];
      return await base44.entities.FinancialProfile.filter({ created_by: currentUser.email });
    },
    enabled: !!currentUser
  });

  // Redirect to dashboard if user already has profile
  useEffect(() => {
    if (profileData && profileData.length > 0) {
      navigate(createPageUrl('Dashboard'));
    }
  }, [profileData, navigate]);
  
  const [profile, setProfile] = useState({
    // Fluxo de Caixa
    monthly_income: '',
    fixed_expenses: '',
    expense_tracking_frequency: '',
    savings_percentage: '',
    has_high_variable_expenses: false,
    
    // Patrimônio e Dívidas
    total_debt: '',
    has_emergency_fund: false,
    current_savings: '',
    has_assets: false,
    asset_description: '',
    main_financial_concern: '',
    
    // Comportamento
    financial_knowledge_level: '',
    main_motivator: '',
    main_financial_villain: '',
    investment_interest: '',
    desired_timeline: '',
    
    // Extras
    age_range: '',
    education_level: '',
    financial_goals: [],
    interests: [],
    onboarding_completed: true
  });

  const goalOptions = [
    'Criar fundo de emergência',
    'Comprar casa/apartamento',
    'Trocar de carro',
    'Viajar pelo mundo',
    'Aposentadoria tranquila',
    'Investir em educação',
    'Abrir um negócio',
    'Quitar dívidas',
    'Aumentar minha renda',
    'Conquistar liberdade financeira'
  ];

  const concernOptions = [
    'Dívidas acumuladas',
    'Não conseguir poupar',
    'Falta de conhecimento financeiro',
    'Gastos descontrolados',
    'Não ter reserva de emergência',
    'Renda insuficiente'
  ];

  const motivatorOptions = [
    'Segurança e tranquilidade',
    'Liberdade para fazer o que quero',
    'Conquistar bens/sonhos',
    'Aposentadoria confortável',
    'Ajudar minha família'
  ];

  const villainOptions = [
    'Gastos impulsivos',
    'Falta de planejamento/orçamento',
    'Dívidas com juros altos',
    'Renda baixa/variável',
    'Falta de disciplina',
    'Pressão social (manter aparências)'
  ];

  // Generate missions and goals using AI
  const generateContent = useMutation({
    mutationFn: async (profileData) => {
      const currentUser = await base44.auth.me();
      
      // Create financial profile
      await base44.entities.FinancialProfile.create(profileData);

      // Generate personalized missions
      const missionPrompt = `
Você é um especialista em finanças pessoais criando missões gamificadas para um jovem usuário.

Perfil do usuário:
- Renda mensal: R$ ${profileData.monthly_income}
- Gastos fixos: R$ ${profileData.fixed_expenses}
- % Poupança atual: ${profileData.savings_percentage}%
- Controle de gastos: ${profileData.expense_tracking_frequency}
- Economia atual: R$ ${profileData.current_savings}
- Dívidas totais: R$ ${profileData.total_debt}
- Fundo de emergência: ${profileData.has_emergency_fund ? 'Sim' : 'Não'}
- Possui ativos: ${profileData.has_assets ? `Sim (${profileData.asset_description})` : 'Não'}
- Maior preocupação: ${profileData.main_financial_concern}
- Nível de conhecimento: ${profileData.financial_knowledge_level}/5
- Motivador principal: ${profileData.main_motivator}
- Vilão financeiro: ${profileData.main_financial_villain}
- Interesse em investir: ${profileData.investment_interest}
- Timeline desejada: ${profileData.desired_timeline}
- Objetivos: ${profileData.financial_goals.join(', ')}
- Idade: ${profileData.age_range} anos
- Escolaridade: ${profileData.education_level}

Crie 8 missões personalizadas (3 diárias fáceis, 3 semanais médias, 2 de campanha difíceis).
Para cada missão, forneça: título motivador, descrição clara e específica, tipo (daily/weekly/campaign), 
recompensa de XP (50-300), e dificuldade (easy/medium/hard/legendary).

As missões devem ser práticas, alcançáveis e alinhadas com os objetivos do usuário.
`;

      const missionsData = await base44.integrations.Core.InvokeLLM({
        prompt: missionPrompt,
        response_json_schema: {
          type: "object",
          properties: {
            missions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  type: { type: "string", enum: ["daily", "weekly", "campaign"] },
                  xp_reward: { type: "integer" },
                  difficulty: { type: "string", enum: ["easy", "medium", "hard", "legendary"] }
                }
              }
            }
          }
        }
      });

      // Create missions
      if (missionsData?.missions) {
        await base44.entities.Mission.bulkCreate(missionsData.missions);
      }

      // Generate personalized goals
      const goalsPrompt = `
      Você é um consultor financeiro criando objetivos/metas personalizadas gamificadas.

      Perfil do usuário:
      - Renda mensal: R$ ${profileData.monthly_income}
      - Gastos fixos: R$ ${profileData.fixed_expenses}
      - % Poupança: ${profileData.savings_percentage}%
      - Economia atual: R$ ${profileData.current_savings}
      - Dívidas: R$ ${profileData.total_debt}
      - Tem fundo de emergência: ${profileData.has_emergency_fund ? 'Sim' : 'Não'}
      - Objetivos declarados: ${profileData.financial_goals.join(', ')}
      - Timeline: ${profileData.desired_timeline}
      - Idade: ${profileData.age_range} anos

IMPORTANTE: Crie EXATAMENTE 5 conquistas financeiras REALISTAS e ALCANÇÁVEIS com a seguinte distribuição temporal:

1. Conquista de CURTO PRAZO (6 meses a 1 ano) - urgente e alcançável
2. Conquista de CURTO PRAZO (6 meses a 1 ano) - outro objetivo rápido
3. Conquista de MÉDIO PRAZO (1 a 3 anos) - requer planejamento
4. Conquista de MÉDIO PRAZO (1 a 3 anos) - outro objetivo de médio prazo
5. Conquista de LONGO PRAZO (3 a 5 anos) - objetivo maior e ambicioso

Para cada conquista forneça:
- name: nome atrativo e motivador do objetivo
- legendary_item: título épico/lendário relacionado ao objetivo
- target_amount: valor alvo REALISTA em R$ baseado no prazo e perfil do usuário
- icon: emoji apropriado e visual
- color: cor hex neon (#FF00FF, #00FFFF, #39FF14, #8A2BE2, #FFD700)

Os valores devem ser progressivos e considerando a capacidade de poupança do usuário.
`;

      const goalsData = await base44.integrations.Core.InvokeLLM({
        prompt: goalsPrompt,
        response_json_schema: {
          type: "object",
          properties: {
            goals: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  legendary_item: { type: "string" },
                  target_amount: { type: "number" },
                  icon: { type: "string" },
                  color: { type: "string" }
                }
              }
            }
          }
        }
      });

      // Create goals
      if (goalsData?.goals) {
        await base44.entities.Goal.bulkCreate(goalsData.goals);
      }

      // Initialize user if not exists
      const existingUser = await base44.entities.User.filter({ 
        created_by: currentUser.email 
      });
      
      if (existingUser.length === 0) {
        await base44.entities.User.create({
          level: 1,
          xp: 0,
          total_xp: 0,
          skill_points: 0,
          total_wealth: parseFloat(profileData.current_savings) || 0,
          login_streak: 1,
          last_login: new Date().toISOString().split('T')[0],
          gold_coins: 0,
          level_title: 'Novato',
          character_skin: 'trader_rookie',
          unlocked_skins: ['trader_rookie'],
          character_accessories: [],
          unlocked_skills: [],
          completed_modules: [],
          behavior_tags: []
        });
      }

      return { missions: missionsData, goals: goalsData };
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['allMissions']);
      queryClient.invalidateQueries(['allGoals']);
      queryClient.invalidateQueries(['currentUser']);
      // CampaignIntro already showing, will auto-redirect when animations complete
    },
    onError: (error) => {
      toast.error('Erro ao gerar conteúdo', {
        description: 'Tente novamente ou preencha manualmente.'
      });
      setIsGenerating(false);
    }
  });

  const handleSubmit = async () => {
    // Validate
    if (!profile.monthly_income || !profile.age_range || !profile.education_level || 
        profile.financial_goals.length === 0 || !profile.financial_knowledge_level || 
        !profile.main_motivator) {
      toast.error('Preencha todos os campos obrigatórios marcados com *');
      return;
    }

    // Show CampaignIntro immediately
    setShowCampaignIntro(true);
    
    const profileData = {
      ...profile,
      monthly_income: parseFloat(profile.monthly_income),
      fixed_expenses: parseFloat(profile.fixed_expenses) || 0,
      current_savings: parseFloat(profile.current_savings) || 0,
      total_debt: parseFloat(profile.total_debt) || 0,
      savings_percentage: parseFloat(profile.savings_percentage) || 0
    };

    // Generate content in background
    generateContent.mutate(profileData);
  };

  const toggleArrayItem = (array, item) => {
    if (array.includes(item)) {
      return array.filter(i => i !== item);
    }
    return [...array, item];
  };

  const handleAnswerSelect = (field, value) => {
    setSelectedAnswer({ field, value });
    setShowFeedback(true);
    
    setTimeout(() => {
      setProfile({...profile, [field]: value});
      setShowFeedback(false);
      setSelectedAnswer(null);
    }, 800);
  };

  const steps = [
    {
      title: '⚡ ANÁLISE DE RECURSOS',
      subtitle: 'Escaneando fluxo financeiro...',
      icon: DollarSign,
      color: 'from-cyan-400 to-blue-500',
      content: (
        <div className="space-y-6">
          {/* Animated Input with Icon */}
          <div className="relative">
            <div className="absolute -top-3 left-4 px-2 bg-[#1a1a2e] z-10">
              <span className="text-cyan-400 text-xs font-bold flex items-center gap-1">
                <Coins className="w-3 h-3" /> RENDA MENSAL
              </span>
            </div>
            <div className="relative group">
              <Input
                type="number"
                placeholder="Digite o valor em R$"
                value={profile.monthly_income}
                onChange={(e) => setProfile({...profile, monthly_income: e.target.value})}
                className="bg-gradient-to-br from-[#0a0a1a] to-[#1a1a2e] border-2 border-cyan-500/30 text-white text-xl font-bold pl-12 h-16 group-hover:border-cyan-500/60 focus:border-cyan-500 transition-all shadow-[0_0_20px_rgba(0,255,255,0.1)] focus:shadow-[0_0_30px_rgba(0,255,255,0.3)]"
              />
              <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-cyan-400 animate-pulse" />
              {profile.monthly_income && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 animate-in fade-in zoom-in">
                  <Sparkles className="w-4 h-4 text-green-400" />
                  <span className="text-green-400 text-xs font-bold">DETECTADO</span>
                </div>
              )}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -top-3 left-4 px-2 bg-[#1a1a2e] z-10">
              <span className="text-orange-400 text-xs font-bold flex items-center gap-1">
                <Shield className="w-3 h-3" /> DESPESAS FIXAS
              </span>
            </div>
            <div className="relative group">
              <Input
                type="number"
                placeholder="Aluguel, contas, transporte..."
                value={profile.fixed_expenses}
                onChange={(e) => setProfile({...profile, fixed_expenses: e.target.value})}
                className="bg-gradient-to-br from-[#0a0a1a] to-[#1a1a2e] border-2 border-orange-500/30 text-white text-xl font-bold pl-12 h-16 group-hover:border-orange-500/60 focus:border-orange-500 transition-all"
              />
              <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-orange-400" />
            </div>
          </div>

          <div>
            <div className="text-center mb-4">
              <h3 className="text-white text-lg font-bold mb-1 flex items-center justify-center gap-2">
                <Brain className="w-5 h-5 text-purple-400 animate-pulse" />
                HÁBITO DE CONTROLE
              </h3>
              <p className="text-gray-400 text-sm">Selecione sua frequência atual</p>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              {[
                { label: 'Nunca', emoji: '💀', color: 'red' },
                { label: 'Raramente', emoji: '😅', color: 'orange' },
                { label: 'Mensalmente', emoji: '📅', color: 'yellow' },
                { label: 'Semanalmente', emoji: '⚡', color: 'cyan' },
                { label: 'Diariamente', emoji: '🏆', color: 'green' }
              ].map(freq => (
                <button
                  key={freq.label}
                  onClick={() => handleAnswerSelect('expense_tracking_frequency', freq.label)}
                  className={`group relative p-4 rounded-2xl border-2 transition-all duration-300 hover:scale-105 ${
                    profile.expense_tracking_frequency === freq.label
                      ? `border-${freq.color}-500 bg-${freq.color}-500/20 shadow-[0_0_30px_rgba(0,255,255,0.5)] scale-105`
                      : 'border-gray-700 hover:border-gray-500 bg-[#0a0a1a]'
                  }`}
                >
                  <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">{freq.emoji}</div>
                  <span className="text-white font-bold text-sm">{freq.label}</span>
                  {profile.expense_tracking_frequency === freq.label && (
                    <div className="absolute -top-2 -right-2 animate-in zoom-in">
                      <div className="bg-green-500 rounded-full p-1">
                        <Sparkles className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-white font-semibold mb-2 block">
              💸 Qual % da sua renda você consegue poupar por mês?
            </label>
            <Input
              type="number"
              placeholder="0%"
              value={profile.savings_percentage}
              onChange={(e) => setProfile({...profile, savings_percentage: e.target.value})}
              className="bg-[#0a0a1a] border-cyan-500/30 text-white text-lg"
            />
          </div>

          <div className="flex items-center gap-4 p-4 bg-[#0a0a1a] rounded-xl border-2 border-cyan-500/30 hover:border-cyan-500/50 transition-all">
            <Checkbox
              checked={profile.has_high_variable_expenses}
              onCheckedChange={(checked) => setProfile({...profile, has_high_variable_expenses: checked})}
              className="w-6 h-6 border-2 border-cyan-500/50 data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500"
            />
            <label className="text-white font-semibold cursor-pointer">
              Tenho gastos variáveis altos (lazer, delivery, compras)
            </label>
          </div>
        </div>
      )
    },
    {
      title: '🛡️ ESCANEAMENTO PATRIMONIAL',
      subtitle: 'Analisando ativos e ameaças...',
      icon: Shield,
      color: 'from-purple-400 to-pink-500',
      content: (
        <div className="space-y-6">
          <div>
            <label className="text-white font-semibold mb-2 block">
              💳 Qual o valor TOTAL de suas dívidas hoje? (cartão, empréstimos, financiamentos)
            </label>
            <Input
              type="number"
              placeholder="R$ 0,00"
              value={profile.total_debt}
              onChange={(e) => setProfile({...profile, total_debt: e.target.value})}
              className="bg-[#0a0a1a] border-cyan-500/30 text-white text-lg"
            />
          </div>

          <div className="flex items-center gap-4 p-4 bg-[#0a0a1a] rounded-xl border-2 border-cyan-500/30 hover:border-cyan-500/50 transition-all">
            <Checkbox
              checked={profile.has_emergency_fund}
              onCheckedChange={(checked) => setProfile({...profile, has_emergency_fund: checked})}
              className="w-6 h-6 border-2 border-cyan-500/50 data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500"
            />
            <label className="text-white font-semibold cursor-pointer">
              ✅ Tenho reserva de emergência (3-6 meses de despesas)
            </label>
          </div>

          <div>
            <label className="text-white font-semibold mb-2 block">
              🏦 Quanto você tem guardado/investido hoje?
            </label>
            <Input
              type="number"
              placeholder="R$ 0,00"
              value={profile.current_savings}
              onChange={(e) => setProfile({...profile, current_savings: e.target.value})}
              className="bg-[#0a0a1a] border-cyan-500/30 text-white text-lg"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-4 p-4 bg-[#0a0a1a] rounded-xl border-2 border-cyan-500/30 hover:border-cyan-500/50 transition-all">
              <Checkbox
                checked={profile.has_assets}
                onCheckedChange={(checked) => setProfile({...profile, has_assets: checked})}
                className="w-6 h-6 border-2 border-cyan-500/50 data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500"
              />
              <label className="text-white font-semibold cursor-pointer">
                🏡 Possuo bens/ativos (imóvel, carro quitado, investimentos)
              </label>
            </div>
            
            {profile.has_assets && (
              <Input
                placeholder="Descreva brevemente seus ativos"
                value={profile.asset_description}
                onChange={(e) => setProfile({...profile, asset_description: e.target.value})}
                className="bg-[#0a0a1a] border-cyan-500/30 text-white"
              />
            )}
          </div>

          <div>
            <label className="text-white font-semibold mb-3 block">
              ⚠️ Qual sua MAIOR preocupação financeira hoje?
            </label>
            <div className="grid grid-cols-1 gap-3">
              {concernOptions.map(concern => (
                <button
                  key={concern}
                  onClick={() => setProfile({...profile, main_financial_concern: concern})}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    profile.main_financial_concern === concern
                      ? 'border-red-500 bg-red-500/20 shadow-[0_0_20px_rgba(255,0,0,0.4)]'
                      : 'border-gray-700 hover:border-gray-600 bg-[#0a0a1a]'
                  }`}
                >
                  <span className="text-white font-semibold">{concern}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )
    },
    {
      title: '🧠 ANÁLISE PSICOLÓGICA',
      subtitle: 'Identificando padrões de comportamento...',
      icon: Brain,
      color: 'from-green-400 to-cyan-500',
      content: (
        <div className="space-y-6">
          <div>
            <div className="text-center mb-6">
              <h3 className="text-white text-xl font-black mb-2 flex items-center justify-center gap-2">
                <Brain className="w-6 h-6 text-cyan-400 animate-pulse" />
                NÍVEL DE CONHECIMENTO FINANCEIRO
              </h3>
              <p className="text-cyan-400 text-sm">Escolha honestamente seu nível atual *</p>
            </div>
            <div className="grid grid-cols-5 gap-3">
              {[
                { level: 1, label: 'Iniciante', emoji: '🥚', color: 'red', desc: 'Começando agora' },
                { level: 2, label: 'Básico', emoji: '🐣', color: 'orange', desc: 'Sei o básico' },
                { level: 3, label: 'Intermediário', emoji: '🐥', color: 'yellow', desc: 'Tenho base' },
                { level: 4, label: 'Avançado', emoji: '🦅', color: 'cyan', desc: 'Experiente' },
                { level: 5, label: 'Expert', emoji: '👑', color: 'purple', desc: 'Mestre' }
              ].map(item => (
                <button
                  key={item.level}
                  onClick={() => handleAnswerSelect('financial_knowledge_level', item.level.toString())}
                  className={`group relative p-6 rounded-2xl border-2 transition-all duration-300 hover:scale-110 hover:-translate-y-2 ${
                    profile.financial_knowledge_level === item.level.toString()
                      ? `border-${item.color}-500 bg-${item.color}-500/20 shadow-[0_0_40px_rgba(0,255,255,0.6)] scale-110`
                      : 'border-gray-700 hover:border-gray-500 bg-gradient-to-b from-[#0a0a1a] to-[#1a1a2e]'
                  }`}
                >
                  <div className="text-5xl mb-3 group-hover:scale-125 transition-transform duration-300">{item.emoji}</div>
                  <div className="text-white font-black text-3xl mb-1">{item.level}</div>
                  <div className="text-gray-400 text-xs font-bold uppercase">{item.label}</div>
                  <div className="text-gray-500 text-[10px] mt-1">{item.desc}</div>
                  {profile.financial_knowledge_level === item.level.toString() && (
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-cyan-500/20 to-transparent pointer-events-none animate-pulse" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-white font-semibold mb-3 block">
              🎯 Qual seu MAIOR motivador para melhorar suas finanças? *
            </label>
            <div className="grid grid-cols-1 gap-3">
              {motivatorOptions.map(motivator => (
                <button
                  key={motivator}
                  onClick={() => setProfile({...profile, main_motivator: motivator})}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    profile.main_motivator === motivator
                      ? 'border-green-400 bg-green-500/20 shadow-[0_0_20px_rgba(57,255,20,0.4)]'
                      : 'border-gray-700 hover:border-gray-600 bg-[#0a0a1a]'
                  }`}
                >
                  <span className="text-white font-semibold">{motivator}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-white font-semibold mb-3 block">
              😈 Qual seu maior "vilão" financeiro? (o que mais te atrapalha)
            </label>
            <div className="grid grid-cols-1 gap-3">
              {villainOptions.map(villain => (
                <button
                  key={villain}
                  onClick={() => setProfile({...profile, main_financial_villain: villain})}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    profile.main_financial_villain === villain
                      ? 'border-red-500 bg-red-500/20 shadow-[0_0_20px_rgba(255,0,0,0.4)]'
                      : 'border-gray-700 hover:border-gray-600 bg-[#0a0a1a]'
                  }`}
                >
                  <span className="text-white font-semibold">{villain}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-white font-semibold mb-3 block">
              📈 Você já investe ou tem interesse em investir?
            </label>
            <div className="grid grid-cols-3 gap-3">
              {['Não, zero conhecimento', 'Tenho interesse', 'Sim, já invisto'].map(option => (
                <button
                  key={option}
                  onClick={() => setProfile({...profile, investment_interest: option})}
                  className={`p-4 rounded-xl border-2 text-center transition-all ${
                    profile.investment_interest === option
                      ? 'border-magenta-500 bg-magenta-500/20 shadow-[0_0_20px_rgba(255,0,255,0.4)]'
                      : 'border-gray-700 hover:border-gray-600 bg-[#0a0a1a]'
                  }`}
                >
                  <span className="text-white font-semibold text-sm">{option}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-white font-semibold mb-3 block">
              ⏱️ Em quanto tempo você quer ver resultados financeiros reais?
            </label>
            <div className="grid grid-cols-2 gap-3">
              {['1-3 meses (rápido)', '6 meses', '1 ano', '2+ anos (tranquilo)'].map(timeline => (
                <button
                  key={timeline}
                  onClick={() => setProfile({...profile, desired_timeline: timeline})}
                  className={`p-4 rounded-xl border-2 text-center transition-all ${
                    profile.desired_timeline === timeline
                      ? 'border-cyan-500 bg-cyan-500/20 shadow-[0_0_20px_rgba(0,255,255,0.4)]'
                      : 'border-gray-700 hover:border-gray-600 bg-[#0a0a1a]'
                  }`}
                >
                  <span className="text-white font-semibold">{timeline}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )
    },
    {
      title: '🎯 DEFINIÇÃO DE METAS',
      subtitle: 'Configurando objetivos da missão...',
      icon: Target,
      color: 'from-yellow-400 to-orange-500',
      content: (
        <div className="space-y-6">
          <div>
            <label className="text-white font-semibold mb-3 block">
              📅 Qual sua faixa etária? *
            </label>
            <div className="grid grid-cols-3 gap-3">
              {['15-20', '21-25', '26-30', '31-35', '36+'].map(age => (
                <button
                  key={age}
                  onClick={() => setProfile({...profile, age_range: age})}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    profile.age_range === age
                      ? 'border-cyan-500 bg-cyan-500/20 shadow-[0_0_20px_rgba(0,255,255,0.4)]'
                      : 'border-gray-700 hover:border-gray-600 bg-[#0a0a1a]'
                  }`}
                >
                  <span className="text-white font-semibold">{age} anos</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-white font-semibold mb-3 block">
              🎓 Qual seu nível de escolaridade? *
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                'Ensino Fundamental',
                'Ensino Médio',
                'Ensino Superior (cursando)',
                'Ensino Superior (completo)',
                'Pós-graduação',
                'Mestrado/Doutorado'
              ].map(edu => (
                <button
                  key={edu}
                  onClick={() => setProfile({...profile, education_level: edu})}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    profile.education_level === edu
                      ? 'border-purple-500 bg-purple-500/20 shadow-[0_0_20px_rgba(139,0,255,0.4)]'
                      : 'border-gray-700 hover:border-gray-600 bg-[#0a0a1a]'
                  }`}
                >
                  <span className="text-white font-semibold text-sm">{edu}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-white font-semibold mb-3 block">
              🎯 Quais seus principais objetivos financeiros? * (escolha pelo menos 1)
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {goalOptions.map(goal => (
                <button
                  key={goal}
                  onClick={() => setProfile({
                    ...profile, 
                    financial_goals: toggleArrayItem(profile.financial_goals, goal)
                  })}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    profile.financial_goals.includes(goal)
                      ? 'border-magenta-500 bg-magenta-500/20 shadow-[0_0_20px_rgba(255,0,255,0.4)]'
                      : 'border-gray-700 hover:border-gray-600 bg-[#0a0a1a]'
                  }`}
                >
                  <span className="text-white font-semibold">{goal}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )
    }
  ];

  // Loading state
  if (profileLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A1A] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
      </div>
    );
  }

  // Show intro only for new users without profile
  if (showIntro && (!profileData || profileData.length === 0)) {
    return <OnboardingIntro onStart={() => setShowIntro(false)} />;
  }

  // Show campaign intro after successful onboarding
  if (showCampaignIntro && !showMenuTutorial) {
    return <CampaignIntro onComplete={() => setShowMenuTutorial(true)} />;
  }

  // Show menu tutorial after campaign intro
  if (showMenuTutorial) {
    return <MenuTutorial onComplete={() => navigate(createPageUrl('Dashboard'))} />;
  }

  const StepIcon = steps[step].icon;

  return (
    <div className="min-h-screen bg-[#0A0A1A] cyber-grid flex items-center justify-center p-4 overflow-hidden">
      {/* Animated Background Particles */}
      <div className="fixed inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-cyan-400 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              opacity: Math.random() * 0.5
            }}
          />
        ))}
      </div>

      <div className="max-w-4xl w-full relative">
        {/* Animated Card with Scanline Effect */}
        <div className="relative">
          {/* Glow Effect */}
          <div className={`absolute -inset-1 bg-gradient-to-r ${steps[step].color} rounded-3xl blur-2xl opacity-30 animate-pulse`} />
          
          <NeonCard glowColor="cyan" className="relative overflow-hidden backdrop-blur-xl">
            {/* Scanline Animation */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/10 to-transparent h-32 animate-scan" />
            </div>

            {/* Header with Icon */}
            <div className="relative text-center mb-8">
              {/* Step Icon */}
              <div className="flex justify-center mb-4">
                <div className={`relative w-20 h-20 rounded-2xl bg-gradient-to-br ${steps[step].color} flex items-center justify-center shadow-[0_0_40px_rgba(0,255,255,0.5)] animate-in zoom-in duration-700`}>
                  <StepIcon className="w-10 h-10 text-white animate-pulse" />
                  <div className="absolute inset-0 rounded-2xl border-4 border-white/20" />
                </div>
              </div>

              {/* Title Animation */}
              <div className="animate-in fade-in slide-in-from-top duration-700">
                <h1 className={`text-3xl md:text-4xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r ${steps[step].color} animate-pulse`}>
                  {steps[step].title}
                </h1>
                <p className="text-cyan-400 text-sm mb-4 font-mono animate-pulse">
                  {steps[step].subtitle}
                </p>
              </div>

              {/* Step Counter */}
              <div className="flex items-center justify-center gap-2 mb-4">
                {steps.map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-2 rounded-full transition-all duration-500 ${
                      idx === step
                        ? 'w-12 bg-gradient-to-r from-cyan-500 to-magenta-500 shadow-[0_0_10px_rgba(0,255,255,0.8)]'
                        : idx < step
                        ? 'w-2 bg-green-500'
                        : 'w-2 bg-gray-700'
                    }`}
                  />
                ))}
              </div>
              <p className="text-gray-500 text-xs font-mono">
                FASE {step + 1}/{steps.length} • {Math.round(((step + 1) / steps.length) * 100)}% COMPLETO
              </p>
            </div>

            {/* Content with Animation */}
            <div className="mb-8 animate-in fade-in slide-in-from-bottom duration-700">
              <div className="relative">
                {/* Content Container with Glow */}
                <div className="bg-gradient-to-b from-[#0a0a1a]/50 to-[#1a1a2e]/50 rounded-2xl p-6 border border-cyan-500/20">
                  {steps[step].content}
                </div>
                
                {/* Feedback Animation */}
                {showFeedback && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none animate-in zoom-in duration-300">
                    <div className="bg-green-500/90 rounded-full p-8 shadow-[0_0_60px_rgba(57,255,20,0.8)]">
                      <Sparkles className="w-16 h-16 text-white animate-spin" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Navigation with Animations */}
            <div className="flex justify-between gap-4">
              <Button
                onClick={() => setStep(step - 1)}
                disabled={step === 0}
                variant="outline"
                className="group relative px-6 py-6 border-2 border-cyan-500/30 text-white hover:bg-cyan-500/20 hover:border-cyan-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(0,255,255,0.2)]"
              >
                <ChevronLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
                <span className="font-bold">VOLTAR</span>
              </Button>

              {step < steps.length - 1 ? (
                <Button
                  onClick={() => setStep(step + 1)}
                  className="group relative px-8 py-6 bg-gradient-to-r from-cyan-500 to-magenta-500 hover:from-cyan-600 hover:to-magenta-600 text-white font-black text-lg shadow-[0_0_30px_rgba(0,255,255,0.6)] hover:shadow-[0_0_50px_rgba(0,255,255,0.9)] transition-all hover:scale-105 overflow-hidden"
                >
                  {/* Shine Effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  <span className="relative flex items-center gap-2">
                    AVANÇAR
                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  className="group relative px-10 py-6 bg-gradient-to-r from-green-500 via-cyan-500 to-blue-500 hover:from-green-600 hover:via-cyan-600 hover:to-blue-600 text-white font-black text-lg shadow-[0_0_40px_rgba(57,255,20,0.6)] hover:shadow-[0_0_60px_rgba(57,255,20,0.9)] transition-all hover:scale-110 animate-pulse overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  <span className="relative flex items-center gap-2">
                    <Sparkles className="w-5 h-5 animate-spin" />
                    INICIAR JORNADA
                    <Zap className="w-5 h-5" />
                  </span>
                </Button>
              )}
            </div>
          </NeonCard>
        </div>

        {/* Side Stats Display */}
        <div className="absolute -right-24 top-1/2 -translate-y-1/2 hidden xl:block animate-in slide-in-from-right duration-1000">
          <div className="space-y-3">
            <div className="bg-gradient-to-r from-cyan-500/20 to-transparent backdrop-blur-sm rounded-l-xl p-3 border-l-4 border-cyan-500">
              <p className="text-cyan-400 text-xs font-bold">FASE ATUAL</p>
              <p className="text-white text-2xl font-black">{step + 1}/{steps.length}</p>
            </div>
            <div className="bg-gradient-to-r from-magenta-500/20 to-transparent backdrop-blur-sm rounded-l-xl p-3 border-l-4 border-magenta-500">
              <p className="text-magenta-400 text-xs font-bold">PROGRESSO</p>
              <p className="text-white text-2xl font-black">{Math.round(((step + 1) / steps.length) * 100)}%</p>
            </div>
            <div className="bg-gradient-to-r from-green-500/20 to-transparent backdrop-blur-sm rounded-l-xl p-3 border-l-4 border-green-500">
              <p className="text-green-400 text-xs font-bold">STATUS</p>
              <p className="text-white text-xs font-bold flex items-center gap-1">
                <Zap className="w-3 h-3 animate-pulse" />
                ATIVO
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Animations */}
      <style jsx>{`
        @keyframes scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        .animate-scan {
          animation: scan 3s linear infinite;
        }
      `}</style>
    </div>
  );
}
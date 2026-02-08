import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Plus, FileText, Menu, X, Zap, Upload, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import BankStatementImporter from './BankStatementImporter';
import ShareAchievementModal from './ShareAchievementModal';
import { XPParticles, GoldParticles } from './ParticleEffect';
import { playSound } from './SoundManager';

export default function SkillBar() {
  const [activeModal, setActiveModal] = useState(null); // 'attack', 'heal', 'menu', 'import'
  const [flashColor, setFlashColor] = useState(null);
  const [particles, setParticles] = useState(null);
  const [shareAchievement, setShareAchievement] = useState(null);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    description: '',
    value: '',
    category: '',
    account_id: '',
    date: new Date().toISOString().split('T')[0]
  });

  const { data: currentUser } = useQuery({
    queryKey: ['base44User'],
    queryFn: () => base44.auth.me(),
  });

  const { data: userData } = useQuery({
    queryKey: ['currentUserProfile', currentUser?.email],
    queryFn: async () => {
      if (currentUser?.email) {
        const profiles = await base44.entities.User.filter({ email: currentUser.email });
        return profiles && profiles.length > 0 ? profiles[0] : null;
      }
      return null;
    },
    enabled: !!currentUser,
  });

  const { data: budgetCategories = [] } = useQuery({
    queryKey: ['budgetCategories', currentUser?.email],
    queryFn: () => base44.entities.BudgetCategory.filter({ created_by: currentUser.email }),
    enabled: !!currentUser?.email
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts', currentUser?.email],
    queryFn: () => base44.entities.Account.filter({ created_by: currentUser.email }),
    enabled: !!currentUser?.email
  });

  // Opções de categorias de despesa
  const expenseCategoryOptions = useMemo(() => {
    return budgetCategories
      .filter(c => c.category_type === 'expense' || c.category_type === 'enemy')
      .map(cat => ({
        value: cat.name,
        label: cat.name,
        icon: cat.icon || '💀'
      }));
  }, [budgetCategories]);

  // Opções de categorias de receita
  const incomeCategoryOptions = useMemo(() => {
    return budgetCategories
      .filter(c => c.category_type === 'guardian')
      .map(cat => ({
        value: cat.name,
        label: cat.name,
        icon: cat.icon || '💰'
      }));
  }, [budgetCategories]);

  // Opções de contas
  const accountOptions = useMemo(() => {
    return accounts.map(acc => ({
      value: acc.id,
      label: acc.name,
      icon: acc.icon || '💰'
    }));
  }, [accounts]);

  const handleFlash = (color) => {
    setFlashColor(color);
    setTimeout(() => setFlashColor(null), 300);
  };

  const handleSubmit = async (type) => {
    if (!formData.value || !formData.description || !formData.category) {
      toast.error('Preencha todos os campos obrigatórios');
      playSound('error');
      return;
    }

    try {
      // Buscar o ID da categoria selecionada
      const selectedCategory = budgetCategories.find(c => c.name === formData.category);

      await base44.functions.invoke('createTransaction', {
        date: formData.date,
        value: parseFloat(formData.value),
        description: formData.description,
        category: formData.category,
        type,
        account_id: formData.account_id || null,
        budget_category_id: selectedCategory?.id || null
      });

      // Efeitos visuais e sonoros
      playSound(type === 'expense' ? 'coin' : 'success');
      
      const rect = document.querySelector('.skill-bar-container')?.getBoundingClientRect();
      setParticles({
        type: type === 'expense' ? 'xp' : 'gold',
        amount: parseFloat(formData.value),
        x: rect ? rect.left + rect.width / 2 : window.innerWidth / 2,
        y: rect ? rect.top : window.innerHeight / 2
      });
      
      setTimeout(() => setParticles(null), 2000);

      queryClient.invalidateQueries(['finTransactions']);
      queryClient.invalidateQueries(['budgetCategories']);
      queryClient.invalidateQueries(['dashboardData']);
      queryClient.invalidateQueries(['accounts']);
      queryClient.invalidateQueries(['missionTimeline']);
      queryClient.invalidateQueries(['performanceScore']);
      
      handleFlash(type === 'expense' ? 'red' : 'green');
      setActiveModal(null);
      setFormData({ description: '', value: '', category: '', account_id: '', date: new Date().toISOString().split('T')[0] });
      
      toast.success(type === 'expense' ? '⚔️ Dano registrado! Missões atualizadas.' : '💚 HP restaurado! Missões atualizadas.');

      // Prompt share for significant transactions (>= 1000)
      if (parseFloat(formData.value) >= 1000) {
        setTimeout(() => {
          setShareAchievement({
            type: 'custom',
            title: type === 'expense' ? `Dano de R$ ${parseFloat(formData.value).toLocaleString('pt-BR')}!` : `Receita de R$ ${parseFloat(formData.value).toLocaleString('pt-BR')}!`,
            description: `${formData.description} - ${formData.category}`,
            icon: type === 'expense' ? '⚔️' : '💰',
            metadata: { value: parseFloat(formData.value), category: formData.category }
          });
        }, 1000);
      }
    } catch (error) {
      console.error('Erro ao registrar:', error);
      toast.error('Erro ao registrar transação');
      playSound('error');
    }
  };

  const skills = [
    { 
      id: 'import', 
      icon: Upload, 
      label: 'EXTRATOS',
      color: 'from-[#4A9FFF] via-[#6BB5FF] to-[#3B8AE5]',
      bgColor: 'bg-[#4A9FFF]',
      shadowColor: 'rgba(74,159,255,0.5)',
      glowColor: '#4A9FFF'
    },
    { 
      id: 'heal', 
      icon: Plus, 
      label: 'RENDA',
      color: 'from-[#00D9A3] via-[#00FFC2] to-[#00B887]',
      bgColor: 'bg-[#00D9A3]',
      shadowColor: 'rgba(0,217,163,0.5)',
      glowColor: '#00D9A3'
    },
    { 
      id: 'attack', 
      icon: Swords, 
      label: 'GASTO',
      color: 'from-[#FF3B3B] via-[#FF5757] to-[#FF1F1F]',
      bgColor: 'bg-[#FF3B3B]',
      shadowColor: 'rgba(255,59,59,0.5)',
      glowColor: '#FF3B3B'
    },
    { 
      id: 'categories', 
      icon: Settings, 
      label: 'CATEGORIAS',
      color: 'from-[#FF00FF] via-[#FF66FF] to-[#CC00CC]',
      bgColor: 'bg-[#FF00FF]',
      shadowColor: 'rgba(255,0,255,0.5)',
      glowColor: '#FF00FF',
      link: 'NetWorth?tab=categories'
    },
    { 
      id: 'scan', 
      icon: FileText, 
      label: 'NÚCLEO ESTRATÉGICO',
      color: 'from-[#00D9FF] via-[#00F0FF] to-[#00BFDB]',
      bgColor: 'bg-[#00D9FF]',
      shadowColor: 'rgba(0,217,255,0.5)',
      glowColor: '#00D9FF',
      link: 'FinancialCore'
    },
    { 
      id: 'menu', 
      icon: Menu, 
      label: 'MENU',
      color: 'from-[#A855F7] via-[#C084FC] to-[#9333EA]',
      bgColor: 'bg-[#A855F7]',
      shadowColor: 'rgba(168,85,247,0.5)',
      glowColor: '#A855F7'
    }
  ];

  return (
    <>
      {/* Share Achievement Modal */}
      {shareAchievement && userData && (
        <ShareAchievementModal
          achievement={shareAchievement}
          user={userData}
          onClose={() => setShareAchievement(null)}
        />
      )}

      {/* Particles */}
      {particles?.type === 'xp' && <XPParticles amount={particles.amount} x={particles.x} y={particles.y} />}
      {particles?.type === 'gold' && <GoldParticles amount={particles.amount} x={particles.x} y={particles.y} />}

      {/* Flash Effect */}
      <AnimatePresence>
        {flashColor && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 pointer-events-none z-[60] ${
              flashColor === 'red' ? 'bg-red-500' : 'bg-green-500'
            }`}
          />
        )}
      </AnimatePresence>

      {/* Skill Bar - Optimized */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, type: "spring", stiffness: 100 }}
        className="fixed bottom-0 left-0 right-0 z-50 lg:left-64 pointer-events-none"
      >
        {/* Gradient Background */}
        <div className="relative bg-gradient-to-t from-[#0A0A1A] via-[#0A0A1A]/95 to-transparent pt-4 sm:pt-6 pb-safe pointer-events-none">
          {/* Decorative Top Border */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />

          <div className="max-w-4xl mx-auto px-2 sm:px-4 pointer-events-none">
            {/* Main Container */}
            <div className="relative pointer-events-auto skill-bar-container">
              {/* Glow Effect Background */}
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-purple-500/5 to-pink-500/5 rounded-2xl sm:rounded-3xl blur-xl" />

              {/* Skills Container */}
              <div className="relative bg-gradient-to-br from-slate-900/90 via-slate-800/80 to-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl sm:rounded-3xl p-2 sm:p-3 lg:p-4 shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
                <div className="flex items-center justify-between sm:justify-around gap-1 sm:gap-2 lg:gap-3">
                  {skills.map((skill, index) => {
                    const Icon = skill.icon;

                    const SkillButton = (
                      <motion.div
                        key={skill.id}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ 
                          delay: 0.5 + index * 0.05,
                          type: "spring",
                          stiffness: 200,
                          damping: 15
                        }}
                        className="flex flex-col items-center gap-1 sm:gap-1.5 flex-1 max-w-[80px]"
                      >
                        <motion.button
                          whileHover={{ 
                            scale: 1.1, 
                            y: -4
                          }}
                          whileTap={{ scale: 0.95 }}
                          onClick={skill.link ? undefined : () => setActiveModal(skill.id)}
                          className="relative group w-full"
                        >
                          {/* Glow Effect on Hover - only desktop */}
                          <div 
                            className="absolute inset-0 rounded-xl sm:rounded-2xl blur-lg opacity-0 group-hover:opacity-50 transition-opacity duration-300 hidden sm:block"
                            style={{ backgroundColor: skill.glowColor }}
                          />

                          {/* Button */}
                          <div 
                            className={`relative w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-br ${skill.color} flex items-center justify-center shadow-lg transition-all duration-200 overflow-hidden mx-auto`}
                            style={{ 
                              boxShadow: `0 2px 12px ${skill.shadowColor}`
                            }}
                          >
                            {/* Icon */}
                            <Icon className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-white relative z-10 drop-shadow-lg" strokeWidth={2.5} />
                          </div>
                        </motion.button>

                        {/* Label */}
                        <span 
                          className="text-[7px] sm:text-[8px] lg:text-[9px] font-black tracking-wider text-white/60 group-hover:text-white/90 transition-colors text-center leading-tight"
                          style={{ fontFamily: 'Orbitron, sans-serif' }}
                        >
                          {skill.label}
                        </span>
                      </motion.div>
                    );

                    if (skill.link) {
                      return (
                        <Link key={skill.id} to={createPageUrl(skill.link)}>
                          {SkillButton}
                        </Link>
                      );
                    }

                    return SkillButton;
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Attack Modal - Gasto Rápido */}
      <AnimatePresence>
        {activeModal === 'attack' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[70] flex items-center justify-center p-3 sm:p-4"
            onClick={() => setActiveModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border-2 border-red-500/50 rounded-xl sm:rounded-2xl p-4 sm:p-6 max-w-md w-full shadow-[0_0_50px_rgba(239,68,68,0.4)] relative max-h-[90vh] overflow-y-auto"
            >
              {/* Close Button */}
              <button
                onClick={() => setActiveModal(null)}
                className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              {/* Header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-red-600 to-red-500 rounded-xl flex items-center justify-center">
                  <Swords className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-red-400 font-black text-2xl">DANO</h2>
                  <p className="text-slate-400 text-xs">Registrar Despesa</p>
                </div>
              </div>

              {/* Form */}
              <div className="space-y-4">
                <div>
                  <label className="text-slate-400 text-xs uppercase font-bold mb-2 block">Descrição</label>
                  <Input
                    placeholder="Ex: Almoço, Uber, Mercado"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="bg-slate-800 border-red-500/30 text-white"
                  />
                </div>

                <div>
                  <label className="text-slate-400 text-xs uppercase font-bold mb-2 block">Data</label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="bg-slate-800 border-red-500/30 text-white"
                  />
                </div>

                <div>
                  <label className="text-slate-400 text-xs uppercase font-bold mb-2 block">Valor do Dano</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">R$</span>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.value}
                      onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                      className="bg-slate-800 border-red-500/30 text-white pl-10 text-2xl font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 text-xs uppercase font-bold mb-2 block">Categoria *</label>
                  <SearchableSelect
                    value={formData.category}
                    onValueChange={(val) => setFormData({ ...formData, category: val })}
                    options={expenseCategoryOptions}
                    placeholder="Digite ou selecione..."
                    searchPlaceholder="Buscar categoria..."
                    emptyMessage="Nenhuma categoria encontrada"
                    triggerClassName="bg-slate-800 border-red-500/30 text-white hover:bg-slate-800/80"
                    contentClassName="bg-slate-900 border-red-500/30"
                  />
                </div>

                <div>
                  <label className="text-slate-400 text-xs uppercase font-bold mb-2 block">Conta</label>
                  <SearchableSelect
                    value={formData.account_id}
                    onValueChange={(val) => setFormData({ ...formData, account_id: val })}
                    options={accountOptions}
                    placeholder="Digite ou selecione..."
                    searchPlaceholder="Buscar conta..."
                    emptyMessage="Nenhuma conta encontrada"
                    triggerClassName="bg-slate-800 border-red-500/30 text-white hover:bg-slate-800/80"
                    contentClassName="bg-slate-900 border-red-500/30"
                  />
                </div>

                <button
                  onClick={() => handleSubmit('expense')}
                  className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white font-black py-4 rounded-xl flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(239,68,68,0.5)]"
                >
                  <Swords className="w-5 h-5" />
                  CAUSAR DANO
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Heal Modal - Renda Rápida */}
      <AnimatePresence>
        {activeModal === 'heal' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[70] flex items-center justify-center p-3 sm:p-4"
            onClick={() => setActiveModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border-2 border-green-500/50 rounded-xl sm:rounded-2xl p-4 sm:p-6 max-w-md w-full shadow-[0_0_50px_rgba(34,197,94,0.4)] relative max-h-[90vh] overflow-y-auto"
            >
              {/* Close Button */}
              <button
                onClick={() => setActiveModal(null)}
                className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              {/* Header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-green-500 rounded-xl flex items-center justify-center">
                  <Plus className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-green-400 font-black text-2xl">CURA</h2>
                  <p className="text-slate-400 text-xs">Registrar Receita</p>
                </div>
              </div>

              {/* Form */}
              <div className="space-y-4">
                <div>
                  <label className="text-slate-400 text-xs uppercase font-bold mb-2 block">Descrição</label>
                  <Input
                    placeholder="Ex: Salário, Freelance, Venda"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="bg-slate-800 border-green-500/30 text-white"
                  />
                </div>

                <div>
                  <label className="text-slate-400 text-xs uppercase font-bold mb-2 block">Data</label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="bg-slate-800 border-green-500/30 text-white"
                  />
                </div>

                <div>
                  <label className="text-slate-400 text-xs uppercase font-bold mb-2 block">Valor da Cura</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">R$</span>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.value}
                      onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                      className="bg-slate-800 border-green-500/30 text-white pl-10 text-2xl font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 text-xs uppercase font-bold mb-2 block">Categoria *</label>
                  <SearchableSelect
                    value={formData.category}
                    onValueChange={(val) => setFormData({ ...formData, category: val })}
                    options={incomeCategoryOptions}
                    placeholder="Digite ou selecione..."
                    searchPlaceholder="Buscar categoria..."
                    emptyMessage="Nenhuma categoria encontrada"
                    triggerClassName="bg-slate-800 border-green-500/30 text-white hover:bg-slate-800/80"
                    contentClassName="bg-slate-900 border-green-500/30"
                  />
                </div>

                <div>
                  <label className="text-slate-400 text-xs uppercase font-bold mb-2 block">Conta</label>
                  <SearchableSelect
                    value={formData.account_id}
                    onValueChange={(val) => setFormData({ ...formData, account_id: val })}
                    options={accountOptions}
                    placeholder="Digite ou selecione..."
                    searchPlaceholder="Buscar conta..."
                    emptyMessage="Nenhuma conta encontrada"
                    triggerClassName="bg-slate-800 border-green-500/30 text-white hover:bg-slate-800/80"
                    contentClassName="bg-slate-900 border-green-500/30"
                  />
                </div>

                <button
                  onClick={() => handleSubmit('income')}
                  className="w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-black py-4 rounded-xl flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(34,197,94,0.5)]"
                >
                  <Plus className="w-5 h-5" />
                  RESTAURAR HP
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Import Modal - Bank Statements */}
      <AnimatePresence>
        {activeModal === 'import' && (
          <BankStatementImporter 
            onClose={() => setActiveModal(null)}
            onImport={(transactions) => {
              queryClient.invalidateQueries(['finTransactions']);
              queryClient.invalidateQueries(['budgetCategories']);
              queryClient.invalidateQueries(['accounts']);
              queryClient.invalidateQueries(['dashboardData']);
              setActiveModal(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Menu Modal - Quick Links */}
      <AnimatePresence>
        {activeModal === 'menu' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[70] flex items-center justify-center p-3 sm:p-4"
            onClick={() => setActiveModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border-2 border-purple-500/50 rounded-xl sm:rounded-2xl p-4 sm:p-6 max-w-md w-full shadow-[0_0_50px_rgba(168,85,247,0.4)]"
            >
              <div className="flex items-center gap-3 mb-6">
                <Zap className="w-8 h-8 text-purple-400" />
                <h2 className="text-white font-black text-2xl">MENU RÁPIDO</h2>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Link to={createPageUrl('Missions')} onClick={() => setActiveModal(null)}>
                  <button className="w-full bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/50 rounded-xl p-4 transition-all">
                    <Swords className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                    <p className="text-white font-bold text-sm">Missões</p>
                  </button>
                </Link>
                <Link to={createPageUrl('Vault')} onClick={() => setActiveModal(null)}>
                  <button className="w-full bg-yellow-600/20 hover:bg-yellow-600/30 border border-yellow-500/50 rounded-xl p-4 transition-all">
                    <Zap className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                    <p className="text-white font-bold text-sm">Metas</p>
                  </button>
                </Link>
                <Link to={createPageUrl('NetWorth')} onClick={() => setActiveModal(null)}>
                  <button className="w-full bg-red-600/20 hover:bg-red-600/30 border border-red-500/50 rounded-xl p-4 transition-all">
                    <Swords className="w-8 h-8 text-red-400 mx-auto mb-2" />
                    <p className="text-white font-bold text-sm">Arena</p>
                  </button>
                </Link>
                <Link to={createPageUrl('CommandCenter')} onClick={() => setActiveModal(null)}>
                  <button className="w-full bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/50 rounded-xl p-4 transition-all">
                    <FileText className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
                    <p className="text-white font-bold text-sm">Comando</p>
                  </button>
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
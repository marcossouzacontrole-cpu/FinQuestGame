import { useState, useMemo } from 'react';
import { 
  Wallet, Zap, Shield, AlertTriangle, 
  Crosshair, Plus, Flame, Swords, Radar, FileText, 
  Settings, Trash2, Skull, Target, Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AreaChart, Area, XAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
  BarChart, Bar, Cell
} from 'recharts';
import { format, addDays } from 'date-fns';

// --- COMPONENTES UI INTERNOS ---

const NeonCard = ({ children, glowColor = 'cyan', className = '' }) => {
  const colors = {
    cyan: 'border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.15)] bg-slate-900/80',
    green: 'border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)] bg-slate-900/80',
    red: 'border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.15)] bg-slate-900/80',
    purple: 'border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.15)] bg-slate-900/80',
    gold: 'border-yellow-500/30 shadow-[0_0_20px_rgba(234,179,8,0.15)] bg-slate-900/80',
  };
  return (
    <div className={`rounded-2xl border backdrop-blur-xl p-6 relative overflow-hidden ${colors[glowColor] || colors.cyan} ${className}`}>
      {children}
    </div>
  );
};

// --- COMPONENTES DE LÓGICA (MÓDULOS) ---

const ManaPool = ({ totalMana, allocatedMana, onEquip, onManageAccounts }) => {
  const availableMana = totalMana - allocatedMana;
  const isCritical = availableMana < 0;
  const usagePercent = totalMana > 0 ? Math.min((allocatedMana / totalMana) * 100, 100) : 0;

  return (
    <div className="relative text-center py-8 group">
      <div className="absolute inset-0 bg-cyan-500/5 blur-3xl rounded-full pointer-events-none" />
      
      <motion.div 
        animate={{ scale: [1, 1.02, 1] }}
        transition={{ duration: 4, repeat: Infinity }}
        className="relative z-10"
      >
        <h2 className="text-cyan-400 text-xs font-bold tracking-[0.3em] uppercase mb-2">
          MANA DISPONÍVEL (Livre)
        </h2>
        <div className={`text-6xl md:text-7xl font-black ${isCritical ? 'text-red-500' : 'text-white'} drop-shadow-[0_0_25px_rgba(0,255,255,0.3)]`}>
          R$ {availableMana.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </div>
        
        <div className="mt-4 flex justify-center items-center gap-4 text-sm font-mono text-slate-400">
            <span>Total: R$ {totalMana.toLocaleString()}</span>
            <span className="text-slate-600">|</span>
            <span>Equipado: R$ {allocatedMana.toLocaleString()}</span>
        </div>

        {/* Barra de Alocação */}
        <div className="mt-6 max-w-md mx-auto h-2 bg-slate-800 rounded-full overflow-hidden">
            <motion.div 
                className={`h-full ${isCritical ? 'bg-red-500' : 'bg-cyan-400'}`}
                initial={{ width: 0 }}
                animate={{ width: `${usagePercent}%` }}
                transition={{ duration: 1 }}
            />
        </div>
      </motion.div>

      <div className="mt-8 flex justify-center gap-4">
        <button 
          onClick={onManageAccounts}
          className="flex items-center gap-2 px-6 py-3 bg-slate-800 border border-slate-600 text-slate-300 font-bold rounded-xl hover:bg-slate-700 hover:text-white transition-all"
        >
          <Settings className="w-4 h-4" />
          GERENCIAR CONTAS
        </button>
        <button 
          onClick={onEquip}
          className="flex items-center gap-2 px-8 py-3 bg-cyan-600/20 border border-cyan-500/50 text-cyan-400 font-bold rounded-xl hover:bg-cyan-500 hover:text-black transition-all shadow-[0_0_20px_rgba(6,182,212,0.2)]"
        >
          <Swords className="w-5 h-5" />
          DISTRIBUIR ORÇAMENTO
        </button>
      </div>
    </div>
  );
};

const BankIntelligence = ({ onImport }) => {
  return (
    <NeonCard glowColor="gold" className="h-full flex flex-col justify-center items-center text-center p-8 cursor-pointer hover:bg-yellow-900/10 transition-all group" >
        <div className="relative mb-4">
            <div className="absolute inset-0 bg-yellow-500/20 blur-xl rounded-full animate-pulse" />
            <FileText className="w-12 h-12 text-yellow-400 relative z-10" />
            <Search className="w-6 h-6 text-white absolute -bottom-2 -right-2 bg-slate-900 rounded-full p-1 border border-yellow-500" />
        </div>
        <h3 className="text-xl font-black text-white uppercase mb-2">
            Inteligência Bancária
        </h3>
        <p className="text-slate-400 text-sm mb-6 max-w-xs mx-auto">
            Importe seu extrato (PDF) para identificar vilões ocultos e padrões de ataque.
        </p>
        <button 
            onClick={onImport}
            className="px-6 py-2 bg-yellow-500/20 border border-yellow-500 text-yellow-400 font-bold rounded-lg hover:bg-yellow-500 hover:text-black transition-all flex items-center gap-2"
        >
            <Shield className="w-4 h-4" />
            ANALISAR EXTRATO
        </button>
    </NeonCard>
  );
}

const CreditCardOverheat = ({ cards }) => {
  return (
    <NeonCard glowColor="red" className="h-full flex flex-col">
      <div className="flex items-center gap-3 mb-6">
        <Flame className="w-6 h-6 text-orange-500 animate-pulse" />
        <h3 className="text-lg font-black text-white uppercase tracking-wider">
          Sobrecarga (Crédito)
        </h3>
      </div>

      <div className="space-y-6 flex-1">
        {cards.map(card => {
          const usagePercent = (card.currentInvoice / card.limit) * 100;
          const isCritical = usagePercent > 90;
          const isHigh = usagePercent > 70;
          
          return (
            <div key={card.id} className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-white font-bold">{card.name}</span>
                <span className={isCritical ? 'text-red-500 font-black' : isHigh ? 'text-orange-400' : 'text-green-400'}>
                  {usagePercent.toFixed(0)}% {isCritical && 'CRÍTICO'}
                </span>
              </div>
              
              <div className="h-5 bg-gray-900 rounded-sm overflow-hidden border border-gray-700 relative">
                <div className="absolute inset-0 flex justify-between px-1 z-10">
                    {[1,2,3,4,5,6,7,8,9].map(i => <div key={i} className="w-px h-full bg-black/40" />)}
                </div>
                <motion.div 
                  className={`h-full ${
                    isCritical 
                      ? 'bg-gradient-to-r from-red-600 to-red-500 animate-pulse' 
                      : 'bg-gradient-to-r from-green-600 via-yellow-500 to-orange-500'
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(usagePercent, 100)}%` }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                />
              </div>
              
              <div className="flex justify-between text-[10px] text-gray-500 font-mono uppercase tracking-widest">
                <span>Fatura: R$ {card.currentInvoice.toLocaleString()}</span>
                <span>Max: R$ {card.limit.toLocaleString()}</span>
              </div>
            </div>
          );
        })}
      </div>
    </NeonCard>
  );
};

// COMPONENTE RENOMEADO DE CashFlowRadar PARA TacticalRadar PARA CORRIGIR O ERRO
const TacticalRadar = ({ currentBalance, averageSpending, fixedExpenses, alerts }) => {
  const chartData = useMemo(() => {
    const data = [];
    let balance = currentBalance;
    const today = new Date();

    for (let i = 0; i < 30; i++) {
      const date = addDays(today, i);
      const dayNum = parseInt(format(date, 'd'));
      balance -= averageSpending;
      
      // Aplica despesas fixas se existirem
      if (fixedExpenses && fixedExpenses.length > 0) {
          // Lógica simplificada: distribui o custo fixo nos dias 5 e 20
          if (dayNum === 5) balance -= 1200; 
          if (dayNum === 10) balance -= 400; 
      } else {
          // Fallback mock se não houver dados
          if (dayNum === 5) balance -= 1200; 
          if (dayNum === 10) balance -= 400; 
      }
      
      if (dayNum === 5) balance += 3500; 

      data.push({
        day: format(date, 'dd/MM'),
        balance: Math.round(balance),
        critical: balance < 0
      });
    }
    return data;
  }, [currentBalance, averageSpending, fixedExpenses]);

  const minBalance = Math.min(...chartData.map(d => d.balance));
  const isDanger = minBalance < 0;

  return (
    <NeonCard glowColor={isDanger ? 'red' : 'purple'} className="h-full min-h-[350px] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Crosshair className={`w-6 h-6 ${isDanger ? 'text-red-500' : 'text-purple-400'} animate-[spin_10s_linear_infinite]`} />
          <div>
            <h3 className="text-lg font-black text-white uppercase tracking-wider">Radar Tático (30d)</h3>
            <p className="text-xs text-slate-400">Baseado na média diária de R$ {averageSpending.toFixed(0)}</p>
          </div>
        </div>
        {alerts.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/50 rounded text-red-400 text-xs font-bold animate-pulse">
            <AlertTriangle className="w-3 h-3" />
            {alerts.length} ALERTA(S)
          </div>
        )}
      </div>

      {alerts.length > 0 && (
        <div className="mb-4 space-y-2">
            {alerts.map((alert, idx) => (
                <div key={idx} className="text-xs bg-red-900/20 border-l-2 border-red-500 p-2 text-red-200">
                    <strong className="block">{alert.message}</strong>
                    <span className="opacity-70">{alert.action}</span>
                </div>
            ))}
        </div>
      )}

      <div className="flex-1 w-full min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={isDanger ? "#ef4444" : "#c084fc"} stopOpacity={0.5}/>
                <stop offset="95%" stopColor={isDanger ? "#ef4444" : "#c084fc"} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis dataKey="day" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} interval={4} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#0f172a', border: isDanger ? '1px solid #ef4444' : '1px solid #c084fc', borderRadius: '8px' }}
              itemStyle={{ color: '#fff' }}
              formatter={(value) => [`R$ ${value}`, 'Projeção']}
            />
            <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="3 3" />
            <Area 
              type="monotone" 
              dataKey="balance" 
              stroke={isDanger ? "#ef4444" : "#c084fc"} 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorBalance)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </NeonCard>
  );
};

// --- COMPONENTE PRINCIPAL (CONTROLLER) ---

export default function FinanceHub() {
  const [isEntryOpen, setIsEntryOpen] = useState(false);
  const [isAccountsOpen, setIsAccountsOpen] = useState(false);
  const [isPdfImportOpen, setIsPdfImportOpen] = useState(false);
  const [pdfProcessing, setPdfProcessing] = useState(false);
  const [villainReport, setVillainReport] = useState(null); // Resultado da análise de PDF

  // STATE DE CONTAS (Agora editável)
  const [accounts, setAccounts] = useState([
    { id: 1, name: 'Nubank Conta', type: 'checking', balance: 1250.00 },
    { id: 2, name: 'Cofre Reserva', type: 'savings', balance: 5000.00 },
    { id: 3, name: 'Carteira', type: 'cash', balance: 150.00 }
  ]);

  const creditCards = [
    { id: 'card1', name: 'Nubank Roxinho', currentInvoice: 1850.00, limit: 2000.00 },
    { id: 'card2', name: 'Inter Black', currentInvoice: 450.00, limit: 10000.00 }
  ];

  // Adicionado is_fixed para evitar erros no filtro
  const envelopes = [
    { id: 'env1', name: 'Moradia', allocated_amount: 2000, is_fixed: true },
    { id: 'env2', name: 'Mercado', allocated_amount: 1200, is_fixed: false },
    { id: 'env3', name: 'Lazer', allocated_amount: 500, is_fixed: false },
  ];

  // LÓGICA DE NEGÓCIO
  const totalMana = accounts
    .filter(acc => acc.type !== 'savings')
    .reduce((sum, acc) => sum + acc.balance, 0);

  const allocatedMana = envelopes.reduce((sum, env) => sum + env.allocated_amount, 0);
  const averageDailySpending = 85; // Mock

  const alerts = [];
  if (totalMana - allocatedMana < 0) {
    alerts.push({ message: 'MANA NEGATIVA', action: 'Você alocou mais dinheiro do que possui.' });
  }

  // --- FUNÇÕES DE GESTÃO DE CONTAS ---
  const handleUpdateAccount = (id, field, value) => {
    setAccounts(prev => prev.map(acc => 
        acc.id === id ? { ...acc, [field]: field === 'balance' ? Number(value) : value } : acc
    ));
  };

  const handleAddAccount = () => {
    const newId = Math.max(...accounts.map(a => a.id)) + 1;
    setAccounts([...accounts, { id: newId, name: 'Nova Conta', type: 'checking', balance: 0 }]);
  };

  const handleDeleteAccount = (id) => {
    if (window.confirm('Tem certeza que deseja deletar esta conta?')) {
        setAccounts(prev => prev.filter(acc => acc.id !== id));
    }
  };

  // --- SIMULAÇÃO DE IMPORTAÇÃO DE PDF (INTELIGÊNCIA) ---
  const handlePdfUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setPdfProcessing(true);
    // Simula tempo de processamento de IA
    setTimeout(() => {
        setPdfProcessing(false);
        // Resultado Mockado da Análise
        setVillainReport({
            totalSpent: 3450.00,
            villains: [
                { name: 'iFood & Delivery', damage: 850.00, type: 'boss' },
                { name: 'Uber', damage: 420.00, type: 'minion' },
                { name: 'Assinaturas', damage: 150.00, type: 'minion' }
            ],
            insight: "Detetamos um padrão de ataque recorrente em Delivery nos fins de semana. Sugerimos equipar a habilidade 'Cozinhar em Casa' para recuperar 20% de Mana."
        });
    }, 3000);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-32">
      
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center pt-4"
      >
        <div className="flex items-center justify-center gap-3 mb-2">
            <Radar className="w-6 h-6 text-yellow-400 animate-[spin_8s_linear_infinite]" />
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tighter">
              NÚCLEO <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">ESTRATÉGICO</span>
            </h1>
        </div>
        <p className="text-slate-400 text-sm uppercase tracking-widest">Dashboard de Controle Financeiro v2.0</p>
      </motion.div>

      {/* Módulo 1: Mana Pool (Agora com Botão de Gerir Contas) */}
      <ManaPool 
        totalMana={totalMana} 
        allocatedMana={allocatedMana} 
        onEquip={() => alert("Abrir Modal de Envelopes")}
        onManageAccounts={() => setIsAccountsOpen(true)}
      />

      {/* Grid Tático */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Módulo 2: Overheat */}
        <div className="lg:col-span-1">
            <CreditCardOverheat cards={creditCards} />
        </div>
        
        {/* Módulo 3: Radar */}
        <div className="lg:col-span-1">
            <TacticalRadar 
                currentBalance={totalMana} 
                averageSpending={averageDailySpending}
                fixedExpenses={envelopes.filter(e => e.is_fixed)} 
                alerts={alerts}
            />
        </div>

        {/* Novo Módulo: Inteligência Bancária */}
        <div className="lg:col-span-1">
            <BankIntelligence onImport={() => setIsPdfImportOpen(true)} />
        </div>
      </div>

      {/* FAB Centralizado */}
      <motion.button
        whileHover={{ scale: 1.1, rotate: 90 }}
        whileTap={{ scale: 0.9 }}
        className="fixed bottom-8 left-1/2 -translate-x-1/2 w-16 h-16 bg-gradient-to-t from-cyan-600 to-blue-500 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(6,182,212,0.5)] z-50 border-2 border-white/20 group"
        onClick={() => setIsEntryOpen(true)}
      >
        <Plus className="w-8 h-8 text-white group-hover:text-white transition-colors" />
      </motion.button>

      {/* --- MODAL: GESTÃO DE CONTAS (INVENTORY) --- */}
      <AnimatePresence>
        {isAccountsOpen && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
                <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-slate-900 border border-cyan-500/30 p-6 rounded-2xl max-w-2xl w-full shadow-[0_0_50px_rgba(6,182,212,0.2)]"
                >
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-black text-white flex items-center gap-2">
                            <Wallet className="text-cyan-400" /> GESTÃO DE INVENTÁRIO (CONTAS)
                        </h3>
                        <button onClick={() => setIsAccountsOpen(false)} className="text-slate-500 hover:text-white">X</button>
                    </div>

                    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                        {accounts.map(acc => (
                            <div key={acc.id} className="flex items-center gap-4 bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                                <div className="p-3 bg-slate-900 rounded-lg">
                                    {acc.type === 'checking' ? <Wallet className="text-cyan-400" /> : 
                                     acc.type === 'savings' ? <Shield className="text-purple-400" /> : 
                                     <Zap className="text-yellow-400" />}
                                </div>
                                <div className="flex-1">
                                    <input 
                                        type="text" 
                                        value={acc.name}
                                        onChange={(e) => handleUpdateAccount(acc.id, 'name', e.target.value)}
                                        className="bg-transparent text-white font-bold w-full outline-none focus:border-b border-cyan-500 mb-1"
                                    />
                                    <select 
                                        value={acc.type}
                                        onChange={(e) => handleUpdateAccount(acc.id, 'type', e.target.value)}
                                        className="bg-transparent text-xs text-slate-400 uppercase outline-none"
                                    >
                                        <option value="checking">Conta Corrente</option>
                                        <option value="savings">Reserva/Investimento</option>
                                        <option value="cash">Dinheiro Físico</option>
                                    </select>
                                </div>
                                <div className="w-32">
                                    <label className="text-[10px] text-slate-500 uppercase font-bold">Saldo Atual</label>
                                    <input 
                                        type="number" 
                                        value={acc.balance}
                                        onChange={(e) => handleUpdateAccount(acc.id, 'balance', e.target.value)}
                                        className="bg-slate-900 text-white p-2 rounded border border-slate-600 w-full text-right font-mono"
                                    />
                                </div>
                                <button onClick={() => handleDeleteAccount(acc.id)} className="text-red-500 hover:bg-red-900/20 p-2 rounded">
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        ))}
                        
                        <button onClick={handleAddAccount} className="w-full py-3 border-2 border-dashed border-slate-700 text-slate-400 rounded-xl hover:border-cyan-500 hover:text-cyan-500 transition-all flex justify-center gap-2 font-bold uppercase text-sm">
                            <Plus className="w-5 h-5" /> Adicionar Novo Slot
                        </button>
                    </div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>

      {/* --- MODAL: IMPORTAÇÃO DE PDF (BANK INTEL) --- */}
      <AnimatePresence>
        {isPdfImportOpen && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/95 backdrop-blur-md p-4">
                <motion.div 
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 50, opacity: 0 }}
                    className="bg-slate-900 border border-yellow-500/30 p-8 rounded-2xl max-w-3xl w-full shadow-[0_0_100px_rgba(234,179,8,0.1)] relative overflow-hidden"
                >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-500 to-transparent" />
                    <button onClick={() => {setIsPdfImportOpen(false); setVillainReport(null);}} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X className="w-6 h-6"/></button>

                    {!villainReport ? (
                        <div className="text-center py-12">
                            <FileText className="w-20 h-20 text-yellow-500 mx-auto mb-6 animate-pulse" />
                            <h2 className="text-3xl font-black text-white mb-4">ANÁLISE TÁTICA DE EXTRATO</h2>
                            <p className="text-slate-400 max-w-md mx-auto mb-8">
                                Carregue seu extrato bancário (PDF) para que nosso sistema de inteligência identifique os maiores inimigos do seu patrimônio.
                            </p>
                            
                            {pdfProcessing ? (
                                <div className="flex flex-col items-center gap-4">
                                    <div className="w-64 h-2 bg-slate-800 rounded-full overflow-hidden">
                                        <motion.div 
                                            className="h-full bg-yellow-500"
                                            animate={{ width: ["0%", "100%"] }}
                                            transition={{ duration: 2, repeat: Infinity }}
                                        />
                                    </div>
                                    <p className="text-yellow-400 font-mono text-sm animate-pulse">DECODIFICANDO MATRIX BANCÁRIA...</p>
                                </div>
                            ) : (
                                <label className="cursor-pointer inline-flex items-center gap-3 px-8 py-4 bg-yellow-500 hover:bg-yellow-400 text-black font-black rounded-xl shadow-[0_0_30px_rgba(234,179,8,0.4)] transition-all transform hover:scale-105">
                                    <Upload className="w-6 h-6" />
                                    SELECIONAR ARQUIVO PDF
                                    <input type="file" accept=".pdf" className="hidden" onChange={handlePdfUpload} />
                                </label>
                            )}
                        </div>
                    ) : (
                        <div className="animate-in fade-in slide-in-from-bottom-8 duration-500">
                            <div className="flex items-center gap-4 mb-8 border-b border-slate-800 pb-6">
                                <div className="bg-red-500/20 p-3 rounded-full">
                                    <Skull className="w-8 h-8 text-red-500" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-white">RELATÓRIO DE VILÕES</h2>
                                    <p className="text-slate-400 text-sm">Dano Total Identificado: <span className="text-red-400 font-bold">R$ {villainReport.totalSpent.toFixed(2)}</span></p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Lista de Vilões */}
                                <div className="space-y-4">
                                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Inimigos Detectados</h3>
                                    {villainReport.villains.map((v, i) => (
                                        <div key={i} className="flex items-center justify-between bg-slate-800 p-4 rounded-xl border border-slate-700 hover:border-red-500/50 transition-colors">
                                            <div className="flex items-center gap-3">
                                                {v.type === 'boss' ? <Target className="text-red-500 w-5 h-5" /> : <AlertTriangle className="text-orange-400 w-4 h-4" />}
                                                <span className="text-white font-bold">{v.name}</span>
                                            </div>
                                            <span className="text-red-400 font-mono font-bold">- R$ {v.damage.toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Gráfico de Dano */}
                                <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 flex flex-col justify-center">
                                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Distribuição de Dano</h3>
                                    <div className="h-40 w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={villainReport.villains}>
                                                <XAxis dataKey="name" hide />
                                                <Tooltip 
                                                    cursor={{fill: 'transparent'}}
                                                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ef4444' }}
                                                />
                                                <Bar dataKey="damage" fill="#ef4444" radius={[4, 4, 0, 0]}>
                                                    {villainReport.villains.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.type === 'boss' ? '#ef4444' : '#f97316'} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="mt-4 bg-yellow-900/20 p-3 rounded border border-yellow-500/20">
                                        <p className="text-yellow-200 text-xs italic">
                                            "{villainReport.insight}"
                                        </p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="mt-8 flex justify-end">
                                <button 
                                    onClick={() => {setVillainReport(null); setIsPdfImportOpen(false);}}
                                    className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold"
                                >
                                    Arquivar Relatório
                                </button>
                            </div>
                        </div>
                    )}
                </motion.div>
            </div>
        )}
      </AnimatePresence>

      {/* ... Modal de Lançamento Rápido existente ... */}
      <AnimatePresence>
        {isEntryOpen && (
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/90 backdrop-blur-sm p-4"
                onClick={() => setIsEntryOpen(false)}
            >
                <motion.div 
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    className="bg-slate-900 border border-cyan-500/30 p-6 rounded-2xl max-w-md w-full shadow-[0_0_50px_rgba(6,182,212,0.2)] relative" 
                    onClick={e => e.stopPropagation()}
                >
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-yellow-500 text-black font-bold px-4 py-1 rounded-full text-xs uppercase tracking-widest shadow-lg">
                        Combo Breaker
                    </div>
                    
                    <div className="space-y-6 mt-2">
                        <div>
                            <label className="text-xs uppercase text-slate-500 font-bold mb-1 block">Valor do Impacto</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-xl">R$</span>
                                <input 
                                    type="number" 
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl py-4 pl-12 pr-4 text-3xl text-white font-mono focus:border-cyan-500 outline-none transition-colors" 
                                    placeholder="0.00" 
                                    autoFocus 
                                />
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <button className="group py-4 bg-red-500/10 border border-red-500/30 rounded-xl hover:bg-red-500 hover:border-red-500 transition-all">
                                <p className="text-red-500 font-black text-lg group-hover:text-white">DANO</p>
                                <p className="text-red-400/60 text-xs uppercase group-hover:text-white/80">Despesa</p>
                            </button>
                            <button className="group py-4 bg-green-500/10 border border-green-500/30 rounded-xl hover:bg-green-500 hover:border-green-500 transition-all">
                                <p className="text-green-500 font-black text-lg group-hover:text-white">LOOT</p>
                                <p className="text-green-400/60 text-xs uppercase group-hover:text-white/80">Receita</p>
                            </button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
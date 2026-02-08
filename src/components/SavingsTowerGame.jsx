import { useState } from 'react';
import { TrendingUp, Award, Coins, Brain, X } from 'lucide-react';
import NeonCard from './NeonCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const FLOOR_VALUE = 100;
const MAX_FLOORS = 20;

const QUIZ_QUESTIONS = [
  {
    question: 'Qual é a regra de ouro do orçamento 50/30/20?',
    options: ['50% necessidades, 30% desejos, 20% poupança', '50% desejos, 30% necessidades, 20% poupança', '50% poupança, 30% necessidades, 20% desejos'],
    correct: 0
  },
  {
    question: 'O que é juros compostos?',
    options: ['Juros que não crescem', 'Juros sobre juros', 'Juros fixos'],
    correct: 1
  },
  {
    question: 'Qual investimento é mais seguro?',
    options: ['Ações', 'Tesouro Direto', 'Criptomoedas'],
    correct: 1
  },
  {
    question: 'Quanto deve ser seu fundo de emergência?',
    options: ['1 mês de gastos', '3-6 meses de gastos', '1 ano de gastos'],
    correct: 1
  },
  {
    question: 'O que fazer primeiro ao receber dinheiro?',
    options: ['Gastar em algo que você quer', 'Pagar a si mesmo (poupar)', 'Investir em risco alto'],
    correct: 1
  },
  {
    question: 'O que é inflação?',
    options: ['Aumento de preços', 'Redução de preços', 'Valor fixo'],
    correct: 0
  },
  {
    question: 'Qual é a melhor estratégia para dívidas?',
    options: ['Ignorar e esperar', 'Pagar a de maior juros primeiro', 'Pagar tudo de uma vez'],
    correct: 1
  },
  {
    question: 'Diversificação significa?',
    options: ['Investir tudo em uma coisa', 'Espalhar investimentos', 'Não investir'],
    correct: 1
  }
];

const FLOOR_REWARDS = {
  5: { xp: 50, gold: 10, badge: '🥉', name: 'Escalador Bronze' },
  10: { xp: 100, gold: 25, badge: '🥈', name: 'Escalador Prata' },
  15: { xp: 200, gold: 50, badge: '🥇', name: 'Escalador Ouro' },
  20: { xp: 500, gold: 100, badge: '💎', name: 'Mestre da Torre' }
};

export default function SavingsTowerGame({ onComplete }) {
  const [currentFloor, setCurrentFloor] = useState(0);
  const [totalSavings, setTotalSavings] = useState(0);
  const [showChallenge, setShowChallenge] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [earnedBadges, setEarnedBadges] = useState([]);

  const handleDeposit = () => {
    const amount = parseFloat(depositAmount);
    if (!amount || amount <= 0) {
      toast.error('Digite um valor válido');
      return;
    }

    if (amount < FLOOR_VALUE) {
      toast.warning(`Você precisa de pelo menos R$ ${FLOOR_VALUE} para subir um andar`);
      return;
    }

    const floorsToClimb = Math.floor(amount / FLOOR_VALUE);
    const newFloor = Math.min(currentFloor + floorsToClimb, MAX_FLOORS);
    const actualAmount = floorsToClimb * FLOOR_VALUE;

    setTotalSavings(totalSavings + actualAmount);
    
    if (newFloor % 3 === 0 && newFloor > currentFloor) {
      setCurrentFloor(newFloor);
      setShowChallenge(true);
      setCurrentQuestion(QUIZ_QUESTIONS[Math.floor(Math.random() * QUIZ_QUESTIONS.length)]);
      toast.info('⚡ Mini desafio desbloqueado!');
    } else {
      setCurrentFloor(newFloor);
      toast.success(`🎉 Você subiu ${floorsToClimb} andar(es)!`, {
        description: `Andar atual: ${newFloor}`
      });
      checkRewards(newFloor);
    }

    setDepositAmount('');
  };

  const handleWithdraw = () => {
    const amount = parseFloat(depositAmount);
    if (!amount || amount <= 0) {
      toast.error('Digite um valor válido');
      return;
    }

    if (amount > totalSavings) {
      toast.error('Você não tem esse valor guardado');
      return;
    }

    const floorsToFall = Math.floor(amount / FLOOR_VALUE);
    const newFloor = Math.max(currentFloor - floorsToFall, 0);
    const actualAmount = floorsToFall * FLOOR_VALUE;

    setTotalSavings(totalSavings - actualAmount);
    setCurrentFloor(newFloor);
    
    toast.warning(`⚠️ Você caiu ${floorsToFall} andar(es)`, {
      description: `Andar atual: ${newFloor}`
    });

    setDepositAmount('');
  };

  const handleAnswerQuestion = (selectedIndex) => {
    if (selectedIndex === currentQuestion.correct) {
      toast.success('✅ Resposta correta! +20 XP');
      if (onComplete) {
        onComplete({ xpReward: 20, goldReward: 5 });
      }
    } else {
      toast.error('❌ Resposta errada! Você caiu 1 andar');
      setCurrentFloor(Math.max(currentFloor - 1, 0));
    }
    setShowChallenge(false);
    setCurrentQuestion(null);
    checkRewards(currentFloor);
  };

  const checkRewards = (floor) => {
    if (FLOOR_REWARDS[floor] && !earnedBadges.includes(floor)) {
      const reward = FLOOR_REWARDS[floor];
      setEarnedBadges([...earnedBadges, floor]);
      toast.success(`${reward.badge} ${reward.name} desbloqueado!`, {
        description: `+${reward.xp} XP e +${reward.gold} Gold Coins`
      });
      if (onComplete) {
        onComplete({ xpReward: reward.xp, goldReward: reward.gold, badge: reward.name });
      }
    }
  };

  const progress = (currentFloor / MAX_FLOORS) * 100;

  return (
    <NeonCard glowColor="cyan">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-white font-bold text-xl">Torre da Poupança</h3>
              <p className="text-gray-400 text-sm">Suba andares economizando dinheiro</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-cyan-400 text-sm font-semibold">Andar</p>
            <p className="text-white font-black text-3xl">{currentFloor}/{MAX_FLOORS}</p>
          </div>
        </div>

        <div className="relative bg-gradient-to-b from-[#0a0a1a] to-[#1a1a2e] rounded-lg p-6 border border-cyan-500/30 min-h-[300px]">
          <div className="absolute left-6 top-6 bottom-6 w-2 bg-gray-800 rounded-full overflow-hidden">
            <div 
              className="absolute bottom-0 w-full bg-gradient-to-t from-cyan-500 via-blue-500 to-cyan-400 transition-all duration-500"
              style={{ height: `${progress}%` }}
            />
          </div>

          <div className="ml-12 space-y-2">
            {Array.from({ length: MAX_FLOORS }, (_, i) => MAX_FLOORS - i).map(floor => (
              <div
                key={floor}
                className={`
                  flex items-center gap-3 p-2 rounded-lg transition-all duration-300
                  ${floor <= currentFloor 
                    ? 'bg-cyan-500/20 border border-cyan-500/50' 
                    : 'bg-gray-800/30 border border-gray-700'
                  }
                  ${floor === currentFloor ? 'shadow-[0_0_15px_rgba(0,255,255,0.5)] scale-105' : ''}
                `}
              >
                <span className={`font-bold ${floor <= currentFloor ? 'text-cyan-400' : 'text-gray-600'}`}>
                  {floor}º
                </span>
                <div className="flex-1 flex items-center justify-between">
                  <span className={`text-sm ${floor <= currentFloor ? 'text-white' : 'text-gray-600'}`}>
                    R$ {floor * FLOOR_VALUE}
                  </span>
                  {FLOOR_REWARDS[floor] && (
                    <span className="text-lg">{FLOOR_REWARDS[floor].badge}</span>
                  )}
                  {floor === currentFloor && (
                    <span className="text-xl animate-bounce">🧗</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-center">
            <Coins className="w-5 h-5 text-green-400 mx-auto mb-1" />
            <p className="text-green-400 font-bold text-lg">R$ {totalSavings.toFixed(2)}</p>
            <p className="text-gray-400 text-xs">Total Guardado</p>
          </div>
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3 text-center">
            <Award className="w-5 h-5 text-purple-400 mx-auto mb-1" />
            <p className="text-purple-400 font-bold text-lg">{earnedBadges.length}</p>
            <p className="text-gray-400 text-xs">Badges</p>
          </div>
        </div>

        {showChallenge && currentQuestion ? (
          <div className="bg-purple-500/20 border border-purple-500/50 rounded-lg p-4 space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="w-5 h-5 text-purple-400" />
              <h4 className="text-white font-bold">Desafio do Andar {currentFloor}</h4>
            </div>
            <p className="text-white text-sm">{currentQuestion.question}</p>
            <div className="space-y-2">
              {currentQuestion.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswerQuestion(index)}
                  className="w-full p-3 rounded-lg bg-[#0a0a1a] border border-cyan-500/30 hover:bg-cyan-500/10 hover:border-cyan-500/50 transition-all text-white text-left"
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <Input
                type="number"
                placeholder="Valor (R$)"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="bg-[#0a0a1a] border-cyan-500/30 text-white"
              />
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={handleDeposit}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Depositar
                </Button>
                <Button
                  onClick={handleWithdraw}
                  variant="outline"
                  className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                >
                  <X className="w-4 h-4 mr-2" />
                  Sacar
                </Button>
              </div>
            </div>

            {earnedBadges.length > 0 && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                <p className="text-yellow-400 font-semibold text-sm mb-2 flex items-center gap-2">
                  <Award className="w-4 h-4" />
                  Badges Desbloqueados
                </p>
                <div className="flex flex-wrap gap-2">
                  {earnedBadges.map(floor => (
                    <div key={floor} className="bg-[#0a0a1a] rounded-lg px-3 py-1 border border-yellow-500/30">
                      <span className="text-xl mr-1">{FLOOR_REWARDS[floor].badge}</span>
                      <span className="text-white text-xs">{FLOOR_REWARDS[floor].name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
          <p className="text-purple-400 text-xs">
            <strong>Como jogar:</strong> Cada andar = R$ 100. Deposite para subir e responda desafios a cada 3 andares. Se sacar dinheiro, você desce andares. Colete badges especiais nos andares 5, 10, 15 e 20!
          </p>
        </div>
      </div>
    </NeonCard>
  );
}
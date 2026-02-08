import { useState } from 'react';
import { TrendingUp, Calendar, Sparkles } from 'lucide-react';
import NeonCard from './NeonCard';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';

export default function RetirementCalculator() {
  const [currentAge, setCurrentAge] = useState(25);
  const [retirementAge, setRetirementAge] = useState(65);
  const [monthlyContribution, setMonthlyContribution] = useState(500);
  const [currentSavings, setCurrentSavings] = useState(0);
  const [expectedReturn, setExpectedReturn] = useState(8);

  // Calculate retirement projections
  const yearsUntilRetirement = retirementAge - currentAge;
  const monthsUntilRetirement = yearsUntilRetirement * 12;
  const monthlyRate = expectedReturn / 100 / 12;

  const futureValue = currentSavings * Math.pow(1 + monthlyRate, monthsUntilRetirement) +
    monthlyContribution * ((Math.pow(1 + monthlyRate, monthsUntilRetirement) - 1) / monthlyRate);
  
  return (
    <NeonCard glowColor="purple">
      <div className="space-y-4 sm:space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
            <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div>
            <h3 className="text-white font-bold text-lg sm:text-xl">Calculadora de Aposentadoria</h3>
            <p className="text-gray-400 text-xs sm:text-sm">Veja seu futuro financeiro</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
          {/* Input Section */}
          <div className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="text-gray-400 text-xs sm:text-sm mb-1.5 sm:mb-2 block">Idade Atual</label>
                <Input
                  type="number"
                  value={currentAge}
                  onChange={(e) => setCurrentAge(parseInt(e.target.value) || 18)}
                  className="bg-[#0a0a1a] border-cyan-500/30 text-white h-9 sm:h-10"
                />
              </div>

              <div>
                <label className="text-gray-400 text-xs sm:text-sm mb-1.5 sm:mb-2 block">Poupança Atual (R$)</label>
                <Input
                  type="number"
                  value={currentSavings}
                  onChange={(e) => setCurrentSavings(parseFloat(e.target.value) || 0)}
                  className="bg-[#0a0a1a] border-cyan-500/30 text-white h-9 sm:h-10"
                />
              </div>
            </div>

            <div>
              <label className="text-gray-400 text-xs sm:text-sm mb-1.5 sm:mb-2 block">Economia Mensal (R$)</label>
              <Input
                type="number"
                value={monthlyContribution}
                onChange={(e) => setMonthlyContribution(parseFloat(e.target.value) || 0)}
                className="bg-[#0a0a1a] border-cyan-500/30 text-white h-9 sm:h-10"
              />
            </div>

            <div>
              <label className="text-gray-400 text-xs sm:text-sm mb-1.5 sm:mb-2 block flex items-center justify-between">
                <span>Idade de Aposentadoria</span>
                <span className="text-purple-400 font-bold text-sm sm:text-base">{retirementAge} anos</span>
              </label>
              <Slider
                value={[retirementAge]}
                onValueChange={([value]) => setRetirementAge(value)}
                min={currentAge + 10}
                max={80}
                step={1}
                className="py-3 sm:py-4"
              />
            </div>

            <div>
              <label className="text-gray-400 text-xs sm:text-sm mb-1.5 sm:mb-2 block flex items-center justify-between">
                <span>Retorno Anual Esperado</span>
                <span className="text-cyan-400 font-bold text-sm sm:text-base">{expectedReturn}%</span>
              </label>
              <Slider
                value={[expectedReturn]}
                onValueChange={([value]) => setExpectedReturn(value)}
                min={3}
                max={15}
                step={0.5}
                className="py-3 sm:py-4"
              />
            </div>
          </div>

          {/* Results Section */}
          <div className="space-y-3 sm:space-y-4">
            {/* Main Result Card */}
            <div className="bg-gradient-to-br from-green-500/20 to-cyan-500/20 rounded-xl p-4 sm:p-6 border border-green-500/30">
              <div className="flex items-center gap-2 mb-3 sm:mb-4">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
                <span className="text-green-400 font-bold text-sm sm:text-base">Projeção de Aposentadoria</span>
              </div>
              
              <div className="space-y-3 sm:space-y-4">
                <div className="text-center sm:text-left">
                  <p className="text-gray-400 text-xs sm:text-sm mb-1">Valor Acumulado</p>
                  <p className="text-white font-black text-2xl sm:text-3xl lg:text-4xl break-all">
                    R$ {futureValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:gap-3 pt-3 border-t border-gray-700">
                  <div>
                    <p className="text-gray-500 text-xs">Anos restantes</p>
                    <p className="text-cyan-400 font-bold text-sm sm:text-base">{yearsUntilRetirement} anos</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Total investido</p>
                    <p className="text-purple-400 font-bold text-sm sm:text-base break-all">
                      R$ {((monthlyContribution * monthsUntilRetirement) + currentSavings).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-700">
                  <p className="text-gray-500 text-xs mb-1">Renda Mensal Estimada (4% a.a.)</p>
                  <p className="text-yellow-400 font-bold text-lg sm:text-xl break-all">
                    R$ {(futureValue * 0.04 / 12).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / mês
                  </p>
                </div>
              </div>
            </div>

            {futureValue > 1000000 && (
              <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-3 flex items-start sm:items-center gap-2">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 flex-shrink-0 mt-0.5 sm:mt-0" />
                <p className="text-yellow-400 text-xs sm:text-sm font-semibold">
                  Parabéns! Você alcançará o status de MILLIONAIRE! 🎉
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </NeonCard>
  );
}
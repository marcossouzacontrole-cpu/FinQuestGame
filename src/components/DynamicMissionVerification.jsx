import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, CheckCircle2, X, Upload, Loader2, Shield, DollarSign, TrendingUp, FileText, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function DynamicMissionVerification({ mission, onComplete, onClose }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [verificationSteps, setVerificationSteps] = useState([]);
  const [stepData, setStepData] = useState({});
  const [isValidating, setIsValidating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Analyze mission and generate dynamic steps on mount
  useEffect(() => {
    analyzeMissionAndGenerateSteps();
  }, []);

  const analyzeMissionAndGenerateSteps = async () => {
    setIsAnalyzing(true);
    try {
      const { base44 } = await import('@/api/base44Client');
      
      const analysisPrompt = `
Você é um sistema de análise de missões financeiras. Analise esta missão e determine quais etapas de verificação são necessárias.

MISSÃO:
Título: ${mission.title}
Descrição: ${mission.description}
Tipo: ${mission.type}
Dificuldade: ${mission.difficulty}

TIPOS DE VERIFICAÇÃO DISPONÍVEIS:
1. "amount_input" - Exigir que o usuário informe um valor específico (ex: quanto economizou, investiu, reduziu gastos)
2. "data_input" - Exigir dados específicos como categorias, porcentagens, metas
3. "document_upload" - Exigir upload de documentos (extratos, comprovantes, fotos de planilhas)
4. "before_after" - Exigir comparação antes/depois (para missões de redução de gastos)
5. "quiz" - Gerar 2-3 perguntas contextuais que apenas quem fez a missão saberia responder
6. "reflection" - Descrição detalhada do que foi feito

Determine quais etapas são necessárias baseado no objetivo da missão. Sempre inclua "reflection" por último.

EXEMPLO PARA "Economize R$ 500 este mês":
- amount_input: "Quanto você economizou?"
- document_upload: "Envie comprovante (extrato ou screenshot)"
- reflection: "Descreva como você conseguiu economizar"

EXEMPLO PARA "Organize seu orçamento por categorias":
- data_input: "Liste as categorias que você criou"
- document_upload: "Envie foto da sua planilha/app"
- quiz: Perguntas sobre as categorias
- reflection: "Descreva o processo"

Retorne as etapas necessárias para validar esta missão específica.
`;

      const analysis = await base44.integrations.Core.InvokeLLM({
        prompt: analysisPrompt,
        response_json_schema: {
          type: "object",
          properties: {
            steps: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { 
                    type: "string",
                    enum: ["amount_input", "data_input", "document_upload", "before_after", "quiz", "reflection"]
                  },
                  title: { type: "string" },
                  description: { type: "string" },
                  placeholder: { type: "string" },
                  questions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        question: { type: "string" },
                        correct_pattern: { type: "string" }
                      }
                    }
                  },
                  validation_criteria: { type: "string" }
                }
              }
            }
          }
        }
      });

      setVerificationSteps(analysis.steps || []);
      setIsAnalyzing(false);
    } catch (error) {
      toast.error('Erro ao analisar missão');
      setIsAnalyzing(false);
    }
  };

  const handleFileUpload = async (e, stepIndex) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 10MB');
      return;
    }

    try {
      const { base44 } = await import('@/api/base44Client');
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      setStepData({
        ...stepData,
        [stepIndex]: { ...stepData[stepIndex], file_url }
      });
      toast.success('Arquivo enviado!');
    } catch (error) {
      toast.error('Erro ao enviar arquivo');
    }
  };

  const validateCurrentStep = () => {
    const step = verificationSteps[currentStep];
    const data = stepData[currentStep];

    if (!data) return false;

    switch (step.type) {
      case 'amount_input':
        return data.value && parseFloat(data.value) > 0;
      case 'data_input':
        return data.value && data.value.trim().length >= 10;
      case 'document_upload':
        return data.file_url;
      case 'quiz':
        return data.answers && data.answers.filter(a => a).length === step.questions.length;
      case 'reflection':
        return data.value && data.value.trim().split(/\s+/).length >= 15;
      default:
        return false;
    }
  };

  const handleNext = async () => {
    if (!validateCurrentStep()) {
      toast.error('Complete esta etapa antes de continuar');
      return;
    }

    if (currentStep < verificationSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      await handleFinalValidation();
    }
  };

  const handleFinalValidation = async () => {
    setIsValidating(true);

    try {
      const { base44 } = await import('@/api/base44Client');
      
      // Compile all collected data
      const compiledData = verificationSteps.map((step, idx) => ({
        step_type: step.type,
        step_title: step.title,
        user_response: stepData[idx]
      }));

      const validationPrompt = `
Você é um validador EXTREMAMENTE RIGOROSO de conclusão de missões financeiras.

MISSÃO:
Título: ${mission.title}
Descrição: ${mission.description}

DADOS COLETADOS DO USUÁRIO:
${JSON.stringify(compiledData, null, 2)}

Analise TODOS os dados fornecidos e determine:
1. Os dados fazem sentido em relação à missão?
2. Há evidências concretas de que a missão foi completada?
3. As respostas são específicas e não genéricas?
4. Os valores/documentos são plausíveis?

IMPORTANTE:
- Se houver quiz, as respostas fazem sentido contextualmente?
- Se houver valores, são realistas?
- Se houver reflexão, tem detalhes ESPECÍFICOS da execução?
- Rejeite se detectar inconsistências ou respostas genéricas

Seja EXTREMAMENTE RIGOROSO. Fraude = confidence_score < 0.75
`;

      const validation = await base44.integrations.Core.InvokeLLM({
        prompt: validationPrompt,
        response_json_schema: {
          type: "object",
          properties: {
            is_valid: { type: "boolean" },
            confidence_score: { type: "number" },
            reason: { type: "string" },
            red_flags: { 
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      if (!validation.is_valid || validation.confidence_score < 0.75) {
        setIsValidating(false);
        toast.error('Validação falhou', {
          description: validation.reason || 'Os dados fornecidos não comprovam a conclusão da missão.'
        });
        return;
      }

      // Success!
      setShowSuccess(true);
      setIsValidating(false);

      setTimeout(() => {
        onComplete(mission, {
          verification_data: compiledData,
          validation_score: validation.confidence_score,
          verified_at: new Date().toISOString()
        });
      }, 2000);

    } catch (error) {
      setIsValidating(false);
      toast.error('Erro na validação');
    }
  };

  const renderStep = () => {
    if (isAnalyzing) {
      return (
        <div className="text-center py-12">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="inline-block"
          >
            <Brain className="w-16 h-16 text-cyan-400 mx-auto mb-4" />
          </motion.div>
          <p className="text-white font-bold text-lg">Analisando missão...</p>
          <p className="text-gray-400 text-sm">Gerando etapas de verificação personalizadas</p>
        </div>
      );
    }

    if (showSuccess) {
      return (
        <div className="text-center py-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.6 }}
          >
            <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-[0_0_50px_rgba(57,255,20,0.6)] mb-4">
              <CheckCircle2 className="w-16 h-16 text-white" />
            </div>
          </motion.div>
          <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400 mb-2">
            VERIFICAÇÃO COMPLETA!
          </h2>
          <p className="text-gray-400">Missão validada com sucesso</p>
        </div>
      );
    }

    const step = verificationSteps[currentStep];
    const data = stepData[currentStep] || {};

    const stepIcons = {
      amount_input: DollarSign,
      data_input: FileText,
      document_upload: Upload,
      quiz: Brain,
      reflection: FileText,
      before_after: TrendingUp
    };

    const Icon = stepIcons[step.type] || FileText;

    return (
      <div className="space-y-4">
        {/* Step Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 mb-3">
            <Icon className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-bold text-white mb-1">{step.title}</h3>
          <p className="text-gray-400 text-sm">{step.description}</p>
        </div>

        {/* Step Content */}
        <div className="bg-[#0a0a1a] rounded-xl p-4 border border-cyan-500/30">
          {step.type === 'amount_input' && (
            <div>
              <label className="text-white font-semibold mb-2 block">Valor em R$</label>
              <Input
                type="number"
                step="0.01"
                placeholder={step.placeholder || "0.00"}
                value={data.value || ''}
                onChange={(e) => setStepData({ ...stepData, [currentStep]: { value: e.target.value } })}
                className="bg-[#1a1a2e] border-cyan-500/30 text-white text-lg"
              />
            </div>
          )}

          {step.type === 'data_input' && (
            <div>
              <label className="text-white font-semibold mb-2 block">Informe os dados</label>
              <textarea
                placeholder={step.placeholder || "Digite aqui..."}
                value={data.value || ''}
                onChange={(e) => setStepData({ ...stepData, [currentStep]: { value: e.target.value } })}
                className="w-full h-24 bg-[#1a1a2e] border-2 border-cyan-500/30 rounded-xl p-3 text-white text-sm resize-none focus:border-cyan-500 focus:outline-none"
              />
            </div>
          )}

          {step.type === 'document_upload' && (
            <div>
              {!data.file_url ? (
                <label className="block">
                  <div className="border-2 border-dashed border-cyan-500/30 hover:border-cyan-500/60 rounded-xl p-6 text-center cursor-pointer transition-all hover:bg-cyan-500/5">
                    <input 
                      type="file" 
                      accept="image/*,.pdf"
                      onChange={(e) => handleFileUpload(e, currentStep)}
                      className="hidden"
                    />
                    <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                    <p className="text-white font-semibold mb-1">Clique para enviar documento</p>
                    <p className="text-gray-400 text-xs">Imagem ou PDF até 10MB</p>
                  </div>
                </label>
              ) : (
                <div className="text-center p-4 bg-green-500/20 border-2 border-green-500/50 rounded-xl">
                  <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-2" />
                  <p className="text-green-400 font-bold">Documento enviado!</p>
                </div>
              )}
            </div>
          )}

          {step.type === 'quiz' && (
            <div className="space-y-3">
              {step.questions.map((q, qIdx) => (
                <div key={qIdx} className="bg-[#1a1a2e] rounded-lg p-3 border border-cyan-500/20">
                  <p className="text-white font-semibold mb-2 text-sm">{qIdx + 1}. {q.question}</p>
                  <Input
                    placeholder="Sua resposta..."
                    value={data.answers?.[qIdx] || ''}
                    onChange={(e) => {
                      const newAnswers = [...(data.answers || [])];
                      newAnswers[qIdx] = e.target.value;
                      setStepData({ 
                        ...stepData, 
                        [currentStep]: { ...data, answers: newAnswers } 
                      });
                    }}
                    className="bg-[#0a0a1a] border-cyan-500/30 text-white"
                  />
                </div>
              ))}
            </div>
          )}

          {step.type === 'reflection' && (
            <div>
              <label className="text-white font-semibold mb-2 block">
                Descreva detalhadamente (mínimo 15 palavras)
              </label>
              <p className="text-gray-400 text-xs mb-2">
                Palavras: <span className="text-cyan-400 font-bold">
                  {(data.value || '').trim().split(/\s+/).filter(w => w).length}
                </span> / 15
              </p>
              <textarea
                placeholder={step.placeholder || "Seja específico sobre cada ação que você tomou..."}
                value={data.value || ''}
                onChange={(e) => setStepData({ ...stepData, [currentStep]: { value: e.target.value } })}
                className="w-full h-32 bg-[#1a1a2e] border-2 border-cyan-500/30 rounded-xl p-3 text-white text-sm resize-none focus:border-cyan-500 focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Progress */}
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>Etapa {currentStep + 1} de {verificationSteps.length}</span>
          <span>{Math.round(((currentStep + 1) / verificationSteps.length) * 100)}% completo</span>
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          {currentStep > 0 && (
            <Button
              onClick={() => setCurrentStep(currentStep - 1)}
              variant="outline"
              className="flex-1"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Voltar
            </Button>
          )}
          <Button
            onClick={handleNext}
            disabled={!validateCurrentStep() || isValidating}
            className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
          >
            {isValidating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Validando...
              </>
            ) : currentStep === verificationSteps.length - 1 ? (
              <>
                <Shield className="w-4 h-4 mr-2" />
                Validar
              </>
            ) : (
              <>
                Próximo
                <ChevronRight className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-magenta-400 mb-1">
            VERIFICAÇÃO INTELIGENTE
          </h2>
          <p className="text-gray-400 text-sm">Missão: <span className="text-white font-bold">{mission.title}</span></p>
        </div>
        <button
          onClick={onClose}
          className="bg-red-600 hover:bg-red-700 p-2 rounded-full transition-all"
        >
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Progress Bar */}
      {!isAnalyzing && !showSuccess && (
        <div className="h-2 bg-[#0a0a1a] rounded-full overflow-hidden border border-cyan-500/30">
          <motion.div
            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
            initial={{ width: 0 }}
            animate={{ width: `${((currentStep + 1) / verificationSteps.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      )}

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {renderStep()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
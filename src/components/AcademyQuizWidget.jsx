import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Zap } from 'lucide-react';

export default function AcademyQuizWidget({ content, onComplete }) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [finished, setFinished] = useState(false);
  const [score, setScore] = useState(0);

  if (!content?.quiz || content.quiz.length === 0) {
    return null;
  }

  const quiz = content.quiz;
  const question = quiz[currentQuestion];

  const handleAnswer = (answerIndex) => {
    const newAnswers = [...answers, answerIndex];
    setAnswers(newAnswers);

    // Verificar se é última pergunta
    if (currentQuestion === quiz.length - 1) {
      const correctAnswers = quiz.map(q => q.correct);
      let correctCount = 0;
      newAnswers.forEach((ans, idx) => {
        if (ans === correctAnswers[idx]) correctCount++;
      });
      const percentage = (correctCount / quiz.length) * 100;
      setScore(percentage);
      setFinished(true);
      
      // Chamar callback
      onComplete({
        answers: newAnswers,
        correctAnswers,
        score: percentage
      });
    } else {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  if (finished) {
    const passed = score >= 70;
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`p-4 rounded-lg border-2 ${
          passed
            ? 'bg-green-900/20 border-green-500'
            : 'bg-yellow-900/20 border-yellow-500'
        }`}
      >
        <div className="text-center">
          {passed ? (
            <>
              <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-2" />
              <h4 className="font-bold text-green-300">Quiz Aprovado! 🎉</h4>
            </>
          ) : (
            <>
              <XCircle className="w-12 h-12 text-yellow-400 mx-auto mb-2" />
              <h4 className="font-bold text-yellow-300">Tente novamente</h4>
            </>
          )}
          <p className="text-slate-300 text-sm mt-2">
            Você acertou <span className="font-bold text-lg">{Math.round(score)}%</span>
          </p>
          <div className="flex items-center justify-center gap-2 mt-3 text-sm font-bold">
            <Zap className="w-4 h-4 text-cyan-400" />
            <span className="text-cyan-400">+{passed ? 40 : 30} XP</span>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-800/50 rounded-lg p-4 border border-cyan-500/30"
    >
      <div className="mb-4">
        <div className="flex justify-between text-xs text-slate-400 mb-2">
          <span>Pergunta {currentQuestion + 1}/{quiz.length}</span>
          <span>{Math.round(((currentQuestion + 1) / quiz.length) * 100)}%</span>
        </div>
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
            style={{ width: `${((currentQuestion + 1) / quiz.length) * 100}%` }}
          />
        </div>
      </div>

      <h4 className="font-bold text-white mb-4">{question.question}</h4>

      <div className="space-y-2">
        {question.options.map((option, idx) => (
          <button
            key={idx}
            onClick={() => handleAnswer(idx)}
            className="w-full text-left p-3 rounded-lg bg-slate-700 hover:bg-slate-600 border border-slate-600 hover:border-cyan-500 text-slate-100 transition-all text-sm"
          >
            {option}
          </button>
        ))}
      </div>
    </motion.div>
  );
}
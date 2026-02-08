import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { contentId, answers, correctAnswers } = payload;

    if (!contentId || !answers) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Calcular score do quiz
    let correctCount = 0;
    answers.forEach((answer, idx) => {
      if (answer === correctAnswers[idx]) {
        correctCount++;
      }
    });

    const scorePercentage = (correctCount / correctAnswers.length) * 100;
    const passedQuiz = scorePercentage >= 70; // 70% = passou

    // Bonus XP baseado no score (sem chamar IA)
    const baseXP = 30;
    const bonusXP = passedQuiz ? Math.floor((scorePercentage - 70) / 3) : 0; // Extra 0-10 XP
    const totalXP = baseXP + bonusXP;

    // Atualizar progresso do usuário
    let profiles = await base44.entities.User.filter({ email: user.email });
    const profile = profiles?.[0];

    if (!profile) {
      return Response.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Inicializar academy progress se não existir
    const academyProgress = profile.academy_progress || {};
    academyProgress[contentId] = {
      completed: true,
      completedAt: new Date().toISOString(),
      quizScore: scorePercentage,
      passed: passedQuiz
    };

    // Atualizar gamificação
    const gamification = profile.gamification || {
      totalPoints: 0,
      level: 1,
      xp: 0,
      xpToNextLevel: 1000,
      achievements: []
    };

    gamification.totalPoints += totalXP;
    gamification.xp += totalXP;

    // Level up check
    while (gamification.xp >= gamification.xpToNextLevel) {
      gamification.xp -= gamification.xpToNextLevel;
      gamification.level += 1;
      gamification.xpToNextLevel = Math.floor(gamification.xpToNextLevel * 1.15);
    }

    // Check achievements
    const completedModules = Object.keys(academyProgress).length;
    if (completedModules === 5 && !gamification.achievements.includes('student')) {
      gamification.achievements.push('student');
    }
    if (completedModules === 10 && !gamification.achievements.includes('scholar')) {
      gamification.achievements.push('scholar');
    }

    // Atualizar user
    await base44.auth.updateMe({
      academy_progress: academyProgress,
      gamification
    });

    // Retornar resultado
    return Response.json({
      success: true,
      score: scorePercentage,
      passed: passedQuiz,
      xpEarned: totalXP,
      newLevel: gamification.level,
      achievement: completedModules === 5 || completedModules === 10 ? 
        (completedModules === 5 ? 'student' : 'scholar') : null
    });
  } catch (error) {
    console.error('Complete quiz error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
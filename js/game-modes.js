// 248 Arena — Game Modes Module

// Real MA plumbing exam structure (PSI, closed book, computer-based).
// Journeyman: Part I 70q/150min, Part II 30q/120min — 70% to pass each part.
// Master:     Part I 60q/120min, Part II 30q/120min — 70% to pass each part.
// Sources: PSI candidate bulletin listings + MA prep providers (2025/26).
const EXAM_FORMAT = {
  journeyman: { part1: { questions: 70, minutes: 150 }, part2: { questions: 30, minutes: 120 } },
  master:     { part1: { questions: 60, minutes: 120 }, part2: { questions: 30, minutes: 120 } },
  passing: 70
};

// Category mix, mapped from PSI's published topic areas for the MA plumbing
// exam: General Regulations/Inspections/Permits · Gas Piping, Equipment &
// Appliances · Venting · Traps & Cleanouts · Fixtures, Equipment & Clearances ·
// Water Heaters · Piping, Valves & Controls · Water Supply · Hangers & Supports ·
// Drain, Waste & Vent · Separators/Interceptors/Grease Traps · Joints & Connections.
// ⚠️ The bulletin lists topics but not weights — these fractions are our best
// mapping onto the app's categories. Tune here as real exam experience comes in.
const EXAM_BLUEPRINT = {
  DWV: 0.18, VENTING: 0.13, WATER: 0.14, GAS: 0.13, FIXTURES: 0.11,
  SIZING: 0.09, BACKFLOW: 0.07, MATERIALS: 0.07, GENERAL: 0.05,
  PERMITS: 0.02, MEDICAL: 0.01
};

const GameModes = {
  examTarget: 'journeyman',   // 'journeyman' | 'master'
  examPart: 1,                // 1 | 2
  currentMode: null, currentQuestions: [], currentIndex: 0,
  score: 0, correct: 0, streak: 0, startTime: 0,
  timeLimit: 0, eliminated: false, lives: 3,

  shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  },

  getAdaptiveQuestions(count, user) {
    const selected = [];

    // 1) Spaced repetition first: up to half the session is due reviews —
    //    questions previously missed or scheduled to resurface today.
    if (window.SRS) {
      const dueIds = new Set(SRS.dueIds());
      const dueQs = this.shuffle(QUESTIONS.filter(q => dueIds.has(q.id)));
      selected.push(...dueQs.slice(0, Math.floor(count / 2)));
    }

    // 2) Fill the rest weighted by weak categories, favoring unseen questions.
    const chosen = new Set(selected.map(q => q.id));
    const stats = user?.stats?.categoryStats || {};
    const weighted = QUESTIONS.filter(q => !chosen.has(q.id)).map(q => {
      const catStat = stats[q.category];
      let weight = 1;
      if (catStat) {
        const accuracy = catStat.correct / (catStat.total || 1);
        weight = accuracy < 0.5 ? 3 : accuracy < 0.7 ? 2 : 1;
      } else { weight = 2; }
      if (window.SRS && !SRS.seen(q.id)) weight += 1;   // bias toward new material
      return { q, weight };
    });
    const pool = [...weighted];
    while (selected.length < Math.min(count, QUESTIONS.length) && pool.length > 0) {
      const totalWeight = pool.reduce((s, w) => s + w.weight, 0);
      let r = Math.random() * totalWeight;
      for (let i = 0; i < pool.length; i++) {
        r -= pool[i].weight;
        if (r <= 0) { selected.push(pool[i].q); pool.splice(i, 1); break; }
      }
    }
    return this.shuffle(selected);
  },

  // Exam Sim mirrors the REAL exam's category mix (EXAM_BLUEPRINT), sampled
  // neutrally — no adaptive weighting, because a dress rehearsal shouldn't
  // bend toward your weaknesses the way practice does.
  getBlueprintQuestions(count) {
    const byCat = {};
    QUESTIONS.forEach(q => { (byCat[q.category] = byCat[q.category] || []).push(q); });
    const cats = Object.keys(EXAM_BLUEPRINT).filter(c => byCat[c]?.length);
    // Allocate seats by weight, then hand out remainder to largest fractions.
    const alloc = {};
    let used = 0;
    const fracs = [];
    cats.forEach(c => {
      const exact = count * EXAM_BLUEPRINT[c];
      alloc[c] = Math.floor(exact);
      used += alloc[c];
      fracs.push({ c, frac: exact - alloc[c] });
    });
    fracs.sort((a, b) => b.frac - a.frac);
    for (let i = 0; used < count && i < fracs.length; i++, used++) alloc[fracs[i].c]++;
    const selected = [];
    cats.forEach(c => {
      const pool = this.shuffle(byCat[c]);
      // If a category has fewer questions than its allocation, take what exists.
      selected.push(...pool.slice(0, Math.min(alloc[c], pool.length)));
    });
    // Backfill any shortfall from the whole bank.
    if (selected.length < count) {
      const chosen = new Set(selected.map(q => q.id));
      selected.push(...this.shuffle(QUESTIONS.filter(q => !chosen.has(q.id))).slice(0, count - selected.length));
    }
    return this.shuffle(selected);
  },

  start(mode, user) {
    this.currentMode = mode;
    this.currentIndex = 0; this.score = 0; this.correct = 0;
    this.streak = 0; this.eliminated = false; this.lives = 3;
    this.answerLog = [];
    this.startTime = Date.now();
    switch(mode) {
      case 'practice': this.currentQuestions = this.getAdaptiveQuestions(20, user); this.timeLimit = 0; break;
      case 'ranked': this.currentQuestions = this.getAdaptiveQuestions(25, user); this.timeLimit = 0; break;
      // Mirrors the real PSI exam. Default = Journeyman Part I (70q/150min);
      // set GameModes.examTarget = 'master' and GameModes.examPart = 2 to switch.
      case 'exam': {
        const fmt = EXAM_FORMAT[this.examTarget === 'master' ? 'master' : 'journeyman'];
        const part = this.examPart === 2 ? fmt.part2 : fmt.part1;
        this.currentQuestions = this.getBlueprintQuestions(part.questions);
        this.timeLimit = part.minutes * 60 * 1000;
        break;
      }
      case 'royale': this.currentQuestions = this.getAdaptiveQuestions(30, user); this.timeLimit = 0; this.lives = 3; break;
      case 'speed': this.currentQuestions = this.getAdaptiveQuestions(25, user); this.timeLimit = 5*60*1000; break;
      case 'imposter': this.currentQuestions = this.generateImposterQuestions(15); this.timeLimit = 0; break;
      // Worksheet: randomized calculation problems (fixture units, sizing, slope,
      // trap arms, gas demand) — generated fresh every session.
      case 'drills': this.currentQuestions = window.Drills ? Drills.generate(15) : this.getAdaptiveQuestions(15, user); this.timeLimit = 0; break;
    }
    return this.getCurrentQuestion();
  },

  getCurrentQuestion() {
    if (this.currentIndex >= this.currentQuestions.length) return null;
    const q = this.currentQuestions[this.currentIndex];
    return {
      ...q, number: this.currentIndex + 1, total: this.currentQuestions.length,
      isLoot: Math.random() < 0.1, mode: this.currentMode, score: this.score,
      streak: this.streak, lives: this.lives, elapsed: Date.now() - this.startTime,
      timeLimit: this.timeLimit
    };
  },

  answer(choiceIndex, user) {
    const q = this.currentQuestions[this.currentIndex];
    const isCorrect = choiceIndex === q.correct;
    // Feed the spaced-repetition scheduler on every answer, in every mode.
    // Skip imposter (mutated options) and drills (generated one-offs — scheduling
    // an id that will never be generated again would just bloat the queue).
    if (window.SRS && !q.isImposter && !q.isDrill) SRS.record(q.id, isCorrect);
    // Session log powers the end-of-session score report.
    this.answerLog.push({ q, choiceIndex, isCorrect });
    const isLoot = Math.random() < 0.1;
    let pointsEarned = 0;
    if (isCorrect) {
      this.correct++; this.streak++;
      let base = q.difficulty === 3 ? 200 : q.difficulty === 2 ? 150 : 100;
      const multiplier = Math.min(this.streak, 10);
      pointsEarned = base * (1 + (multiplier - 1) * 0.25);
      if (isLoot) pointsEarned *= 5;
      if (this.currentMode === 'ranked') pointsEarned *= 1.5;
      if (this.currentMode === 'speed') pointsEarned *= 2;
      pointsEarned = Math.round(pointsEarned);
      this.score += pointsEarned;
      if (this.streak > (user?.stats?.bestStreak || 0)) user.stats.bestStreak = this.streak;
    } else {
      this.streak = 0;
      if (this.currentMode === 'royale') { this.lives--; if (this.lives <= 0) this.eliminated = true; }
    }
    if (user && this.currentMode !== 'practice') {
      user.stats.totalAnswered++;
      if (isCorrect) user.stats.totalCorrect++;
      user.stats.streak = this.streak;
      if (!user.stats.categoryStats[q.category]) user.stats.categoryStats[q.category] = { total: 0, correct: 0 };
      user.stats.categoryStats[q.category].total++;
      if (isCorrect) user.stats.categoryStats[q.category].correct++;
      Auth.addXP(user, isCorrect ? Math.round(pointsEarned / 10) : 5);
    }
    this.currentIndex++;
    const isComplete = this.currentIndex >= this.currentQuestions.length || this.eliminated;
    const result = {
      isCorrect, correctAnswer: q.correct, explanation: q.explanation,
      codeRef: q.codeRef, pointsEarned, streak: this.streak, isLoot,
      eliminated: this.eliminated, lives: this.lives, isComplete, question: q
    };
    if (isComplete) result.results = this.getResults(user);
    return result;
  },

  getResults(user, timedOut = false) {
    const elapsed = Date.now() - this.startTime;
    // Per-category breakdown + missed questions for the score report.
    const byCategory = {};
    const missed = [];
    for (const entry of (this.answerLog || [])) {
      const cat = entry.q.category;
      if (!byCategory[cat]) byCategory[cat] = { correct: 0, total: 0 };
      byCategory[cat].total++;
      if (entry.isCorrect) byCategory[cat].correct++;
      else missed.push(entry);
    }
    const accuracy = this.currentIndex > 0 ? Math.round((this.correct / this.currentIndex) * 100) : 0;
    const results = {
      mode: this.currentMode, score: this.score, correct: this.correct,
      total: this.currentQuestions.length, answered: this.currentIndex,
      accuracy,
      byCategory, missed,
      passed: accuracy >= 70,   // the real exam's passing bar
      time: elapsed, timeFormatted: this.formatTime(elapsed),
      timedOut, eliminated: this.eliminated,
      xpEarned: Math.round(this.score / 10),
      newBadges: user ? Auth.checkBadges(user) : []
    };
    if (user && (this.currentMode === 'ranked' || this.currentMode === 'speed')) {
      Leaderboard.submitScore(user, this.currentMode, this.score, {
        correct: this.correct, total: this.currentIndex, time: elapsed
      });
    }
    // Sync progress (stats + SRS schedule) to the cloud after every session.
    if (user && window.CloudSync) CloudSync.push(user);
    return results;
  },

  formatTime(ms) {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}:${String(m % 60).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;
    return `${m}:${String(s % 60).padStart(2,'0')}`;
  },

  getHint(user) {
    const q = this.currentQuestions[this.currentIndex];
    if (!q) return null;
    const cost = 50;
    this.score = Math.max(0, this.score - cost);
    const wrongOptions = q.options.map((o, i) => i).filter(i => i !== q.correct);
    const eliminated = wrongOptions[Math.floor(Math.random() * wrongOptions.length)];
    return { hint: `Eliminated: "${q.options[eliminated]}"`, eliminatedIndex: eliminated, cost };
  },

  challenge() {
    return { message: 'Challenge submitted! If proven wrong, you earn 5x points.', active: true };
  },

  generateImposterQuestions(count) {
    const real = this.shuffle([...QUESTIONS]).slice(0, count);
    return real.map(q => {
      const fakes = [
        'Per 248 CMR 99.99, this is not regulated',
        'No code requirement exists for this scenario',
        'This is determined by the installer\'s preference',
        'The homeowner decides this, not the code',
        'This requirement was removed in the 2020 update'
      ];
      const fake = fakes[Math.floor(Math.random() * fakes.length)];
      const newOptions = [...q.options];
      const fakeIndex = Math.floor(Math.random() * (newOptions.length + 1));
      newOptions.splice(fakeIndex, 0, fake);
      let newCorrect = q.correct;
      if (fakeIndex <= q.correct) newCorrect++;
      return { ...q, options: newOptions, correct: newCorrect, imposterIndex: fakeIndex, isImposter: true };
    });
  },

  report(questionId, reason) {
    const reports = JSON.parse(localStorage.getItem('arena248_reports') || '[]');
    reports.push({ questionId, reason, date: Date.now() });
    localStorage.setItem('arena248_reports', JSON.stringify(reports));
    // Send it where it matters: the owner's report inbox (server mode).
    if (window.CloudSync) {
      const q = (window.QUESTIONS || []).find(x => x.id === questionId);
      CloudSync.reportQuestion(questionId, reason, q ? q.question : '');
    }
  }
};

window.GameModes = GameModes;

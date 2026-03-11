// 248 Arena — Main App Logic

const App = {
  user: null,
  currentScreen: 'dashboard',
  gameActive: false,
  currentQuestion: null,
  answered: false,
  timerInterval: null,
  eliminatedOption: null,

  init() {
    this.user = Auth.init();
    if (!this.user) {
      window.location.href = 'index.html';
      return;
    }
    Leaderboard.seed();
    this.renderHeader();
    this.showScreen('dashboard');
    this.setupNav();
  },

  renderHeader() {
    const u = this.user;
    const xpInLevel = u.stats.xp % Auth.XP_PER_LEVEL;
    const xpPct = (xpInLevel / Auth.XP_PER_LEVEL) * 100;
    document.getElementById('userName').textContent = u.name;
    document.getElementById('userLevel').textContent = `Lv ${u.stats.level}`;
    document.getElementById('xpFill').style.width = xpPct + '%';
    document.getElementById('userAvatar').textContent = u.avatar || '⚔️';
  },

  setupNav() {
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const screen = tab.dataset.screen;
        if (screen) this.showScreen(screen);
      });
    });
  },

  showScreen(name) {
    this.currentScreen = name;
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    const el = document.getElementById('screen-' + name);
    if (el) el.classList.add('active');
    const tab = document.querySelector(`.nav-tab[data-screen="${name}"]`);
    if (tab) tab.classList.add('active');
    switch(name) {
      case 'dashboard': this.renderDashboard(); break;
      case 'leaderboard': this.renderLeaderboard(); break;
      case 'badges': this.renderBadges(); break;
      case 'chat': this.renderChat(); break;
    }
  },

  // === DASHBOARD ===
  renderDashboard() {
    const s = this.user.stats;
    const accuracy = s.totalAnswered > 0 ? Math.round((s.totalCorrect / s.totalAnswered) * 100) : 0;
    document.getElementById('statAnswered').textContent = s.totalAnswered;
    document.getElementById('statAccuracy').textContent = accuracy + '%';
    document.getElementById('statStreak').textContent = s.bestStreak;
    document.getElementById('statLevel').textContent = s.level;
    this.renderCategories();
    this.renderBattlePass();
  },

  renderCategories() {
    const container = document.getElementById('categoryList');
    const stats = this.user.stats.categoryStats;
    let html = '';
    Object.entries(CATEGORIES).forEach(([key, cat]) => {
      const s = stats[key] || { total: 0, correct: 0 };
      const pct = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
      const cls = pct >= 70 ? 'good' : pct >= 50 ? 'ok' : 'bad';
      html += `
        <div class="category-item">
          <div class="cat-icon">${cat.icon}</div>
          <div class="cat-info">
            <div class="cat-name">${cat.name}</div>
            <div class="cat-stats">${s.correct}/${s.total} correct · ${pct}%</div>
            <div class="progress-bar">
              <div class="progress-fill ${cls}" style="width: ${pct}%"></div>
            </div>
          </div>
        </div>`;
    });
    container.innerHTML = html;
  },

  renderBattlePass() {
    const level = this.user.stats.level;
    const rewards = [
      { lvl: 1, icon: '🔧', label: 'Start' },
      { lvl: 3, icon: '🩸', label: 'First Blood' },
      { lvl: 5, icon: '🔥', label: 'Pipe Rookie' },
      { lvl: 10, icon: '⚡', label: 'Code Fighter' },
      { lvl: 15, icon: '📖', label: 'Drain Warrior' },
      { lvl: 20, icon: '🧙', label: 'Pipe Wizard' },
      { lvl: 30, icon: '🔄', label: 'Backflow Boss' },
      { lvl: 40, icon: '👑', label: 'Arena Champion' },
      { lvl: 50, icon: '🏆', label: 'Code Master' },
      { lvl: 100, icon: '💎', label: 'Grand Master' }
    ];
    document.getElementById('battlePassTrack').innerHTML = rewards.map(r => {
      const cls = level >= r.lvl ? 'unlocked' : level >= r.lvl - 2 ? 'current' : 'locked';
      return `<div class="bp-node ${cls}"><div class="bp-icon">${r.icon}</div><div class="bp-label">Lv${r.lvl}</div></div>`;
    }).join('');
  },

  // === GAME MODES ===
  startGame(mode) {
    this.gameActive = true;
    this.answered = false;
    this.eliminatedOption = null;
    const q = GameModes.start(mode, this.user);
    if (!q) return;
    this.showScreen('game');
    this.currentQuestion = q;
    this.renderQuestion(q);
    if (q.timeLimit > 0) this.startTimer(q.timeLimit);
  },

  renderQuestion(q) {
    const gameScreen = document.getElementById('screen-game');
    const letters = ['A', 'B', 'C', 'D', 'E'];
    const cat = CATEGORIES[q.category] || { icon: '📋', name: q.category };
    
    const modeLabels = {
      practice: '📚 Practice', ranked: '⚔️ Ranked', exam: '📝 Exam Sim',
      royale: '🏟️ Code Royale', speed: '⚡ Speed Run', imposter: '🕵️ Imposter'
    };
    const modeLabel = modeLabels[q.mode] || '';

    let livesHtml = '';
    if (q.mode === 'royale') {
      livesHtml = `<div class="lives-display">
        ${[1,2,3].map(i => `<span class="life ${i > q.lives ? 'lost' : ''}">❤️</span>`).join('')}
      </div>`;
    }

    let headerExtra = q.isLoot ? `<span class="badge badge-loot">🎁 LOOT DROP — 5x!</span>` : '';

    gameScreen.innerHTML = `
      <div class="question-screen">
        <div class="ai-opponent">
          <div class="ai-avatar">⚔️</div>
          <div class="ai-info">
            <div class="ai-name">THE EXAMINER</div>
            <div class="ai-status">${modeLabel} · Q${q.number}/${q.total}</div>
          </div>
          ${livesHtml}
        </div>
        
        <div class="question-header">
          <span class="question-progress">Q${q.number} of ${q.total}</span>
          <div class="question-meta">
            <span class="badge badge-category">${cat.icon} ${cat.name}</span>
            ${q.streak > 1 ? `<span class="badge badge-streak">🔥 ${q.streak}x</span>` : ''}
            ${headerExtra}
          </div>
        </div>
        
        <div class="question-score">Score: ${q.score.toLocaleString()}</div>
        ${q.timeLimit ? `<div class="question-timer" id="gameTimer">⏱️ --:--</div>` : ''}
        
        <div class="question-card">
          <div class="question-text">${q.isImposter ? '🕵️ IMPOSTER MODE: Spot the FAKE answer!' : ''} ${q.question}</div>
          <div class="options-list">
            ${q.options.map((opt, i) => `
              <button class="option-btn" onclick="App.selectAnswer(${i})" id="opt-${i}">
                <span class="option-letter">${letters[i]}</span>
                ${opt}
              </button>
            `).join('')}
          </div>
        </div>
        
        <div class="explanation" id="explanation"></div>
        
        <div class="question-actions" id="questionActions">
          <button class="action-btn" onclick="App.getHint()">💡 Hint (-50pts)</button>
          <button class="action-btn" onclick="App.challengeQuestion()">⚔️ Challenge</button>
          <button class="action-btn danger" onclick="App.reportQuestion()">🚩 Report</button>
        </div>
      </div>`;
  },

  selectAnswer(idx) {
    if (this.answered) return;
    this.answered = true;
    const result = GameModes.answer(idx, this.user);
    
    document.querySelectorAll('.option-btn').forEach((btn, i) => {
      btn.classList.add('disabled');
      if (i === result.correctAnswer) btn.classList.add('correct');
      if (i === idx && !result.isCorrect) btn.classList.add('wrong');
    });

    const codeRefLink = result.codeRef ? 
      `<a class="code-ref" href="codebook.html#${encodeURIComponent(result.codeRef)}" target="_blank">📖 ${result.codeRef}</a>` : '';

    const exp = document.getElementById('explanation');
    exp.innerHTML = `
      <div class="exp-header">
        ${result.isCorrect ? '✅ Correct!' : '❌ Wrong!'} 
        ${result.pointsEarned > 0 ? `<span style="color:var(--success)">+${result.pointsEarned} pts</span>` : ''}
        ${result.isLoot && result.isCorrect ? `<span class="badge badge-loot">🎁 LOOT BONUS!</span>` : ''}
      </div>
      <div class="exp-text">${result.explanation}</div>
      ${codeRefLink}
    `;
    exp.classList.add('show');

    const actions = document.getElementById('questionActions');
    if (result.isComplete) {
      this.showResults(result.results);
    } else if (result.eliminated) {
      actions.innerHTML = `
        <div style="text-align:center; color: var(--danger); font-size: 1.2rem; font-weight: 700;">
          💀 ELIMINATED! No lives remaining.
        </div>
        <button class="action-btn primary" onclick="App.showResults(GameModes.getResults(App.user))" style="margin-top:12px">
          View Results →
        </button>`;
    } else {
      actions.innerHTML = `<button class="action-btn primary" onclick="App.nextQuestion()" style="flex:1">Next Question →</button>`;
    }
    this.renderHeader();
  },

  nextQuestion() {
    this.answered = false;
    this.eliminatedOption = null;
    const q = GameModes.getCurrentQuestion();
    if (!q) { this.showResults(GameModes.getResults(this.user)); return; }
    this.currentQuestion = q;
    this.renderQuestion(q);
  },

  getHint() {
    if (this.answered) return;
    const hint = GameModes.getHint(this.user);
    if (!hint) return;
    const btn = document.getElementById('opt-' + hint.eliminatedIndex);
    if (btn) btn.classList.add('eliminated');
    this.eliminatedOption = hint.eliminatedIndex;
    document.querySelector('.question-score').textContent = `Score: ${GameModes.score.toLocaleString()} (-${hint.cost})`;
  },

  challengeQuestion() {
    if (this.answered) return;
    GameModes.challenge();
    alert('⚔️ Challenge submitted! In future updates, successful challenges earn 5x points!');
  },

  reportQuestion() {
    const q = this.currentQuestion;
    if (!q) return;
    const reason = prompt('What\'s wrong with this question?');
    if (reason) {
      GameModes.report(q.id, reason);
      alert('🚩 Report submitted. Thanks for helping improve 248 Arena!');
    }
  },

  showResults(results) {
    if (this.timerInterval) clearInterval(this.timerInterval);
    const gameScreen = document.getElementById('screen-game');
    let grade = '';
    if (results.accuracy >= 90) grade = '🏆 A+ — LEGENDARY';
    else if (results.accuracy >= 80) grade = '⭐ A — EXCELLENT';
    else if (results.accuracy >= 70) grade = '✅ B — PASSING';
    else if (results.accuracy >= 60) grade = '⚠️ C — ALMOST';
    else grade = '❌ F — KEEP TRAINING';

    let badgeHtml = '';
    if (results.newBadges && results.newBadges.length > 0) {
      badgeHtml = results.newBadges.map(b => 
        `<div class="badge-unlock">${b.icon} ${b.name} Unlocked!</div>`
      ).join('');
    }

    gameScreen.innerHTML = `
      <div class="results-card">
        <h2>${results.eliminated ? '💀 ELIMINATED' : results.timedOut ? '⏰ TIME\'S UP' : '📊 BATTLE RESULTS'}</h2>
        <div class="results-score">${results.score.toLocaleString()}</div>
        <div style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 8px;">${grade}</div>
        <div class="results-stats">
          <div class="results-stat">
            <div class="value">${results.correct}/${results.answered}</div>
            <div class="label">Correct</div>
          </div>
          <div class="results-stat">
            <div class="value">${results.accuracy}%</div>
            <div class="label">Accuracy</div>
          </div>
          <div class="results-stat">
            <div class="value">${results.timeFormatted}</div>
            <div class="label">Time</div>
          </div>
        </div>
        <div style="color: var(--success); font-weight: 600; margin-bottom: 16px;">+${results.xpEarned} XP earned</div>
        ${badgeHtml}
        <div class="question-actions mt-16">
          <button class="action-btn" onclick="App.showScreen('dashboard')">← Arena</button>
          <button class="action-btn primary" onclick="App.startGame('${results.mode}')">Fight Again →</button>
        </div>
      </div>`;
  },

  startTimer(limitMs) {
    const startTime = Date.now();
    this.timerInterval = setInterval(() => {
      const remaining = limitMs - (Date.now() - startTime);
      if (remaining <= 0) {
        clearInterval(this.timerInterval);
        this.showResults(GameModes.getResults(this.user, true));
        return;
      }
      const timerEl = document.getElementById('gameTimer');
      if (timerEl) {
        const min = Math.floor(remaining / 60000);
        const sec = Math.floor((remaining % 60000) / 1000);
        timerEl.textContent = `⏱️ ${min}:${String(sec).padStart(2, '0')}`;
        if (remaining < 60000) timerEl.classList.add('urgent');
      }
    }, 1000);
  },

  // === LEADERBOARD ===
  lbTab: 'all',
  lbShowAll: false,
  lbPage: 0,

  renderLeaderboard() {
    const container = document.getElementById('leaderboardContent');
    const showAll = this.lbShowAll;
    const data = showAll 
      ? Leaderboard.getLeaderboard(this.lbTab, 'ranked', this.lbPage) 
      : Leaderboard.getLeaderboard(this.lbTab, 'ranked', 0, 10);
    const userRank = Leaderboard.getUserRank(this.user.id, this.lbTab, 'ranked');

    let html = `
      <div class="leaderboard-tabs">
        <div class="lb-tab ${this.lbTab === 'weekly' ? 'active' : ''}" onclick="App.lbTab='weekly';App.lbShowAll=false;App.lbPage=0;App.renderLeaderboard()">Weekly</div>
        <div class="lb-tab ${this.lbTab === 'monthly' ? 'active' : ''}" onclick="App.lbTab='monthly';App.lbShowAll=false;App.lbPage=0;App.renderLeaderboard()">Monthly</div>
        <div class="lb-tab ${this.lbTab === 'all' ? 'active' : ''}" onclick="App.lbTab='all';App.lbShowAll=false;App.lbPage=0;App.renderLeaderboard()">All Time</div>
      </div>`;

    if (userRank) {
      html += `<div class="lb-your-rank">Your Rank: <strong>#${userRank}</strong> · ${this.user.stats.rank}</div>`;
    }

    if (data.entries.length === 0) {
      html += `<div style="text-align:center;color:var(--text-muted);padding:40px 0;">No scores yet. Play Ranked to enter the arena! ⚔️</div>`;
    }

    const startRank = showAll ? this.lbPage * Leaderboard.PAGE_SIZE : 0;
    data.entries.forEach((e, i) => {
      const rank = startRank + i + 1;
      const isYou = e.userId === this.user.id;
      const rankCls = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : '';
      html += `
        <div class="lb-entry ${isYou ? 'you' : ''}">
          <div class="lb-rank ${rankCls}">${rank <= 3 ? ['🥇','🥈','🥉'][rank-1] : rank}</div>
          <div style="font-size:1.2rem;margin-right:4px;">${e.avatar || '⚔️'}</div>
          <div class="lb-info">
            <div class="lb-name">${e.name} ${isYou ? '(You)' : ''}</div>
            <div class="lb-title">${e.title} · Lv${e.level}</div>
          </div>
          <div class="lb-score">${e.score.toLocaleString()}</div>
        </div>`;
    });

    // Show More / Pagination
    if (!showAll && data.total > 10) {
      html += `<div class="lb-show-more"><button onclick="App.lbShowAll=true;App.lbPage=0;App.renderLeaderboard()">See Full Rankings →</button></div>`;
    } else if (showAll && data.totalPages > 1) {
      html += `<div style="display:flex;gap:8px;justify-content:center;margin-top:16px;">`;
      if (this.lbPage > 0) html += `<button class="action-btn" onclick="App.lbPage--;App.renderLeaderboard()">← Prev</button>`;
      html += `<span style="padding:10px;color:var(--text-muted);">${this.lbPage + 1} / ${data.totalPages}</span>`;
      if (this.lbPage < data.totalPages - 1) html += `<button class="action-btn" onclick="App.lbPage++;App.renderLeaderboard()">Next →</button>`;
      html += `</div>`;
    }

    container.innerHTML = html;
  },

  // === BADGES ===
  renderBadges() {
    const container = document.getElementById('badgesContent');
    const earned = this.user.stats.badges;
    container.innerHTML = Auth.BADGES.map(b => {
      const isEarned = earned.includes(b.id);
      return `
        <div class="badge-card ${isEarned ? 'earned' : 'locked'}">
          <div class="badge-icon">${isEarned ? b.icon : '🔒'}</div>
          <div class="badge-name">${b.name}</div>
          <div class="badge-desc">${b.desc}</div>
        </div>`;
    }).join('');
  },

  // === CHAT (THE EXAMINER) ===
  chatMessages: [],
  chatQuestionActive: false,
  chatCurrentQ: null,

  renderChat() {
    if (this.chatMessages.length === 0) {
      this.chatMessages.push({
        role: 'ai',
        text: "⚔️ Welcome to The Examiner. I'm your 248 CMR study partner.\n\nAsk me anything about the MA plumbing code, or type 'quiz me' to test your knowledge!\n\n💡 Tip: After answering questions wrong, check the Code Book for the full code reference."
      });
    }
    this.renderChatMessages();
  },

  renderChatMessages() {
    const list = document.getElementById('chatMessages');
    if (!list) return;
    list.innerHTML = this.chatMessages.map(m => `
      <div class="chat-msg ${m.role === 'ai' ? 'ai' : 'user'}">
        <div class="chat-avatar">${m.role === 'ai' ? '⚔️' : (this.user?.avatar || '👤')}</div>
        <div class="chat-bubble">${m.text}</div>
      </div>
    `).join('');
    list.scrollTop = list.scrollHeight;
  },

  sendChat() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    this.chatMessages.push({ role: 'user', text });
    if (this.chatQuestionActive) {
      this.handleChatAnswer(text);
    } else if (text.toLowerCase().includes('quiz') || text.toLowerCase().includes('question')) {
      this.askChatQuestion();
    } else {
      const responses = [
        "The MA plumbing exam is based on 248 CMR. Type 'quiz me' to test yourself, or check the Code Book for reference!",
        "Good question. The 248 CMR covers everything from pipe sizing to backflow prevention. Want me to quiz you?",
        "Ready to train? Type 'quiz me' and I'll throw you a question from the exam bank. ⚔️",
        "Study smart! The exam tests 248 CMR knowledge. Type 'quiz me' for practice, or browse the Code Book section."
      ];
      this.chatMessages.push({ role: 'ai', text: responses[Math.floor(Math.random() * responses.length)] });
    }
    this.renderChatMessages();
  },

  askChatQuestion() {
    const q = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
    this.chatCurrentQ = q;
    this.chatQuestionActive = true;
    const letters = ['A', 'B', 'C', 'D'];
    const options = q.options.map((o, i) => `${letters[i]}) ${o}`).join('\n');
    this.chatMessages.push({
      role: 'ai',
      text: `📋 <strong>${CATEGORIES[q.category]?.name || q.category}</strong>\n\n${q.question}\n\n${options}\n\nType A, B, C, or D:`
    });
  },

  handleChatAnswer(text) {
    const q = this.chatCurrentQ;
    const idx = 'ABCD'.indexOf(text.toUpperCase().trim().charAt(0));
    if (idx === -1) {
      this.chatMessages.push({ role: 'ai', text: "Just type A, B, C, or D! 💪" });
      return;
    }
    this.chatQuestionActive = false;
    const isCorrect = idx === q.correct;
    const letters = ['A', 'B', 'C', 'D'];
    this.chatMessages.push({
      role: 'ai',
      text: `${isCorrect ? '✅ Correct!' : `❌ The answer is ${letters[q.correct]}) ${q.options[q.correct]}`}\n\n📖 ${q.explanation}\n\n📌 ${q.codeRef}\n\nType 'quiz me' for another!`
    });
  },

  chatKeydown(e) { if (e.key === 'Enter') this.sendChat(); },

  // === LOGOUT ===
  logout() {
    Auth.logout();
    window.location.href = 'index.html';
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());

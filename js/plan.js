// 248 Arena — Today's Plan
// -----------------------------------------------------------------------------
// A subscription lives or dies on whether someone opens the app on a Tuesday
// they don't feel like studying. "Choose your battle" is a menu; a menu is a
// decision, and a decision is friction. This is the answer to the only question
// that actually matters when you open the app: *what should I do right now?*
//
// Two or three tasks, drawn from what the app already knows — reviews the SRS
// scheduler has queued, the category the exam blueprint says is hurting you
// most, material you have never seen, whether it's time for a dress rehearsal,
// and whether your apprentice hours have gone stale in the Locker.
//
// Completion is DERIVED from real state wherever it can be. A checkbox you tick
// yourself is a lie you can tell the app; "you have 0 reviews due" is not.

const Plan = {
  KEY: 'arena248_plan',
  MAX_TASKS: 3,
  HOURS_STALE_DAYS: 14,   // nudge to log hours after two quiet weeks
  EXAM_COOLDOWN_DAYS: 7,  // a dress rehearsal more often than weekly is noise

  // --- Store ---------------------------------------------------------------
  // { days: ['2026-08-12', ...], done: { '2026-08-12': ['weak','new'] },
  //   lastExam: '2026-08-05' }
  load() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(this.KEY)); } catch (e) {}
    if (!d || typeof d !== 'object') d = {};
    if (!Array.isArray(d.days)) d.days = [];
    if (!d.done || typeof d.done !== 'object') d.done = {};
    return d;
  },

  save(d) {
    // Only the last 400 study days are worth keeping — enough for a multi-year
    // apprenticeship streak without letting localStorage grow forever.
    d.days = d.days.slice(-400);
    // Same for per-day completions: yesterday's plan is not interesting.
    const keep = new Set(d.days.slice(-7));
    for (const k of Object.keys(d.done)) if (!keep.has(k)) delete d.done[k];
    try { localStorage.setItem(this.KEY, JSON.stringify(d)); } catch (e) {}
  },

  today() {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
  },

  daysBetween(a, b) {
    return Math.floor((Date.parse(b + 'T00:00:00') - Date.parse(a + 'T00:00:00')) / 86400000);
  },

  // --- Streak --------------------------------------------------------------
  // Called when the user actually answers something. Studying is the streak,
  // not opening the app — a streak you can keep by launching and closing is
  // worthless as a habit signal.
  touch() {
    const d = this.load();
    const t = this.today();
    if (d.days[d.days.length - 1] !== t) {
      d.days.push(t);
      this.save(d);
    }
  },

  streak(d) {
    d = d || this.load();
    if (!d.days.length) return 0;
    const t = this.today();
    const last = d.days[d.days.length - 1];
    // Yesterday still counts — the streak is alive until the day is missed, so
    // it doesn't read as broken at 9am before you've studied.
    const gap = this.daysBetween(last, t);
    if (gap > 1) return 0;
    let n = 1;
    for (let i = d.days.length - 1; i > 0; i--) {
      if (this.daysBetween(d.days[i - 1], d.days[i]) === 1) n++;
      else break;
    }
    return n;
  },

  // --- Completion ----------------------------------------------------------
  complete(id) {
    const d = this.load();
    const t = this.today();
    if (!d.days.includes(t)) d.days.push(t);
    const list = d.done[t] || (d.done[t] = []);
    if (!list.includes(id)) list.push(id);
    if (id === 'exam') d.lastExam = t;
    this.save(d);
  },

  isDone(d, id) {
    return (d.done[this.today()] || []).includes(id);
  },

  // --- Task generation -----------------------------------------------------
  tasks(user) {
    const d = this.load();
    const out = [];
    const stats = user?.stats?.categoryStats || {};
    const total = (window.QUESTIONS || []).length;

    // 1) Due reviews. Highest priority by a distance: the whole point of spaced
    //    repetition is that a review lands on the day it lands.
    const due = window.SRS ? SRS.stats().due : 0;
    if (due > 0) {
      out.push({
        id: 'reviews', icon: '🔁', priority: 1,
        label: `Clear ${due} due review${due === 1 ? '' : 's'}`,
        detail: 'Questions the scheduler says you are about to forget.',
        cta: 'Start', run: 'App.planRun("reviews")', done: false
      });
    } else if (window.SRS && SRS.stats().tracked > 0) {
      out.push({
        id: 'reviews', icon: '🔁', priority: 1,
        label: 'Reviews clear', detail: 'Nothing due today. The scheduler is happy.',
        cta: '', run: '', done: true
      });
    }

    // 2) Weakest category, weighted by how much the real exam cares about it.
    //    A 40% in DWV (18% of the exam) hurts far more than a 40% in MEDICAL (1%).
    let worst = null;
    for (const [cat, weight] of Object.entries(window.EXAM_BLUEPRINT || {})) {
      const s = stats[cat];
      if (!s || s.total < 5) continue;              // too little data to call it
      const acc = s.correct / s.total;
      if (acc >= 0.75) continue;                    // good enough to leave alone
      const cost = (0.75 - acc) * weight;           // points of exam at risk
      if (!worst || cost > worst.cost) worst = { cat, acc, cost, weight };
    }
    if (worst) {
      const name = (window.CATEGORIES || {})[worst.cat]?.name || worst.cat;
      out.push({
        id: 'weak', icon: '🎯', priority: 2,
        label: `Drill ${name} — ${Math.round(worst.acc * 100)}%`,
        detail: `${Math.round(worst.weight * 100)}% of the real exam. Your weakest spot that counts.`,
        cta: 'Drill 15', run: `App.planRun("weak","${worst.cat}")`, done: this.isDone(d, 'weak')
      });
    }

    // 3) Unseen material. Coverage is a quarter of the readiness score and the
    //    only component you cannot fix by grinding what you already know.
    const seen = window.SRS ? SRS.stats().tracked : 0;
    if (total && seen < total * 0.9) {
      out.push({
        id: 'new', icon: '📚', priority: 3,
        label: `Meet new questions — ${total - seen} left in the bank`,
        detail: 'You cannot be ready for questions you have never seen.',
        cta: 'Start', run: 'App.planRun("new")', done: this.isDone(d, 'new')
      });
    }

    // 4) Dress rehearsal, once you have enough under you to survive one.
    const readiness = window.Readiness ? Readiness.compute(user).pct : 0;
    const sinceExam = d.lastExam ? this.daysBetween(d.lastExam, this.today()) : 999;
    if (readiness >= 55 && sinceExam >= this.EXAM_COOLDOWN_DAYS) {
      out.push({
        id: 'exam', icon: '📝', priority: 4,
        label: 'Take a timed Part I',
        detail: `70 questions, 150 minutes. ${d.lastExam ? `Last sim ${sinceExam} days ago.` : 'Your first full rehearsal.'}`,
        cta: 'Sit it', run: 'App.planRun("exam")', done: this.isDone(d, 'exam')
      });
    }

    // 5) Hours. Not studying, but it is the thing that quietly ruins people:
    //    four years of experience nobody wrote down.
    if (window.Locker) {
      const lk = Locker.load();
      const last = lk.entries[0]?.date;
      const stale = !last || this.daysBetween(last, this.today()) >= this.HOURS_STALE_DAYS;
      if (stale) {
        out.push({
          id: 'hours', icon: '⏱️', priority: 5,
          label: last ? 'Log your hours' : 'Start logging your hours',
          detail: last
            ? `Nothing logged since ${last}. Your master plumber signs off on this record years from now.`
            : 'The Board keeps no running total of your 6,800 hours. You have to.',
          cta: 'Open Locker', run: 'App.planRun("hours")', done: false
        });
      }
    }

    out.sort((a, b) => (a.done - b.done) || (a.priority - b.priority));
    return { tasks: out.slice(0, this.MAX_TASKS), streak: this.streak(d), readiness };
  },

  // --- Render --------------------------------------------------------------
  render(user) {
    const el = document.getElementById('planCard');
    if (!el || !user) return;
    const { tasks, streak } = this.tasks(user);

    if (!tasks.length) {
      el.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:6px;">
          <div style="font-family:'Rajdhani',sans-serif;font-weight:700;letter-spacing:1px;color:#fff;">TODAY'S PLAN</div>
          ${this.streakChip(streak)}
        </div>
        <div style="color:#00ff88;font-size:0.9rem;margin-top:10px;">Nothing owed today — you are ahead of your own schedule. 🎉</div>`;
      return;
    }

    const allDone = tasks.every(t => t.done);
    el.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:6px;">
        <div style="font-family:'Rajdhani',sans-serif;font-weight:700;letter-spacing:1px;color:#fff;">TODAY'S PLAN</div>
        ${this.streakChip(streak)}
      </div>
      ${allDone ? `<div style="color:#00ff88;font-size:0.85rem;margin-top:8px;">Plan cleared. Anything past here is bonus. 🎉</div>` : ''}
      <div style="margin-top:10px;">
        ${tasks.map(t => `
          <div style="display:flex;align-items:center;gap:11px;padding:10px 0;border-top:1px solid rgba(255,255,255,0.06);">
            <div style="font-size:1.15rem;opacity:${t.done ? 0.4 : 1};">${t.done ? '✅' : t.icon}</div>
            <div style="flex:1;min-width:0;">
              <div style="color:${t.done ? '#6c6c80' : '#fff'};font-size:0.9rem;font-weight:600;${t.done ? 'text-decoration:line-through;' : ''}">${t.label}</div>
              <div style="color:#6c6c80;font-size:0.76rem;line-height:1.4;">${t.detail}</div>
            </div>
            ${t.done || !t.cta ? '' : `<button class="action-btn primary" style="padding:7px 14px;font-size:0.78rem;white-space:nowrap;" onclick='${t.run}'>${t.cta}</button>`}
          </div>`).join('')}
      </div>`;
  },

  streakChip(streak) {
    if (streak < 2) return '';
    return `<div style="font-family:'Orbitron',sans-serif;font-size:0.95rem;color:#ff6b2b;" title="Consecutive days you have studied">🔥 ${streak} day${streak === 1 ? '' : 's'}</div>`;
  }
};

window.Plan = Plan;

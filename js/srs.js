// 248 Arena — Spaced Repetition (SM-2 lite)
// -----------------------------------------------------------------------------
// Schedules every question you answer: misses come back fast, correct answers
// come back at growing intervals (1d → 3d → interval×ease). This is the engine
// behind "Smart Review" — the single biggest lever on real retention.
//
// Storage: localStorage 'arena248_srs' = { [questionId]: entry }
//   entry = { ease, interval (days), due (ts), reps, lapses, last (ts) }
// Designed to sync server-side later: the whole store is one JSON blob.

const SRS = {
  KEY: 'arena248_srs',
  DAY_MS: 24 * 60 * 60 * 1000,
  RELEARN_MS: 10 * 60 * 1000,   // a miss comes back after ~10 minutes
  MASTERY_DAYS: 21,             // interval at which we call a card "mastered"

  _load() {
    try { return JSON.parse(localStorage.getItem(this.KEY)) || {}; } catch (e) { return {}; }
  },

  _save(data) {
    try { localStorage.setItem(this.KEY, JSON.stringify(data)); } catch (e) {}
  },

  // Record an answer and reschedule the question.
  record(questionId, isCorrect) {
    if (questionId == null) return;
    const data = this._load();
    const now = Date.now();
    const e = data[questionId] || { ease: 2.5, interval: 0, due: now, reps: 0, lapses: 0, last: 0 };

    if (isCorrect) {
      e.reps += 1;
      if (e.reps === 1) e.interval = 1;
      else if (e.reps === 2) e.interval = 3;
      else e.interval = Math.round(e.interval * e.ease);
      e.interval = Math.min(e.interval, 180);          // cap: exam prep, not lifetime memory
      e.ease = Math.min(2.8, e.ease + 0.05);
      e.due = now + e.interval * this.DAY_MS;
    } else {
      e.reps = 0;
      e.lapses += 1;
      e.interval = 0;
      e.ease = Math.max(1.3, e.ease - 0.2);
      e.due = now + this.RELEARN_MS;
    }
    e.last = now;
    data[questionId] = e;
    this._save(data);
  },

  // Question ids currently due for review (most overdue first).
  dueIds(now = Date.now()) {
    const data = this._load();
    return Object.keys(data)
      .filter(id => data[id].due <= now)
      .sort((a, b) => data[a].due - data[b].due)
      .map(Number);
  },

  seen(questionId) {
    return this._load()[questionId] !== undefined;
  },

  // Summary for the dashboard.
  stats(now = Date.now()) {
    const data = this._load();
    const ids = Object.keys(data);
    let due = 0, mastered = 0;
    for (const id of ids) {
      if (data[id].due <= now) due++;
      if (data[id].interval >= this.MASTERY_DAYS) mastered++;
    }
    return { tracked: ids.length, due, mastered, unseen: (window.QUESTIONS?.length || 0) - ids.length };
  }
};

window.SRS = SRS;

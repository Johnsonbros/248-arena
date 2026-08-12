// 248 Arena — Code Conquest
// -----------------------------------------------------------------------------
// The Code Book, turned into territory. 248 CMR isn't one blob of law — it's
// districts: the drainage system, the vent stacks, the gas quarter, the
// licensing gatehouse. Conquest gives each district a card, a rank, and a
// fight, so "study the code book" becomes "take the Vent Spires."
//
// Ranks are earned three ways at once, because comprehension is three things:
//   coverage  — how much of the district you've faced
//   accuracy  — how often you're right when you face it
//   retention — how much the SRS scheduler says you still hold (21d+ interval)
// You can't rank up by grinding one easy question (coverage gates it), by
// racing through everything once (accuracy gates it), or by cramming (the
// Crown demands retention). That's the comprehension benchmark, made a game.
//
// Every question already carries a codeRef citation, so territories derive
// from data the bank already has — nothing new to author per question.

const Conquest = {
  KEY: 'arena248_conquest',

  // --- The map ---------------------------------------------------------------
  // refs are codeRef prefixes; a question belongs to the first territory that
  // matches. `anchor` deep-links into codebook.html.
  TERRITORIES: [
    { id: 'gatehouse',  icon: '🏰', name: 'The Gatehouse',
      sub: 'Board, licensing & permits', refs: ['248 CMR 2.', '248 CMR 3.', '248 CMR 11.'], anchor: 's200' },
    { id: 'basecamp',   icon: '🏕️', name: 'Base Camp',
      sub: 'Definitions, general regs, testing', refs: ['248 CMR 10.03', '248 CMR 10.04', '248 CMR 10.05'], anchor: 's1003' },
    { id: 'foundry',    icon: '⚒️', name: 'The Foundry',
      sub: 'Materials, joints & supports', refs: ['248 CMR 10.06', '248 CMR 10.07', '248 CMR 10.11'], anchor: 's1006' },
    { id: 'undercroft', icon: '🕳️', name: 'The Undercroft',
      sub: 'Traps, cleanouts & interceptors', refs: ['248 CMR 10.08', '248 CMR 10.09'], anchor: 's1008' },
    { id: 'fixturehall', icon: '🚿', name: 'The Fixture Hall',
      sub: 'Plumbing fixtures', refs: ['248 CMR 10.10'], anchor: 's1010' },
    { id: 'waterworks', icon: '💧', name: 'The Waterworks',
      sub: 'Water supply & distribution', refs: ['248 CMR 10.14'], anchor: 's1014' },
    { id: 'drainlands', icon: '🌊', name: 'The Drainlands',
      sub: 'Sanitary drainage', refs: ['248 CMR 10.15'], anchor: 's1015' },
    { id: 'ventspires', icon: '🌬️', name: 'The Vent Spires',
      sub: 'Vents & venting', refs: ['248 CMR 10.16'], anchor: 's1016' },
    { id: 'greywastes', icon: '🌧️', name: 'The Greywastes',
      sub: 'Indirect, special wastes & storm', refs: ['248 CMR 10.12', '248 CMR 10.13', '248 CMR 10.17'], anchor: 's1012' },
    { id: 'gasquarter', icon: '🔥', name: 'The Gas Quarter',
      sub: 'MA fuel gas code (4.00–7.00)', refs: ['248 CMR 4.', '248 CMR 5.', '248 CMR 6.', '248 CMR 7.'], anchor: 'gasmap' },
    { id: 'sanctum',    icon: '🏥', name: 'The Sanctum',
      sub: 'Hospital fixtures & medical gas', refs: ['248 CMR 10.18'], anchor: 's1018' }
  ],

  // Rank ladder. Thresholds check coverage AND accuracy; the Crown adds
  // retention. Order matters — highest first when ranking.
  RANKS: [
    { id: 'crown',  icon: '👑', name: 'Crowned',  xp: 2000, cov: 0.90, acc: 0.85, ret: 0.50 },
    { id: 'gold',   icon: '🥇', name: 'Gold',     xp: 1000, cov: 0.90, acc: 0.85, ret: 0 },
    { id: 'silver', icon: '🥈', name: 'Silver',   xp: 500,  cov: 0.75, acc: 0.75, ret: 0 },
    { id: 'bronze', icon: '🥉', name: 'Bronze',   xp: 250,  cov: 0.50, acc: 0.60, ret: 0 },
    { id: 'scout',  icon: '🗡️', name: 'Scouted',  xp: 50,   cov: 0.25, acc: 0,    ret: 0 },
    { id: 'unexplored', icon: '🌫️', name: 'Unexplored', xp: 0, cov: 0, acc: 0, ret: 0 }
  ],

  // --- Question → territory ---------------------------------------------------
  _index: null,
  index() {
    if (this._index) return this._index;
    const idx = { byTerritory: {}, byQid: {} };
    for (const t of this.TERRITORIES) idx.byTerritory[t.id] = [];
    for (const q of (window.QUESTIONS || [])) {
      const ref = (q.codeRef || '').trim();
      let t = this.TERRITORIES.find(t => t.refs.some(p => ref.startsWith(p)));
      // A bare "248 CMR" citation (what-is-the-code questions) is Base Camp
      // material. Can't be a prefix in refs — it would swallow the whole bank.
      if (!t && ref === '248 CMR') t = this.TERRITORIES.find(x => x.id === 'basecamp');
      if (t) { idx.byTerritory[t.id].push(q.id); idx.byQid[q.id] = t.id; }
    }
    this._index = idx;
    return idx;
  },

  // --- Ledger ------------------------------------------------------------------
  // Per-question lifetime answered/correct — the accuracy half of the rank.
  // Coverage and retention come straight from the SRS store.
  load() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(this.KEY)); } catch (e) {}
    if (!d || typeof d !== 'object') d = {};
    if (!d.q || typeof d.q !== 'object') d.q = {};       // qid -> {a, c}
    if (!d.ranks || typeof d.ranks !== 'object') d.ranks = {}; // territoryId -> rankId already awarded
    return d;
  },

  save(d) {
    try { localStorage.setItem(this.KEY, JSON.stringify(d)); } catch (e) {}
  },

  record(qid, isCorrect) {
    const d = this.load();
    const s = d.q[qid] || (d.q[qid] = { a: 0, c: 0 });
    s.a++; if (isCorrect) s.c++;
    this.save(d);
  },

  // --- Standing ------------------------------------------------------------------
  standing(territoryId, d, srs) {
    const ids = this.index().byTerritory[territoryId] || [];
    const total = ids.length || 1;
    d = d || this.load();
    srs = srs || this._srs();
    let seen = 0, answered = 0, correct = 0, retained = 0;
    for (const id of ids) {
      const s = d.q[id];
      if (s && s.a > 0) { seen++; answered += s.a; correct += s.c; }
      else if (srs[id]) seen++;                      // faced but pre-ledger
      if (srs[id] && (srs[id].interval || 0) >= 21) retained++;
    }
    const coverage = seen / total;
    const accuracy = answered > 0 ? correct / answered : 0;
    const retention = retained / total;
    const rank = this.RANKS.find(r =>
      coverage >= r.cov && accuracy >= r.acc && retention >= r.ret
    ) || this.RANKS[this.RANKS.length - 1];
    return { total, seen, coverage, accuracy, retention, rank };
  },

  _srs() {
    try { return JSON.parse(localStorage.getItem('arena248_srs')) || {}; } catch (e) { return {}; }
  },

  // Newly-earned ranks since last collection. Awards XP once per rank per
  // territory — rank-downs never claw XP back, and re-reaching a rank never
  // re-pays it. Called from the results screen so promotions land with the
  // session that earned them.
  RANK_ORDER: { unexplored: 0, scout: 1, bronze: 2, silver: 3, gold: 4, crown: 5 },

  collectRankUps(user) {
    const d = this.load();
    const srs = this._srs();
    const ups = [];
    for (const t of this.TERRITORIES) {
      const st = this.standing(t.id, d, srs);
      const prev = d.ranks[t.id] || 'unexplored';
      if (this.RANK_ORDER[st.rank.id] > this.RANK_ORDER[prev]) {
        // Pay out every rung climbed this session, not just the top one.
        let xp = 0;
        for (const r of this.RANKS) {
          if (this.RANK_ORDER[r.id] > this.RANK_ORDER[prev] &&
              this.RANK_ORDER[r.id] <= this.RANK_ORDER[st.rank.id]) xp += r.xp;
        }
        d.ranks[t.id] = st.rank.id;
        ups.push({ territory: t, rank: st.rank, xp });
        if (user && window.Auth && xp > 0) Auth.addXP(user, xp);
      }
    }
    if (ups.length) {
      this.save(d);
      if (user) Auth.updateUser(user);
    }
    return ups;
  },

  // Overall campaign: how much of the map is at least Bronze / at least Gold.
  campaign() {
    const d = this.load();
    const srs = this._srs();
    let bronze = 0, gold = 0, crowned = 0;
    for (const t of this.TERRITORIES) {
      const r = this.standing(t.id, d, srs).rank.id;
      if (this.RANK_ORDER[r] >= 2) bronze++;
      if (this.RANK_ORDER[r] >= 4) gold++;
      if (r === 'crown') crowned++;
    }
    return { territories: this.TERRITORIES.length, bronze, gold, crowned };
  },

  // --- Render -------------------------------------------------------------------
  render() {
    const el = document.getElementById('conquestGrid');
    if (!el) return;
    const d = this.load();
    const srs = this._srs();
    const camp = this.campaign();
    const head = document.getElementById('conquestSummary');
    if (head) {
      head.textContent = camp.crowned === camp.territories
        ? '👑 CODE LORD — every district crowned.'
        : `${camp.bronze}/${camp.territories} districts at Bronze+ · ${camp.gold} Gold · ${camp.crowned} Crowned`;
    }
    el.innerHTML = this.TERRITORIES.map(t => {
      const st = this.standing(t.id, d, srs);
      const pct = Math.round(st.coverage * 100);
      const accPct = Math.round(st.accuracy * 100);
      return `
        <div class="mode-card" style="position:relative;" onclick="App.battleTerritory('${t.id}')" title="Battle ${t.name} — ${st.total} questions in this district">
          <div style="position:absolute;top:10px;right:12px;font-size:1.05rem;" title="${st.rank.name}">${st.rank.icon}</div>
          <div class="mode-icon">${t.icon}</div>
          <div class="mode-name" style="font-size:0.95rem;">${t.name}</div>
          <div class="mode-desc">${t.sub}</div>
          <div style="height:6px;background:rgba(255,255,255,0.08);border-radius:3px;overflow:hidden;margin-top:8px;">
            <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#00d4ff,#00ff88);"></div>
          </div>
          <div style="display:flex;justify-content:space-between;color:#6c6c80;font-size:0.7rem;margin-top:5px;">
            <span>${st.seen}/${st.total} explored</span>
            <span>${st.seen ? accPct + '% acc' : ''}</span>
          </div>
          <a href="codebook.html#${t.anchor}" target="_blank" onclick="event.stopPropagation();"
            style="position:absolute;bottom:10px;right:12px;text-decoration:none;font-size:0.85rem;" title="Read this district in the Code Book">📖</a>
        </div>`;
    }).join('');
  }
};

window.Conquest = Conquest;

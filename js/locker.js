// 248 Arena — License Locker
// -----------------------------------------------------------------------------
// The paperwork half of getting licensed. Studying gets you through the exam;
// this gets you TO the exam. Two jobs:
//
//   1. Tell you exactly what the Board wants, why, and who has to sign it.
//   2. Keep the running hour counts — because 248 CMR 11.02 wants 6,800 clock
//      hours of qualifying work experience and 550 clock hours of education,
//      and nobody can reconstruct four years of that from memory when the
//      Statement of Experience form finally lands on their kitchen table.
//
// DELIBERATE DESIGN CONSTRAINT — READ BEFORE EXTENDING THIS FILE:
// The Locker is a TRACKER, not a vault. It stores no document files and no
// personal information as Massachusetts defines it. Under 201 CMR 17.02,
// "Personal Information" is a resident's name combined with a Social Security
// number, driver's license / state ID number, or financial account number.
// The moment we hold any of those, AiSync Services owes a full Written
// Information Security Program under 201 CMR 17.03 — encryption at rest and in
// transit, vendor contracts, breach notification, the lot. The CORI form alone
// carries SSN and DOB. So we track its STATUS and never touch its CONTENTS.
// Actual files belong in the user's own Nextcloud (see docs/DOCUMENT_VAULT.md);
// LOCKER_CONFIG.filesBase below is the opt-in hand-off and ships empty.

const LOCKER_CONFIG = {
  // Optional deep-link to a self-hosted Nextcloud the user controls. Empty =
  // feature off, which is the default and the safe posture. See
  // docs/DOCUMENT_VAULT.md before turning this on — it has compliance strings.
  filesBase: '',
  storageKey: 'arena248_locker'
};

const Locker = {
  // --- Fee schedule (published by the Board / PSI; verify before you pay) ----
  FEES: [
    { label: 'Apprentice plumber application', amount: 14, when: 'Before you can log qualifying hours' },
    { label: 'Apprentice license renewal', amount: 40, when: 'Every 2 years while apprenticing' },
    { label: 'Journeyman application', amount: 31, when: 'Filed on eLIPSE once hours are complete' },
    { label: 'PSI examination fee', amount: 80, when: 'Paid to PSI when you schedule' },
    { label: 'Journeyman license issuance', amount: 52, when: 'After you pass' }
  ],

  // --- Hour targets, straight out of 248 CMR 11.02 --------------------------
  TARGETS: {
    work: 6800,       // 4 years x 1,700 qualifying clock hours per year
    education: 550,   // 5 tiers x 110 clock hours
    workLegacy: 8000, // apprentices licensed before September 1, 2008
    perYear: 1700,
    perTier: 110
  },

  // How long the Board holds an incomplete application before it dies.
  ABANDON_DAYS: 180,

  // --- What the Board actually wants ---------------------------------------
  // `sensitive: true` marks a document that contains 201 CMR 17.02 personal
  // information. Those get a warning in the UI and are never stored here.
  ITEMS: [
    {
      id: 'apprentice-license',
      name: 'Apprentice Plumber License',
      who: 'You — filed on eLIPSE',
      why: 'Hours only count while you hold an apprentice license under a licensed master plumber. Time worked before the license does not count toward the 6,800.',
      cite: '248 CMR 11.02',
      phase: 'before'
    },
    {
      id: 'employment-proof',
      name: 'Proof of employment by a licensed MA master plumber',
      who: 'Your employer',
      why: 'Qualifying experience must be earned as a licensed apprentice working under a Massachusetts master plumber. Keep your master\'s license number with your records.',
      cite: '248 CMR 11.02',
      phase: 'before'
    },
    {
      id: 'hours-log',
      name: 'Your own running hours record',
      who: 'You',
      why: 'The Board does not keep your hours — your master plumber attests to them years later. Log them as you go; the Hours tab below does this for you.',
      cite: '248 CMR 11.02',
      phase: 'before'
    },
    {
      id: 'education',
      name: 'Tier 1–5 schooling (110 clock hours per tier)',
      who: 'An approved school',
      why: '550 clock hours of education total. Pairing 165 education hours in a year with work is what earns you a 1,700-hour year toward the 6,800.',
      cite: '248 CMR 11.02',
      phase: 'before'
    },
    {
      id: 'education-verification',
      name: 'Education Verification Form',
      who: 'Signed by an official at your school',
      why: 'The Board will not take your word or your certificates — a school official signs this form. Request it early; schools are slow in June.',
      cite: 'Board of State Examiners of Plumbers & Gas Fitters',
      phase: 'apply'
    },
    {
      id: 'statement-experience',
      name: 'Statement of Experience Form',
      who: 'Signed by your supervising master plumber',
      why: 'This is where your logged hours go. If you have changed employers you may need one from each master you worked under.',
      cite: 'Board of State Examiners of Plumbers & Gas Fitters',
      phase: 'apply'
    },
    {
      id: 'cori',
      name: 'CORI Acknowledgement Form (DOL)',
      who: 'You — page 2 must be notarized',
      why: 'Criminal Offender Record Information release. Page two requires a notary, so budget a trip to the bank or town hall. This form carries your SSN and date of birth.',
      cite: 'Board of State Examiners of Plumbers & Gas Fitters',
      phase: 'apply',
      sensitive: true
    },
    {
      id: 'photo-id',
      name: 'Government-issued photo ID',
      who: 'You',
      why: 'Needed by the notary for the CORI form and again at the PSI test center on exam day. Check the expiration date now, not the week of the exam.',
      cite: 'PSI candidate requirements',
      phase: 'apply',
      sensitive: true
    },
    {
      id: 'transcript',
      name: 'Vocational school transcript (if claiming vo-tech credit)',
      who: 'Your high school or vocational program',
      why: 'Approved vocational training can be credited toward the requirement — up to 300 education hours and 1,700 experience hours. Only worth chasing if you attended one.',
      cite: '248 CMR 11.02',
      phase: 'apply',
      optional: true
    },
    {
      id: 'name-change',
      name: 'Name-change documentation (if applicable)',
      who: 'You',
      why: 'If the name on your transcript or prior license does not match your application, the Board needs the paper connecting them. A mismatch is a common reason applications stall.',
      cite: 'Board of State Examiners of Plumbers & Gas Fitters',
      phase: 'apply',
      optional: true,
      sensitive: true
    },
    {
      id: 'application-fee',
      name: 'Journeyman application + fee ($31) on eLIPSE',
      who: 'You',
      why: 'Applications must be filed online through eLIPSE. Anything mailed to the Board is returned unprocessed.',
      cite: 'Board of State Examiners of Plumbers & Gas Fitters',
      phase: 'apply'
    },
    {
      id: 'psi-scheduled',
      name: 'PSI exam scheduled + fee ($80)',
      who: 'You, after the Board approves your application',
      why: 'PSI notifies you once the Board approves. You then register and pay PSI directly.',
      cite: 'PSI Exams',
      phase: 'exam'
    },
    {
      id: 'license-fee',
      name: 'License issuance fee ($52)',
      who: 'You, after you pass',
      why: 'Paid once you have a passing score. Then you are a journeyman.',
      cite: 'Board of State Examiners of Plumbers & Gas Fitters',
      phase: 'exam'
    },
    {
      id: 'mce',
      name: 'Continuing education certificates (12 hours / 2 years)',
      who: 'Approved MCE providers',
      why: 'Once licensed, renewal every two years requires 12 hours of Mandatory Continuing Education. Start a folder now so renewal is not a scramble.',
      cite: '248 CMR 11.04',
      phase: 'after'
    }
  ],

  PHASES: {
    before: 'While you apprentice',
    apply: 'Application package',
    exam: 'Exam & license',
    after: 'After you are licensed'
  },

  // --- State ---------------------------------------------------------------
  load() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(LOCKER_CONFIG.storageKey)); } catch (e) {}
    if (!d || typeof d !== 'object') d = {};
    if (!d.items || typeof d.items !== 'object') d.items = {};
    if (!Array.isArray(d.entries)) d.entries = [];
    if (!d.legacy) d.legacy = false;   // pre-Sept-2008 apprentice = 8,000 hours
    return d;
  },

  save(d) {
    try { localStorage.setItem(LOCKER_CONFIG.storageKey, JSON.stringify(d)); } catch (e) {}
    // Four years of hours must survive a cleared cache or a lost phone, so every
    // change rides the existing (debounced) progress sync. Safe to send: the
    // Locker holds no personal information by construction.
    try { if (window.CloudSync && window.App && App.user) CloudSync.push(App.user); } catch (e) {}
  },

  // --- PII guard -----------------------------------------------------------
  // Notes are free text, and free text is where people paste things they
  // shouldn't. This refuses anything shaped like an SSN, a license number, or
  // a card number rather than quietly storing it. Deliberately blunt: a false
  // positive costs the user a rewrite, a false negative costs us a WISP.
  PII_PATTERNS: [
    { re: /\b\d{3}-\d{2}-\d{4}\b/, what: 'a Social Security number' },
    { re: /\b\d{9}\b/, what: 'a 9-digit number (SSN?)' },
    { re: /\b(?:\d[ -]?){13,16}\b/, what: 'a card or account number' },
    { re: /\bS\d{8}\b/i, what: 'a Massachusetts license number' },
    { re: /\b(ssn|social security)\b/i, what: 'a Social Security number' }
  ],

  scrub(text) {
    const t = String(text || '');
    for (const p of this.PII_PATTERNS) {
      if (p.re.test(t)) return { ok: false, what: p.what };
    }
    return { ok: true, text: t.slice(0, 240) };
  },

  // --- Hour math -----------------------------------------------------------
  totals(d) {
    let work = 0, education = 0;
    for (const e of d.entries) {
      if (e.kind === 'education') education += Number(e.hours) || 0;
      else work += Number(e.hours) || 0;
    }
    const workTarget = d.legacy ? this.TARGETS.workLegacy : this.TARGETS.work;
    return {
      work, education, workTarget,
      eduTarget: this.TARGETS.education,
      workPct: Math.min(100, Math.round((work / workTarget) * 100)),
      eduPct: Math.min(100, Math.round((education / this.TARGETS.education) * 100)),
      // At the regulation's own pace — 1,700 qualifying hours a year — how much
      // calendar time is left? Honest, and more motivating than a raw count.
      yearsLeft: Math.max(0, (workTarget - work) / this.TARGETS.perYear)
    };
  },

  progress(d) {
    const required = this.ITEMS.filter(i => !i.optional);
    const done = required.filter(i => d.items[i.id]?.status === 'done').length;
    return { done, total: required.length, pct: Math.round((done / required.length) * 100) };
  },

  // --- Actions -------------------------------------------------------------
  setStatus(id, status) {
    const d = this.load();
    const cur = d.items[id] || {};
    // Three states: untouched, in progress, done. Done stamps the date so the
    // 180-day abandonment clock can be reasoned about later.
    d.items[id] = { ...cur, status, date: status === 'done' ? this.today() : (cur.date || '') };
    this.save(d);
    return d;
  },

  setNote(id, text) {
    const check = this.scrub(text);
    if (!check.ok) return check;
    const d = this.load();
    d.items[id] = { ...(d.items[id] || {}), note: check.text };
    this.save(d);
    return { ok: true };
  },

  addEntry({ date, hours, kind, where, note }) {
    const h = Number(hours);
    if (!isFinite(h) || h <= 0 || h > 400) return { ok: false, what: 'an hour count between 1 and 400' };
    const w = this.scrub(where);
    if (!w.ok) return w;
    const n = this.scrub(note);
    if (!n.ok) return n;
    const d = this.load();
    d.entries.unshift({
      id: 'e' + Date.now() + Math.floor(Math.random() * 1000),
      date: date || this.today(),
      hours: Math.round(h * 10) / 10,
      kind: kind === 'education' ? 'education' : 'work',
      where: w.text.slice(0, 80),
      note: n.text.slice(0, 160)
    });
    d.entries.sort((a, b) => (a.date < b.date ? 1 : -1));
    this.save(d);
    return { ok: true };
  },

  removeEntry(id) {
    const d = this.load();
    d.entries = d.entries.filter(e => e.id !== id);
    this.save(d);
    return d;
  },

  setLegacy(on) {
    const d = this.load();
    d.legacy = !!on;
    this.save(d);
    return d;
  },

  today() {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
  },

  // --- Export --------------------------------------------------------------
  // The point of logging four years of hours is handing a clean summary to the
  // master plumber who has to sign the Statement of Experience. CSV for their
  // records, and a print view they can read at the kitchen table.
  csv() {
    const d = this.load();
    const rows = [['Date', 'Hours', 'Type', 'Employer / School', 'Note']];
    for (const e of d.entries) rows.push([e.date, e.hours, e.kind, e.where, e.note]);
    return rows.map(r => r.map(c => `"${String(c == null ? '' : c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  },

  downloadCsv() {
    const blob = new Blob([this.csv()], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `plumbing-hours-${this.today()}.csv`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
  },

  // Month-by-month rollup — the shape a Statement of Experience wants.
  byMonth(d) {
    const m = {};
    for (const e of d.entries) {
      const key = (e.date || '').slice(0, 7);
      if (!key) continue;
      if (!m[key]) m[key] = { work: 0, education: 0, where: new Set() };
      m[key][e.kind === 'education' ? 'education' : 'work'] += Number(e.hours) || 0;
      if (e.where) m[key].where.add(e.where);
    }
    return Object.keys(m).sort().reverse().map(k => ({
      month: k, work: m[k].work, education: m[k].education,
      where: [...m[k].where].join(', ')
    }));
  }
};

// =============================================================================
// UI — rendered into #screen-locker. Kept here rather than in app.js so the
// whole feature is one file you can read top to bottom.
// =============================================================================

const lkEsc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

Object.assign(Locker, {
  tab: 'checklist',

  render() {
    const el = document.getElementById('screen-locker');
    if (!el) return;
    const d = this.load();
    el.innerHTML = `
      <div class="section-header">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm3 12c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/></svg>
        LICENSE LOCKER
      </div>
      <p style="color:#9898b0;font-size:0.88rem;margin:0 0 14px;line-height:1.55;">
        Studying gets you through the exam. This gets you <em>to</em> it — every form the Board
        wants, who signs it, and the running hour counts 248 CMR 11.02 requires.
      </p>
      <div style="display:flex;gap:8px;margin-bottom:16px;">
        <button class="action-btn ${this.tab === 'checklist' ? 'primary' : ''}" style="flex:1;" onclick="Locker.go('checklist')">📋 Checklist</button>
        <button class="action-btn ${this.tab === 'hours' ? 'primary' : ''}" style="flex:1;" onclick="Locker.go('hours')">⏱️ Hours</button>
      </div>
      ${this.tab === 'hours' ? this.renderHours(d) : this.renderChecklist(d)}
      ${this.privacyNote()}`;
  },

  go(tab) { this.tab = tab; this.render(); },

  privacyNote() {
    const nc = LOCKER_CONFIG.filesBase;
    return `
      <div style="margin-top:22px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,45,85,0.3);border-radius:12px;padding:16px 18px;">
        <div style="font-family:'Rajdhani',sans-serif;font-weight:700;letter-spacing:1px;color:#ff6b2b;margin-bottom:8px;">WHAT THIS DOES AND DOESN'T HOLD</div>
        <p style="color:#9898b0;font-size:0.82rem;line-height:1.6;margin:0 0 8px;">
          The Locker tracks the <strong>status</strong> of your paperwork and your <strong>hour counts</strong>.
          It never stores the documents themselves, and it will refuse to save a Social Security number,
          licence number, or account number if you try to type one into a note.
        </p>
        <p style="color:#6c6c80;font-size:0.78rem;line-height:1.6;margin:0;">
          That is deliberate. Your CORI form carries your SSN and date of birth — under Massachusetts
          201 CMR 17.02 that is protected personal information, and the safest place for it is your own
          storage, not ours. ${nc
            ? `Your private document space: <a href="${lkEsc(nc)}" target="_blank" rel="noopener" style="color:#00d4ff;">open file storage →</a>`
            : `Keep the actual files in your own encrypted storage or the Board's eLIPSE portal.`}
        </p>
      </div>`;
  },

  // --- Checklist -----------------------------------------------------------
  renderChecklist(d) {
    const p = this.progress(d);
    const groups = Object.keys(this.PHASES).map(phase => {
      const items = this.ITEMS.filter(i => i.phase === phase);
      if (!items.length) return '';
      return `
        <div style="font-family:'Rajdhani',sans-serif;font-weight:700;letter-spacing:1px;color:#00d4ff;margin:20px 0 10px;text-transform:uppercase;font-size:0.8rem;">
          ${lkEsc(this.PHASES[phase])}
        </div>
        ${items.map(i => this.itemCard(i, d.items[i.id] || {})).join('')}`;
    }).join('');

    return `
      <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(0,212,255,0.25);border-radius:14px;padding:16px 18px;margin-bottom:6px;">
        <div style="display:flex;justify-content:space-between;align-items:baseline;">
          <div style="font-family:'Rajdhani',sans-serif;font-weight:700;letter-spacing:1px;color:#fff;">PACKAGE PROGRESS</div>
          <div style="font-family:'Orbitron',sans-serif;font-size:1.3rem;color:#00ff88;">${p.done}/${p.total}</div>
        </div>
        <div style="height:10px;background:rgba(255,255,255,0.08);border-radius:5px;overflow:hidden;margin:10px 0 8px;">
          <div style="height:100%;width:${p.pct}%;background:linear-gradient(90deg,#00d4ff,#00ff88);transition:width .5s;"></div>
        </div>
        <div style="color:#6c6c80;font-size:0.78rem;">
          Once you file, the Board holds an incomplete application open for ${this.ABANDON_DAYS} days.
          Miss that window and it is treated as abandoned — new application, new fee.
        </div>
      </div>
      ${groups}
      ${this.renderFees()}`;
  },

  itemCard(item, state) {
    const status = state.status || 'todo';
    const ring = status === 'done' ? '#00ff88' : status === 'doing' ? '#ff6b2b' : 'rgba(255,255,255,0.1)';
    const btn = (val, label) => `<button onclick="Locker.tap('${item.id}','${val}')"
      style="flex:1;padding:6px 4px;font-size:0.72rem;font-family:'Rajdhani',sans-serif;font-weight:700;letter-spacing:.5px;
      border-radius:7px;cursor:pointer;border:1px solid ${status === val ? ring : 'rgba(255,255,255,0.12)'};
      background:${status === val ? 'rgba(0,212,255,0.12)' : 'transparent'};color:${status === val ? '#fff' : '#9898b0'};">${label}</button>`;

    return `
      <div style="background:rgba(255,255,255,0.03);border:1px solid ${ring};border-radius:12px;padding:14px 16px;margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;">
          <div style="font-weight:700;color:#fff;font-size:0.95rem;line-height:1.35;">
            ${lkEsc(item.name)}${item.optional ? ' <span style="color:#6c6c80;font-weight:400;font-size:0.78rem;">(if it applies to you)</span>' : ''}
          </div>
          ${status === 'done' ? '<span style="color:#00ff88;font-size:1.1rem;">✓</span>' : ''}
        </div>
        <div style="color:#c8c8d8;font-size:0.8rem;margin:6px 0 4px;"><strong style="color:#9898b0;">Signed by:</strong> ${lkEsc(item.who)}</div>
        <div style="color:#9898b0;font-size:0.82rem;line-height:1.55;margin-bottom:8px;">${lkEsc(item.why)}</div>
        ${item.sensitive ? `<div style="color:#ff6b2b;font-size:0.76rem;margin-bottom:8px;">🔒 Contains personal information — keep this one in your own secure storage, not in a note here.</div>` : ''}
        <div style="color:#6c6c80;font-size:0.72rem;margin-bottom:10px;">Source: ${lkEsc(item.cite)}</div>
        <div style="display:flex;gap:6px;margin-bottom:8px;">
          ${btn('todo', 'NOT STARTED')}${btn('doing', 'IN PROGRESS')}${btn('done', 'DONE')}
        </div>
        ${state.date && status === 'done' ? `<div style="color:#00ff88;font-size:0.74rem;margin-bottom:8px;">Marked done ${lkEsc(state.date)}</div>` : ''}
        <input type="text" maxlength="240" placeholder="Note — who you asked, when to follow up…"
          value="${lkEsc(state.note || '')}" onchange="Locker.note('${item.id}', this)"
          style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.04);color:#fff;font-size:0.82rem;">
      </div>`;
  },

  renderFees() {
    const total = this.FEES.reduce((a, f) => a + f.amount, 0);
    return `
      <div style="font-family:'Rajdhani',sans-serif;font-weight:700;letter-spacing:1px;color:#00d4ff;margin:22px 0 10px;text-transform:uppercase;font-size:0.8rem;">What it costs</div>
      <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:14px 16px;">
        ${this.FEES.map(f => `
          <div style="display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
            <div style="color:#c8c8d8;font-size:0.85rem;">${lkEsc(f.label)}<div style="color:#6c6c80;font-size:0.74rem;">${lkEsc(f.when)}</div></div>
            <div style="color:#fff;font-family:'Orbitron',sans-serif;font-size:0.9rem;white-space:nowrap;">$${f.amount}</div>
          </div>`).join('')}
        <div style="display:flex;justify-content:space-between;padding-top:10px;">
          <div style="color:#9898b0;font-size:0.85rem;font-weight:700;">Roughly, start to licence</div>
          <div style="color:#00ff88;font-family:'Orbitron',sans-serif;">$${total}</div>
        </div>
        <div style="color:#6c6c80;font-size:0.72rem;margin-top:10px;line-height:1.5;">
          Fees change. Confirm the current schedule with the Board of State Examiners of Plumbers and Gas Fitters
          before you pay — this is a planning estimate, not a quote.
        </div>
      </div>`;
  },

  // --- Hours ---------------------------------------------------------------
  renderHours(d) {
    const t = this.totals(d);
    const months = this.byMonth(d);
    const bar = (pct, from, to) => `
      <div style="height:10px;background:rgba(255,255,255,0.08);border-radius:5px;overflow:hidden;margin:8px 0 6px;">
        <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,${from},${to});transition:width .5s;"></div>
      </div>`;

    return `
      <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(0,212,255,0.25);border-radius:14px;padding:16px 18px;margin-bottom:14px;">
        <div style="display:flex;justify-content:space-between;align-items:baseline;">
          <div style="font-family:'Rajdhani',sans-serif;font-weight:700;letter-spacing:1px;color:#fff;">QUALIFYING WORK HOURS</div>
          <div style="font-family:'Orbitron',sans-serif;font-size:1.2rem;color:#00d4ff;">${t.work.toLocaleString()} / ${t.workTarget.toLocaleString()}</div>
        </div>
        ${bar(t.workPct, '#00d4ff', '#00ff88')}
        <div style="color:#9898b0;font-size:0.82rem;">
          ${t.work >= t.workTarget
            ? 'Hour requirement met — get your Statement of Experience signed.'
            : `About ${t.yearsLeft.toFixed(1)} more years at the regulation's pace of ${this.TARGETS.perYear.toLocaleString()} hours a year.`}
        </div>

        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-top:18px;">
          <div style="font-family:'Rajdhani',sans-serif;font-weight:700;letter-spacing:1px;color:#fff;">EDUCATION HOURS</div>
          <div style="font-family:'Orbitron',sans-serif;font-size:1.2rem;color:#ff6b2b;">${t.education.toLocaleString()} / ${t.eduTarget.toLocaleString()}</div>
        </div>
        ${bar(t.eduPct, '#ff6b2b', '#ff2d55')}
        <div style="color:#9898b0;font-size:0.82rem;">Five tiers at ${this.TARGETS.perTier} clock hours each.</div>

        <div style="color:#6c6c80;font-size:0.76rem;line-height:1.6;margin-top:14px;border-top:1px solid rgba(255,255,255,0.08);padding-top:12px;">
          Per <strong style="color:#9898b0;">248 CMR 11.02</strong>: for each year you obtain 165 clock hours of
          education, you must accrue 1,700 clock hours of qualifying work experience. Four such years is the
          6,800 hours the journeyman exam requires.
        </div>
        <label style="display:flex;align-items:center;gap:8px;color:#9898b0;font-size:0.78rem;margin-top:10px;cursor:pointer;">
          <input type="checkbox" ${d.legacy ? 'checked' : ''} onchange="Locker.legacy(this.checked)">
          I was licensed as an apprentice before September 1, 2008 (8,000-hour legacy standard)
        </label>
      </div>

      <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:14px 16px;margin-bottom:14px;">
        <div style="font-family:'Rajdhani',sans-serif;font-weight:700;letter-spacing:1px;color:#fff;margin-bottom:10px;">LOG HOURS</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;">
          <input id="lkDate" type="date" value="${this.today()}" style="flex:1 1 130px;padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.04);color:#fff;">
          <input id="lkHours" type="number" min="0.5" max="400" step="0.5" placeholder="Hours" style="flex:1 1 90px;padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.04);color:#fff;">
          <select id="lkKind" style="flex:1 1 120px;padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.12);background:#14141c;color:#fff;">
            <option value="work">Work</option>
            <option value="education">School</option>
          </select>
        </div>
        <input id="lkWhere" type="text" maxlength="80" placeholder="Employer or school" style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.04);color:#fff;margin-bottom:8px;">
        <input id="lkNote" type="text" maxlength="160" placeholder="What you worked on (optional)" style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.04);color:#fff;margin-bottom:10px;">
        <div id="lkErr" style="color:#ff2d55;font-size:0.78rem;margin-bottom:8px;display:none;"></div>
        <button class="action-btn primary" style="width:100%;" onclick="Locker.add()">Add entry</button>
      </div>

      ${months.length ? `
        <div style="font-family:'Rajdhani',sans-serif;font-weight:700;letter-spacing:1px;color:#00d4ff;margin:20px 0 10px;text-transform:uppercase;font-size:0.8rem;">Month by month</div>
        <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:6px 14px;margin-bottom:12px;overflow-x:auto;">
          ${months.map(m => `
            <div style="display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
              <div style="color:#c8c8d8;font-size:0.85rem;">${lkEsc(m.month)}<div style="color:#6c6c80;font-size:0.72rem;">${lkEsc(m.where) || '—'}</div></div>
              <div style="text-align:right;white-space:nowrap;">
                <span style="color:#00d4ff;font-size:0.85rem;">${m.work} work</span>
                ${m.education ? `<span style="color:#ff6b2b;font-size:0.85rem;"> · ${m.education} school</span>` : ''}
              </div>
            </div>`).join('')}
        </div>
        <button class="action-btn" style="width:100%;margin-bottom:14px;" onclick="Locker.downloadCsv()">⬇ Export hours as CSV</button>
        <div style="color:#6c6c80;font-size:0.76rem;line-height:1.55;margin-bottom:18px;">
          Hand the export to the master plumber signing your Statement of Experience. It is your record —
          the Board does not keep one for you.
        </div>` : `
        <div style="color:#6c6c80;font-size:0.85rem;padding:18px;text-align:center;">
          No hours logged yet. Add a week and the counters start moving.
        </div>`}

      ${d.entries.length ? `
        <div style="font-family:'Rajdhani',sans-serif;font-weight:700;letter-spacing:1px;color:#00d4ff;margin:20px 0 10px;text-transform:uppercase;font-size:0.8rem;">Entries</div>
        ${d.entries.slice(0, 60).map(e => `
          <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:9px 12px;margin-bottom:6px;">
            <div style="min-width:0;">
              <div style="color:#fff;font-size:0.85rem;">${lkEsc(e.date)} · ${e.hours}h ${e.kind === 'education' ? '📘' : '🔧'}</div>
              <div style="color:#6c6c80;font-size:0.74rem;overflow:hidden;text-overflow:ellipsis;">${lkEsc(e.where)}${e.note ? ' — ' + lkEsc(e.note) : ''}</div>
            </div>
            <button onclick="Locker.del('${e.id}')" style="background:none;border:none;color:#ff2d55;cursor:pointer;font-size:1rem;padding:4px 6px;" title="Delete entry">✕</button>
          </div>`).join('')}
        ${d.entries.length > 60 ? `<div style="color:#6c6c80;font-size:0.76rem;padding:8px 0;">Showing the 60 most recent of ${d.entries.length}. All of them are in the CSV export.</div>` : ''}` : ''}`;
  },

  // --- Handlers ------------------------------------------------------------
  tap(id, status) { this.setStatus(id, status); this.render(); },

  note(id, input) {
    const r = this.setNote(id, input.value);
    if (!r.ok) {
      input.value = '';
      alert(`That note looks like it contains ${r.what}. The Locker will not store it — keep documents with personal information in your own secure storage.`);
    }
  },

  legacy(on) { this.setLegacy(on); this.render(); },

  del(id) { this.removeEntry(id); this.render(); },

  add() {
    const err = document.getElementById('lkErr');
    const r = this.addEntry({
      date: document.getElementById('lkDate').value,
      hours: document.getElementById('lkHours').value,
      kind: document.getElementById('lkKind').value,
      where: document.getElementById('lkWhere').value,
      note: document.getElementById('lkNote').value
    });
    if (!r.ok) {
      err.textContent = `Needs ${r.what}.`;
      err.style.display = 'block';
      return;
    }
    this.render();
  }
});

window.Locker = Locker;
window.LOCKER_CONFIG = LOCKER_CONFIG;


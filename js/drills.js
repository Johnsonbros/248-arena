// 248 Arena — Calculation Drills
// -----------------------------------------------------------------------------
// The real exam makes you WORK problems, not just recall facts. This generates
// randomized calculation questions from parameterized templates — infinite
// variants, each with a worked solution, in the same shape as bank questions
// so every mode/renderer handles them unchanged.
//
// Ids start at 100000 so they never collide with the bank (and so the spaced-
// repetition scheduler treats each generated instance as ephemeral rather than
// polluting the review queue — see SKIP_SRS below).

const Drills = {
  ID_BASE: 100000,
  _seq: 0,

  _id() { return this.ID_BASE + (this._seq++); },
  _pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; },
  _int(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; },

  // DFU values used by the drills (mirrors the Code Book table in 10.15).
  DFU: {
    'water closet (1.6 gpf)': 3, 'lavatory': 1, 'bathtub': 2, 'shower': 2,
    'kitchen sink': 2, 'laundry tray': 2, 'clothes washer': 3, 'drinking fountain': 0.5,
    'floor drain': 2, 'urinal': 2
  },

  // Max DFU by horizontal branch size (10.15) — used for sizing drills.
  BRANCH_CAPACITY: [
    { size: '1-1/2 inch', max: 3 },
    { size: '2 inch', max: 6 },
    { size: '3 inch', max: 20 },
    { size: '4 inch', max: 160 }
  ],

  TRAP_ARM: [
    { trap: '1-1/4 inch', max: '3 feet 6 inches' },
    { trap: '1-1/2 inch', max: '5 feet' },
    { trap: '2 inch', max: '8 feet' },
    { trap: '3 inch', max: '12 feet' },
    { trap: '4 inch', max: '16 feet' }
  ],

  // --- templates -------------------------------------------------------------
  // Each returns a question object identical in shape to bank questions.

  // 1) Total the drainage fixture units for a fixture list.
  dfuTotal() {
    const names = Object.keys(this.DFU);
    const picks = [];
    let total = 0;
    const n = this._int(3, 5);
    const used = new Set();
    while (picks.length < n) {
      const name = this._pick(names);
      if (used.has(name)) continue;
      used.add(name);
      const qty = this._int(1, 3);
      picks.push({ name, qty });
      total += this.DFU[name] * qty;
    }
    const list = picks.map(p => `${p.qty} × ${p.name}`).join(', ');
    const work = picks.map(p => `${p.qty} × ${p.name} @ ${this.DFU[p.name]} = ${p.qty * this.DFU[p.name]}`).join('\n');
    const fmt = v => (Number.isInteger(v) ? String(v) : v.toFixed(1));
    const distractors = new Set();
    while (distractors.size < 3) {
      const d = total + this._pick([-3, -2, -1, 1, 2, 3, 4]) * (Math.random() < 0.5 ? 1 : 0.5);
      if (d > 0 && d !== total) distractors.add(fmt(d));
    }
    return this._build({
      category: 'SIZING', difficulty: 2,
      question: `A branch serves: ${list}. What is the total drainage fixture unit (DFU) load?`,
      correctText: `${fmt(total)} DFU`,
      wrongTexts: [...distractors].map(d => `${d} DFU`),
      explanation: `Add each fixture's DFU value:\n${work}\nTotal = ${fmt(total)} DFU.`,
      codeRef: '248 CMR 10.15'
    });
  },

  // 2) Size a horizontal branch for a given DFU load.
  branchSize() {
    const tier = this._pick(this.BRANCH_CAPACITY.slice(0, 3));
    const idx = this.BRANCH_CAPACITY.indexOf(tier);
    const below = idx > 0 ? this.BRANCH_CAPACITY[idx - 1].max : 0;
    const load = this._int(below + 1, tier.max);
    return this._build({
      category: 'SIZING', difficulty: 2,
      question: `A horizontal fixture branch carries a total load of ${load} DFU. What is the minimum pipe size?`,
      correctText: tier.size,
      wrongTexts: this.BRANCH_CAPACITY.filter(t => t.size !== tier.size).map(t => t.size),
      explanation: `A ${tier.size} horizontal branch carries up to ${tier.max} DFU${below ? `, and the next size down (${this.BRANCH_CAPACITY[idx - 1].size}) tops out at ${below} DFU` : ''}. With ${load} DFU, the minimum is ${tier.size}.`,
      codeRef: '248 CMR 10.15'
    });
  },

  // 3) Slope: total fall across a run.
  slopeFall() {
    const size = this._pick(['3 inch', '4 inch']);
    const slope = size === '3 inch' ? 0.25 : 0.125;
    const slopeText = size === '3 inch' ? '1/4 inch per foot' : '1/8 inch per foot';
    const run = this._int(12, 60);
    const fall = run * slope;
    const fmt = v => `${v} inches`;
    const wrong = new Set();
    while (wrong.size < 3) {
      const alt = this._pick([run * 0.5, run * 0.125, run * 0.25, fall + this._int(1, 6), fall - this._int(1, 5)]);
      if (alt > 0 && Math.abs(alt - fall) > 0.01) wrong.add(fmt(Number(alt.toFixed(2))));
    }
    return this._build({
      category: 'SIZING', difficulty: 2,
      question: `A ${size} horizontal drain runs ${run} feet at minimum slope. How much total fall is required?`,
      correctText: fmt(Number(fall.toFixed(2))),
      wrongTexts: [...wrong],
      explanation: `A ${size} drain requires a minimum slope of ${slopeText}. ${run} ft × ${slope} in/ft = ${Number(fall.toFixed(2))} inches of fall.`,
      codeRef: '248 CMR 10.15'
    });
  },

  // 4) Trap arm: is this run legal?
  trapArm() {
    const row = this._pick(this.TRAP_ARM.slice(0, 4));
    return this._build({
      category: 'VENTING', difficulty: 2,
      question: `What is the maximum developed length of the trap arm (trap to vent) for a ${row.trap} trap?`,
      correctText: row.max,
      wrongTexts: this.TRAP_ARM.filter(t => t.max !== row.max).map(t => t.max),
      explanation: `Per the trap-to-vent distance table, a ${row.trap} trap arm may not exceed ${row.max} of developed length. Beyond that, the trap can self-siphon.`,
      codeRef: '248 CMR 10.16'
    });
  },

  // 5) Vent sizing: half the drain, never under 1-1/4".
  ventSize() {
    const drain = this._pick(['1-1/2 inch', '2 inch', '3 inch', '4 inch']);
    const map = { '1-1/2 inch': '1-1/4 inch', '2 inch': '1-1/4 inch', '3 inch': '1-1/2 inch', '4 inch': '2 inch' };
    const answer = map[drain];
    const halves = { '1-1/2 inch': '3/4 inch', '2 inch': '1 inch', '3 inch': '1-1/2 inch', '4 inch': '2 inch' };
    return this._build({
      category: 'VENTING', difficulty: 2,
      question: `An individual vent serves a ${drain} fixture drain. What is the minimum vent size?`,
      correctText: answer,
      wrongTexts: ['1 inch', '1-1/2 inch', '2 inch', '3 inch'].filter(s => s !== answer),
      explanation: `A vent must be at least half the diameter of the drain it serves (half of ${drain} = ${halves[drain]}), but never smaller than 1-1/4 inches. Minimum here: ${answer}.`,
      codeRef: '248 CMR 10.16'
    });
  },

  // 6) Gas: convert appliance load to cubic feet per hour.
  gasCfh() {
    const appliances = [
      { name: 'furnace', btu: this._int(60, 120) * 1000 },
      { name: 'water heater', btu: this._int(30, 50) * 1000 },
      { name: 'range', btu: this._int(60, 70) * 1000 },
      { name: 'dryer', btu: this._int(20, 35) * 1000 }
    ];
    const chosen = appliances.slice(0, this._int(2, 4));
    const totalBtu = chosen.reduce((s, a) => s + a.btu, 0);
    const cfh = Math.round(totalBtu / 1000);
    const list = chosen.map(a => `${a.name} (${a.btu.toLocaleString()} BTU/hr)`).join(', ');
    const wrong = new Set();
    while (wrong.size < 3) {
      const alt = this._pick([cfh * 2, Math.round(cfh / 2), cfh + this._int(10, 60), Math.max(1, cfh - this._int(10, 40))]);
      if (alt > 0 && alt !== cfh) wrong.add(`${alt} CFH`);
    }
    return this._build({
      category: 'GAS', difficulty: 3,
      question: `A gas line serves: ${list}. Using 1,000 BTU per cubic foot for natural gas, what is the demand in cubic feet per hour?`,
      correctText: `${cfh} CFH`,
      wrongTexts: [...wrong],
      explanation: `Total load = ${totalBtu.toLocaleString()} BTU/hr. Natural gas ≈ 1,000 BTU per cubic foot, so ${totalBtu.toLocaleString()} ÷ 1,000 = ${cfh} CFH. (Use this demand plus the longest run length to size the pipe.)`,
      codeRef: '248 CMR 4.00'
    });
  },

  // 7) Water heater relief discharge / thermal expansion sanity check.
  waterMath() {
    const psi = this._int(85, 140);
    return this._build({
      category: 'WATER', difficulty: 2,
      question: `Static street pressure at a building measures ${psi} psi. What is required?`,
      correctText: 'A pressure reducing valve (and thermal expansion control on the resulting closed system)',
      wrongTexts: [
        'Nothing — this is within the allowed range',
        'A larger water service only',
        'A vacuum relief valve on the service'
      ],
      explanation: `Maximum static pressure at a fixture is 80 psi. At ${psi} psi a pressure reducing valve is required. A PRV creates a closed system, so thermal expansion must also be controlled (expansion tank).`,
      codeRef: '248 CMR 10.14'
    });
  },

  // --- assembly --------------------------------------------------------------
  _build({ category, difficulty, question, correctText, wrongTexts, explanation, codeRef }) {
    const wrong = [...new Set(wrongTexts)].filter(w => w !== correctText).slice(0, 3);
    while (wrong.length < 3) wrong.push(`None of these (${wrong.length + 1})`); // safety net
    const options = [correctText, ...wrong];
    // shuffle
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
    return {
      id: this._id(),
      category, difficulty, question, options,
      correct: options.indexOf(correctText),
      explanation, codeRef,
      isDrill: true   // renderers/SRS can treat generated questions specially
    };
  },

  TEMPLATES: ['dfuTotal', 'branchSize', 'slopeFall', 'trapArm', 'ventSize', 'gasCfh', 'waterMath'],

  generate(count = 15) {
    const out = [];
    for (let i = 0; i < count; i++) {
      const t = this.TEMPLATES[i % this.TEMPLATES.length];
      out.push(this[t]());
    }
    // shuffle template order so it isn't a predictable cycle
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }
};

window.Drills = Drills;

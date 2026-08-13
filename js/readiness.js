// 248 Arena — Exam Readiness Score
// -----------------------------------------------------------------------------
// Rolls everything the app knows into the one number a student checks daily:
// "Am I ready?" Three honest components:
//   accuracy  (45%) — per-category accuracy weighted by the REAL exam blueprint,
//                     so being great at rare topics can't mask weak core ones
//   retention (30%) — how much of the bank the SRS scheduler shows you're
//                     retaining (interval ≥ 3 days = learned, ≥ 21 = mastered)
//   coverage  (25%) — how much of the bank you've actually faced
// Not a guarantee — a coaching signal tied to the same 70% bar the exam uses.

const Readiness = {
  compute(user) {
    const total = (window.QUESTIONS || []).length || 1;
    const stats = user?.stats?.categoryStats || {};

    // accuracy, blueprint-weighted (unseen categories count as 0)
    let acc = 0;
    let weightSeen = 0;
    for (const [cat, w] of Object.entries(window.EXAM_BLUEPRINT || EXAM_BLUEPRINT)) {
      const s = stats[cat];
      if (s && s.total > 0) {
        acc += w * (s.correct / s.total);
        weightSeen += w;
      }
    }
    // Categories never touched drag the score — that's the point.
    const accuracy = acc; // already weighted against full blueprint (untouched = 0)

    // retention + coverage from the SRS store
    let learned = 0, tracked = 0;
    try {
      const srs = JSON.parse(localStorage.getItem('arena248_srs')) || {};
      const ids = Object.keys(srs);
      tracked = ids.length;
      for (const id of ids) if ((srs[id].interval || 0) >= 3) learned++;
    } catch (e) {}
    const retention = Math.min(1, learned / (total * 0.6));   // retaining 60% of the bank = full marks
    const coverage = Math.min(1, tracked / (total * 0.8));    // faced 80% of the bank = full marks

    const pct = Math.round(100 * (0.45 * accuracy + 0.30 * retention + 0.25 * coverage));

    let message, color;
    if (pct >= 85)      { message = '📅 Book your exam — you\'re ready.'; color = '#00ff88'; }
    else if (pct >= 70) { message = 'Almost there — drill your weak categories.'; color = '#00d4ff'; }
    else if (pct >= 40) { message = 'Solid progress — keep the streak alive.'; color = '#ff6b2b'; }
    else                { message = 'Early days — Practice mode is your friend.'; color = '#ff2d55'; }

    return {
      pct, message, color,
      components: {
        accuracy: Math.round(accuracy * 100),
        retention: Math.round(retention * 100),
        coverage: Math.round(coverage * 100),
        weightSeen: Math.round(weightSeen * 100)
      }
    };
  }
};

window.Readiness = Readiness;

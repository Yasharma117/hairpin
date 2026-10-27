// The passenger's one line at each of three beats. Every scene reads this.
// lines: [expression, words, status]; the expression shows first, then the words.
// Every line is 'DRAFT' until Yash approves it; only then does its status change.
window.HAIRPIN_ROSTER = (() => {
  // what each beat's line has to do, its tone, and the only expressions it may use
  const beats = {
    jorabat: {
      goal: 'Getting in. Who they are in one breath, and why they said yes to this taxi. Leads into "So what do you do?"',
      tone: 'Warm, a little dry. The joke is never on them: it is on the situation, or on me.',
      expressions: ['grins', 'raises an eyebrow', 'squints at the dashboard', 'buckles up'],
    },
    hang: {
      goal: 'Nose over the edge. Their one line under pressure, in character, that gets a laugh while everyone is scared.',
      tone: 'Fast, nervy, still kind. The joke is on the cliff, the car or me, never on them.',
      expressions: ['grips the seat', 'very calm', 'laughs, too loudly', "doesn't look down"],
    },
    shillong: {
      goal: 'At the viewpoint, before the star. A quiet sign-off. Never about the wish, never addressed to one person.',
      tone: 'Soft. No punchline needed.',
      expressions: ['smiles', 'looks at the city', 'stretches', 'nods'],
    },
  };
  // the passenger is whoever the viewer dresses and names at the stand; these are their lines, the name shows on the label.
  // (The 18 teammates and their lines were here until 2026-10-27; they're in git if any line is worth keeping.)
  const lines = {
    jorabat: ['buckles up', 'Shillong, then. Wake me if the road gets interesting.', 'DRAFT'],
    hang: ['grips the seat', "This is the interesting part, isn't it.", 'DRAFT'],
    shillong: ['looks at the city', 'All those lights. Someone awake in every one of them.', 'DRAFT'],
  };
  return { beats, lines };
})();

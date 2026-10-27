// The team at the stand, and the one line each of them gets at three beats. Every scene reads this one list.
// on: shown at the stand. lines: [expression, words, status]; the expression shows first, then the words.
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
  const P = (id, name, tagline, quip, on, jorabat, hang, shillong) => ({ id, name, first: name.split(' ')[0], tagline, quip, on, lines: { jorabat, hang, shillong } });
  const people = [
    P('hardik', 'Hardik Pandya', 'PRs after dark.', 'One small PR before bed. Famous last words.', true,
      ['grins', 'One small drive before bed. Famous last words.', 'DRAFT'], ['laughs, too loudly', 'Revert. Revert the last commit.', 'DRAFT'], ['stretches', 'Merged. Going to bed.', 'DRAFT']),
    P('vivek', 'Vivek Singh', 'Carries the edge cases.', 'The summit is shipping. Yes, we are taking the edge cases with us.', true,
      ['grins', "The summit's shipping. We're taking the edge cases.", 'DRAFT'], ['very calm', "Well. This is the edge case. I'll carry it.", 'DRAFT'], ['looks at the city', 'Summit. Shipped.', 'DRAFT']),
    P('kishore', 'Kishore Sundarajan', 'Keeps titles in line.', 'Left-middle. The title knows where it belongs.', true,
      ['raises an eyebrow', 'Left seat. I know where I belong.', 'DRAFT'], ['grips the seat', 'Nothing is in line right now. Nothing.', 'DRAFT'], ['nods', "Everything's back where it belongs.", 'DRAFT']),
    P('rushil', 'Rushil Jha', 'Tunnel visionary.', 'New tunnel link. Same ambition. Please refresh your bookmark.', true,
      ['grins', "Shillong? I know a shortcut. It's a tunnel. It doesn't exist yet.", 'DRAFT'], ['very calm', 'Okay. New plan. We tunnel out.', 'DRAFT'], ['looks at the city', 'Same ambition. Better view.', 'DRAFT']),
    P('aditya', 'Aditya Shukla', 'Merge material.', 'The prototype works. So does the deployment. Your move.', true,
      ['raises an eyebrow', "Your move. Show me what you've shipped.", 'DRAFT'], ['grips the seat', 'This is not the deployment I approved.', 'DRAFT'], ['nods', 'It works. Ship it.', 'DRAFT']),
    P('ainesh', 'Ainesh Chhetri', 'Makes cents of Monet.', 'Seven hours of focus music. One very intentional paywall.', true,
      ['buckles up', "I brought seven hours of focus music. We'll need four.", 'DRAFT'], ["doesn't look down", 'Skip the ad. Skip the ad. Skip the—', 'DRAFT'], ['smiles', 'Worth the paywall.', 'DRAFT']),
    P('aman', 'Aman Bhadani', 'Call to action.', 'We could solve this in a quick call. Define quick? Great question.', true,
      ['grins', 'Quick question. How quick is this drive?', 'DRAFT'], ['laughs, too loudly', "Let's take this offline. Literally offline.", 'DRAFT'], ['stretches', 'That was a quick one. Define quick? Great question.', 'DRAFT']),
    P('chirag', 'Chirag Pawar', 'Creature comforts.', 'Every good interface deserves a suspiciously smart animal.', true,
      ['squints at the dashboard', 'No mascot on the dashboard? Bold.', 'DRAFT'], ['very calm', 'A goat would have made that bend.', 'DRAFT'], ['looks at the city', 'Somewhere down there is a very smart dog.', 'DRAFT']),
    P('devendra', 'Devendra Singh', 'Popup culture critic.', 'If this popup interrupts me, I am redesigning it.', true,
      ['raises an eyebrow', "If a cow interrupts this ride, I'm redesigning it.", 'DRAFT'], ['grips the seat', "This is the worst modal I've ever seen.", 'DRAFT'], ['nods', 'No popups. Just the view.', 'DRAFT']),
    P('divya', 'Divya Bhatia', 'Pixel detective.', 'That is one pixel off. No, I cannot unsee it.', true,
      ['squints at the dashboard', 'That receipt is one pixel off.', 'DRAFT'], ["doesn't look down", 'We are more than one pixel off the road.', 'DRAFT'], ['smiles', 'Perfectly aligned. Finally.', 'DRAFT']),
    P('harssha', 'Harsshavardan S', 'Designs the dream. Pushes the branch.', 'What if we built it? ...I already opened a branch.', true,
      ['buckles up', 'What if we drove all the way? ...I already opened a branch.', 'DRAFT'], ['very calm', "Okay. This branch, we don't merge.", 'DRAFT'], ['looks at the city', 'Dreamed it. Built it. There it is.', 'DRAFT']),
    P('kartik', 'Kartik Khandekar', 'Blur with benefits.', 'The details are sharp. The background has other plans.', true,
      ['squints at the dashboard', 'Sharp details. The road ahead has other plans.', 'DRAFT'], ["doesn't look down", 'The background is all blur. I love it. I hate it.', 'DRAFT'], ['smiles', 'Look at that bokeh.', 'DRAFT']),
    P('neeru', 'Neeru Yadav', 'Ships with resolve.', 'The happy path is happy. Now show me everything that can go wrong.', true,
      ['buckles up', "Happy path's fine. Now tell me what can go wrong.", 'DRAFT'], ['very calm', 'Ah. So this is what can go wrong.', 'DRAFT'], ['smiles', 'Shipped. Every path covered.', 'DRAFT']),
    P('nikita', 'Nikita Jindal', 'Cleans up the plot.', 'This UGC flow needed a cleanup. I brought the whole broom.', true,
      ['grins', 'Your dashboard needs a cleanup. I brought the broom.', 'DRAFT'], ["doesn't look down", 'This is going to take more than a broom.', 'DRAFT'], ['looks at the city', 'Tidy. I like it.', 'DRAFT']),
    P('pritika', 'Pritika Mishra', 'On a scroll.', 'Just one more scroll. The player has places to be.', true,
      ['buckles up', "Let's go. The player has places to be.", 'DRAFT'], ['grips the seat', 'Scroll back. Please scroll back.', 'DRAFT'], ['stretches', 'One more look. Then home.', 'DRAFT']),
    P('rachit', 'Rachit Jain', 'Writer whisperer.', 'I spoke to 700 writers. The plot thickens.', true,
      ['raises an eyebrow', 'Seven hundred writers, and not one of them wrote this road.', 'DRAFT'], ['laughs, too loudly', 'The plot thickens. So does the cloud.', 'DRAFT'], ['smiles', "Good ending. I'd pitch it.", 'DRAFT']),
    P('satyam', 'Satyam Sinha', 'Has a type.', 'Nice font. I know its name, its weight, and its entire family.', true,
      ['squints at the dashboard', 'Nice font on that receipt. I know its whole family.', 'DRAFT'], ['very calm', 'Whatever happens, the subtitles had good kerning.', 'DRAFT'], ['looks at the city', 'Shillong at night. Set in a lovely serif.', 'DRAFT']),
    P('suzanne', 'Suzanne May DSouza', 'Saves by asking.', 'A good question is cheaper than building the wrong thing.', true,
      ['raises an eyebrow', 'Before we go: do you know where you are going?', 'DRAFT'], ["doesn't look down", 'Good question for later. Why this road?', 'DRAFT'], ['nods', 'Right road after all.', 'DRAFT']),
  ];
  return { beats, people };
})();

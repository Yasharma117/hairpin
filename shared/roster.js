// The team at the stand, and the one line each of them gets at three beats. Every scene reads this one list.
// on: shown at the stand. lines: [expression, words, status]; the expression shows first, then the words.
// Every line is 'DRAFT' until Yash approves it; only then does its status change.
// Only the Jorabat line echoes their quip from the site (the "oh, that's me" moment); the hang and Shillong lines don't.
// The hang leans on the cliffhanger once, in one person's line, and nowhere else.
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
      ['grins', 'One small drive before bed. Famous last words.', 'DRAFT'], ['laughs, too loudly', 'Okay. Okay. Nobody move. Especially you.', 'DRAFT'], ['stretches', 'Home before midnight. Somehow.', 'DRAFT']),
    P('vivek', 'Vivek Singh', 'Carries the edge cases.', 'The summit is shipping. Yes, we are taking the edge cases with us.', true,
      ['grins', "The summit's shipping. We're taking the edge cases.", 'DRAFT'], ['very calm', "Right. Everyone out the side that isn't sky.", 'DRAFT'], ['looks at the city', 'We made it. All of us.', 'DRAFT']),
    P('kishore', 'Kishore Sundarajan', 'Keeps titles in line.', 'Left-middle. The title knows where it belongs.', true,
      ['raises an eyebrow', 'Left seat. I know where I belong.', 'DRAFT'], ['grips the seat', 'Say something calm. No, calmer than that.', 'DRAFT'], ['nods', 'Good drive. Mostly.', 'DRAFT']),
    P('rushil', 'Rushil Jha', 'Tunnel visionary.', 'New tunnel link. Same ambition. Please refresh your bookmark.', true,
      ['grins', "Shillong? I know a shortcut. It's a tunnel. It doesn't exist yet.", 'DRAFT'], ['very calm', 'Good news: the seatbelts work. Bad news: everything else.', 'DRAFT'], ['looks at the city', "I didn't know you could see all of it from here.", 'DRAFT']),
    P('aditya', 'Aditya Shukla', 'Merge material.', 'The prototype works. So does the deployment. Your move.', true,
      ['raises an eyebrow', "Your move. Show me what you've shipped.", 'DRAFT'], ['grips the seat', 'You said you knew this road.', 'DRAFT'], ['nods', 'Same time next weekend?', 'DRAFT']),
    P('ainesh', 'Ainesh Chhetri', 'Makes cents of Monet.', 'Seven hours of focus music. One very intentional paywall.', true,
      ['buckles up', "I brought seven hours of focus music. We'll need four.", 'DRAFT'], ["doesn't look down", 'Not the cliffhanger I wanted.', 'DRAFT'], ['smiles', 'Quiet up here. I like it.', 'DRAFT']),
    P('aman', 'Aman Bhadani', 'Call to action.', 'We could solve this in a quick call. Define quick? Great question.', true,
      ['grins', 'Quick question. How quick is this drive?', 'DRAFT'], ['laughs, too loudly', 'Everyone stay very, very still. Including the car.', 'DRAFT'], ['stretches', 'That was not a quick call.', 'DRAFT']),
    P('chirag', 'Chirag Pawar', 'Creature comforts.', 'Every good interface deserves a suspiciously smart animal.', true,
      ['squints at the dashboard', 'No mascot on the dashboard? Bold.', 'DRAFT'], ['very calm', 'No sudden moves. I think the car can smell fear.', 'DRAFT'], ['looks at the city', 'Every light down there is someone getting home.', 'DRAFT']),
    P('devendra', 'Devendra Singh', 'Popup culture critic.', 'If this popup interrupts me, I am redesigning it.', true,
      ['raises an eyebrow', "If a cow interrupts this ride, I'm redesigning it.", 'DRAFT'], ['grips the seat', 'Who designed this road? I have notes.', 'DRAFT'], ['nods', 'Okay. That was worth the climb.', 'DRAFT']),
    P('divya', 'Divya Bhatia', 'Pixel detective.', 'That is one pixel off. No, I cannot unsee it.', true,
      ['squints at the dashboard', 'That receipt is one pixel off.', 'DRAFT'], ["doesn't look down", "I'm not looking down. Tell me when I can look.", 'DRAFT'], ['smiles', 'I can see my street from here. I think.', 'DRAFT']),
    P('harssha', 'Harsshavardan S', 'Designs the dream. Pushes the branch.', 'What if we built it? ...I already opened a branch.', true,
      ['buckles up', 'What if we drove all the way? ...I already opened a branch.', 'DRAFT'], ['very calm', 'Okay. Plan B. Do we have a plan B?', 'DRAFT'], ['looks at the city', 'Tomorrow, I tell everyone about this.', 'DRAFT']),
    P('kartik', 'Kartik Khandekar', 'Blur with benefits.', 'The details are sharp. The background has other plans.', true,
      ['squints at the dashboard', 'Sharp details. The road ahead has other plans.', 'DRAFT'], ["doesn't look down", "Everything out there is white. That's not a good sign.", 'DRAFT'], ['smiles', 'The city looks better from up here. Most things do.', 'DRAFT']),
    P('neeru', 'Neeru Yadav', 'Ships with resolve.', 'The happy path is happy. Now show me everything that can go wrong.', true,
      ['buckles up', "Happy path's fine. Now tell me what can go wrong.", 'DRAFT'], ['very calm', 'Doors. Slowly. Me first, then you. Go.', 'DRAFT'], ['nods', 'Everyone out, everyone fine. Good.', 'DRAFT']),
    P('nikita', 'Nikita Jindal', 'Cleans up the plot.', 'This UGC flow needed a cleanup. I brought the whole broom.', true,
      ['grins', 'Your dashboard needs a cleanup. I brought the broom.', 'DRAFT'], ["doesn't look down", "We're going to laugh about this. Later. Much later.", 'DRAFT'], ['looks at the city', "That's a lot of lights for one small town.", 'DRAFT']),
    P('pritika', 'Pritika Mishra', 'On a scroll.', 'Just one more scroll. The player has places to be.', true,
      ['buckles up', "Let's go. The player has places to be.", 'DRAFT'], ['grips the seat', 'Please tell me this is the scenic route.', 'DRAFT'], ['stretches', 'Five more minutes here. Then home.', 'DRAFT']),
    P('rachit', 'Rachit Jain', 'Writer whisperer.', 'I spoke to 700 writers. The plot thickens.', true,
      ['raises an eyebrow', 'Seven hundred writers, and not one of them wrote this road.', 'DRAFT'], ['laughs, too loudly', 'Tell me this is not how the story goes.', 'DRAFT'], ['smiles', 'Good ending.', 'DRAFT']),
    P('satyam', 'Satyam Sinha', 'Has a type.', 'Nice font. I know its name, its weight, and its entire family.', true,
      ['squints at the dashboard', 'Nice font on that receipt. I know its whole family.', 'DRAFT'], ['very calm', 'I am very calm. My hands are not.', 'DRAFT'], ['looks at the city', 'Look at that. All of it, lit.', 'DRAFT']),
    P('suzanne', 'Suzanne May DSouza', 'Saves by asking.', 'A good question is cheaper than building the wrong thing.', true,
      ['raises an eyebrow', 'Before we go: do you know where you are going?', 'DRAFT'], ["doesn't look down", 'One question. Whose idea was this road?', 'DRAFT'], ['nods', 'Right road after all.', 'DRAFT']),
  ];
  return { beats, people };
})();

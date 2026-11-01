import { line, passenger } from './kit.js';

const clamp = (n,a=0,b=1) => Math.max(a,Math.min(b,n));
const TIMES = { reveal: 6, festival: 8.7, star: 14, crossing: 9, hold: .9, quotes: [1.6,5.6,10.1,14.6,19.6], end: 24.6 };
const QUOTE = [
  'Years ago I saw one of these and didn’t wish.',
  'I just smiled, and kept it in the bank for when I’d need it.',
  'I think I spent it tonight, at the cloud line.',
  'Maybe he spent his on this road too.',
  'This one, I’m keeping.',
];

// Connected-world ending. Canvas gestures move the air; only an intentional
// press on the wish control, or Space, can keep a wish.
export function loadOverlook(ctx) {
  const { layer,input }=ctx;
  layer.classList.add('world-ending');
  layer.innerHTML=`<style>
    .season-note{position:fixed;left:100px;top:100px;width:min(320px,calc(100vw - 40px));z-index:9;color:#fff1dd;pointer-events:none;animation:overlook-in .9s ease both;text-shadow:0 2px 16px #101d2e;}
    .season-note{box-sizing:border-box;padding:17px 20px 18px;border:1px solid #d2dae330;border-radius:19px;background:linear-gradient(135deg,#172331d9,#17233190);backdrop-filter:blur(12px);box-shadow:inset 0 1px 0 #ffffff0d,0 10px 35px #0002;}
    body:has(.world-ending.is-immersive):not(.map-open) #chapter-rail{background:linear-gradient(90deg,#1b2833ee,#263746ef 48%,#17242fee);border-color:#bdc9d26b;box-shadow:inset 0 0 0 3px #ffffff10,0 8px 24px #0003;}
    body:has(.world-ending.is-immersive):not(.map-open) #chapter-rail button{color:#d0dce2;}
    body:has(.world-ending.is-immersive):not(.map-open) #chapter-rail button:hover{background:#ffffff17;}
    body:has(.world-ending.is-immersive):not(.map-open) #chapter-rail button[aria-current="step"]{background:linear-gradient(#f7faf8,#ccd8d6);color:#223138;}
    body:has(.world-ending.is-immersive):not(.map-open) .story{left:20px;right:auto;width:200px;}
    .season-note .season-kicker{display:block;font:500 10px/1.4 var(--sans,Arial);letter-spacing:.16em;text-transform:uppercase;opacity:.75;margin-bottom:8px;}
    .season-note p{margin:0;font:400 25px/1.15 var(--serif);text-wrap:balance;}
    .season-note small{display:block;margin-top:9px;font:400 13px/1.5 var(--serif);opacity:.8;}
    .petal-invitation{position:fixed;left:50%;bottom:35px;transform:translateX(-50%);z-index:10;color:#f6dedf;font:400 13px/1.5 var(--serif);letter-spacing:.02em;pointer-events:none;opacity:.8;}
    .wish-moment{position:fixed;left:50%;bottom:28px;transform:translateX(-50%);width:310px;max-width:calc(100vw - 40px);z-index:12;text-align:center;color:#fff0d8;animation:overlook-in .6s ease both;}
    .wish-moment[hidden],.season-note[hidden],.petal-invitation[hidden]{display:none!important;}
    .wish-caption{font:400 17px/1.3 var(--serif);margin:0 0 12px;text-shadow:0 2px 12px #101d2e;}
    .wish-control{--wish-progress:0;display:inline-flex;align-items:center;justify-content:center;gap:12px;min-height:55px;padding:7px 22px 7px 8px!important;min-width:208px;color:#fff4df!important;background:linear-gradient(180deg,#3c4248,#101820 50%,#1c2730)!important;border:1px solid #a4afb7!important;box-shadow:inset 0 1px 1px #fff8,0 0 0 2px #ffffff30,0 8px 25px #0004!important;touch-action:none;user-select:none;-webkit-user-select:none;}
    .wish-orbit{display:grid;place-items:center;width:26px;height:26px;border-radius:50%;background:conic-gradient(#ffe2a4 calc(var(--wish-progress)*1turn),#ffffff19 0);padding:2px;box-sizing:border-box;}
    .wish-orbit span{display:grid;place-items:center;width:100%;height:100%;border-radius:50%;background:#1b2026;font-size:17px;color:#ffdda0;}
    .wish-label{font:500 14px/1.2 var(--sans,Arial);}
    .wish-help{font:400 11px/1.4 var(--sans,Arial);opacity:.65;margin:9px 0 0;letter-spacing:.03em;}
    .wish-control.kept{box-shadow:0 0 25px #f2c58923,inset 0 1px 0 #fff7!important;}
    .overlook-quote{position:fixed;left:50%;top:13%;transform:translateX(-50%);width:min(600px,calc(100vw - 40px));z-index:11;text-align:center;pointer-events:none;transition:opacity .6s;}
    .overlook-quote p{opacity:0;transform:translateY(7px);transition:opacity .8s,transform .8s;color:#fff0dc;font:400 clamp(19px,2.2vw,26px)/1.4 var(--serif);margin:0 0 10px;text-wrap:balance;text-shadow:0 2px 18px #101d2e;}
    .overlook-quote p.on{opacity:1;transform:none;}.overlook-quote p:last-child{font-style:italic;margin-top:18px;}.overlook-quote.gone{opacity:0;}.overlook-quote .star{color:#ffdf9e;margin-left:8px;}
    .overlook-end{position:fixed;left:50%;top:12%;transform:translateX(-50%);z-index:14;width:min(390px,calc(100vw - 40px));box-sizing:border-box;padding:28px;text-align:center;animation:overlook-in .6s ease both;}
    .overlook-end h2{margin:0 0 8px;font:400 60px/.95 var(--display);letter-spacing:-.03em;}.overlook-end .by{margin:0 0 18px;font:italic 21px/1.3 var(--serif);}.overlook-end .for{display:block;font-size:10px;letter-spacing:.1em;line-height:1.7;text-transform:uppercase;opacity:.7;}.overlook-end .row{display:flex;justify-content:center;gap:10px;margin-top:22px;}
    .overlook-status{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);}
    @keyframes overlook-in{from{opacity:0}to{opacity:1}}
    @media(max-width:600px){.season-note{left:20px;top:130px;width:260px;}.season-note p{font-size:23px;}.wish-moment{bottom:88px;}.wish-caption{font-size:15px;}.petal-invitation{bottom:92px;width:90%;text-align:center;}.overlook-quote{top:13%;}.overlook-quote p{font-size:18px;line-height:1.35;}.overlook-end{top:13%;padding:24px;}}
    @media(prefers-reduced-motion:reduce){.overlook-quote p{transform:none;transition:opacity .2s;}.season-note,.wish-moment,.overlook-end{animation:none;}}
  </style>
  <aside class="season-note" id="season-note" hidden><span class="season-kicker">November in Shillong</span><p>Cherry Blossom<br>Festival season.</p><small>Here, the hills turn pink in autumn.</small></aside>
  <div class="petal-invitation" id="petal-invitation" hidden>${ctx.isTouch?'Brush the petals to stir the breeze.':'Move through the petals to stir the breeze.'}</div>
  <div class="wish-moment" id="wish-moment" hidden>
    <p class="wish-caption" id="wish-caption">Some wishes are worth keeping.</p>
    <button class="btn wish-control" id="wish" type="button" aria-label="Press and hold to keep a wish" aria-describedby="wish-help"><span class="wish-orbit" aria-hidden="true"><span></span></span><span class="wish-label" id="wish-label">Keep a wish</span></button>
    <p class="wish-help" id="wish-help">${ctx.isTouch?'Press and hold.':'Hold Space, or press and hold.'}</p>
  </div>
  <div class="overlook-quote" id="quote" aria-live="polite">${QUOTE.map(q=>`<p>${q}</p>`).join('')}</div>
  <div class="overlook-status" id="wish-status" aria-live="polite"></div>
  <section class="panel overlook-end" id="end" aria-labelledby="end-t" hidden><h2 id="end-t">Hairpin</h2><p class="by">by Yash Sharma</p><span class="for">Made for Pocket FM Design</span><span class="for">Music: Blue Dot Sessions · CC BY-NC 4.0</span><div class="row"><button class="btn again" id="again" type="button">Again</button><button class="btn" id="title" type="button">Back to the beginning</button></div></section>`;
  const $=s=>layer.querySelector(s),wishButton=$('#wish');
  let phase='arrive',since=0,starK=0,starEnd=Infinity,banked=false,heldFor=0,shown=0,skip=0,wishPressed=false,byeSaid=false,bloomPlayed=false,bankEvent=0,bankedAt=-Infinity;
  let previousPointer=null,breeze={x:0,y:0,strength:0},interactionSeen=false,nextTick=1.7,tickGap=.25;
  const rider=passenger()||{name:'Alex',build:'f',top:'hoodie'},bye=line('shillong');
  ctx.bed({engine:1,crickets:1,wind:.4});ctx.rpm(0);
  function note(hz,delay,volume=.06){const ac=ctx.ac;if(!ac)return;const t=ac.currentTime+delay,o=ac.createOscillator(),g=ac.createGain();o.type='sine';o.frequency.value=hz;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(volume,t+.015);g.gain.exponentialRampToValueAtTime(.0001,t+1.1);o.connect(g);g.connect(ctx.out||ac.destination);o.start(t);o.stop(t+1.2);}
  function bankWish(){banked=true;bankedAt=since;bankEvent++;[659.25,830.61,987.77].forEach((hz,i)=>note(hz,i*.13));try{localStorage.setItem('hairpin.wish',String(Date.now()));}catch{}$('#wish-label').textContent='Wish kept';$('#wish-caption').textContent='For a day you need it.';$('#wish-help').textContent='A small thing to carry home.';$('#wish-status').textContent='Your wish is kept.';wishButton.classList.add('kept');wishButton.setAttribute('aria-label','Wish kept');wishButton.setAttribute('aria-disabled','true');if(shown===QUOTE.length)$('#quote').children[QUOTE.length-1].insertAdjacentHTML('beforeend','<span class="star" aria-label="wish kept">✦</span>');}
  const press=e=>{if(banked||phase!=='stop')return;e.preventDefault?.();e.stopPropagation?.();wishPressed=true;if(Number.isInteger(e.pointerId))wishButton.setPointerCapture?.(e.pointerId);};
  const release=()=>{wishPressed=false;};
  ctx.on(wishButton,'pointerdown',press);for(const event of ['pointerup','pointercancel','lostpointercapture','blur'])ctx.on(wishButton,event,release);
  ctx.on(wishButton,'keydown',e=>{if(e.code==='Space'||e.code==='Enter')press(e);});ctx.on(wishButton,'keyup',e=>{if(e.code==='Space'||e.code==='Enter')release();});ctx.on(wishButton,'click',e=>e.preventDefault());ctx.on(wishButton,'contextmenu',e=>e.preventDefault());
  ctx.on($('#again'),'click',()=>ctx.go('stand'));ctx.on($('#title'),'click',()=>{location.href=location.pathname;});
  function stop(){phase='stop';since=0;ctx.engineOff();ctx.bed({engine:0,crickets:1,wind:.4});ctx.say(null);}
  function advance(){if(phase==='arrive')stop();else if(phase==='stop'&&shown>0)skip+=Math.max(0,(shown<QUOTE.length?TIMES.quotes[shown]:TIMES.end)-(since-starEnd+skip));}
  if(ctx.params.has('t')){stop();since=Number(ctx.params.get('t'))||0;byeSaid=since>2;nextTick=since+.2;starK=clamp((since-TIMES.star)/TIMES.crossing);if(starK>=1)starEnd=TIMES.star+TIMES.crossing;}
  function frame(dt){
    since+=dt;layer.classList.toggle('is-immersive',phase!=='arrive'&&since>=TIMES.reveal);let starUp=false;
    const width=ctx.canvas?.clientWidth||globalThis.innerWidth||1280,height=ctx.canvas?.clientHeight||globalThis.innerHeight||720;
    const ptr=input.ptr?{x:input.ptr[0]/width*2-1,y:1-input.ptr[1]/height*2,active:true,pressed:input.source==='pointer'&&input.hold}:null;
    if(ptr&&previousPointer&&dt>0){const dx=ptr.x-previousPointer.x,dy=ptr.y-previousPointer.y,v=Math.hypot(dx,dy)/Math.max(dt,.016);const k=1-Math.exp(-dt*9);breeze.x+=(clamp(dx/Math.max(dt,.016),-3,3)-breeze.x)*k;breeze.y+=(clamp(dy/Math.max(dt,.016),-3,3)-breeze.y)*k;breeze.strength+=(clamp(v*.14)-breeze.strength)*k;if(v>.15&&since>6)interactionSeen=true;}
    else if(dt>0){const decay=Math.exp(-dt*3);breeze.x*=decay;breeze.y*=decay;breeze.strength*=decay;}
    previousPointer=ptr;
    if(phase==='stop'){
      if(!byeSaid&&since>1){byeSaid=true;if(bye)ctx.say(bye.who,bye.text,3.6,bye.expr);}
      if(ctx.ac&&since>nextTick){ctx.sfx?.tick?.();tickGap*=1.18;nextTick=since+tickGap;}
      if(!bloomPlayed&&since>TIMES.star-.9){bloomPlayed=true;ctx.score?.('bloom');}
      const asking=!banked&&since>=TIMES.star;
      if(since>TIMES.star&&starK<1){starUp=true;starK=Math.min(1,starK+dt/(banked?1.6:TIMES.crossing));if(starK>=1)starEnd=since;}
      const keyboardHeld=input.hold&&input.source==='keyboard',intentional=wishPressed||keyboardHeld;
      heldFor=asking&&intentional?Math.min(TIMES.hold,heldFor+dt):Math.max(0,heldFor-dt*1.5);
      if(!banked&&asking&&heldFor>=TIMES.hold)bankWish();
      const progress=banked?1:heldFor/TIMES.hold;wishButton.style.setProperty?.('--wish-progress',progress.toFixed(3));
      if(!banked){$('#wish-label').textContent=progress>0?'Keep holding…':'Keep a wish';if(starEnd<Infinity)$('#wish-caption').textContent='Keep this moment for later.';}
      $('#wish-moment').hidden=since<TIMES.star||(banked&&since>bankedAt+3.2);
      const quoteTime=since-starEnd+skip;
      while(shown<QUOTE.length&&quoteTime>TIMES.quotes[shown]){const p=$('#quote').children[shown++];p.classList.add('on');if(shown===QUOTE.length&&banked)p.insertAdjacentHTML('beforeend','<span class="star" aria-label="wish kept">✦</span>');}
      if(shown===QUOTE.length&&quoteTime>TIMES.end){phase='done';$('#quote').classList.add('gone');$('#end').hidden=false;$('#wish-moment').hidden=true;$('#again').focus({preventScroll:true});}
    }
    $('#season-note').hidden=phase!=='stop'||since<TIMES.festival||since>TIMES.star-.2;
    $('#petal-invitation').hidden=phase!=='stop'||since<9||since>12.2||interactionSeen;
    ctx.prompt(phase==='arrive'?'Turn the engine off':null);
    ctx.progress?.(phase==='done'?1:phase==='arrive'?.04:starEnd===Infinity?.08+.27*clamp(since/(TIMES.star+TIMES.crossing)):.35+.65*clamp((since-starEnd+skip)/TIMES.end));
    ctx.worldState({phase,since,starK,starUp,banked,wish:banked,look:rider,pointer:ptr||{x:0,y:0,active:false,pressed:false},breeze,wishProgress:banked?1:heldFor/TIMES.hold,bankEvent,gust:Math.max(breeze.strength,banked?clamp(1-(since-bankedAt)/3.2):0)});
  }
  return {frame,resize(){},onTap:advance,dispose(){wishPressed=false;}};
}

/* SleepThrough MVP — quiz funnel + 7-day experiment loop.
   All data stays in the browser (localStorage). No backend in this preview. */
(function () {
  'use strict';

  // ---------- storage ----------
  var KEY = 'sleepthrough.v1';
  function load() {
    try { var raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : {}; } catch (e) { return {}; }
  }
  var state = Object.assign({ answers: {}, email: '', plan: null, sub: null, checkins: [], expIndex: 0 }, load());
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* private mode: keep in memory */ } }

  // ---------- quiz ----------
  var QUIZ = [
    { id: 'age', q: 'How old are you?', opts: ['Under 40', '40–44', '45–49', '50–55', '56 or older'] },
    { id: 'cycle', q: 'How has your period changed in the last year?', help: 'This tells us where you might be in the transition. It stays on your device.', opts: ['Still regular', 'Less regular, or skipping months', 'Stopped 12 or more months ago', 'Not sure, or not applicable'] },
    { id: 'problem', q: 'What bothers you most at night?', opts: ['Falling asleep', 'Waking up between 2 and 4 AM', 'Waking too early and staying up', 'All of these'] },
    { id: 'wakeups', q: 'On a typical night, how many times do you wake up?', opts: ['Once or not at all', 'Twice', 'Three times', 'Four or more'] },
    { id: 'sweats', q: 'How often do hot flashes or night sweats wake you?', opts: ['Never', 'A few times a month', 'Most weeks', 'Most nights'] },
    { id: 'wine', q: 'How many evenings a week do you have a drink?', opts: ['None', '1 or 2', '3 or 4', '5 or more'] },
    { id: 'caffeine', q: 'When do you have your last coffee, tea or soda?', opts: ['Before noon', 'Between noon and 3 PM', 'After 3 PM', "I don't have caffeine"] },
    { id: 'screens', q: 'What do you usually do in the last hour before bed?', opts: ['Phone or TV in bed', 'Work or email', 'Read or wind down', 'It varies'] },
    { id: 'stress', q: 'When you wake at night, how often does your mind start racing?', opts: ['Rarely', 'Sometimes', 'Often', 'Almost always'] },
    { id: 'room', q: 'How does your bedroom feel at night?', opts: ['Cool', 'Comfortable', 'Warm', 'I wake up too hot'] },
    { id: 'wearable', q: 'Do you wear a sleep tracker?', help: 'Optional. A 30-second morning check-in works without one.', opts: ['Apple Watch', 'Oura', 'Fitbit', 'Whoop', 'No tracker'] },
    { id: 'goal', q: 'What would change most if you slept through the night?', opts: ['More energy at work', 'A better mood with my family', 'Less coffee to get through the day', 'Feeling like myself again'] }
  ];

  // ---------- experiments ----------
  var EXP = {
    alcohol: { name: 'No wine after 7 PM', why: 'Alcohol helps you fall asleep, then wears off a few hours later. That rebound often wakes you around 3 AM.', how: 'Any drink, any night, finish it before 7 PM. Sparkling water with lime after that.', ask: 'Did you skip drinks after 7 PM?' },
    heat: { name: 'Cool room, light layers', why: 'A warm bedroom makes night sweats more likely to wake you, and harder to fall back asleep after.', how: 'Set the room to 65–68°F, use breathable sheets, keep cold water by the bed.', ask: 'Was your room cool last night?' },
    caffeine: { name: 'Caffeine cutoff at noon', why: 'Half of an afternoon coffee is still in your system at bedtime, and it makes sleep lighter.', how: 'Coffee, black tea and soda before noon. Herbal tea or decaf after.', ask: 'Was your last caffeine before noon?' },
    mind: { name: '10-minute wind-down and worry list', why: 'A racing mind at 3 AM often picks up tomorrow’s to-do list. Writing it down earlier gives it somewhere to go.', how: 'At 9:30 PM, write tomorrow’s 3 worries and 1 next step each. Then the 3-minute breathing in the app.', ask: 'Did you do the wind-down?' },
    screens: { name: 'Screens off 45 minutes before bed', why: 'Scrolling keeps your brain alert and pushes sleep later, even when you feel tired.', how: 'Phone charges outside the bedroom. Read, stretch or do the breathing instead.', ask: 'Were screens off 45 minutes before bed?' },
    rhythm: { name: 'Same wake time every day', why: 'A fixed wake time, even on weekends, makes you sleepy at the same time each night.', how: 'Pick a time you can keep 7 days in a row. Get daylight within 30 minutes of waking.', ask: 'Did you get up at your set time?' }
  };

  function idx(id) { var a = state.answers[id]; return typeof a === 'number' ? a : 0; }

  function analyze() {
    var w = {
      alcohol: idx('wine') * 3,
      heat: idx('sweats') * 2 + (idx('room') >= 2 ? idx('room') : 0),
      caffeine: [0, 3, 6, 0][idx('caffeine')],
      mind: idx('stress') * 2 + (idx('screens') === 1 ? 2 : 0),
      screens: [5, 3, 0, 2][idx('screens')],
      rhythm: 2
    };
    var ranked = Object.keys(w).sort(function (a, b) { return w[b] - w[a]; });
    var score = 100
      - idx('wakeups') * 8
      - idx('sweats') * 5
      - idx('wine') * 5
      - [0, 3, 8, 0][idx('caffeine')]
      - [6, 6, 0, 3][idx('screens')]
      - idx('stress') * 4
      - [0, 0, 4, 7][idx('room')]
      - (idx('problem') === 3 ? 6 : 0);
    score = Math.max(28, Math.min(92, score));
    var top = ranked.slice(0, 3);
    var plan = top.slice();
    if (plan.indexOf('rhythm') === -1) plan.push('rhythm'); else plan.push(ranked[3]);
    return { score: score, suspects: top, weeks: plan.slice(0, 4) };
  }

  var SUSPECT_NOTE = {
    alcohol: 'Evening drinks wear off around 3 AM',
    heat: 'Night sweats plus a warm room',
    caffeine: 'Afternoon caffeine keeps sleep light',
    mind: 'A racing mind when you wake',
    screens: 'Screens late in the evening',
    rhythm: 'An irregular wake time'
  };
  var SUSPECT_NAME = { alcohol: 'Evening wine', heat: 'Heat', caffeine: 'Caffeine', mind: 'Racing mind', screens: 'Screens', rhythm: 'Body clock' };

  // ---------- helpers ----------
  var app = document.getElementById('app');
  var landing = document.getElementById('landing');
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }
  function go(h) { location.hash = h; }
  function toast(msg) {
    var t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove('show'); }, 2600);
  }
  var ICON = {
    back: '<svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    moon: '<svg viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>',
    wave: '<svg viewBox="0 0 24 24"><path d="M3 12h3l3-7 4 14 3-7h5"/></svg>',
    sun: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    chart: '<svg viewBox="0 0 24 24"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
    watch: '<svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="3"/><path d="M9 6l1-3h4l1 3M9 18l1 3h4l1-3M12 10v2l1.5 1.5"/></svg>'
  };
  function screen(mode, inner, extraClass) {
    app.innerHTML = '<div class="screen ' + (mode === 'night' ? 'is-night' : 'is-day') + ' ' + (extraClass || '') + '"><div class="screen-in">' + inner + '</div></div>';
    window.scrollTo(0, 0);
    var h = app.querySelector('h1, .q-title, .hello, .insight-head');
    if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
  }

  // ---------- views ----------
  function viewQuiz(n) {
    var q = QUIZ[n];
    if (!q) return go('#/email');
    var pct = Math.round((n / QUIZ.length) * 100);
    var opts = q.opts.map(function (o, i) {
      return '<button class="opt" data-i="' + i + '" aria-pressed="' + (state.answers[q.id] === i) + '">' + esc(o) + '</button>';
    }).join('');
    screen('night',
      '<div class="topbar"><button class="icon-btn" data-back aria-label="Back">' + ICON.back + '</button>' +
      '<div class="progress" role="progressbar" aria-valuenow="' + pct + '" aria-valuemin="0" aria-valuemax="100"><i style="width:' + pct + '%"></i></div>' +
      '<span class="step-count">' + (n + 1) + '/' + QUIZ.length + '</span></div>' +
      '<h1 class="q-title">' + esc(q.q) + '</h1>' +
      (q.help ? '<p class="q-help">' + esc(q.help) + '</p>' : '') +
      '<div class="options">' + opts + '</div>');
    app.querySelector('[data-back]').onclick = function () { n === 0 ? go('#/') : go('#/quiz/' + (n - 1)); };
    app.querySelectorAll('.opt').forEach(function (b) {
      b.onclick = function () {
        state.answers[q.id] = +b.dataset.i; save();
        b.setAttribute('aria-pressed', 'true');
        setTimeout(function () { go('#/quiz/' + (n + 1)); }, 160);
      };
    });
  }

  function viewEmail() {
    screen('night',
      '<div class="topbar"><button class="icon-btn" data-back aria-label="Back">' + ICON.back + '</button><div class="progress"><i style="width:100%"></i></div><span class="step-count"></span></div>' +
      '<h1 class="q-title">Where should we send your sleep plan?</h1>' +
      '<p class="q-help">We’ll email your results and your week 1 experiment. No spam, unsubscribe any time.</p>' +
      '<form id="ef"><label for="em" class="q-help" style="display:block;margin:8px 0 6px">Email</label>' +
      '<input id="em" class="field" type="email" autocomplete="email" placeholder="you@example.com" value="' + esc(state.email) + '">' +
      '<div class="spacer"></div><button class="btn btn-lamp btn-block" type="submit" style="margin-top:20px">See my results</button></form>' +
      '<button class="btn btn-quiet btn-block" data-skip>Skip and see results</button>');
    app.querySelector('[data-back]').onclick = function () { go('#/quiz/' + (QUIZ.length - 1)); };
    app.querySelector('#ef').onsubmit = function (e) { e.preventDefault(); state.email = app.querySelector('#em').value.trim(); save(); go('#/analyzing'); };
    app.querySelector('[data-skip]').onclick = function () { go('#/analyzing'); };
  }

  function viewAnalyzing() {
    var steps = ['Reading your nights', 'Weighing wine, caffeine, heat and stress', 'Matching patterns common in perimenopause', 'Building your 4-week plan'];
    screen('night',
      '<div class="spacer"></div><h1 class="q-title">Finding what’s waking you</h1>' +
      '<ul class="analyze">' + steps.map(function (s) { return '<li><span class="dot"></span>' + s + '</li>'; }).join('') + '</ul><div class="spacer"></div>');
    var lis = app.querySelectorAll('.analyze li'), i = 0;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    (function tick() {
      if (location.hash !== '#/analyzing') return;
      if (i < lis.length) { lis[i].classList.add('done'); i++; setTimeout(tick, reduce ? 150 : 700); }
      else { state.plan = analyze(); state.expIndex = 0; save(); go('#/result'); }
    })();
  }

  function ring(score) {
    var c = 2 * Math.PI * 52, off = c * (1 - score / 100);
    return '<svg class="ring" viewBox="0 0 128 128" role="img" aria-label="Sleep Score ' + score + ' out of 100"><circle class="track" cx="64" cy="64" r="52"/>' +
      '<circle class="val" cx="64" cy="64" r="52" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + c.toFixed(1) + '" data-off="' + off.toFixed(1) + '"/>' +
      '<text x="64" y="76">' + score + '</text></svg>';
  }

  function viewResult() {
    var p = state.plan || (state.plan = analyze());
    var verdict = p.score >= 75 ? 'Your sleep is mostly working.' : p.score >= 55 ? 'Your sleep is getting interrupted.' : 'Your nights are working against you.';
    screen('night',
      '<div class="topbar"><button class="icon-btn" data-back aria-label="Back">' + ICON.back + '</button><span></span></div>' +
      '<p class="q-help" style="margin:0">Your Sleep Score</p>' +
      '<div class="score">' + ring(p.score) + '<div class="score-copy"><strong>' + verdict + '</strong><p>Out of 100, higher is better. We re-score your nights after every experiment.</p></div></div>' +
      '<h2 style="font-size:24px">Your likely suspects</h2>' +
      '<ol class="suspects">' + p.suspects.map(function (s, i) { return '<li><span class="rank">' + (i + 1) + '</span><b>' + SUSPECT_NAME[s] + '</b><span>' + SUSPECT_NOTE[s] + '</span></li>'; }).join('') + '</ol>' +
      '<h2 style="font-size:24px">Your 4-week plan</h2>' +
      '<ol class="plan-weeks">' + p.weeks.map(function (k, i) { return '<li>' + esc(EXP[k].name) + '<small>Week ' + (i + 1) + '</small></li>'; }).join('') + '</ol>' +
      '<button class="btn btn-lamp btn-block" data-next>Start my plan</button>' +
      '<p class="disclaimer" style="margin-top:16px">SleepThrough is a coaching tool, not a diagnosis. If you snore loudly or stop breathing at night, talk to a doctor.</p>');
    requestAnimationFrame(function () { var v = app.querySelector('.ring .val'); if (v) v.style.strokeDashoffset = v.dataset.off; });
    app.querySelector('[data-back]').onclick = function () { go('#/quiz/' + (QUIZ.length - 1)); };
    app.querySelector('[data-next]').onclick = function () { go('#/paywall'); };
  }

  function viewPaywall() {
    var p = state.plan || analyze();
    var pick = 'q';
    screen('night',
      '<div class="topbar"><button class="icon-btn" data-back aria-label="Back">' + ICON.back + '</button><span></span></div>' +
      '<h1 class="q-title" style="margin-top:0">Find what’s waking you in 7 nights</h1>' +
      '<ul class="pw-list"><li>Week 1: ' + esc(EXP[p.weeks[0]].name) + '</li><li>3-minute wind-down every evening</li><li>“Awake at 3 AM” mode for the middle of the night</li><li>Your result on day 7, then the next experiment</li></ul>' +
      '<div class="pw-plans" role="group" aria-label="Choose a plan">' +
      '<button class="pw-plan" data-p="q" aria-pressed="true"><b>12 weeks</b><span class="pw-price">$39.99</span><small>$3.33 a week · best value</small></button>' +
      '<button class="pw-plan" data-p="m" aria-pressed="false"><b>4 weeks</b><span class="pw-price">$19.99</span><small>$5.00 a week</small></button></div>' +
      '<button class="btn btn-lamp btn-block" data-buy>Start 7-day free trial</button>' +
      '<p class="disclaimer" style="margin-top:12px">Free for 7 days, then the plan you chose. Cancel any time before the trial ends and you won’t be charged. <b>Preview: no real payment is taken.</b></p>' +
      '<button class="btn btn-quiet btn-block" data-free>Continue with the free week 1 preview</button>');
    app.querySelector('[data-back]').onclick = function () { go('#/result'); };
    app.querySelectorAll('.pw-plan').forEach(function (b) {
      b.onclick = function () { pick = b.dataset.p; app.querySelectorAll('.pw-plan').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); };
    });
    app.querySelector('[data-buy]').onclick = function () { state.sub = { plan: pick, trialStart: Date.now() }; save(); toast('Trial started. Welcome to SleepThrough.'); go('#/app'); };
    app.querySelector('[data-free]').onclick = function () { state.sub = state.sub || { plan: 'free' }; save(); go('#/app'); };
  }

  // ---------- product ----------
  function currentExp() { var p = state.plan || (state.plan = analyze()); return EXP[p.weeks[state.expIndex] || p.weeks[0]]; }
  function weekCheckins() { var start = state.expIndex * 7; return state.checkins.slice(start, start + 7); }

  function streak() {
    var n = 0; for (var i = state.checkins.length - 1; i >= 0; i--) { if (state.checkins[i]) n++; else break; } return n;
  }

  function viewHome() {
    if (!state.plan) return go('#/quiz/0');
    var e = currentExp(), wk = weekCheckins(), day = Math.min(wk.length + 1, 7);
    var h = new Date().getHours();
    var night = h >= 19 || h < 6;
    var hello = h < 5 ? 'Up in the night?' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
    var dots = ''; for (var i = 0; i < 7; i++) { var c = wk[i]; dots += '<i class="' + (c ? (c.did ? 'on' : 'miss') : '') + '"></i>'; }
    var free = state.sub && state.sub.plan === 'free';
    var done = wk.length >= 7;
    screen(night ? 'night' : 'day',
      '<div class="topbar"><a class="brand" href="#/" style="font-size:18px;color:inherit">' + '<svg viewBox="0 0 24 24" aria-hidden="true" style="width:18px;height:18px"><path d="M15 3a8 8 0 1 0 6 13A9 9 0 0 1 15 3z"/></svg>SleepThrough</a><span></span></div>' +
      (free ? '<p class="banner">Free preview: week 1 is open. Start the trial to unlock weeks 2–4.</p>' : '') +
      '<h1 class="hello">' + hello + '</h1>' +
      '<p class="streak">' + (streak() ? streak() + ' check-ins in a row' : 'Your first check-in is tomorrow morning') + '</p>' +
      '<section class="exp-card" aria-label="Current experiment"><p class="lbl">Week ' + (state.expIndex + 1) + ' · ' + (done ? 'complete' : 'Night ' + day + ' of 7') + '</p>' +
      '<h2>' + esc(e.name) + '</h2><p>' + esc(e.how) + '</p><div class="days" aria-label="' + wk.length + ' of 7 nights checked in">' + dots + '</div></section>' +
      '<div class="actions">' +
      (done ? action('#/app/insight', ICON.chart, 'See your week 1 result', 'Ready now') : '') +
      action('#/app/tonight', ICON.moon, 'Tonight: 3-minute wind-down', 'Long-exhale breathing before bed') +
      action('#/app/3am', ICON.wave, 'Awake right now?', 'What to do at 3 AM') +
      action('#/app/checkin', ICON.sun, 'Morning check-in', '30 seconds, 5 taps') +
      (!done ? action('#/app/insight', ICON.chart, 'Your week so far', wk.length + ' of 7 nights logged') : '') +
      action('#/app/devices', ICON.watch, 'Connect a sleep tracker', 'Apple Watch, Oura, Fitbit, Whoop') +
      '</div>' +
      '<div class="demo-tools"><p style="margin:0">Demo tools for the Capstone review</p><button data-demo>Fill a sample week</button><button data-reset>Start over</button></div>');
    app.querySelector('[data-demo]').onclick = fillDemo;
    app.querySelector('[data-reset]').onclick = function () { try { localStorage.removeItem(KEY); } catch (e) {} state = { answers: {}, email: '', plan: null, sub: null, checkins: [], expIndex: 0 }; go('#/'); };
  }
  function action(href, icon, title, sub) {
    return '<a class="action" href="' + href + '"><span class="ic">' + icon + '</span><span><b>' + title + '</b><small>' + sub + '</small></span><span class="chev" aria-hidden="true">›</span></a>';
  }

  function fillDemo() {
    var start = state.expIndex * 7;
    var sample = [
      { wake: 3, awake: 2, hot: true, did: false, rested: 2 },
      { wake: 1, awake: 1, hot: false, did: true, rested: 3 },
      { wake: 1, awake: 0, hot: false, did: true, rested: 4 },
      { wake: 3, awake: 2, hot: true, did: false, rested: 2 },
      { wake: 1, awake: 1, hot: false, did: true, rested: 4 },
      { wake: 0, awake: 0, hot: false, did: true, rested: 5 },
      { wake: 1, awake: 0, hot: false, did: true, rested: 4 }
    ];
    for (var i = 0; i < 7; i++) state.checkins[start + i] = sample[i];
    save(); toast('Sample week added'); viewHome();
  }

  // breathing: inhale 4s, exhale 6s, 3 minutes
  function viewTonight() {
    screen('night',
      '<div class="topbar"><button class="icon-btn" data-back aria-label="Close">' + ICON.close + '</button><span class="step-count">3 min</span></div>' +
      '<div class="breath"><div><div class="orb-wrap"><span class="orb-ring"></span><div class="orb" id="orb"></div></div>' +
      '<p class="cue" id="cue" aria-live="polite">Ready when you are</p><p class="timer" id="tm">3:00</p>' +
      '<label class="check"><input type="checkbox" id="voice"> Read the cues aloud</label>' +
      '<button class="btn btn-lamp" id="go" style="min-width:200px">Start</button></div></div>' +
      '<p class="disclaimer" style="text-align:center">Breathe in through your nose for 4, out slowly for 6. A longer exhale tells your body it’s safe to rest.</p>');
    var orb = app.querySelector('#orb'), cue = app.querySelector('#cue'), tm = app.querySelector('#tm'), btn = app.querySelector('#go');
    var running = false, left = 180, phaseT, clockT;
    function say(t) { cue.textContent = t; if (app.querySelector('#voice').checked && 'speechSynthesis' in window) { try { speechSynthesis.cancel(); var u = new SpeechSynthesisUtterance(t); u.rate = .8; speechSynthesis.speak(u); } catch (e) {} } }
    function inhale() { if (!running) return; say('Breathe in'); orb.style.transitionDuration = '4s'; orb.style.transform = 'scale(1.9)'; phaseT = setTimeout(exhale, 4000); }
    function exhale() { if (!running) return; say('And out, slowly'); orb.style.transitionDuration = '6s'; orb.style.transform = 'scale(1)'; phaseT = setTimeout(inhale, 6000); }
    function stop(done) {
      running = false; clearTimeout(phaseT); clearInterval(clockT); orb.style.transform = 'scale(1)'; btn.textContent = 'Start'; left = 180; tm.textContent = '3:00';
      if (done) { cue.textContent = 'Done. Lights off when you’re ready.'; toast('Wind-down complete'); }
      else cue.textContent = 'Ready when you are';
    }
    btn.onclick = function () {
      if (running) return stop(false);
      running = true; btn.textContent = 'Stop'; inhale();
      clockT = setInterval(function () { left--; tm.textContent = Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0'); if (left <= 0) stop(true); }, 1000);
    };
    app.querySelector('[data-back]').onclick = function () { stop(false); go('#/app'); };
  }

  function view3am() {
    screen('night',
      '<div class="topbar"><button class="icon-btn" data-back aria-label="Close">' + ICON.close + '</button><span></span></div>' +
      '<h1 class="q-title" style="margin-top:0">You’re awake. That’s okay.</h1>' +
      '<p class="q-help">Keep the screen dim. Don’t check the time again.</p>' +
      '<ol class="three">' +
      '<li><div><b>Cool down first</b><span>Uncover a foot, flip the pillow, sip cold water.</span></div></li>' +
      '<li><div><b>Breathe out longer than in</b><span>In for 4, out for 6. Two minutes is enough.</span></div></li>' +
      '<li><div><b>Park the thought</b><span>If your mind is racing, say it once in a sentence. It will still be there in the morning.</span></div></li>' +
      '<li><div><b>Still awake after about 20 minutes?</b><span>Get up, keep lights low, do something boring. Go back when you feel sleepy.</span></div></li>' +
      '</ol><div class="spacer"></div>' +
      '<a class="btn btn-lamp btn-block" href="#/app/tonight">Start 2-minute breathing</a>', 'dim-screen');
    app.querySelector('[data-back]').onclick = function () { go('#/app'); };
  }

  function viewCheckin() {
    var e = currentExp(), r = { wake: null, awake: null, hot: null, did: null, rested: null };
    function seg(key, labels) {
      return '<div class="seg" role="group">' + labels.map(function (l, i) { return '<button class="opt" data-k="' + key + '" data-v="' + i + '" aria-pressed="false">' + l + '</button>'; }).join('') + '</div>';
    }
    screen('day',
      '<div class="topbar"><button class="icon-btn" data-back aria-label="Close">' + ICON.close + '</button><span class="step-count">30 sec</span></div>' +
      '<h1 class="q-title" style="margin-top:0">How was last night?</h1>' +
      '<p class="ci-q">How many times did you wake up?</p>' + seg('wake', ['0', '1', '2', '3', '4+']) +
      '<p class="ci-q">Longest time awake</p>' + seg('awake', ['Under 10 min', '10–30 min', '30–60 min', 'Over an hour']) +
      '<p class="ci-q">Did heat or sweats wake you?</p>' + seg('hot', ['No', 'Yes']) +
      '<p class="ci-q">' + esc(e.ask) + '</p>' + seg('did', ['No', 'Yes']) +
      '<p class="ci-q">How rested do you feel?</p>' + seg('rested', ['1', '2', '3', '4', '5']) +
      '<div class="spacer"></div><button class="btn btn-night btn-block" id="save" style="margin-top:24px">Save check-in</button>');
    app.querySelectorAll('.seg .opt').forEach(function (b) {
      b.onclick = function () {
        var k = b.dataset.k; r[k] = +b.dataset.v;
        app.querySelectorAll('[data-k="' + k + '"]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      };
    });
    app.querySelector('#save').onclick = function () {
      var missing = Object.keys(r).filter(function (k) { return r[k] === null; });
      if (missing.length) { toast('Answer all 5 questions to save'); return; }
      var wk = weekCheckins(); if (wk.length >= 7) { toast('This week is complete. See your result.'); return go('#/app/insight'); }
      state.checkins.push({ wake: r.wake, awake: r.awake, hot: !!r.hot, did: !!r.did, rested: r.rested + 1, at: Date.now() });
      save();
      var n = weekCheckins().length;
      toast(n >= 7 ? 'Night 7 logged. Your result is ready.' : 'Saved. Night ' + n + ' of 7.');
      go(n >= 7 ? '#/app/insight' : '#/app');
    };
    app.querySelector('[data-back]').onclick = function () { go('#/app'); };
  }

  function avg(a) { return a.length ? a.reduce(function (s, x) { return s + x; }, 0) / a.length : null; }
  function fmt(x) { return Math.round(x * 10) / 10; }

  function viewInsight() {
    var e = currentExp(), wk = weekCheckins();
    var on = wk.filter(function (c) { return c.did; }), off = wk.filter(function (c) { return !c.did; });
    var aOn = avg(on.map(function (c) { return c.wake; })), aOff = avg(off.map(function (c) { return c.wake; }));
    var rOn = avg(on.map(function (c) { return c.rested; })), rOff = avg(off.map(function (c) { return c.rested; }));
    var head;
    if (wk.length < 3) head = 'Log ' + (3 - wk.length) + ' more night' + (3 - wk.length === 1 ? '' : 's') + ' to see a first pattern.';
    else if (!on.length || !off.length) head = on.length ? 'You stuck with it every night. Compare against a normal night next week.' : 'No experiment nights yet. Try it tonight.';
    else {
      var diff = aOff - aOn;
      head = diff >= 0.5 ? 'You had <strong>' + fmt(diff) + ' fewer wake-ups</strong> on “' + esc(e.name) + '” nights.'
        : diff <= -0.5 ? 'This change didn’t help: ' + fmt(-diff) + ' more wake-ups. Good to know, cross it off.'
          : 'No clear difference yet. Wake-ups were about the same either way.';
    }
    // chart
    var maxW = 4, bw = 26, gap = 13, H = 94;
    var bars = '', ticks = '';
    for (var i = 0; i < 7; i++) {
      var c = wk[i], x = 8 + i * (bw + gap);
      if (c) { var h = Math.max(4, (Math.min(c.wake, maxW) / maxW) * 72); bars += '<g class="' + (c.did ? 'bar-on' : 'bar-off') + '"><rect x="' + x + '" y="' + (H - h) + '" width="' + bw + '" height="' + h + '" rx="5"/></g>'; }
      else bars += '<rect x="' + x + '" y="' + (H - 4) + '" width="' + bw + '" height="4" rx="2" fill="none" stroke="#34407A" stroke-dasharray="3 3"/>';
      ticks += '<text x="' + (x + bw / 2) + '" y="' + (H + 14) + '">' + (i + 1) + '</text>';
    }
    var done = wk.length >= 7;
    var free = state.sub && state.sub.plan === 'free';
    var p = state.plan;
    var nextExp = p.weeks[state.expIndex + 1] ? EXP[p.weeks[state.expIndex + 1]] : null;
    screen('day',
      '<div class="topbar"><button class="icon-btn" data-back aria-label="Back">' + ICON.back + '</button><span class="step-count">Week ' + (state.expIndex + 1) + '</span></div>' +
      '<p class="q-help" style="margin:0">' + esc(e.name) + ' · ' + wk.length + ' of 7 nights</p>' +
      '<h1 class="insight-head">' + head + '</h1>' +
      '<div class="chart-card"><svg class="sc-bars" viewBox="0 0 280 112" role="img" aria-label="Wake-ups per night">' + bars + '<g class="ticks">' + ticks + '</g></svg>' +
      '<p class="sc-legend"><span class="k on"></span>Did the experiment <span class="k off"></span>Didn’t</p></div>' +
      (on.length && off.length ? '<div class="stat-row"><div class="stat"><b>' + fmt(aOn) + '</b><span>wake-ups on experiment nights</span></div><div class="stat"><b>' + fmt(aOff) + '</b><span>wake-ups on other nights</span></div>' +
        '<div class="stat"><b>' + fmt(rOn) + '/5</b><span>how rested, experiment nights</span></div><div class="stat"><b>' + fmt(rOff) + '/5</b><span>how rested, other nights</span></div></div>' : '') +
      '<p class="disclaimer">Based on your own check-ins. One week is a first signal, not proof. That’s why every experiment can run twice.</p>' +
      (done && nextExp ? (free
        ? '<p class="q-help" style="margin:16px 0 8px">Next: ' + esc(nextExp.name) + '</p><a class="btn btn-night btn-block" href="#/paywall">Unlock week 2</a>'
        : '<p class="q-help" style="margin:16px 0 8px">Next: ' + esc(nextExp.name) + '</p><button class="btn btn-night btn-block" data-next>Start week ' + (state.expIndex + 2) + '</button>') : '') +
      (!done ? '<a class="btn btn-night btn-block" href="#/app/checkin" style="margin-top:12px">Log last night</a>' : ''));
    app.querySelector('[data-back]').onclick = function () { go('#/app'); };
    var nx = app.querySelector('[data-next]');
    if (nx) nx.onclick = function () { state.expIndex++; save(); toast('Week ' + (state.expIndex + 1) + ' starts tonight'); go('#/app'); };
  }

  function viewDevices() {
    var w = ['Apple Watch', 'Oura', 'Fitbit', 'Whoop'];
    screen('day',
      '<div class="topbar"><button class="icon-btn" data-back aria-label="Back">' + ICON.back + '</button><span></span></div>' +
      '<h1 class="q-title" style="margin-top:0">Connect a sleep tracker</h1>' +
      '<p class="q-help">Your tracker adds wake-up times and heart rate to your check-ins. The morning check-in still works without one.</p>' +
      '<div class="actions">' + w.map(function (n) { return '<button class="action" data-w="' + n + '"><span class="ic">' + ICON.watch + '</span><span><b>' + n + '</b><small>Coming with the iOS app</small></span><span class="chev" aria-hidden="true">›</span></button>'; }).join('') + '</div>' +
      '<p class="disclaimer" style="margin-top:18px">In this web preview, tracker sync is not live. Tap one to tell us which you use.</p>');
    app.querySelectorAll('[data-w]').forEach(function (b) { b.onclick = function () { state.tracker = b.dataset.w; save(); toast('Noted: we’ll let you know when ' + b.dataset.w + ' sync is ready.'); }; });
    app.querySelector('[data-back]').onclick = function () { go('#/app'); };
  }

  // ---------- router ----------
  function route() {
    var h = location.hash || '#/';
    if (h === '#/' || h === '#' || h === '' || h === '#pricing') {
      app.hidden = true; landing.hidden = false;
      if (h === '#pricing') { var el = document.getElementById('pricing'); if (el) el.scrollIntoView(); }
      document.title = 'SleepThrough — sleep through the night in perimenopause';
      return;
    }
    landing.hidden = true; app.hidden = false;
    var m;
    if ((m = h.match(/^#\/quiz\/(\d+)$/))) return viewQuiz(+m[1]);
    if (h === '#/email') return viewEmail();
    if (h === '#/analyzing') return viewAnalyzing();
    if (h === '#/result') return state.plan || Object.keys(state.answers).length ? viewResult() : go('#/quiz/0');
    if (h === '#/paywall') return viewPaywall();
    if (h === '#/app') return viewHome();
    if (h === '#/app/tonight') return viewTonight();
    if (h === '#/app/3am') return view3am();
    if (h === '#/app/checkin') return state.plan ? viewCheckin() : go('#/quiz/0');
    if (h === '#/app/insight') return state.plan ? viewInsight() : go('#/quiz/0');
    if (h === '#/app/devices') return viewDevices();
    go('#/');
  }
  window.addEventListener('hashchange', function () { if ('speechSynthesis' in window) { try { speechSynthesis.cancel(); } catch (e) {} } route(); });
  route();
})();

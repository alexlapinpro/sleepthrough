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

  // ---------- quiz flow ----------
  // Questions start from her experience (nights, body, days), not from our solution.
  // "info" steps are the you're-not-alone screens: real, sourced numbers only.
  var FLOW = [
    { sec: 'About you', id: 'age', why: 'Sleep and hormones change a lot between 40 and 55. Your age helps us match you with the right stage.', q: 'How old are you?', opts: ['Under 40', '40–44', '45–49', '50–55', '56 or older'] },
    { sec: 'About you', id: 'cycle', q: 'How has your period changed in the last year?', help: 'This tells us where you might be in the transition.', why: 'Changes in your cycle are one of the clearest signs of perimenopause. Your answers stay on your device in this preview.', opts: ['Still regular', 'Less regular, or skipping months', 'Stopped 12 or more months ago', 'Not sure, or not applicable'] },
    { sec: 'About you', info: 'short' },

    { sec: 'Your nights', id: 'problem', q: 'What bothers you most at night?', opts: ['Falling asleep', 'Waking up between 2 and 4 AM', 'Waking too early and staying up', 'All of these'] },
    { sec: 'Your nights', id: 'waketime', q: 'When do you usually wake up in the night?', opts: ['Before 1 AM', '1–2 AM', '2–3 AM', '3–4 AM', '4–5 AM', 'It changes'],
      say: ['before 1 AM', 'between 1 and 2 AM', 'between 2 and 3 AM', 'between 3 and 4 AM', 'between 4 and 5 AM', 'at different times'] },
    { sec: 'Your nights', id: 'wakeups', q: 'On a typical night, how many times do you wake up?', opts: ['Once or not at all', 'Twice', 'Three times', 'Four or more'],
      say: ['once or not at all', 'twice', 'three times', 'four or more times'] },
    { sec: 'Your nights', id: 'awakeLong', q: 'Once you’re awake, how long until you fall back asleep?', opts: ['Under 15 minutes', '15–30 minutes', '30–60 minutes', 'Over an hour, or not at all'],
      say: ['under 15 minutes', '15–30 minutes', '30–60 minutes', 'over an hour'] },
    { sec: 'Your nights', id: 'awakeDo', multi: true, none: 5, q: 'What do you do while you lie awake?', help: 'Pick all that apply.', opts: ['Check the time', 'Scroll my phone', 'Replay tomorrow’s to-do list', 'Kick off the covers', 'Get up for the bathroom', 'Just lie there'] },
    { sec: 'Your nights', id: 'badNights', q: 'How many bad nights in a typical week?', opts: ['1 or 2', '3 or 4', '5 or 6', 'Every night'],
      say: ['1–2', '3–4', '5–6', '7'] },
    { sec: 'Your nights', info: 'staying' },

    { sec: 'Your body', id: 'sweats', why: 'Night sweats are one of the most common reasons women wake up in perimenopause, and one of the easiest to test.', q: 'How often do hot flashes or night sweats wake you?', opts: ['Never', 'A few times a month', 'Most weeks', 'Most nights'],
      say: ['never', 'a few times a month', 'most weeks', 'most nights'] },
    { sec: 'Your body', id: 'sev', scale: true, q: 'How much is each of these affecting you?', why: 'Rating how strong each symptom is gives you a starting score. We re-check it every few weeks, and it goes on your report for your doctor.' },
    { sec: 'Your body', info: 'hormones' },
    { sec: 'Your body', info: 'heat' },

    { sec: 'Your days', id: 'energy', q: 'How’s your energy at 3 PM?', opts: ['Fine', 'Dipping', 'Running on coffee', 'I could nap at my desk'] },
    { sec: 'Your days', id: 'cups', q: 'How many cups of coffee, tea or soda a day?', opts: ['None', '1', '2', '3', '4 or more'],
      say: ['No caffeine', '1 cup', '2 cups', '3 cups', '4+ cups'] },
    { sec: 'Your days', id: 'caffeine', when: function () { return idx('cups') > 0; }, q: 'When do you have your last coffee, tea or soda?', opts: ['Before noon', 'Between noon and 3 PM', 'After 3 PM', 'It varies'],
      say: ['before noon', 'between noon and 3 PM', 'after 3 PM', 'at different times'] },
    { sec: 'Your days', info: 'caffeine', when: function () { return idx('cups') > 0; } },
    { sec: 'Your days', id: 'work', skip: true, q: 'How have bad nights affected your work?', opts: ['Not much', 'Harder to focus', 'More mistakes than usual', 'I’ve called in sick or cut hours', 'I don’t work outside the home'] },
    { sec: 'Your days', info: 'work' },

    { sec: 'Your evenings', id: 'wine', skip: true, why: 'No judgment. Alcohol is one of the most common hidden reasons for waking in the second half of the night.', q: 'How many evenings a week do you have a drink?', opts: ['None', '1 or 2', '3 or 4', '5 or more'],
      say: ['no evenings', '1–2 evenings a week', '3–4 evenings a week', '5+ evenings a week'] },
    { sec: 'Your evenings', id: 'lastDrink', when: function () { return idx('wine') > 0; }, q: 'When do you usually finish your last drink?', opts: ['Before 7 PM', '7–9 PM', 'After 9 PM', 'Right before bed'],
      say: ['before 7 PM', 'between 7 and 9 PM', 'after 9 PM', 'right before bed'] },
    { sec: 'Your evenings', info: 'alcohol', when: function () { return idx('wine') > 0; } },
    { sec: 'Your evenings', id: 'screens', q: 'What do you usually do in the last hour before bed?', opts: ['Phone or TV in bed', 'Work or email', 'Read or wind down', 'It varies'],
      say: ['Phone or TV in bed', 'Work or email', 'Reading', 'A mix of things'] },
    { sec: 'Your evenings', id: 'room', q: 'How does your bedroom feel at night?', opts: ['Cool', 'Comfortable', 'Warm', 'I wake up too hot'],
      say: ['cool', 'comfortable', 'warm', 'too hot'] },

    { sec: 'Your mind', id: 'stress', skip: true, q: 'When you wake at night, how often does your mind start racing?', opts: ['Rarely', 'Sometimes', 'Often', 'Almost always'],
      say: ['rarely', 'sometimes', 'often', 'almost always'] },
    { sec: 'Your mind', id: 'tried', skip: true, why: 'So we don’t suggest what you’ve already tried, and so your doctor sees the full picture.', multi: true, none: 6, q: 'What have you already tried for sleep?', help: 'Pick all that apply.', opts: ['Melatonin', 'Magnesium or other supplements', 'A sleep or meditation app', 'Cutting back on caffeine', 'Asking my doctor', 'Hormone therapy', 'Nothing yet'] },
    { sec: 'Your mind', info: 'guess' },

    { sec: 'Your plan', id: 'goal', q: 'What would change most if you slept through the night?', opts: ['More energy at work', 'A better mood with my family', 'Less coffee to get through the day', 'Feeling like myself again'] },
    { sec: 'Your plan', id: 'minutes', q: 'How much time can you give this each day?', help: 'Most days it’s a 3-minute wind-down and a 30-second check-in.', opts: ['5 minutes', '10 minutes', '15 minutes', '20 minutes or more'],
      say: ['5 minutes', '10 minutes', '15 minutes', '20 minutes'] },
    { sec: 'Your plan', id: 'wearable', q: 'Do you wear a sleep tracker?', help: 'Optional. A 30-second morning check-in works without one.', opts: ['Apple Watch', 'Oura', 'Fitbit', 'Whoop', 'No tracker'] },
    { sec: 'Your plan', info: 'preview' }
  ];

  var SEV_ITEMS = ['Hot flashes or night sweats', 'Waking up at night', 'Brain fog', 'Mood swings or a short fuse', 'Anxiety', 'Low energy all day'];
  var SEV_LEVELS = ['Not at all', 'Barely noticeable', 'Noticeable but manageable', 'Gets in the way of my day', 'Severely affects my life'];
  function sevVals() { var a = state.answers.sev; return Array.isArray(a) && a.length === SEV_ITEMS.length ? a : null; }
  function sevAt(i) { var a = sevVals(); return a && typeof a[i] === 'number' ? a[i] : 0; }
  function sevScore(a) { return a ? a.reduce(function (t, x) { return t + (x || 0); }, 0) : null; }
  function sevMax() { return SEV_ITEMS.length * 4; }
  function symList(min) { var a = sevVals(); if (!a) return []; return SEV_ITEMS.map(function (n, i) { return { n: n, v: a[i] }; }).filter(function (x, i) { return i !== 1 && x.v >= (min || 2); }).sort(function (x, y) { return y.v - x.v; }); }
  // A plain-language read of the transition stage from cycle, age and symptoms. Never a diagnosis.
  function stageGuess() {
    var c = state.answers.cycle, age = idx('age'), vms = idx('sweats') >= 1 || sevAt(0) >= 2;
    if (c === 2) return { name: 'Postmenopause', why: 'Your periods stopped 12 or more months ago, which is how menopause is defined.' };
    if (c === 1) return { name: 'Perimenopause', why: 'Less regular periods' + (age >= 1 ? ' after 40' : '') + (vms ? ', plus hot flashes or night sweats,' : '') + ' are the most common signs of the transition.' };
    if (c === 0 && age >= 1 && vms) return { name: 'Possibly early perimenopause', why: 'Your periods are still regular, but night sweats and broken sleep after 40 often start before cycles change.' };
    if (c === 3 && age >= 2) return { name: 'Possibly perimenopause', why: 'At your age and with your symptoms, the transition is a likely part of the picture.' };
    if (age === 0) return { name: 'Hard to say yet', why: 'Under 40, broken sleep has many causes. Your plan works either way.' };
    return { name: 'Hard to say yet', why: 'Your answers could fit several stages. Your plan works either way.' };
  }
  function targetDate() { var d = new Date(Date.now() + 28 * 86400000); return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }); }
  function step(id) { for (var i = 0; i < FLOW.length; i++) if (FLOW[i].id === id) return FLOW[i]; return null; }
  function idx(id) { var a = state.answers[id]; return typeof a === 'number' ? a : 0; }
  function answered(id) { return typeof state.answers[id] === 'number'; }
  function picks(id) { var a = state.answers[id]; return Array.isArray(a) ? a : []; }
  function has(id, i) { return picks(id).indexOf(i) !== -1; }
  function say(id) { var s = step(id); if (!s || !answered(id)) return ''; return (s.say || s.opts)[state.answers[id]]; }
  function visible(s) { return !s.when || s.when(); }
  function nextIndex(n) { for (var i = n + 1; i < FLOW.length; i++) if (visible(FLOW[i])) return i; return -1; }
  function prevIndex(n) { for (var i = n - 1; i >= 0; i--) if (visible(FLOW[i])) return i; return -1; }
  function goNext(n) { var i = nextIndex(n); go(i === -1 ? '#/email' : '#/quiz/' + i); }
  function goPrev(n) { var i = prevIndex(n); go(i === -1 ? '#/' : '#/quiz/' + i); }

  // ---------- experiments ----------
  var EXP = {
    alcohol: { name: 'No wine after 7 PM', why: 'Alcohol helps you fall asleep, then wears off a few hours later. That rebound often wakes you around 3 AM.', how: 'Any drink, any night, finish it before 7 PM. Sparkling water with lime after that.', ask: 'Did you skip drinks after 7 PM?' },
    heat: { name: 'Cool room, light layers', why: 'A warm bedroom makes night sweats more likely to wake you, and harder to fall back asleep after.', how: 'Set the room to 65–68°F, use breathable sheets, keep cold water by the bed.', ask: 'Was your room cool last night?' },
    caffeine: { name: 'Caffeine cutoff at noon', why: 'Half of an afternoon coffee is still in your system at bedtime, and it makes sleep lighter.', how: 'Coffee, black tea and soda before noon. Herbal tea or decaf after.', ask: 'Was your last caffeine before noon?' },
    mind: { name: '10-minute wind-down and worry list', why: 'A racing mind at 3 AM often picks up tomorrow’s to-do list. Writing it down earlier gives it somewhere to go.', how: 'At 9:30 PM, write tomorrow’s 3 worries and 1 next step each. Then the 3-minute breathing in the app.', ask: 'Did you do the wind-down?' },
    screens: { name: 'Screens off 45 minutes before bed', why: 'Scrolling keeps your brain alert and pushes sleep later, even when you feel tired.', how: 'Phone charges outside the bedroom. Read, stretch or do the breathing instead.', ask: 'Were screens off 45 minutes before bed?' },
    rhythm: { name: 'Same wake time every day', why: 'A fixed wake time, even on weekends, makes you sleepy at the same time each night.', how: 'Pick a time you can keep 7 days in a row. Get daylight within 30 minutes of waking.', ask: 'Did you get up at your set time?' }
  };

  var MICRO = [
    { id: 'm_wired', q: 'Quick one: do you often feel tired but wired at bedtime?' },
    { id: 'm_hot', q: 'Do you wake up hot even when the room is cool?' },
    { id: 'm_changed', q: 'Has your sleep changed in the last 2–3 years?' }
  ];
  function yes(id) { return state.answers[id] === 1; }

  function analyze() {
    var w = {
      alcohol: idx('wine') * 3 + (idx('wine') > 0 && idx('lastDrink') >= 2 ? 2 : 0),
      heat: idx('sweats') * 2 + (sevAt(0) >= 3 ? 2 : 0) + (idx('room') >= 2 ? idx('room') : 0) + (has('awakeDo', 3) ? 2 : 0) + (yes('m_hot') ? 1 : 0),
      caffeine: idx('cups') === 0 ? 0 : [0, 3, 6, 2][idx('caffeine')] + (idx('cups') >= 3 ? 2 : 0) + (idx('energy') >= 2 ? 1 : 0),
      mind: idx('stress') * 2 + (sevAt(4) >= 3 ? 1 : 0) + (idx('screens') === 1 ? 2 : 0) + (has('awakeDo', 2) ? 2 : 0) + (yes('m_wired') ? 1 : 0),
      screens: [5, 3, 0, 2][idx('screens')] + (has('awakeDo', 1) ? 2 : 0),
      rhythm: 2 + (idx('waketime') === 5 ? 1 : 0)
    };
    var ranked = Object.keys(w).sort(function (a, b) { return w[b] - w[a]; });
    var score = 100
      - idx('wakeups') * 7
      - idx('awakeLong') * 3
      - idx('badNights') * 3
      - idx('sweats') * 4
      - idx('wine') * 4
      - (idx('cups') === 0 ? 0 : [0, 3, 7, 3][idx('caffeine')])
      - [5, 5, 0, 3][idx('screens')]
      - idx('stress') * 3
      - [0, 0, 3, 6][idx('room')]
      - (idx('problem') === 3 ? 5 : 0);
    score = Math.max(28, Math.min(92, score));
    var top = ranked.slice(0, 3);
    var plan = top.slice();
    if (plan.indexOf('rhythm') === -1) plan.push('rhythm'); else plan.push(ranked[3]);
    return { score: score, suspects: top, weeks: plan.slice(0, 4) };
  }

  var SUSPECT_NAME = { alcohol: 'Evening wine', heat: 'Heat', caffeine: 'Caffeine', mind: 'Racing mind', screens: 'Screens', rhythm: 'Body clock' };
  // Why this suspect, in her own answers.
  function suspectNote(k) {
    switch (k) {
      case 'alcohol': return 'A drink ' + say('wine') + (answered('lastDrink') ? ', the last one ' + say('lastDrink') : '') + '. Alcohol wears off in the second half of the night.';
      case 'heat': return 'Sweats wake you ' + (say('sweats') || 'sometimes') + ', and your room feels ' + (say('room') || 'warm') + '.';
      case 'caffeine': return (say('cups') || 'Caffeine') + ' a day' + (answered('caffeine') ? ', the last one ' + say('caffeine') : '') + '. It can stay in your system for hours.';
      case 'mind': return 'Your mind races ' + (say('stress') || 'sometimes') + ' when you wake' + (has('awakeDo', 2) ? ', replaying tomorrow’s list' : '') + '.';
      case 'screens': return (say('screens') || 'Screens') + ' in the last hour before bed' + (has('awakeDo', 1) ? ', and the phone again at night' : '') + '.';
      default: return 'Broken nights push your body clock around. A fixed wake time resets it.';
    }
  }
  function goalLine() {
    var now = idx('wakeups') + 1;
    return now >= 2 ? { now: now, target: 1, text: 'from ' + now + ' wake-ups a night to 1' } : { now: 1, target: 0, text: 'back to sleep in under 15 minutes' };
  }

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
    doc: '<svg viewBox="0 0 24 24"><path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h5M10 16h5"/></svg>',
    drop: '<svg viewBox="0 0 24 24"><path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/></svg>',
    watch: '<svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="3"/><path d="M9 6l1-3h4l1 3M9 18l1 3h4l1-3M12 10v2l1.5 1.5"/></svg>'
  };
  function screen(mode, inner, extraClass, tab) {
    app.innerHTML = '<div class="screen ' + (mode === 'night' ? 'is-night' : 'is-day') + ' ' + (extraClass || '') + (tab ? ' has-tabs' : '') + '"><div class="screen-in">' + inner + '</div>' + (tab ? tabs(tab) : '') + '</div>';
    window.scrollTo(0, 0);
    var h = app.querySelector('h1, .q-title, .hello, .insight-head');
    if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
  }
  function topbar(n) {
    var pct = Math.round((n / FLOW.length) * 100);
    return '<div class="topbar"><button class="icon-btn" data-back aria-label="Back">' + ICON.back + '</button>' +
      '<div class="progress" role="progressbar" aria-valuenow="' + pct + '" aria-valuemin="0" aria-valuemax="100"><i style="width:' + pct + '%"></i></div>' +
      '<span class="step-count sec">' + esc(FLOW[n].sec) + '</span></div>';
  }

  // ---------- charts for the info screens ----------
  var STAGES = ['Before perimenopause', 'In perimenopause', 'After menopause'];
  function hbars(label, values, mine) {
    var rows = values.map(function (v, i) {
      return '<div class="hb' + (i === 1 ? ' hb-hi' : '') + '"><span class="hb-l">' + STAGES[i] + (i === mine ? ' <em>closest to you</em>' : '') + '</span>' +
        '<span class="hb-row"><span class="hb-t"><i style="width:' + v + '%"></i></span><b>' + v.toFixed(1) + '%</b></span></div>';
    }).join('');
    return '<p class="chart-t">' + label + '</p><div class="hbars" role="img" aria-label="' + esc(label + ': ' + values.map(function (v, i) { return STAGES[i] + ' ' + v + '%'; }).join(', ')) + '">' + rows + '</div>';
  }
  function dots(on, total, label) {
    var d = ''; for (var i = 0; i < total; i++) d += '<i class="' + (i < on ? 'on' : '') + '"></i>';
    return '<div class="dots10" role="img" aria-label="' + esc(label) + '">' + d + '</div><p class="chart-t" style="text-align:center;margin:10px 0 0">' + esc(label) + '</p>';
  }
  function hormoneChart(mine) {
    var est = 'M10 60 C25 50 35 70 50 58 C65 48 75 66 90 58 C100 30 108 92 118 40 C128 15 136 98 148 52 C158 22 166 96 178 70 C190 50 198 92 210 88 C235 100 260 104 290 106';
    var pro = 'M10 70 C40 62 70 72 90 66 C120 78 150 90 210 100 C240 104 265 106 290 108';
    var zx = [[10, 90], [90, 210], [210, 290]];
    var band = '<rect x="' + zx[mine][0] + '" y="10" width="' + (zx[mine][1] - zx[mine][0]) + '" height="104" rx="8" class="hz-me"/>';
    return '<svg class="tl" viewBox="0 0 300 140" role="img" aria-label="Illustration: estrogen swings and progesterone falls during perimenopause, both are lower after menopause">' + band +
      '<line x1="90" y1="10" x2="90" y2="114" class="ax" stroke-dasharray="3 4"/><line x1="210" y1="10" x2="210" y2="114" class="ax" stroke-dasharray="3 4"/>' +
      '<path d="' + est + '" class="h-est"/><path d="' + pro + '" class="h-pro"/>' +
      '<text x="50" y="132">Before</text><text x="150" y="132">Perimenopause</text><text x="250" y="132">After</text></svg>' +
      '<p class="sc-legend"><span class="k on"></span>Estrogen <span class="k k-pro"></span>Progesterone · illustration, not your levels</p>';
  }
  function caffeineLine() {
    // 12 PM to 12 AM, 22px per hour starting at x=14
    function x(h) { return 14 + h * 22; }
    var ticks = [[0, '12 PM'], [3, '3 PM'], [6, '6 PM'], [9, '9 PM'], [12, '12 AM']].map(function (t) {
      return '<line x1="' + x(t[0]) + '" y1="54" x2="' + x(t[0]) + '" y2="60" class="ax"/><text x="' + x(t[0]) + '" y="76">' + t[1] + '</text>';
    }).join('');
    return '<p class="chart-t">Caffeine taken 6 hours before an 11 PM bedtime</p>' +
      '<svg class="tl" viewBox="0 0 292 84" role="img" aria-label="Timeline: coffee at 5 PM, bedtime at 11 PM, 6 hours apart">' +
      '<line x1="' + x(0) + '" y1="54" x2="' + x(12) + '" y2="54" class="ax"/>' + ticks +
      '<rect x="' + x(5) + '" y="34" width="' + (x(11) - x(5)) + '" height="14" rx="7" class="win"/>' +
      '<text x="' + ((x(5) + x(11)) / 2) + '" y="26" class="lbl">6 hours: sleep was still over an hour shorter</text>' +
      '<circle cx="' + x(5) + '" cy="41" r="7" class="cup"/><circle cx="' + x(11) + '" cy="41" r="7" class="bed"/></svg>' +
      '<p class="sc-legend"><span class="k on"></span>Coffee, 5 PM <span class="k bedk"></span>Bed, 11 PM</p>';
  }
  function nightLine() {
    // Illustration: wake level across the night, calmer first half, choppier second half.
    var pts = [[0, 20], [10, 52], [30, 62], [55, 64], [80, 60], [105, 63], [130, 58], [145, 40], [152, 58], [170, 30], [178, 56], [196, 36], [204, 58], [222, 22], [232, 50], [252, 30], [262, 52], [280, 18]];
    var d = 'M' + pts.map(function (p) { return (10 + p[0]) + ' ' + p[1]; }).join(' L');
    return '<p class="chart-t">How evening alcohol tends to shape the night</p>' +
      '<svg class="tl" viewBox="0 0 300 96" role="img" aria-label="Illustration: steadier sleep in the first half of the night, more waking in the second half">' +
      '<rect x="150" y="8" width="140" height="62" rx="8" class="half2"/>' +
      '<text x="80" y="14" class="lbl">Steadier</text><text x="220" y="20" class="lbl">More waking</text>' +
      '<path d="' + d + '" class="wake"/>' +
      '<line x1="10" y1="70" x2="290" y2="70" class="ax"/>' +
      '<text x="10" y="88" style="text-anchor:start">11 PM</text><text x="150" y="88">3 AM</text><text x="290" y="88" style="text-anchor:end">7 AM</text></svg>' +
      '<p class="sc-legend">Illustration of the pattern, not your data. Higher line means closer to awake.</p>';
  }
  function guessCard() {
    return '<div class="vs"><div><b>Change 6 things at once</b><span>Melatonin, no coffee, new pillow, app… Better week? You can’t tell which one did it.</span></div>' +
      '<div class="vs-us"><b>One change, 7 nights</b><span>Compare experiment nights with the rest. Keep what works, drop what doesn’t.</span></div></div>';
  }
  function goalChart() {
    var g = goalLine(), y = function (v) { return 14 + (4 - v) * 18; };
    var start = g.now, end = g.target, xs = [20, 85, 150, 215, 280];
    var vals = xs.map(function (_, i) { return start - (start - end) * Math.pow(i / 4, 0.8); });
    var d = 'M' + xs.map(function (x, i) { return x + ' ' + y(vals[i]).toFixed(1); }).join(' L');
    var lbls = ['Today', 'Week 1', 'Week 2', 'Week 3', 'Week 4'].map(function (l, i) { return '<text x="' + xs[i] + '" y="104">' + l + '</text>'; }).join('');
    return '<p class="chart-t">Wake-ups per night</p><svg class="tl" viewBox="0 0 300 110" role="img" aria-label="Goal: from ' + start + ' to ' + end + ' wake-ups per night over 4 weeks">' +
      '<line x1="10" y1="86" x2="290" y2="86" class="ax"/>' +
      '<path d="' + d + '" class="goal"/>' +
      '<circle cx="20" cy="' + y(start) + '" r="6" class="bed"/><text x="30" y="' + (y(start) - 8) + '" style="text-anchor:start" class="lbl">' + start + ' now</text>' +
      '<circle cx="280" cy="' + y(end) + '" r="7" class="cup"/><text x="272" y="' + (y(end) - 12) + '" style="text-anchor:end" class="lbl">Goal: ' + end + '</text>' + lbls + '</svg>' +
      '<p class="sc-legend">Your goal, not a guarantee. You’ll see real numbers from your own check-ins.</p>';
  }

  var INFO = {
    short: function () {
      var c = state.answers.cycle;
      return {
        eyebrow: 'You’re not alone',
        title: c === 1 ? 'Less regular periods after 40 are a common sign of perimenopause. <strong>So is losing sleep.</strong>' : 'You’re not imagining it. <strong>Sleep changes in midlife.</strong>',
        visual: hbars('US women aged 40–59 who sleep less than 7 hours', [32.5, 56.0, 40.5], c),
        body: 'More than half of women in perimenopause sleep under 7 hours a night. It’s not a willpower problem.',
        src: 'CDC, NCHS Data Brief No. 286, 2017'
      };
    },
    staying: function () {
      return {
        eyebrow: 'Your nights',
        title: 'You wake up ' + esc(say('wakeups') || 'at night') + '. <strong>Nearly 1 in 3</strong> women in perimenopause has trouble staying asleep most nights.',
        visual: '<ul class="recap"><li>Usually ' + esc(say('waketime') || 'at night') + '</li><li>Awake ' + esc(say('awakeLong') || 'a while') + '</li><li>' + esc(say('badNights') || 'Several') + ' bad nights a week</li></ul>' +
          hbars('Trouble staying asleep on 4+ nights a week', [23.7, 30.8, 35.9], state.answers.cycle),
        body: 'In the same survey, about half of women in perimenopause (49.9%) woke up not feeling rested on most days.',
        src: 'CDC, NCHS Data Brief No. 286, 2017'
      };
    },
    heat: function () {
      var s = idx('sweats');
      return {
        eyebrow: 'Your body',
        title: '<strong>Up to 80%</strong> of women get hot flashes or night sweats during the transition.',
        visual: dots(8, 10, 'Up to 8 in 10 women'),
        body: (s >= 2 ? 'You said they wake you ' + esc(say('sweats')) + '. ' : '') + 'For more than half of women with frequent hot flashes, they lasted over 7 years. Waiting it out is a long wait, but heat at night is something you can change tonight.',
        src: 'SWAN study, JAMA Internal Medicine, 2015'
      };
    },
    hormones: function () {
      var chips = symList(2).slice(0, 3).map(function (x) { return x.n; });
      if (idx('sweats') >= 2 && chips.indexOf(SEV_ITEMS[0]) === -1) chips.unshift(SEV_ITEMS[0]);
      chips.unshift('Waking at night');
      chips = chips.slice(0, 4);
      var mine = state.answers.cycle === 2 ? 2 : state.answers.cycle === 0 && idx('age') === 0 ? 0 : 1;
      var zone = ['Before', 'Perimenopause', 'After'];
      return {
        eyebrow: 'Why this is happening',
        title: 'This isn’t a willpower problem. <strong>Your hormones are changing.</strong>',
        visual: hormoneChart(mine) + '<p class="chart-t" style="margin:12px 0 8px">Often linked to these swings, from your answers:</p><ul class="recap">' + chips.map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('') + '</ul>',
        body: 'In perimenopause, progesterone, which helps you sleep, often drops first, and estrogen swings up and down. Those swings can bring night sweats, 3 AM wake-ups and a racing mind. Some of what wakes you is still in your hands: heat, wine, caffeine and evening habits are things you can test.',
        src: ''
      };
    },
    caffeine: function () {
      var late = answered('caffeine') && (idx('caffeine') === 1 || idx('caffeine') === 2);
      return {
        eyebrow: 'Your days',
        title: late ? 'Your last cup is ' + esc(say('caffeine')) + '. <strong>That may still be in your system at bedtime.</strong>' : 'Afternoon coffee can cost you <strong>more than an hour of sleep.</strong>',
        visual: caffeineLine(),
        body: 'In a sleep-lab study, about 2–3 cups of coffee (400 mg) taken 6 hours before bed cut sleep by more than an hour. People didn’t notice it themselves.',
        src: 'Drake et al., Journal of Clinical Sleep Medicine, 2013'
      };
    },
    work: function () {
      var hit = answered('work') && idx('work') >= 1 && idx('work') <= 3;
      return {
        eyebrow: 'Your days',
        title: hit ? 'You feel it at work. <strong>So do many women your age.</strong>' : 'It doesn’t stay in the bedroom.',
        visual: '<div class="bigstat"><b>1 in 9</b><span>employed women aged 45–60 missed work because of menopause symptoms in the past year</span></div>' +
          '<div class="bigstat small"><b>$1.8B</b><span>estimated lost work time in the US each year</span></div>',
        body: 'Brain fog at 3 PM and a short fuse at dinner often start at 3 AM. Fixing the night is the shortest way to fixing the day.',
        src: 'Faubion et al., Mayo Clinic Proceedings, 2023 (4,440 women)'
      };
    },
    alcohol: function () {
      var mid = answered('waketime') && idx('waketime') >= 2 && idx('waketime') <= 4;
      return {
        eyebrow: 'Your evenings',
        title: 'Wine helps you fall asleep. <strong>Then it can wake you up.</strong>',
        visual: nightLine(),
        body: 'In a sleep-lab study, an evening of drinking increased wakefulness in the second half of the night, and women woke more often than men.' +
          (mid ? ' You usually wake ' + esc(say('waketime')) + ', right in that second half.' : ''),
        src: 'Arnedt et al., Alcoholism: Clinical & Experimental Research, 2011'
      };
    },
    guess: function () {
      var n = picks('tried').filter(function (i) { return i !== 6; }).length;
      return {
        eyebrow: 'Why it’s been hard',
        title: n ? 'You’ve tried ' + n + ' thing' + (n === 1 ? '' : 's') + '. <strong>The hard part is knowing what worked.</strong>' : 'Most sleep advice is a list of 20 things <strong>to do all at once.</strong>',
        visual: guessCard(),
        body: 'SleepThrough tests one change at a time for 7 nights and compares your experiment nights with the rest. Your own nights are the evidence.',
        src: ''
      };
    },
    preview: function () {
      var g = goalLine();
      return {
        eyebrow: 'Your plan',
        title: 'Your goal: <strong>' + esc(g.text) + '</strong> in 4 weeks.',
        visual: goalChart(),
        body: 'We’ll pick 4 experiments from your answers, one per week, in about ' + esc(say('minutes') || '10 minutes') + ' a day.',
        src: ''
      };
    }
  };

  // ---------- views ----------
  function viewQuiz(n) {
    var q = FLOW[n];
    if (!q) return go('#/email');
    if (!visible(q)) return goNext(n);
    if (q.info) return viewInfo(n);
    if (q.scale) return viewScale(n);
    var multi = !!q.multi;
    var cur = state.answers[q.id];
    var opts = q.opts.map(function (o, i) {
      var on = multi ? (Array.isArray(cur) && cur.indexOf(i) !== -1) : cur === i;
      return '<button class="opt' + (multi ? ' opt-multi' : '') + '" data-i="' + i + '" aria-pressed="' + on + '">' + esc(o) + '</button>';
    }).join('');
    screen('night', topbar(n) +
      '<h1 class="q-title">' + esc(q.q) + '</h1>' +
      (q.help ? '<p class="q-help">' + esc(q.help) + '</p>' : '') +
      '<div class="options">' + opts + '</div>' + whyBox(q) +
      (q.skip && !multi ? '<button class="btn btn-quiet btn-block" data-skipq>Prefer not to say</button>' : '') +
      (multi ? '<div class="spacer"></div><button class="btn btn-lamp btn-block sticky" data-next' + (Array.isArray(cur) && cur.length ? '' : ' disabled') + '>Continue</button>' : ''));
    app.querySelector('[data-back]').onclick = function () { goPrev(n); };
    app.querySelectorAll('.opt').forEach(function (b) {
      b.onclick = function () {
        var i = +b.dataset.i;
        if (!multi) {
          state.answers[q.id] = i; save();
          app.querySelectorAll('.opt').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
          setTimeout(function () { goNext(n); }, 160);
          return;
        }
        var a = Array.isArray(state.answers[q.id]) ? state.answers[q.id].slice() : [];
        var at = a.indexOf(i);
        if (at !== -1) a.splice(at, 1);
        else if (i === q.none) a = [i];
        else { a = a.filter(function (x) { return x !== q.none; }); a.push(i); }
        state.answers[q.id] = a; save();
        app.querySelectorAll('.opt').forEach(function (x) { x.setAttribute('aria-pressed', String(a.indexOf(+x.dataset.i) !== -1)); });
        app.querySelector('[data-next]').disabled = !a.length;
      };
    });
    var nx = app.querySelector('[data-next]');
    if (nx) nx.onclick = function () { goNext(n); };
    var sk = app.querySelector('[data-skipq]');
    if (sk) sk.onclick = function () { delete state.answers[q.id]; save(); goNext(n); };
  }
  function whyBox(q) { return q.why ? '<details class="whyq"><summary>Why we ask</summary><p>' + esc(q.why) + '</p></details>' : ''; }

  // One symptom at a time, five levels, like a clinical rating scale.
  function viewScale(n, k, rescore) {
    var q = FLOW[n] || {}, cur = rescore ? (rescore.vals) : (Array.isArray(state.answers.sev) ? state.answers.sev.slice() : []);
    k = k || 0;
    var head = rescore ? '<div class="topbar"><button class="icon-btn" data-back aria-label="Back">' + ICON.back + '</button><div class="progress"><i style="width:' + Math.round(k / SEV_ITEMS.length * 100) + '%"></i></div><span class="step-count">Re-check</span></div>' : topbar(n);
    screen(rescore ? 'day' : 'night', head +
      '<h1 class="q-title">' + esc(rescore ? 'How much is each of these affecting you now?' : q.q) + '</h1>' +
      '<div class="sev-card"><span class="sev-n">' + (k + 1) + '/' + SEV_ITEMS.length + '</span><b>' + esc(SEV_ITEMS[k]) + '</b></div>' +
      '<div class="options">' + SEV_LEVELS.map(function (l, i) { return '<button class="opt" data-v="' + i + '" aria-pressed="' + (cur[k] === i) + '">' + esc(l) + '</button>'; }).join('') + '</div>' +
      (rescore ? '' : whyBox(q)), rescore ? 'sky-day' : '');
    app.querySelector('[data-back]').onclick = function () {
      if (k > 0) return viewScale(n, k - 1, rescore);
      if (rescore) return go('#/app/progress');
      goPrev(n);
    };
    app.querySelectorAll('.opt').forEach(function (b) {
      b.onclick = function () {
        cur[k] = +b.dataset.v; b.setAttribute('aria-pressed', 'true');
        if (!rescore) { state.answers.sev = cur; save(); } else rescore.vals = cur;
        setTimeout(function () {
          if (k + 1 < SEV_ITEMS.length) return viewScale(n, k + 1, rescore);
          if (rescore) {
            state.sevHistory = state.sevHistory || [];
            state.sevHistory.push({ at: now(), vals: cur.slice() }); save();
            toast('Symptom score saved: ' + sevScore(cur) + ' of ' + sevMax()); return go('#/app/progress');
          }
          goNext(n);
        }, 180);
      };
    });
  }

  function viewInfo(n) {
    var c = INFO[FLOW[n].info]();
    screen('night', topbar(n) +
      '<p class="eyebrow">' + esc(c.eyebrow) + '</p>' +
      '<h1 class="q-title info-title">' + c.title + '</h1>' +
      '<div class="info-card">' + c.visual + '</div>' +
      '<p class="info-body">' + c.body + '</p>' +
      (c.src ? '<p class="src">Source: ' + esc(c.src) + '</p>' : '') +
      '<div class="spacer"></div><button class="btn btn-lamp btn-block" data-next>Continue</button>');
    app.querySelector('[data-back]').onclick = function () { goPrev(n); };
    app.querySelector('[data-next]').onclick = function () { goNext(n); };
  }

  function viewEmail() {
    screen('night',
      '<div class="topbar"><button class="icon-btn" data-back aria-label="Back">' + ICON.back + '</button><div class="progress"><i style="width:100%"></i></div><span class="step-count"></span></div>' +
      '<h1 class="q-title">Your plan is ready. Where should we send it?</h1>' +
      '<p class="q-help">We’ll email your results and your week 1 experiment. No spam, unsubscribe any time.</p>' +
      '<form id="ef"><label for="em" class="q-help" style="display:block;margin:8px 0 6px">Email</label>' +
      '<input id="em" class="field" type="email" autocomplete="email" placeholder="you@example.com" value="' + esc(state.email) + '">' +
      '<div class="spacer"></div><button class="btn btn-lamp btn-block" type="submit" style="margin-top:20px">See my results</button></form>' +
      '<button class="btn btn-quiet btn-block" data-skip>Skip and see results</button>');
    app.querySelector('[data-back]').onclick = function () { goPrev(FLOW.length); };
    app.querySelector('#ef').onsubmit = function (e) { e.preventDefault(); state.email = app.querySelector('#em').value.trim(); save(); go('#/analyzing'); };
    app.querySelector('[data-skip]').onclick = function () { go('#/analyzing'); };
  }

  function viewAnalyzing() {
    var steps = ['Reading your nights', 'Weighing wine, caffeine, heat and stress', 'Matching patterns common in perimenopause', 'Building your 4-week plan'];
    screen('night',
      '<div class="spacer" style="flex:.4"></div><h1 class="q-title">Finding what’s waking you</h1>' +
      '<ul class="analyze">' + steps.map(function (s) { return '<li><span class="dot"></span>' + s + '</li>'; }).join('') + '</ul>' +
      '<div class="micro" id="micro" aria-live="polite"></div><div class="spacer"></div>');
    var lis = app.querySelectorAll('.analyze li'), box = app.querySelector('#micro'), i = 0;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var wait = reduce ? 150 : 800;
    function ask(m, then) {
      box.innerHTML = '<p>' + esc(m.q) + '</p><div class="micro-btns"><button class="opt" data-v="1">Yes</button><button class="opt" data-v="0">No</button></div>';
      box.classList.add('show');
      box.querySelectorAll('button').forEach(function (b) {
        b.onclick = function () { state.answers[m.id] = +b.dataset.v; save(); box.classList.remove('show'); box.innerHTML = ''; setTimeout(then, reduce ? 50 : 350); };
      });
    }
    (function tick() {
      if (location.hash !== '#/analyzing') return;
      if (i < lis.length) {
        lis[i].classList.add('done'); i++;
        if (i - 1 < MICRO.length) setTimeout(function () { ask(MICRO[i - 1], tick); }, reduce ? 50 : 400);
        else setTimeout(tick, wait);
      } else { state.plan = analyze(); state.expIndex = 0; save(); go('#/result'); }
    })();
  }

  function ring(score) {
    var c = 2 * Math.PI * 52, off = c * (1 - score / 100);
    return '<svg class="ring" viewBox="0 0 128 128" role="img" aria-label="Sleep Score ' + score + ' out of 100"><circle class="track" cx="64" cy="64" r="52"/>' +
      '<circle class="val" cx="64" cy="64" r="52" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + c.toFixed(1) + '" data-off="' + off.toFixed(1) + '"/>' +
      '<text x="64" y="76">' + score + '</text></svg>';
  }

  function recapList() {
    var items = [];
    if (answered('wakeups')) items.push('You wake up ' + say('wakeups') + ' a night' + (answered('waketime') ? ', usually ' + say('waketime') : ''));
    if (answered('awakeLong')) items.push('Awake ' + say('awakeLong') + ' each time');
    if (answered('badNights')) items.push(say('badNights') + ' bad nights a week');
    var sym = symList(2).map(function (x) { return x.n.toLowerCase(); });
    if (sym.length) items.push('Also: ' + sym.slice(0, 3).join(', '));
    return items.length ? '<ul class="recap recap-list">' + items.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' : '';
  }

  function stageCard() {
    var st = stageGuess(), sc = sevScore(sevVals());
    return '<section class="stage"><p class="stage-l">Your answers fit</p><h2 class="stage-n">' + esc(st.name) + '</h2><p class="stage-w">' + esc(st.why) + '</p>' +
      (sc != null ? '<p class="stage-s">Symptom score <b>' + sc + '</b> of ' + sevMax() + '. We re-check it every few weeks.</p>' : '') +
      '<p class="stage-d">Not a diagnosis. Your doctor can confirm it, and your SleepThrough report helps that conversation.</p></section>';
  }
  function viewResult() {
    var p = state.plan || (state.plan = analyze());
    var verdict = p.score >= 75 ? 'Your sleep is mostly working.' : p.score >= 55 ? 'Your sleep is getting interrupted.' : 'Your nights are working against you.';
    screen('night',
      '<div class="topbar"><button class="icon-btn" data-back aria-label="Back">' + ICON.back + '</button><span></span></div>' +
      '<p class="eyebrow" style="margin-top:0">What you told us</p>' + recapList() + stageCard() +
      '<p class="q-help" style="margin:18px 0 0">Your Sleep Score</p>' +
      '<div class="score">' + ring(p.score) + '<div class="score-copy"><strong>' + verdict + '</strong><p>Out of 100, higher is better. We re-score your nights after every experiment.</p></div></div>' +
      '<h2 style="font-size:24px">Your likely suspects</h2>' +
      '<ol class="suspects">' + p.suspects.map(function (s, i) { return '<li><span class="rank">' + (i + 1) + '</span><b>' + SUSPECT_NAME[s] + '</b><span>' + esc(suspectNote(s)) + '</span></li>'; }).join('') + '</ol>' +
      '<h2 style="font-size:24px">Your 4-week plan</h2>' +
      '<ol class="plan-weeks">' + p.weeks.map(function (k, i) { return '<li>' + esc(EXP[k].name) + '<small>Week ' + (i + 1) + '</small></li>'; }).join('') + '</ol>' +
      '<button class="btn btn-lamp btn-block" data-next>Start my plan</button>' +
      '<p class="disclaimer" style="margin-top:16px">SleepThrough is a coaching tool, not a diagnosis. If you snore loudly or stop breathing at night, talk to a doctor.</p>');
    requestAnimationFrame(function () { var v = app.querySelector('.ring .val'); if (v) v.style.strokeDashoffset = v.dataset.off; });
    app.querySelector('[data-back]').onclick = function () { goPrev(FLOW.length); };
    app.querySelector('[data-next]').onclick = function () { go('#/paywall'); };
  }

  var OBJ = {
    0: ['You tried melatonin.', 'Melatonin mostly helps you fall asleep. We look at what wakes you at 3 AM.'],
    1: ['You tried supplements.', 'A supplement is one guess. We test one change at a time and show you the result.'],
    2: ['You tried a sleep app.', 'A sleep app plays content. We tell you which change worked for your body.'],
    3: ['You cut back on caffeine.', 'Good start. Your check-ins will show if it actually made a difference.'],
    4: ['You asked your doctor.', 'Bring them a one-page report of your nights, made from your check-ins.'],
    5: ['You’re on hormone therapy.', 'SleepThrough works alongside it, on the habits medication can’t change.']
  };
  function objections() {
    var t = picks('tried').filter(function (i) { return OBJ[i]; }).slice(0, 2);
    if (!t.length) return '';
    return '<div class="objs"><p class="chart-t">Why this time is different</p>' + t.map(function (i) { return '<p class="obj"><b>' + esc(OBJ[i][0]) + '</b> ' + esc(OBJ[i][1]) + '</p>'; }).join('') + '</div>';
  }
  function viewPaywall() {
    var p = state.plan || analyze();
    var g = goalLine();
    var pick = 'q';
    screen('night',
      '<div class="topbar"><button class="icon-btn" data-back aria-label="Back">' + ICON.back + '</button><span></span></div>' +
      '<h1 class="q-title" style="margin-top:0">Your plan to get <span class="hl">' + esc(g.text) + '</span> by ' + esc(targetDate()) + '</h1>' +
      '<p class="pw-top">12 weeks $39.99 · 7 days free · cancel any time</p>' +
      '<div class="info-card">' + goalChart() + '</div>' +
      '<ul class="pw-list"><li>Week 1: ' + esc(EXP[p.weeks[0]].name) + ' — your #1 suspect</li><li>3-minute wind-down every evening</li><li>Night mode: one tap when you wake' + (answered('waketime') && idx('waketime') < 5 ? ' ' + esc(say('waketime')) : '') + ', and your check-in fills itself in</li><li>Tonight’s plan with times, and a report for your doctor</li><li>Your result on day 7, then the next experiment</li></ul>' +
      '<div class="pw-plans" role="group" aria-label="Choose a plan">' +
      '<button class="pw-plan" data-p="q" aria-pressed="true"><b>12 weeks</b><span class="pw-price">$39.99</span><small>$3.33 a week · best value</small></button>' +
      '<button class="pw-plan" data-p="m" aria-pressed="false"><b>4 weeks</b><span class="pw-price">$19.99</span><small>$5.00 a week</small></button></div>' +
      objections() +
      '<button class="btn btn-lamp btn-block" data-buy>Start 7-day free trial</button>' +
      '<p class="guarantee"><b>30-day money-back promise.</b> If your nights aren’t better after 30 days of check-ins, write to us and we refund you.</p>' +
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
  function currentKey() { var p = state.plan || (state.plan = analyze()); return p.weeks[state.expIndex] || p.weeks[0]; }
  function currentExp() { return EXP[currentKey()]; }
  function weekCheckins() { var start = state.expIndex * 7; return state.checkins.slice(start, start + 7).filter(Boolean); }
  function streak() { var n = 0; for (var i = state.checkins.length - 1; i >= 0; i--) { if (state.checkins[i]) n++; else break; } return n; }
  function avg(a) { return a.length ? a.reduce(function (s, x) { return s + x; }, 0) / a.length : null; }
  function fmt(x) { return Math.round(x * 10) / 10; }

  // ---------- clock: real time, or a preview time set from the demo tools ----------
  var timers = [];
  function later(fn, ms) { var t = setInterval(fn, ms); timers.push(t); return t; }
  function clearTimers() { timers.forEach(clearInterval); timers = []; }
  function now() { return Date.now() + (state.clockOffset || 0); }
  function nowDate() { return new Date(now()); }
  function pad(n) { return String(n).padStart(2, '0'); }
  function dayKey(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  // A night runs from noon to noon, so 7:30 PM and 3:07 AM belong to the same night.
  function nightKey(t) { var d = new Date(t); if (d.getHours() < 12) d = new Date(t - 86400000); return dayKey(d); }
  function nightOf(k) { state.nights = state.nights || {}; return state.nights[k] || (state.nights[k] = { wakes: [], parked: [], done: [] }); }
  function fmtHM(min) { min = ((min % 1440) + 1440) % 1440; var h = Math.floor(min / 60), m = min % 60; return ((h % 12) || 12) + ':' + pad(m) + ' ' + (h < 12 ? 'AM' : 'PM'); }
  function fmtClock(t) { var d = new Date(t); return fmtHM(d.getHours() * 60 + d.getMinutes()); }
  function minOfDay(t) { var d = new Date(t); return d.getHours() * 60 + d.getMinutes(); }
  function parseHM(s) { var p = String(s || '22:30').split(':'); return (+p[0]) * 60 + (+p[1] || 0); }
  function sinceNine(t) { return (minOfDay(t) - 1260 + 1440) % 1440; }
  function dur(ms) { var m = Math.max(0, Math.round(ms / 60000)); return m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + (m % 60) + ' min'; }
  function phase() {
    var h = nowDate().getHours();
    if (h >= 17 && h < 22) return 'evening';
    if (h >= 22 || h < 5) return 'night';
    if (h < 11) return 'morning';
    return 'day';
  }
  var SKY = { evening: ['night', 'sky-evening'], night: ['night', 'sky-night'], morning: ['day', 'sky-dawn'], day: ['day', 'sky-day'] };

  // ---------- the night dial: 9 PM to 7 AM, wake-ups as stars ----------
  function dial(o) {
    var cx = 160, cy = 168, r = 124;
    function pt(m, rr) { var a = (-120 + 240 * Math.max(0, Math.min(600, m)) / 600) * Math.PI / 180; return [cx + rr * Math.sin(a), cy - rr * Math.cos(a)]; }
    function xy(p) { return p[0].toFixed(1) + ' ' + p[1].toFixed(1); }
    var a0 = pt(0, r), a1 = pt(600, r);
    var svg = '<path d="M' + xy(a0) + ' A' + r + ' ' + r + ' 0 1 1 ' + xy(a1) + '" class="d-arc"/>';
    ['10 PM', '12 AM', '2 AM', '4 AM', '6 AM'].forEach(function (l, i) {
      var m = 60 + i * 120, p1 = pt(m, r - 7), p2 = pt(m, r + 7), pl = pt(m, r + 24);
      svg += '<line x1="' + p1[0].toFixed(1) + '" y1="' + p1[1].toFixed(1) + '" x2="' + p2[0].toFixed(1) + '" y2="' + p2[1].toFixed(1) + '" class="d-tick"/>' +
        '<text x="' + pl[0].toFixed(1) + '" y="' + (pl[1] + 4).toFixed(1) + '" class="d-lbl">' + l + '</text>';
    });
    if (o.bed != null) { var b = pt(o.bed, r); svg += '<circle cx="' + b[0].toFixed(1) + '" cy="' + b[1].toFixed(1) + '" r="7" class="d-bed"/>'; }
    if (o.wake != null) { var w = pt(o.wake, r); svg += '<circle cx="' + w[0].toFixed(1) + '" cy="' + w[1].toFixed(1) + '" r="7" class="d-sun"/>'; }
    (o.stars || []).forEach(function (s) {
      var p = pt(s.m, r - (s.ring || 0));
      svg += '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="13" class="d-glow ' + (s.cls || '') + '"/><circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="5.5" class="d-star ' + (s.cls || '') + '"/>';
    });
    if (o.now != null && o.now <= 600) { var n1 = pt(o.now, r - 20), n2 = pt(o.now, r + 10); svg += '<line x1="' + n1[0].toFixed(1) + '" y1="' + n1[1].toFixed(1) + '" x2="' + n2[0].toFixed(1) + '" y2="' + n2[1].toFixed(1) + '" class="d-now"/>'; }
    return '<div class="dial ' + (o.cls || '') + '"><svg viewBox="0 0 320 300" role="img" aria-label="' + esc(o.label || 'Night from 9 PM to 7 AM') + '">' + svg + '</svg><div class="dial-c">' + (o.center || '') + '</div></div>';
  }

  // ---------- tonight's plan ----------
  function planItems() {
    var k = currentKey(), bed = parseHM(state.bedtime), wake = parseHM(state.wakeAt || '06:45');
    var exp = {
      alcohol: { at: 19 * 60, t: 'Last drink by 7:00 PM', s: 'Sparkling water with lime after that' },
      heat: { at: bed - 60, t: 'Cool the bedroom to 65–68°F', s: 'Light layers, breathable sheets' },
      caffeine: { at: 12 * 60, t: 'Last caffeine by noon', s: 'Herbal tea or decaf after that' },
      mind: { at: bed - 60, t: 'Write tomorrow’s worry list', s: '3 worries, one next step for each' },
      screens: { at: bed - 45, t: 'Phone charging outside the bedroom', s: 'Read or stretch instead' },
      rhythm: { at: bed - 30, t: 'Alarm set for ' + fmtHM(wake), s: 'Same time every day, weekends too' }
    }[k];
    exp.id = 'exp'; exp.exp = true;
    var items = [exp, { id: 'wind', at: bed - 15, t: '3-minute wind-down', s: 'Long-exhale breathing', href: '#/app/tonight' }];
    if (k !== 'heat' && state.plan.suspects.indexOf('heat') !== -1) items.push({ id: 'water', at: bed - 10, t: 'Cold water by the bed', s: 'In case a hot flash wakes you' });
    items.push({ id: 'lights', at: bed, t: 'Lights out', s: 'Your bedtime' });
    return items.sort(function (a, b) { return a.at - b.at; });
  }
  function planList(k) {
    var n = nightOf(k), items = planItems(), m = minOfDay(now()), next = null;
    items.forEach(function (it) { if (!next && n.done.indexOf(it.id) === -1 && it.at > m && m >= 12 * 60) next = it; });
    var head = next ? '<p class="next">Next: ' + esc(next.t) + ' <b>in ' + dur((next.at - m) * 60000) + '</b></p>' : '';
    return head + '<ul class="tplan">' + items.map(function (it) {
      var on = n.done.indexOf(it.id) !== -1;
      return '<li class="' + (on ? 'done ' : '') + (it === next ? 'is-next' : '') + '"><span class="pl-t">' + fmtHM(it.at) + '</span>' +
        '<span class="pl-x"><b>' + esc(it.t) + (it.exp ? ' <em>this week’s test</em>' : '') + '</b><small>' + (it.href ? '<a href="' + it.href + '">Start it now</a>' : esc(it.s)) + '</small></span>' +
        '<button class="tick" data-tick="' + it.id + '" aria-pressed="' + on + '" aria-label="Done: ' + esc(it.t) + '"></button></li>';
    }).join('') + '</ul>';
  }
  function bindPlan(k, rerender) {
    app.querySelectorAll('[data-tick]').forEach(function (b) {
      b.onclick = function () {
        var n = nightOf(k), id = b.dataset.tick, at = n.done.indexOf(id);
        if (at === -1) n.done.push(id); else n.done.splice(at, 1);
        save(); rerender();
      };
    });
  }

  // ---------- tab bar ----------
  function tabs(active) {
    var t = [['today', '#/app', 'Today', ICON.sun], ['night', '#/app/night', 'Awake?', ICON.moon], ['progress', '#/app/progress', 'Progress', ICON.chart], ['report', '#/app/report', 'For my doctor', ICON.doc]];
    return '<nav class="tabbar" aria-label="App sections">' + t.map(function (x) {
      return '<a href="' + x[1] + '" class="tab' + (x[0] === active ? ' on' : '') + '"' + (x[0] === active ? ' aria-current="page"' : '') + '>' + x[3] + '<span>' + x[2] + '</span></a>';
    }).join('') + '</nav>';
  }
  function demoTools() {
    return '<div class="demo-tools"><p>Demo tools for the Capstone review. Preview the app at:</p>' +
      '<div class="demo-row"><button data-at="19:30">7:30 PM</button><button data-at="03:07">3:07 AM</button><button data-at="07:15">7:15 AM</button><button data-at="now">Real time</button></div>' +
      '<div class="demo-row"><button data-demo>Fill a sample week</button><button data-month>Fill a sample month</button><button data-reset>Start over</button></div></div>';
  }
  function bindDemo(rerender) {
    app.querySelectorAll('[data-at]').forEach(function (b) {
      b.onclick = function () {
        if (b.dataset.at === 'now') { state.clockOffset = 0; save(); toast('Back to real time'); return rerender(); }
        var real = new Date(), target = new Date(real), hm = parseHM(b.dataset.at);
        // Evening is "today"; 3 AM and morning are the morning after, so all three share one night.
        if (real.getHours() < 12 && hm >= 12 * 60) target.setDate(target.getDate() - 1);
        if (real.getHours() >= 12 && hm < 12 * 60) target.setDate(target.getDate() + 1);
        target.setHours(Math.floor(hm / 60), hm % 60, 0, 0);
        state.clockOffset = target - real; save(); toast('Previewing ' + fmtHM(hm)); rerender();
      };
    });
    var d = app.querySelector('[data-demo]'); if (d) d.onclick = function () { fillDemo(); rerender(); };
    var mo = app.querySelector('[data-month]'); if (mo) mo.onclick = function () { fillMonth(); rerender(); };
    var r = app.querySelector('[data-reset]'); if (r) r.onclick = function () { try { localStorage.removeItem(KEY); } catch (e) {} state = { answers: {}, email: '', plan: null, sub: null, checkins: [], expIndex: 0 }; go('#/'); };
  }

  // ---------- Today ----------
  function viewHome() {
    if (!state.plan) return go('#/quiz/0');
    var ph = phase(), sky = SKY[ph], k = nightKey(now()), n = nightOf(k);
    var e = currentExp(), wk = weekCheckins(), done = wk.length >= 7;
    var free = state.sub && state.sub.plan === 'free';
    var g = goalLine();
    var hello = { evening: 'Good evening', night: 'Still up?', morning: 'Good morning', day: 'Good afternoon' }[ph];
    var dots7 = ''; for (var i = 0; i < 7; i++) { var c = wk[i]; dots7 += '<i class="' + (c ? (c.did ? 'on' : 'miss') : '') + '"></i>'; }
    var checked = state.checkins.some(function (c) { return c && c.key === k; });
    var body = '';

    if (ph === 'morning') {
      var times = n.wakes.map(function (w) { return fmtClock(w.at); });
      var longest = n.wakes.reduce(function (mx, w) { return Math.max(mx, (w.back || w.at + 20 * 60000) - w.at); }, 0);
      body += dial({ stars: n.wakes.map(function (w) { return { m: sinceNine(w.at) }; }), bed: parseHM(state.bedtime) - 1260, wake: parseHM(state.wakeAt || '06:45') + 180,
        center: '<b class="dial-num">' + n.wakes.length + '</b><span>wake-up' + (n.wakes.length === 1 ? '' : 's') + ' logged</span>', label: 'Last night: ' + n.wakes.length + ' wake-ups logged' }) +
        '<p class="lede-s">' + (n.wakes.length ? 'You tapped at ' + esc(times.join(', ')) + '. Longest awake: ' + dur(longest) + '.' : 'No night taps last night. That’s either a good night, or you can fill it in now.') + '</p>' +
        (checked ? '<p class="saved">Check-in saved for last night.</p>' : '<a class="btn btn-night btn-block" href="#/app/checkin">' + (n.wakes.length ? 'Confirm your check-in' : 'Do your 30-second check-in') + '</a>');
      var open = n.parked.filter(function (p) { return !p.done; });
      if (n.parked.length) {
        body += '<section class="parked"><h2>You parked ' + n.parked.length + ' thought' + (n.parked.length === 1 ? '' : 's') + ' last night</h2>' +
          n.parked.map(function (p, i) { return '<label class="pk' + (p.done ? ' done' : '') + '"><input type="checkbox" data-pk="' + i + '"' + (p.done ? ' checked' : '') + '><span>' + esc(p.text) + '<small>' + fmtClock(p.at) + '</small></span></label>'; }).join('') +
          (open.length ? '<p class="fine-d">Tick one off when it’s handled, or move it to today’s list.</p>' : '<p class="fine-d">All handled. They didn’t need you at 3 AM.</p>') + '</section>';
      }
    } else if (ph === 'night') {
      body += '<a class="night-cta" href="#/app/night"><span class="moon-ic">' + ICON.moon + '</span><span><b>Awake right now?</b><small>Open night mode. The screen goes dim, one tap logs it.</small></span></a>';
    } else {
      body += '<div class="bedrow"><span>Bedtime</span><label><input type="time" id="bed" value="' + esc(state.bedtime || '22:30') + '"></label></div>' +
        '<h2 class="sec-h">' + (ph === 'evening' ? 'Tonight’s plan' : 'Tonight’s plan starts at 7 PM') + '</h2>' + planList(k);
    }

    body += '<section class="exp-card" aria-label="This week’s test"><p class="lbl">Week ' + (state.expIndex + 1) + ' of 4 · ' + (done ? 'complete' : 'night ' + Math.min(wk.length + 1, 7) + ' of 7') + '</p>' +
      '<h2>' + esc(e.name) + '</h2><p>' + esc(e.why) + '</p><p class="why">Why you: ' + esc(suspectNote(currentKey())) + '</p><div class="days" aria-label="' + wk.length + ' of 7 nights checked in">' + dots7 + '</div>' +
      (done ? '<a class="btn btn-lamp btn-block" href="#/app/insight" style="margin-top:16px">See your week ' + (state.expIndex + 1) + ' result</a>' : '') + '</section>';

    screen(sky[0],
      '<header class="app-head"><a class="brand" href="#/" aria-label="SleepThrough home"><svg class="mark" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="50" fill="#E8A93E"/><path d="M20.5 47.5q11.5 11 23 0M56.5 47.5q11.5 11 23 0" fill="none" stroke="#22264B" stroke-width="4" stroke-linecap="round"/><circle cx="21.5" cy="66" r="6.5" fill="#E38D52"/><circle cx="78.5" cy="66" r="6.5" fill="#E38D52"/></svg><span>sleepthrough</span></a><span class="clock-s">' + fmtClock(now()) + '</span></header>' +
      (free ? '<p class="banner">Free preview: week 1 is open. <a href="#/paywall">Start the trial</a> to unlock weeks 2–4.</p>' : '') +
      '<h1 class="hello">' + hello + '</h1>' +
      '<p class="goal-s">Goal: ' + esc(g.text) + (streak() ? ' · ' + streak() + ' check-ins in a row' : '') + '</p>' + body +
      '<div class="more">' + action('#/app/tonight', ICON.moon, '3-minute wind-down', 'Long-exhale breathing') + action('#/app/devices', ICON.watch, 'Connect a sleep tracker', 'Apple Watch, Oura, Fitbit, Whoop') + '</div>' +
      demoTools(), sky[1], 'today');
    var bed = app.querySelector('#bed'); if (bed) bed.onchange = function () { state.bedtime = bed.value || '22:30'; save(); toast('Bedtime set to ' + fmtHM(parseHM(state.bedtime))); viewHome(); };
    bindPlan(k, viewHome);
    app.querySelectorAll('[data-pk]').forEach(function (c) { c.onchange = function () { n.parked[+c.dataset.pk].done = c.checked; save(); viewHome(); }; });
    bindDemo(viewHome);
  }
  function action(href, icon, title, sub) {
    return '<a class="action" href="' + href + '"><span class="ic">' + icon + '</span><span><b>' + esc(title) + '</b><small>' + esc(sub) + '</small></span><span class="chev" aria-hidden="true">›</span></a>';
  }

  // ---------- Night mode: one tap at 3 AM ----------
  function viewNight(panel) {
    if (!state.plan) return go('#/quiz/0');
    var k = nightKey(now()), n = nightOf(k);
    var last = n.wakes[n.wakes.length - 1], open = last && !last.back ? last : null;
    var stars = n.wakes.map(function (w) { return { m: sinceNine(w.at), cls: w === open ? 'live' : '' }; });
    var t = fmtClock(now()), parts = t.split(' ');
    var center = '<b class="dial-time">' + parts[0] + '<small>' + parts[1] + '</small></b><span>' + (open ? 'Awake for ' + dur(now() - open.at) : n.wakes.length ? n.wakes.length + ' logged tonight' : 'Your night so far') + '</span>';
    var inner = '<div class="topbar"><a class="icon-btn" href="#/app" aria-label="Close night mode">' + ICON.close + '</a><span class="step-count">Night mode</span></div>' +
      dial({ stars: stars, now: sinceNine(now()), bed: parseHM(state.bedtime) - 1260, center: center, cls: 'dial-night', label: 'Tonight: ' + n.wakes.length + ' wake-ups logged' });
    if (!open) {
      inner += '<button class="awake-btn" data-awake>I’m awake</button>' +
        '<p class="hint">One tap logs the time. It fills in your morning check-in, so you don’t have to remember.</p>';
    } else if (panel === 'hot') {
      inner += '<section class="np"><h1 class="np-h">Cool down, 90 seconds</h1><ol class="cool">' +
        '<li>Uncover one foot and both hands.</li><li>Flip the pillow to the cool side.</li><li>Sip the cold water by the bed.</li><li>Breathe out slower than you breathe in.</li></ol>' +
        '<p class="np-timer" id="ct" aria-live="polite">1:30</p><button class="btn btn-ghost btn-block" data-panel="">Done</button></section>';
    } else if (panel === 'mind') {
      inner += '<section class="np"><h1 class="np-h">Park the thought</h1><p class="hint">Write it in a few words. It will be on your Today screen in the morning.</p>' +
        '<label for="pt" class="sr">Thought to park</label><textarea id="pt" class="field area" rows="3" placeholder="Call the school about Friday"></textarea>' +
        '<button class="btn btn-lamp btn-block" data-park style="margin-top:12px">Park it</button><button class="btn btn-quiet btn-block" data-panel="">Not now</button></section>';
    } else {
      inner += '<p class="since">Logged at ' + fmtClock(open.at) + (open.hot ? ' · hot flash' : '') + '</p>' +
        '<div class="night-acts"><button data-panel="hot"><span>' + ICON.drop + '</span>I’m hot</button><button data-panel="mind"><span>' + ICON.wave + '</span>My mind is racing</button><a href="#/app/tonight"><span>' + ICON.moon + '</span>Breathe with me</a></div>' +
        '<button class="btn btn-lamp btn-block" data-sleep>Back to sleep</button>';
    }
    if (n.parked.length && !panel) inner += '<p class="hint" style="margin-top:14px">' + n.parked.length + ' thought' + (n.parked.length === 1 ? '' : 's') + ' parked for the morning.</p>';
    screen('night', inner, 'sky-deep night-mode');
    var aw = app.querySelector('[data-awake]');
    if (aw) aw.onclick = function () { n.wakes.push({ at: now(), back: null, hot: false }); save(); viewNight(); };
    app.querySelectorAll('[data-panel]').forEach(function (b) {
      b.onclick = function () { if (b.dataset.panel === 'hot') { open.hot = true; save(); } viewNight(b.dataset.panel); };
    });
    var sl = app.querySelector('[data-sleep]');
    if (sl) sl.onclick = function () { open.back = now(); save(); toast('Logged. Goodnight.'); viewNight(); };
    var pk = app.querySelector('[data-park]');
    if (pk) pk.onclick = function () {
      var v = app.querySelector('#pt').value.trim(); if (!v) { toast('Write a few words first'); return; }
      n.parked.push({ text: v, at: now(), done: false }); save(); toast('Parked. It’ll be here in the morning.'); viewNight();
    };
    if (panel === 'hot') {
      var left = 90, el = app.querySelector('#ct');
      later(function () { left--; if (el) el.textContent = Math.floor(left / 60) + ':' + pad(left % 60); if (left <= 0) { clearTimers(); el.textContent = 'Cooler now?'; } }, 1000);
    }
    if (open && !panel) later(function () { var s = app.querySelector('.dial-c span'); if (s) s.textContent = 'Awake for ' + dur(now() - open.at); }, 30000);
  }

  // ---------- sample data ----------
  function fillDemo() {
    var start = state.expIndex * 7;
    var sample = [[3, 2, 1, 0, 2, [95, 250, 420]], [1, 1, 0, 1, 3, [365]], [1, 0, 0, 1, 4, [370]], [3, 2, 1, 0, 2, [120, 245, 410]], [1, 1, 0, 1, 4, [355]], [0, 0, 0, 1, 5, []], [1, 0, 0, 1, 4, [380]]];
    for (var i = 0; i < 7; i++) { var c = sample[i]; state.checkins[start + i] = { wake: c[0], awake: c[1], hot: !!c[2], did: !!c[3], rested: c[4], times: c[5] }; }
    save(); toast('Sample week added');
  }
  function fillMonth() {
    var weeks = [
      [[3, 2, 1, 0, 2, [95, 250, 420]], [1, 1, 0, 1, 3, [365]], [1, 0, 0, 1, 4, [370]], [3, 2, 1, 0, 2, [120, 245, 410]], [1, 1, 0, 1, 4, [355]], [0, 0, 0, 1, 5, []], [1, 0, 0, 1, 4, [380]]],
      [[2, 1, 0, 1, 3, [250, 430]], [1, 0, 0, 1, 4, [372]], [3, 2, 1, 0, 2, [150, 250, 440]], [1, 1, 0, 1, 4, [360]], [0, 0, 0, 1, 5, []], [2, 1, 0, 0, 3, [240, 400]], [0, 0, 0, 1, 5, []]],
      [[1, 1, 0, 1, 4, [365]], [1, 0, 0, 0, 4, [380]], [0, 0, 0, 1, 5, []], [1, 1, 0, 1, 4, [350]], [0, 0, 0, 0, 5, []], [0, 0, 0, 1, 5, []], [1, 0, 0, 0, 4, [390]]],
      [[0, 0, 0, 1, 5, []], [1, 0, 0, 1, 4, [360]], [0, 0, 0, 1, 5, []]]
    ];
    state.checkins = [];
    weeks.forEach(function (w) { w.forEach(function (c) { state.checkins.push({ wake: c[0], awake: c[1], hot: !!c[2], did: !!c[3], rested: c[4], times: c[5] }); }); });
    state.expIndex = 3;
    if (sevVals()) { var lower = sevVals().map(function (v, i) { return Math.max(0, v - (i === 1 ? 2 : i === 0 ? 2 : 1)); }); state.sevHistory = [{ at: now(), vals: lower }]; }
    if (!state.sub || state.sub.plan === 'free') state.sub = { plan: 'q', trialStart: now() };
    save(); toast('Sample month added: 3 weeks done, week 4 in progress');
  }

  // ---------- breathing: inhale 4s, exhale 6s, 3 minutes ----------
  function viewTonight() {
    screen('night',
      '<div class="topbar"><button class="icon-btn" data-back aria-label="Close">' + ICON.close + '</button><span class="step-count">3 min</span></div>' +
      '<div class="breath"><div><div class="orb-wrap"><span class="orb-ring"></span><div class="orb" id="orb"></div></div>' +
      '<p class="cue" id="cue" aria-live="polite">Ready when you are</p><p class="timer" id="tm">3:00</p>' +
      '<label class="check"><input type="checkbox" id="voice"> Read the cues aloud</label>' +
      '<button class="btn btn-lamp" id="go" style="min-width:200px">Start</button></div></div>' +
      '<p class="disclaimer" style="text-align:center">Breathe in through your nose for 4, out slowly for 6. A longer exhale tells your body it’s safe to rest.</p>', 'sky-deep');
    var orb = app.querySelector('#orb'), cue = app.querySelector('#cue'), tm = app.querySelector('#tm'), btn = app.querySelector('#go');
    var running = false, left = 180, phaseT, clockT;
    function sayCue(t) { cue.textContent = t; if (app.querySelector('#voice').checked && 'speechSynthesis' in window) { try { speechSynthesis.cancel(); var u = new SpeechSynthesisUtterance(t); u.rate = .8; speechSynthesis.speak(u); } catch (e) {} } }
    function inhale() { if (!running) return; sayCue('Breathe in'); orb.style.transitionDuration = '4s'; orb.style.transform = 'scale(1.9)'; phaseT = setTimeout(exhale, 4000); }
    function exhale() { if (!running) return; sayCue('And out, slowly'); orb.style.transitionDuration = '6s'; orb.style.transform = 'scale(1)'; phaseT = setTimeout(inhale, 6000); }
    function stop(done) {
      running = false; clearTimeout(phaseT); clearInterval(clockT); orb.style.transform = 'scale(1)'; btn.textContent = 'Start'; left = 180; tm.textContent = '3:00';
      if (done) { cue.textContent = 'Done. Lights off when you’re ready.'; var nn = nightOf(nightKey(now())); if (nn.done.indexOf('wind') === -1) { nn.done.push('wind'); save(); } toast('Wind-down done'); }
      else cue.textContent = 'Ready when you are';
    }
    btn.onclick = function () {
      if (running) return stop(false);
      running = true; btn.textContent = 'Stop'; inhale();
      clockT = setInterval(function () { left--; tm.textContent = Math.floor(left / 60) + ':' + pad(left % 60); if (left <= 0) stop(true); }, 1000);
      timers.push(clockT);
    };
    app.querySelector('[data-back]').onclick = function () { stop(false); history.length > 1 ? history.back() : go('#/app'); };
  }

  // ---------- morning check-in, prefilled from night taps ----------
  function viewCheckin() {
    var e = currentExp(), k = nightKey(now()), n = nightOf(k);
    var longest = n.wakes.reduce(function (mx, w) { return Math.max(mx, (w.back || w.at + 20 * 60000) - w.at); }, 0) / 60000;
    var pre = n.wakes.length || n.done.length;
    var r = {
      wake: n.wakes.length ? Math.min(4, n.wakes.length) : null,
      awake: n.wakes.length ? (longest < 10 ? 0 : longest < 30 ? 1 : longest < 60 ? 2 : 3) : null,
      hot: n.wakes.length ? (n.wakes.some(function (w) { return w.hot; }) ? 1 : 0) : null,
      did: n.done.indexOf('exp') !== -1 ? 1 : null,
      rested: null
    };
    function seg(key, labels) {
      return '<div class="seg" role="group">' + labels.map(function (l, i) { return '<button class="opt" data-k="' + key + '" data-v="' + i + '" aria-pressed="' + (r[key] === i) + '">' + l + '</button>'; }).join('') + '</div>';
    }
    screen('day',
      '<div class="topbar"><button class="icon-btn" data-back aria-label="Close">' + ICON.close + '</button><span class="step-count">30 sec</span></div>' +
      '<h1 class="q-title" style="margin-top:0">How was last night?</h1>' +
      (pre ? '<p class="banner">Filled in from your night taps and tonight’s plan. Change anything that’s off.</p>' : '') +
      '<p class="ci-q">How many times did you wake up?</p>' + seg('wake', ['0', '1', '2', '3', '4+']) +
      '<p class="ci-q">Longest time awake</p>' + seg('awake', ['Under 10 min', '10–30 min', '30–60 min', 'Over an hour']) +
      '<p class="ci-q">Did heat or sweats wake you?</p>' + seg('hot', ['No', 'Yes']) +
      '<p class="ci-q">' + esc(e.ask) + '</p>' + seg('did', ['No', 'Yes']) +
      '<p class="ci-q">How rested do you feel?</p>' + seg('rested', ['1', '2', '3', '4', '5']) +
      '<div class="spacer"></div><button class="btn btn-night btn-block" id="save" style="margin-top:24px">Save check-in</button>', 'sky-dawn');
    app.querySelectorAll('.seg .opt').forEach(function (b) {
      b.onclick = function () {
        var key = b.dataset.k; r[key] = +b.dataset.v;
        app.querySelectorAll('[data-k="' + key + '"]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      };
    });
    app.querySelector('#save').onclick = function () {
      var missing = Object.keys(r).filter(function (x) { return r[x] === null; });
      if (missing.length) { toast('Answer all 5 questions to save'); return; }
      if (weekCheckins().length >= 7) { toast('This week is complete. See your result.'); return go('#/app/insight'); }
      state.checkins.push({ key: k, wake: r.wake, awake: r.awake, hot: !!r.hot, did: !!r.did, rested: r.rested + 1, times: n.wakes.map(function (w) { return sinceNine(w.at); }), at: now() });
      save();
      var c = weekCheckins().length;
      toast(c >= 7 ? 'Night 7 logged. Your result is ready.' : 'Saved. Night ' + c + ' of 7.');
      go(c >= 7 ? '#/app/insight' : '#/app');
    };
    app.querySelector('[data-back]').onclick = function () { go('#/app'); };
  }

  // ---------- week stats ----------
  function weekStats(w) {
    var c = state.checkins.slice(w * 7, w * 7 + 7).filter(Boolean);
    if (!c.length) return null;
    var on = c.filter(function (x) { return x.did; }), off = c.filter(function (x) { return !x.did; });
    var s = {
      n: c.length, exp: state.plan.weeks[w],
      wake: avg(c.map(function (x) { return x.wake; })), awake: avg(c.map(function (x) { return x.awake; })),
      rested: avg(c.map(function (x) { return x.rested; })), hot: c.filter(function (x) { return x.hot; }).length,
      aOn: on.length ? avg(on.map(function (x) { return x.wake; })) : null, aOff: off.length ? avg(off.map(function (x) { return x.wake; })) : null,
      times: c.reduce(function (a, x) { return a.concat(x.times || []); }, [])
    };
    s.score = Math.max(28, Math.min(95, Math.round(92 - s.wake * 12 - s.awake * 5 + (s.rested - 3) * 4)));
    s.verdict = s.n < 7 || s.aOn == null || s.aOff == null ? null : (s.aOff - s.aOn >= 0.5 ? 'keep' : s.aOff - s.aOn <= -0.5 ? 'drop' : 'unclear');
    return s;
  }
  var VERDICT = { keep: 'Keep it', drop: 'Drop it', unclear: 'No clear effect' };

  function viewInsight() {
    var e = currentExp(), wk = weekCheckins();
    var on = wk.filter(function (c) { return c.did; }), off = wk.filter(function (c) { return !c.did; });
    var aOn = avg(on.map(function (c) { return c.wake; })), aOff = avg(off.map(function (c) { return c.wake; }));
    var rOn = avg(on.map(function (c) { return c.rested; })), rOff = avg(off.map(function (c) { return c.rested; }));
    var head;
    if (wk.length < 3) head = 'Log ' + (3 - wk.length) + ' more night' + (3 - wk.length === 1 ? '' : 's') + ' to see a first pattern.';
    else if (!on.length || !off.length) head = on.length ? 'You stuck with it every night. Compare against a normal night next week.' : 'No test nights yet. Try it tonight.';
    else {
      var diff = aOff - aOn;
      head = diff >= 0.5 ? 'You had <strong>' + fmt(diff) + ' fewer wake-ups</strong> on “' + esc(e.name) + '” nights.'
        : diff <= -0.5 ? 'This change didn’t help: ' + fmt(-diff) + ' more wake-ups. Good to know, cross it off.'
          : 'No clear difference yet. Wake-ups were about the same either way.';
    }
    var maxW = 4, bw = 26, gap = 13, H = 94, bars = '', ticks = '';
    for (var i = 0; i < 7; i++) {
      var c = wk[i], x = 8 + i * (bw + gap);
      if (c) { var h = Math.max(4, (Math.min(c.wake, maxW) / maxW) * 72); bars += '<g class="' + (c.did ? 'bar-on' : 'bar-off') + '"><rect x="' + x + '" y="' + (H - h) + '" width="' + bw + '" height="' + h + '" rx="5"/></g>'; }
      else bars += '<rect x="' + x + '" y="' + (H - 4) + '" width="' + bw + '" height="4" rx="2" fill="none" stroke="#3A3366" stroke-dasharray="3 3"/>';
      ticks += '<text x="' + (x + bw / 2) + '" y="' + (H + 14) + '">' + (i + 1) + '</text>';
    }
    var done = wk.length >= 7, free = state.sub && state.sub.plan === 'free', p = state.plan;
    var nextExp = p.weeks[state.expIndex + 1] ? EXP[p.weeks[state.expIndex + 1]] : null;
    screen('day',
      '<div class="topbar"><button class="icon-btn" data-back aria-label="Back">' + ICON.back + '</button><span class="step-count">Week ' + (state.expIndex + 1) + '</span></div>' +
      '<p class="q-help" style="margin:0">' + esc(e.name) + ' · ' + wk.length + ' of 7 nights</p>' +
      '<h1 class="insight-head">' + head + '</h1>' +
      '<div class="chart-card"><svg class="sc-bars" viewBox="0 0 280 112" role="img" aria-label="Wake-ups per night">' + bars + '<g class="ticks">' + ticks + '</g></svg>' +
      '<p class="sc-legend"><span class="k on"></span>Did the test <span class="k off"></span>Didn’t</p></div>' +
      (on.length && off.length ? '<div class="stat-row"><div class="stat"><b>' + fmt(aOn) + '</b><span>wake-ups on test nights</span></div><div class="stat"><b>' + fmt(aOff) + '</b><span>wake-ups on other nights</span></div>' +
        '<div class="stat"><b>' + fmt(rOn) + '/5</b><span>how rested, test nights</span></div><div class="stat"><b>' + fmt(rOff) + '/5</b><span>how rested, other nights</span></div></div>' : '') +
      '<p class="disclaimer">Based on your own check-ins. One week is a first signal, not proof. That’s why every test can run twice.</p>' +
      (done ? '<button class="btn btn-quiet btn-block" data-story>Share your week as a story</button><div id="story" hidden><video class="film story-in" src="media/story.mp4" poster="media/story.jpg" muted playsinline controls></video><p class="disclaimer">Preview of the shareable story format, shown with an example week. In the app it’s made from your own check-ins.</p></div>' : '') +
      (done && nextExp ? (free
        ? '<p class="q-help" style="margin:16px 0 8px">Next: ' + esc(nextExp.name) + '</p><a class="btn btn-night btn-block" href="#/paywall">Unlock week 2</a>'
        : '<p class="q-help" style="margin:16px 0 8px">Next: ' + esc(nextExp.name) + '</p><button class="btn btn-night btn-block" data-next>Start week ' + (state.expIndex + 2) + '</button>') : '') +
      (!done ? '<a class="btn btn-night btn-block" href="#/app/checkin" style="margin-top:12px">Log last night</a>' : ''), 'sky-day');
    app.querySelector('[data-back]').onclick = function () { go('#/app'); };
    var nx = app.querySelector('[data-next]');
    if (nx) nx.onclick = function () { state.expIndex++; save(); toast('Week ' + (state.expIndex + 1) + ' starts tonight'); go('#/app'); };
    var st = app.querySelector('[data-story]');
    if (st) st.onclick = function () { var box = app.querySelector('#story'); box.hidden = false; st.hidden = true; var v = box.querySelector('video'); var pl = v.play(); if (pl) pl.catch(function () {}); };
  }

  // ---------- Progress: score trend, constellation, sleep recipe ----------
  function symptomCard() {
    var base = sevVals(); if (!base) return '';
    var hist = state.sevHistory || [], last = hist.length ? hist[hist.length - 1].vals : null;
    var b = sevScore(base), l = last ? sevScore(last) : null;
    var rows = SEV_ITEMS.map(function (n, i) {
      return '<div class="sv-row"><span>' + esc(n) + '</span><span class="sv-bars"><i class="sv-a" style="width:' + (base[i] * 25) + '%"></i>' + (last ? '<i class="sv-b" style="width:' + (last[i] * 25) + '%"></i>' : '') + '</span></div>';
    }).join('');
    return '<section class="pcard"><h2>Symptom score</h2><p class="sv-big"><b>' + b + '</b>' + (l != null ? ' → <b class="sv-now">' + l + '</b>' : '') + ' <span>of ' + sevMax() + ', lower is better</span></p>' + rows +
      '<p class="sc-legend"><span class="k k-a"></span>At the quiz' + (last ? ' <span class="k k-b"></span>Latest re-check' : '') + '</p>' +
      '<a class="btn btn-night btn-block" href="#/app/rescore" style="margin-top:12px">Re-check my symptoms</a></section>';
  }
  function viewProgress(sel) {
    if (!state.plan) return go('#/quiz/0');
    var weeks = []; for (var w = 0; w <= state.expIndex; w++) { var s = weekStats(w); if (s) weeks.push(s); }
    var base = state.plan.score;
    var pts = [{ l: 'Quiz', v: base }].concat(weeks.map(function (s, i) { return { l: 'Wk ' + (i + 1), v: s.score }; }));
    // score trend
    var W = 300, Hh = 130, x0 = 24, x1 = 284, y = function (v) { return 14 + (100 - v) * 0.9; };
    var xs = pts.map(function (_, i) { return pts.length === 1 ? (x0 + x1) / 2 : x0 + (x1 - x0) * i / (pts.length - 1); });
    var line = pts.length > 1 ? '<path d="M' + pts.map(function (p, i) { return xs[i].toFixed(1) + ' ' + y(p.v).toFixed(1); }).join(' L') + '" class="tr-line"/>' : '';
    var trend = '<svg class="tl" viewBox="0 0 ' + W + ' ' + Hh + '" role="img" aria-label="Sleep Score: ' + pts.map(function (p) { return p.l + ' ' + p.v; }).join(', ') + '">' +
      '<line x1="10" y1="' + y(50) + '" x2="290" y2="' + y(50) + '" class="tr-grid"/><text x="290" y="' + (y(50) - 5) + '" style="text-anchor:end" class="tr-ax">50</text>' + line +
      pts.map(function (p, i) { return '<circle cx="' + xs[i].toFixed(1) + '" cy="' + y(p.v).toFixed(1) + '" r="' + (i === pts.length - 1 ? 7 : 5) + '" class="' + (i === 0 ? 'tr-base' : 'tr-pt') + '"/><text x="' + xs[i].toFixed(1) + '" y="' + (y(p.v) - 13).toFixed(1) + '" class="tr-v">' + p.v + '</text><text x="' + xs[i].toFixed(1) + '" y="126" class="tr-ax">' + p.l + '</text>'; }).join('') + '</svg>';
    var cur = weeks[weeks.length - 1];
    sel = sel == null ? (weeks.length ? 0 : null) : sel;
    var chips = weeks.map(function (s, i) { return '<button class="chip" data-w="' + i + '" aria-pressed="' + (i === sel) + '">Week ' + (i + 1) + '</button>'; }).join('');
    var sw = sel != null ? weeks[sel] : null;
    var cons = sw ? dial({ stars: sw.times.map(function (m, i) { return { m: m, ring: (i % 3) * 9 }; }), center: '<b class="dial-num">' + sw.times.length + '</b><span>wake-ups in week ' + (sel + 1) + '</span>', label: 'Week ' + (sel + 1) + ': ' + sw.times.length + ' wake-ups', cls: 'dial-day' }) : '';
    var recipe = weeks.filter(function (s) { return s.verdict; });
    var keep = recipe.filter(function (s) { return s.verdict === 'keep'; });
    var body = weeks.length ? (
      symptomCard() +
      '<section class="pcard"><h2>Sleep Score</h2>' + trend + '<p class="fine-d">From your quiz, then re-scored from each week’s check-ins.</p></section>' +
      '<section class="pcard"><h2>Your nights as a sky</h2><p class="fine-d">Each star is a time you woke up. Fewer stars, better nights.</p><div class="chips" role="group" aria-label="Choose a week">' + chips + '</div>' + cons + '</section>' +
      '<section class="pcard"><h2>Your sleep recipe</h2>' +
      (recipe.length ? '<ul class="recipe">' + recipe.map(function (s) { return '<li class="v-' + s.verdict + '"><span class="vchip">' + VERDICT[s.verdict] + '</span><b>' + esc(EXP[s.exp].name) + '</b><small>' + fmt(s.aOn) + ' wake-ups on test nights vs ' + fmt(s.aOff) + ' on others</small></li>'; }).join('') + '</ul>' +
        (keep.length ? '<p class="recipe-sum">What works for you: ' + esc(keep.map(function (s) { return EXP[s.exp].name.toLowerCase(); }).join(' + ')) + '.</p>' : '') : '<p class="fine-d">Finish week 1 to see your first result here.</p>') + '</section>' +
      (cur ? '<div class="stat-row"><div class="stat"><b>' + (idx('wakeups') + 1) + ' → ' + fmt(cur.wake) + '</b><span>wake-ups a night, quiz vs this week</span></div><div class="stat"><b>' + fmt(cur.rested) + '/5</b><span>how rested this week</span></div></div>' : '')
    ) : '<section class="pcard empty"><h2>No nights logged yet</h2><p>Do your first morning check-in and this page starts filling in. After 7 nights you get your first result.</p><a class="btn btn-night" href="#/app/checkin">Do a check-in</a></section>';
    screen('day', '<header class="app-head"><h1 class="hello" style="margin:0">Progress</h1><a class="link-s" href="#/app/report">For my doctor</a></header>' + body + demoTools(), 'sky-day', 'progress');
    app.querySelectorAll('[data-w]').forEach(function (b) { b.onclick = function () { viewProgress(+b.dataset.w); }; });
    bindDemo(function () { viewProgress(); });
  }

  // ---------- Report for my doctor ----------
  function viewReport() {
    if (!state.plan) return go('#/quiz/0');
    var all = state.checkins.filter(Boolean);
    var weeks = []; for (var w = 0; w <= state.expIndex; w++) { var s = weekStats(w); if (s) weeks.push(s); }
    var SHORT = ['none', 'barely', 'manageable', 'gets in the way', 'severe']; var sym = symList(2).map(function (x) { return x.n + ' (' + SHORT[x.v] + ')'; });
    var hist = state.sevHistory || [], sb = sevScore(sevVals()), sl = hist.length ? sevScore(hist[hist.length - 1].vals) : null;
    var tried = picks('tried').filter(function (i) { return i !== 6; }).map(function (i) { return step('tried').opts[i]; });
    var times = all.reduce(function (a, c) { return a.concat(c.times || []); }, []);
    var typical = times.length ? fmtHM(Math.round(avg(times)) + 1260) : (answered('waketime') ? say('waketime') : '—');
    var qs = [];
    if (idx('sweats') >= 2) qs.push('Night sweats wake me ' + say('sweats') + '. Which treatments, hormonal or not, could fit me?');
    qs.push(has('tried', 5) ? 'Is my current hormone therapy dose right for my sleep?' : 'Is hormone therapy an option for me?');
    if (sevAt(3) >= 2 || sevAt(4) >= 2) qs.push('Are the mood changes and anxiety I’ve noticed part of perimenopause?');
    if (has('tried', 0) || has('tried', 1)) qs.push('Is it fine to keep taking melatonin or supplements?');
    qs.push('Could something else be part of this, like sleep apnea, thyroid or iron levels?');
    var rows = all.length ? [
      ['Nights logged', all.length],
      ['Wake-ups a night', fmt(avg(all.map(function (c) { return c.wake; }))) + ' (quiz: ' + (say('wakeups') || '—') + ')'],
      ['Usual wake-up time', typical],
      ['Nights with hot flashes or sweats', all.filter(function (c) { return c.hot; }).length + ' of ' + all.length],
      ['How rested, 1 to 5', fmt(avg(all.map(function (c) { return c.rested; })))]
    ] : [['Wake-ups a night', say('wakeups') || '—'], ['Usual wake-up time', typical], ['Hot flashes or sweats wake me', say('sweats') || '—'], ['Bad nights a week', say('badNights') || '—']];
    screen('day',
      '<header class="app-head no-print"><h1 class="hello" style="margin:0">For my doctor</h1><button class="btn btn-night btn-sm" data-print>Print or save as PDF</button></header>' +
      '<p class="fine-d no-print">A one-page summary to bring to your appointment. Untick any question you don’t want on it.</p>' +
      '<article class="report">' +
      '<header class="rp-head"><h2>Sleep summary</h2><p>Prepared with SleepThrough on ' + nowDate().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) + (all.length ? ', covering ' + all.length + ' nights' : ', from my quiz answers') + '</p></header>' +
      '<section><h3>About me</h3><dl class="rp-dl"><dt>Age</dt><dd>' + esc(say('age') || '—') + '</dd><dt>Periods</dt><dd>' + esc(say('cycle') || '—') + '</dd><dt>Stage my answers fit</dt><dd>' + esc(stageGuess().name) + '</dd><dt>Symptom score</dt><dd>' + (sb != null ? sb + ' of ' + sevMax() + (sl != null ? ', now ' + sl : '') : '—') + '</dd><dt>Also noticed</dt><dd>' + esc(sym.join(', ') || 'Nothing else') + '</dd></dl></section>' +
      '<section><h3>My sleep</h3><dl class="rp-dl">' + rows.map(function (r) { return '<dt>' + esc(r[0]) + '</dt><dd>' + esc(String(r[1])) + '</dd>'; }).join('') + '</dl>' +
      (times.length ? dial({ stars: times.map(function (m, i) { return { m: m, ring: (i % 3) * 9 }; }), center: '<b class="dial-num">' + times.length + '</b><span>wake-up times</span>', cls: 'dial-day dial-sm', label: 'All logged wake-up times' }) : '') + '</section>' +
      '<section><h3>What I’ve tried</h3><ul class="rp-ul">' + tried.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') +
      weeks.filter(function (s) { return s.verdict; }).map(function (s) { return '<li>' + esc(EXP[s.exp].name) + ' for 7 nights: ' + VERDICT[s.verdict].toLowerCase() + ' (' + fmt(s.aOn) + ' vs ' + fmt(s.aOff) + ' wake-ups)</li>'; }).join('') +
      (!tried.length && !weeks.length ? '<li>Nothing yet</li>' : '') + '</ul></section>' +
      '<section><h3>Questions I want to ask</h3>' + qs.map(function (q, i) { return '<label class="rp-q"><input type="checkbox" checked data-q="' + i + '"><span>' + esc(q) + '</span></label>'; }).join('') + '</section>' +
      '<p class="rp-foot">Self-reported from morning check-ins and night taps. Not a diagnosis.</p></article>' + demoTools(), 'sky-day', 'report');
    app.querySelector('[data-print]').onclick = function () { window.print(); };
    app.querySelectorAll('[data-q]').forEach(function (c) { c.onchange = function () { c.closest('.rp-q').classList.toggle('off', !c.checked); }; });
    bindDemo(viewReport);
  }

  function viewDevices() {
    var w = ['Apple Watch', 'Oura', 'Fitbit', 'Whoop'];
    screen('day',
      '<div class="topbar"><button class="icon-btn" data-back aria-label="Back">' + ICON.back + '</button><span></span></div>' +
      '<h1 class="q-title" style="margin-top:0">Connect a sleep tracker</h1>' +
      '<p class="q-help">Your tracker adds wake-up times and heart rate to your check-ins. Night taps and the morning check-in work without one.</p>' +
      '<div class="actions">' + w.map(function (n) { return '<button class="action" data-w="' + n + '"><span class="ic">' + ICON.watch + '</span><span><b>' + n + '</b><small>Coming with the iOS app</small></span><span class="chev" aria-hidden="true">›</span></button>'; }).join('') + '</div>' +
      '<p class="disclaimer" style="margin-top:18px">In this web preview, tracker sync is not live. Tap one to tell us which you use.</p>', 'sky-day');
    app.querySelectorAll('[data-w]').forEach(function (b) { b.onclick = function () { state.tracker = b.dataset.w; save(); toast('Noted: we’ll let you know when ' + b.dataset.w + ' sync is ready.'); }; });
    app.querySelector('[data-back]').onclick = function () { go('#/app'); };
  }

  // ---------- router ----------
  function route() {
    clearTimers();
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
    if (h === '#/demo') {
      // Direct link to the in-app experience for judges: a sample user who finished the quiz and started the trial.
      state = { answers: { age: 2, cycle: 1, problem: 1, waketime: 3, wakeups: 2, awakeLong: 2, awakeDo: [0, 1], badNights: 1, sweats: 1, energy: 2, cups: 2, caffeine: 1, work: 1, wine: 1, lastDrink: 1, screens: 0, room: 2, stress: 2, goal: 0, minutes: 0, sev: [3, 4, 3, 3, 3, 2] },
        email: '', plan: null, sub: { plan: 'q', trialStart: now() }, checkins: [], expIndex: 0 };
      state.plan = analyze(); fillMonth();
      return go('#/app');
    }
    if (h === '#/app') return viewHome();
    if (h === '#/app/night' || h === '#/app/3am') return viewNight();
    if (h === '#/app/tonight') return viewTonight();
    if (h === '#/app/checkin') return state.plan ? viewCheckin() : go('#/quiz/0');
    if (h === '#/app/insight') return state.plan ? viewInsight() : go('#/quiz/0');
    if (h === '#/app/progress') return viewProgress();
    if (h === '#/app/rescore') return state.plan ? viewScale(0, 0, { vals: (sevVals() || []).slice() }) : go('#/quiz/0');
    if (h === '#/app/report') return viewReport();
    if (h === '#/app/devices') return viewDevices();
    go('#/');
  }
  // Landing: start the quiz from an age band (first answer saved, quiz continues at step 2).
  Array.prototype.slice.call(document.querySelectorAll('[data-age]')).forEach(function (b) {
    b.onclick = function () { state.answers.age = +b.dataset.age; save(); go('#/quiz/1'); };
  });
  // Landing films: play only when visible; respect reduced motion.
  (function films() {
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var vids = Array.prototype.slice.call(document.querySelectorAll('video.film'));
    if (reduce) { vids.forEach(function (v) { v.removeAttribute('autoplay'); v.pause(); v.controls = true; }); return; }
    if (!('IntersectionObserver' in window)) { vids.forEach(function (v) { v.play && v.play().catch(function () {}); }); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { var v = e.target; if (e.isIntersecting) { if (v.preload === 'none') v.preload = 'auto'; var p = v.play(); if (p) p.catch(function () {}); } else v.pause(); });
    }, { threshold: 0.35 });
    vids.forEach(function (v) { io.observe(v); });
  })();
  window.addEventListener('hashchange', function () { if ('speechSynthesis' in window) { try { speechSynthesis.cancel(); } catch (e) {} } route(); });
  route();
})();

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
    { sec: 'About you', id: 'age', q: 'How old are you?', opts: ['Under 40', '40–44', '45–49', '50–55', '56 or older'] },
    { sec: 'About you', id: 'cycle', q: 'How has your period changed in the last year?', help: 'This tells us where you might be in the transition. It stays on your device.', opts: ['Still regular', 'Less regular, or skipping months', 'Stopped 12 or more months ago', 'Not sure, or not applicable'] },
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

    { sec: 'Your body', id: 'sweats', q: 'How often do hot flashes or night sweats wake you?', opts: ['Never', 'A few times a month', 'Most weeks', 'Most nights'],
      say: ['never', 'a few times a month', 'most weeks', 'most nights'] },
    { sec: 'Your body', id: 'symptoms', multi: true, none: 6, q: 'What else have you noticed in the last year or two?', help: 'Pick all that apply.', opts: ['Brain fog', 'A shorter fuse', 'Anxiety out of nowhere', 'Weight around the middle', 'Achy joints', 'Low energy all day', 'None of these'] },
    { sec: 'Your body', info: 'heat' },

    { sec: 'Your days', id: 'energy', q: 'How’s your energy at 3 PM?', opts: ['Fine', 'Dipping', 'Running on coffee', 'I could nap at my desk'] },
    { sec: 'Your days', id: 'cups', q: 'How many cups of coffee, tea or soda a day?', opts: ['None', '1', '2', '3', '4 or more'],
      say: ['No caffeine', '1 cup', '2 cups', '3 cups', '4+ cups'] },
    { sec: 'Your days', id: 'caffeine', when: function () { return idx('cups') > 0; }, q: 'When do you have your last coffee, tea or soda?', opts: ['Before noon', 'Between noon and 3 PM', 'After 3 PM', 'It varies'],
      say: ['before noon', 'between noon and 3 PM', 'after 3 PM', 'at different times'] },
    { sec: 'Your days', info: 'caffeine', when: function () { return idx('cups') > 0; } },
    { sec: 'Your days', id: 'work', q: 'How have bad nights affected your work?', opts: ['Not much', 'Harder to focus', 'More mistakes than usual', 'I’ve called in sick or cut hours', 'I don’t work outside the home'] },
    { sec: 'Your days', info: 'work' },

    { sec: 'Your evenings', id: 'wine', q: 'How many evenings a week do you have a drink?', opts: ['None', '1 or 2', '3 or 4', '5 or more'],
      say: ['no evenings', '1–2 evenings a week', '3–4 evenings a week', '5+ evenings a week'] },
    { sec: 'Your evenings', id: 'lastDrink', when: function () { return idx('wine') > 0; }, q: 'When do you usually finish your last drink?', opts: ['Before 7 PM', '7–9 PM', 'After 9 PM', 'Right before bed'],
      say: ['before 7 PM', 'between 7 and 9 PM', 'after 9 PM', 'right before bed'] },
    { sec: 'Your evenings', info: 'alcohol', when: function () { return idx('wine') > 0; } },
    { sec: 'Your evenings', id: 'screens', q: 'What do you usually do in the last hour before bed?', opts: ['Phone or TV in bed', 'Work or email', 'Read or wind down', 'It varies'],
      say: ['Phone or TV in bed', 'Work or email', 'Reading', 'A mix of things'] },
    { sec: 'Your evenings', id: 'room', q: 'How does your bedroom feel at night?', opts: ['Cool', 'Comfortable', 'Warm', 'I wake up too hot'],
      say: ['cool', 'comfortable', 'warm', 'too hot'] },

    { sec: 'Your mind', id: 'stress', q: 'When you wake at night, how often does your mind start racing?', opts: ['Rarely', 'Sometimes', 'Often', 'Almost always'],
      say: ['rarely', 'sometimes', 'often', 'almost always'] },
    { sec: 'Your mind', id: 'tried', multi: true, none: 6, q: 'What have you already tried for sleep?', help: 'Pick all that apply.', opts: ['Melatonin', 'Magnesium or other supplements', 'A sleep or meditation app', 'Cutting back on caffeine', 'Asking my doctor', 'Hormone therapy', 'Nothing yet'] },
    { sec: 'Your mind', info: 'guess' },

    { sec: 'Your plan', id: 'goal', q: 'What would change most if you slept through the night?', opts: ['More energy at work', 'A better mood with my family', 'Less coffee to get through the day', 'Feeling like myself again'] },
    { sec: 'Your plan', id: 'minutes', q: 'How much time can you give this each day?', help: 'Most days it’s a 3-minute wind-down and a 30-second check-in.', opts: ['5 minutes', '10 minutes', '15 minutes', '20 minutes or more'],
      say: ['5 minutes', '10 minutes', '15 minutes', '20 minutes'] },
    { sec: 'Your plan', id: 'wearable', q: 'Do you wear a sleep tracker?', help: 'Optional. A 30-second morning check-in works without one.', opts: ['Apple Watch', 'Oura', 'Fitbit', 'Whoop', 'No tracker'] },
    { sec: 'Your plan', info: 'preview' }
  ];

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
      heat: idx('sweats') * 2 + (idx('room') >= 2 ? idx('room') : 0) + (has('awakeDo', 3) ? 2 : 0) + (yes('m_hot') ? 1 : 0),
      caffeine: idx('cups') === 0 ? 0 : [0, 3, 6, 2][idx('caffeine')] + (idx('cups') >= 3 ? 2 : 0) + (idx('energy') >= 2 ? 1 : 0),
      mind: idx('stress') * 2 + (idx('screens') === 1 ? 2 : 0) + (has('awakeDo', 2) ? 2 : 0) + (yes('m_wired') ? 1 : 0),
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
    watch: '<svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="3"/><path d="M9 6l1-3h4l1 3M9 18l1 3h4l1-3M12 10v2l1.5 1.5"/></svg>'
  };
  function screen(mode, inner, extraClass) {
    app.innerHTML = '<div class="screen ' + (mode === 'night' ? 'is-night' : 'is-day') + ' ' + (extraClass || '') + '"><div class="screen-in">' + inner + '</div></div>';
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
    var multi = !!q.multi;
    var cur = state.answers[q.id];
    var opts = q.opts.map(function (o, i) {
      var on = multi ? (Array.isArray(cur) && cur.indexOf(i) !== -1) : cur === i;
      return '<button class="opt' + (multi ? ' opt-multi' : '') + '" data-i="' + i + '" aria-pressed="' + on + '">' + esc(o) + '</button>';
    }).join('');
    screen('night', topbar(n) +
      '<h1 class="q-title">' + esc(q.q) + '</h1>' +
      (q.help ? '<p class="q-help">' + esc(q.help) + '</p>' : '') +
      '<div class="options">' + opts + '</div>' +
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
    var sym = picks('symptoms').filter(function (i) { return i !== 6; }).map(function (i) { return step('symptoms').opts[i].toLowerCase(); });
    if (sym.length) items.push('Also: ' + sym.slice(0, 3).join(', '));
    return items.length ? '<ul class="recap recap-list">' + items.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' : '';
  }

  function viewResult() {
    var p = state.plan || (state.plan = analyze());
    var verdict = p.score >= 75 ? 'Your sleep is mostly working.' : p.score >= 55 ? 'Your sleep is getting interrupted.' : 'Your nights are working against you.';
    screen('night',
      '<div class="topbar"><button class="icon-btn" data-back aria-label="Back">' + ICON.back + '</button><span></span></div>' +
      '<p class="eyebrow" style="margin-top:0">What you told us</p>' + recapList() +
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

  function viewPaywall() {
    var p = state.plan || analyze();
    var g = goalLine();
    var pick = 'q';
    screen('night',
      '<div class="topbar"><button class="icon-btn" data-back aria-label="Back">' + ICON.back + '</button><span></span></div>' +
      '<h1 class="q-title" style="margin-top:0">Your plan to get <span class="hl">' + esc(g.text) + '</span></h1>' +
      '<div class="info-card">' + goalChart() + '</div>' +
      '<ul class="pw-list"><li>Week 1: ' + esc(EXP[p.weeks[0]].name) + ' — your #1 suspect</li><li>3-minute wind-down every evening</li><li>“Awake at 3 AM” mode for ' + esc(say('waketime') || 'the middle of the night') + '</li><li>Your result on day 7, then the next experiment</li></ul>' +
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
  function currentKey() { var p = state.plan || (state.plan = analyze()); return p.weeks[state.expIndex] || p.weeks[0]; }
  function currentExp() { return EXP[currentKey()]; }
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
    var dots7 = ''; for (var i = 0; i < 7; i++) { var c = wk[i]; dots7 += '<i class="' + (c ? (c.did ? 'on' : 'miss') : '') + '"></i>'; }
    var free = state.sub && state.sub.plan === 'free';
    var done = wk.length >= 7;
    var g = goalLine();
    screen(night ? 'night' : 'day',
      '<div class="topbar"><a class="brand" href="#/" style="font-size:18px;color:inherit">' + '<svg viewBox="0 0 24 24" aria-hidden="true" style="width:18px;height:18px"><path d="M15 3a8 8 0 1 0 6 13A9 9 0 0 1 15 3z"/></svg>SleepThrough</a><span></span></div>' +
      (free ? '<p class="banner">Free preview: week 1 is open. Start the trial to unlock weeks 2–4.</p>' : '') +
      '<h1 class="hello">' + hello + '</h1>' +
      '<p class="streak">Goal: ' + esc(g.text) + ' · ' + (streak() ? streak() + ' check-ins in a row' : 'first check-in tomorrow morning') + '</p>' +
      '<section class="exp-card" aria-label="Current experiment"><p class="lbl">Week ' + (state.expIndex + 1) + ' · ' + (done ? 'complete' : 'Night ' + day + ' of 7') + '</p>' +
      '<h2>' + esc(e.name) + '</h2><p>' + esc(e.how) + '</p><p class="why">Why you: ' + esc(suspectNote(currentKey())) + '</p><div class="days" aria-label="' + wk.length + ' of 7 nights checked in">' + dots7 + '</div></section>' +
      '<div class="actions">' +
      (done ? action('#/app/insight', ICON.chart, 'See your week ' + (state.expIndex + 1) + ' result', 'Ready now') : '') +
      action('#/app/tonight', ICON.moon, 'Tonight: 3-minute wind-down', 'Long-exhale breathing before bed') +
      action('#/app/3am', ICON.wave, 'Awake right now?', answered('waketime') && idx('waketime') < 5 ? 'You usually wake ' + say('waketime') + '. Open this then.' : 'What to do at 3 AM') +
      action('#/app/checkin', ICON.sun, 'Morning check-in', '30 seconds, 5 taps') +
      (!done ? action('#/app/insight', ICON.chart, 'Your week so far', wk.length + ' of 7 nights logged') : '') +
      action('#/app/devices', ICON.watch, 'Connect a sleep tracker', 'Apple Watch, Oura, Fitbit, Whoop') +
      '</div>' +
      '<div class="demo-tools"><p style="margin:0">Demo tools for the Capstone review</p><button data-demo>Fill a sample week</button><button data-reset>Start over</button></div>');
    app.querySelector('[data-demo]').onclick = fillDemo;
    app.querySelector('[data-reset]').onclick = function () { try { localStorage.removeItem(KEY); } catch (e) {} state = { answers: {}, email: '', plan: null, sub: null, checkins: [], expIndex: 0 }; go('#/'); };
  }
  function action(href, icon, title, sub) {
    return '<a class="action" href="' + href + '"><span class="ic">' + icon + '</span><span><b>' + esc(title) + '</b><small>' + esc(sub) + '</small></span><span class="chev" aria-hidden="true">›</span></a>';
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
    function sayCue(t) { cue.textContent = t; if (app.querySelector('#voice').checked && 'speechSynthesis' in window) { try { speechSynthesis.cancel(); var u = new SpeechSynthesisUtterance(t); u.rate = .8; speechSynthesis.speak(u); } catch (e) {} } }
    function inhale() { if (!running) return; sayCue('Breathe in'); orb.style.transitionDuration = '4s'; orb.style.transform = 'scale(1.9)'; phaseT = setTimeout(exhale, 4000); }
    function exhale() { if (!running) return; sayCue('And out, slowly'); orb.style.transitionDuration = '6s'; orb.style.transform = 'scale(1)'; phaseT = setTimeout(inhale, 6000); }
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
    var hot = idx('sweats') >= 2 || has('awakeDo', 3);
    var racing = idx('stress') >= 2 || has('awakeDo', 2);
    screen('night',
      '<div class="topbar"><button class="icon-btn" data-back aria-label="Close">' + ICON.close + '</button><span></span></div>' +
      '<h1 class="q-title" style="margin-top:0">You’re awake. That’s okay.</h1>' +
      '<p class="q-help">Keep the screen dim. Don’t check the time again' + (has('awakeDo', 0) ? ' — you told us you usually do' : '') + '.</p>' +
      '<ol class="three">' +
      '<li><div><b>Cool down first</b><span>Uncover a foot, flip the pillow, sip cold water.' + (hot ? ' Heat is one of your suspects, so start here.' : '') + '</span></div></li>' +
      '<li><div><b>Breathe out longer than in</b><span>In for 4, out for 6. Two minutes is enough.</span></div></li>' +
      '<li><div><b>Park the thought</b><span>If your mind is racing, say it once in a sentence. It will still be there in the morning.' + (racing ? ' Tomorrow, write it on your worry list at 9:30 PM.' : '') + '</span></div></li>' +
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

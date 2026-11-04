# SleepThrough

A sleep coach for women 40–55 in perimenopause. Instead of another library of sleep sounds, SleepThrough finds what is actually waking you — evening wine, caffeine, heat and night sweats, a racing mind, screens or an irregular body clock — by running one small 7-day experiment at a time and comparing your own nights.

Capstone project, Zimran IT School, 2026.

## The flow

| Step | Screen | What happens |
| --- | --- | --- |
| 1 | Landing (`#/`) | Hook "Awake at 3:07 again?", the problem, how it works, pricing, FAQ |
| 2 | Quiz (`#/quiz/0…11`) | 12 one-tap questions: cycle changes, wake-ups, night sweats, wine, caffeine, screens, stress, bedroom, tracker, goal |
| 3 | Email (`#/email`) | Optional email capture, skippable |
| 4 | Result (`#/result`) | Sleep Score (0–100), top 3 likely triggers, a 4-week plan with one experiment per week |
| 5 | Paywall (`#/paywall`) | 12 weeks $39.99 or 4 weeks $19.99, 7-day trial. Honest soft paywall: a visible free week 1 preview |
| 6 | Home (`#/app`) | Current experiment, night X of 7, streak for check-ins |
| 7 | Wind-down (`#/app/tonight`) | 3-minute long-exhale breathing (in 4, out 6), optional spoken cues |
| 8 | Awake at 3 AM (`#/app/3am`) | Dimmed screen with 4 steps for the middle of the night |
| 9 | Check-in (`#/app/checkin`) | 30 seconds, 5 taps: wake-ups, time awake, heat, did the experiment, how rested |
| 10 | Result of the week (`#/app/insight`) | Wake-ups on experiment nights vs other nights, chart, next experiment |

Demo tools on the home screen: **Fill a sample week** (shows a complete day-7 result) and **Start over**.

## How the plan is built

`analyze()` in `app.js` weighs the quiz answers into six trigger scores (alcohol, heat, caffeine, racing mind, screens, body clock), ranks them, and builds a 4-week plan from the top three plus "same wake time every day". The Sleep Score is a transparent rule-based score from the same answers. In production this layer is where an LLM personalizes the plan and reads the check-in history; the experiment loop and the comparison logic stay the same.

## Tech

Static site, no build step: `index.html`, `styles.css`, `app.js`. Hash routing, all data in the browser's `localStorage`. Payments are simulated in this preview. Deployed on Vercel.

## Not medical advice

SleepThrough is a habit coach, not a diagnosis or treatment. It tells users to see a doctor for loud snoring, breathing pauses at night or low mood, and works alongside hormone therapy.

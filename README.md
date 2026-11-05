# SleepThrough

A sleep coach for women 40–55 in perimenopause. Instead of another library of sleep sounds, SleepThrough finds what is actually waking you — evening wine, caffeine, heat and night sweats, a racing mind, screens or an irregular body clock — by running one small 7-day experiment at a time and comparing your own nights.

Capstone project, Zimran IT School, 2026.

## The flow

| Step | Screen | What happens |
| --- | --- | --- |
| 1 | Landing (`#/`) | Hook "Awake at 3:07 again?", the problem, how it works, pricing, FAQ |
| 2 | Quiz (`#/quiz/0…30`) | 23 questions in 7 blocks (about you, nights, body, days, evenings, mind, plan) with 8 "you're not alone" screens: sourced charts (CDC NCHS, SWAN, Mayo Clinic, sleep-lab studies) personalised with her answers. Caffeine and alcohol steps are skipped when not relevant |
| 2a | Symptom scale + hormones | Six symptoms rated on a 5-level scale (like a clinical menopause rating scale) give a starting symptom score; an illustrated estrogen/progesterone screen explains why it’s happening. Sensitive questions carry “Why we ask” and “Prefer not to say” |
| 2b | Analyzing (`#/analyzing`) | Loader with 3 yes/no micro-questions that feed the ranking |
| 3 | Email (`#/email`) | Optional email capture, skippable |
| 4 | Result (`#/result`) | The stage her answers fit (not a diagnosis), symptom score, Sleep Score (0–100), top 3 likely triggers, a 4-week plan with one experiment per week |
| 5 | Paywall (`#/paywall`) | Goal with a date, answers to what she already tried, 30-day money-back promise, price shown twice.  12 weeks $39.99 or 4 weeks $19.99, 7-day trial. Honest soft paywall: a visible free week 1 preview |
| 6 | Today (`#/app`) | Changes with the time of day. Evening: tonight's plan timed to her bedtime (last drink, cool room, wind-down) with a countdown to the next step. Morning: last night on the dial, a prefilled check-in, parked thoughts |
| 7 | Night mode (`#/app/night`) | Dim screen with the night dial. One tap logs a wake-up; "I'm hot" starts a 90-second cool-down, "My mind is racing" parks the thought for the morning, "Back to sleep" closes the wake-up |
| 8 | Wind-down (`#/app/tonight`) | 3-minute long-exhale breathing (in 4, out 6), optional spoken cues |
| 9 | Check-in (`#/app/checkin`) | 30 seconds, 5 taps, prefilled from night taps and tonight's plan |
| 10 | Week result (`#/app/insight`) | Wake-ups on test nights vs other nights, chart, next test, shareable story preview |
| 11 | Progress (`#/app/progress`) | Sleep Score by week, "your nights as a sky" (each wake-up a star on the dial), and the sleep recipe: keep / drop / no clear effect per test |
| 12 | For my doctor (`#/app/report`) | One-page printable summary: about me, sleep averages, what I tried and the results, questions to ask. Print or save as PDF |

Demo tools at the bottom of the app screens: preview the app at **7:30 PM**, **3:07 AM** or **7:15 AM** (all three share one night, so taps at 3 AM show up in the morning), **Fill a sample week**, **Fill a sample month**, **Start over**.

## Design

- The night dial (9 PM to 7 AM on a 240° arc) is the signature element: tonight's taps, last night's wake-ups, a month of nights as a sky.
- The background follows the time of day: dusk in the evening, near-black at night, a dawn gradient in the morning.
- Type: Young Serif for headings and times, Atkinson Hyperlegible Next for text (built for legibility). Both self-hosted in `fonts/`.

## Films (HyperFrames)

`media/hero.mp4`, `media/explainer.mp4` and `media/story.mp4` are HTML + GSAP compositions rendered to MP4 with [HyperFrames](https://github.com/heygen-com/hyperframes). Sources are in `films/`. Render with `cd films/hero && npx hyperframes render`.

## How the plan is built

`analyze()` in `app.js` weighs the quiz answers into six trigger scores (alcohol, heat, caffeine, racing mind, screens, body clock), ranks them, and builds a 4-week plan from the top three plus "same wake time every day". The Sleep Score is a transparent rule-based score from the same answers. In production this layer is where an LLM personalizes the plan and reads the check-in history; the experiment loop and the comparison logic stay the same.

## Tech

Static site, no build step: `index.html`, `styles.css`, `app.js`. Hash routing, all data in the browser's `localStorage`. Payments are simulated in this preview. Deployed on Vercel.

## Not medical advice

SleepThrough is a habit coach, not a diagnosis or treatment. It tells users to see a doctor for loud snoring, breathing pauses at night or low mood, and works alongside hormone therapy.

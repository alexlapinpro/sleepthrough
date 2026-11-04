# Films

HyperFrames compositions (HTML + GSAP) behind the landing videos and the shareable week story.

| Folder | Output | Size |
| --- | --- | --- |
| `hero/` | `media/hero.mp4` | 1080×1080, 11 s loop: one night on the dial, week 1 vs week 4 |
| `explainer/` | `media/explainer.mp4` | 1920×1080, 21 s: the four steps |
| `story/` | `media/story.mp4` | 1080×1920, 10 s: day 7 result as a story |

To render, copy `gsap.min.js` (gsap 3.15) and the woff2 files from `../fonts/` into the folder, then `npx hyperframes render`.
Web versions are re-encoded with ffmpeg (H.264, CRF 26–27, faststart, no audio).

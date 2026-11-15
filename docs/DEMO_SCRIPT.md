# Demo video script (target 1:45, hard limit 2:00)

Record at 1080p with your own voice. On Windows: Win+Alt+R (Xbox Game Bar) or OBS. Set the browser zoom to 125–150% so text is readable. Upload to YouTube as **unlisted**, then replace the Demo Video Link in the submission form.

Say the words below in your own way. Don't read fast. One of you can do the whole thing, or split it.

| Time | On screen | Say |
|---|---|---|
| 0:00–0:15 | Landing page hero at `predict360.vercel.app` (don't scroll) | "It's the end of a 12-hour nursing shift and you still have notes to chart. It's hard to notice when you're slowing down. Predict360 is a 30-second typing check-in that compares you with your own usual." |
| 0:15–0:40 | Go to `/evaluation`. Click **Ordinary typing**, then **Longer key holds** | "You type two sentences. We never keep the words, only the timing: how long you hold each key, the pause between sentences, and your rhythm. Here's an ordinary check-in: close to usual. Here, the keys are held longer than this person's usual, and the model flags it as different." |
| 0:40–0:55 | Click **Missed timing change**, point at "Typing pattern close to usual" | "And here's where it fails. This person's rhythm is 55 percent more uneven, and the model still says usual. That's on purpose, and I'll show you why." |
| 0:55–1:25 | Scroll to **Tested on real people's typing**, pause on the table, then the "Which timing measures can be trusted" table | "We trained a logistic regression model on real typing from 51 people in a public dataset, and tested it on people it never saw. With false alarms held at 10 percent, a simple hand-set rule catches 37 percent of the changes we injected. Our model catches 59 percent. We also found that key-hold time is steady for the same person, about 4 percent wobble, but rhythm wobbles 26 percent. So the model learned to trust key holds and mostly ignore rhythm." |
| 1:25–1:40 | Stay on the page; scroll to "Where it still fails" | "Two honest limits. The model still misses 41 percent of changes. And we injected those changes ourselves, because we couldn't get public typing data with fatigue labels. So we can't yet say a flag means you're tired." |
| 1:40–1:50 | Back to the landing page hero | "Next, we'd collect check-ins from nurses who volunteer, before and after their shifts. Predict360 is a prototype and is not medical advice." |

## Checklist before uploading

- Under 2:00 (aim for 1:45–1:50).
- Text on screen is readable at normal size; no auto-captions covering the tables.
- You say one failure and one next step (both are in the script).
- Never say "morning", "symptom", "diagnose" or "detects fatigue".
- If you turn on captions, check them for errors.

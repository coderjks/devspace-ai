# DevSpace AI — Demo Video Script

**Length:** 3 minutes (a 75–90 second cut can be made by trimming each scene)
**Format:** Real app screen recording, browser at 1440×900. Generated video: `demo/devspace-hackathon-demo.mp4` (180s, H.264 + AAC narration, captions burned in)
**App:** http://localhost:3000 for local recording, or the deployed web app for the final take
**Login:** `demo@devspace.ai` / `DemoPass123!` (local/demo only)

## Before recording

- Use a fresh browser profile or incognito window so the first-run product tour appears.
- If the tour does not appear, open DevTools Console and run:
  `Object.keys(localStorage).filter(k => k.startsWith('devspace_product_tour')).forEach(k => localStorage.removeItem(k))`, then reload the dashboard.
- Hide bookmarks, notifications, terminal windows, and anything showing secrets or `.env` values.
- Keep mouse movements slow. Pause one second after each page loads.

## Opening — problem, why, impact (first ~45 seconds of the 3-minute cut)

1. **The problem:** "Talent is everywhere. Internships are not." Students in tier-2 and tier-3 cities and villages rarely get a real industry internship: few local companies, no professional network, and no one to show them how an engineering team actually works.
2. **Why DevSpace AI:** "A real team experience, wherever you live." A virtual engineering team, a real sprint, and real GitHub pull requests — no metro city, referral, or placement cell required. Only a laptop and an internet connection.
3. **The impact:** "Experience stops being a matter of pin code." Students graduate with approved tickets, a portfolio of real pull requests, and evidence of skill — so a learner in a small town can walk into any interview with the same story as a metro student.

## Shot list and voiceover

| Time | Screen / action | Voiceover or caption |
|---|---|---|
| 0:00–0:06 | Open the web app and sign in with the demo account. | "DevSpace AI is a simulated engineering internship where a student joins an AI engineering team and works a real sprint." |
| 0:06–0:16 | Dashboard loads. Let the product tour welcome appear. Click **Start the tour**. | "On the first visit, a short product tour shows where everything lives, so a new student is not left guessing." |
| 0:16–0:26 | Step through Dashboard and Board. Open AI-001 from the board. | "The sprint has six tickets, AI-001 to AI-006. Each ticket explains what to build and what done looks like." |
| 0:26–0:38 | Open the Team page and ask the Tech Lead a short question about AI-001. | "Students can ask role-based AI teammates for planning, coding, testing, and standup help — with a separate Learning Assistant for hints." |
| 0:38–0:48 | Go to Standup. Show the questions and the voice/type options. Do not submit unless the demo data is disposable. | "Daily standups can be typed or spoken, reviewed first, and shared with the team like a real standup." |
| 0:48–1:02 | Go to GitHub. Show the linked fork and pull-request submission area. If a demo PR already exists, open its review report instead of creating a new one. | "Work is submitted through GitHub pull requests. Reviews are tied to the exact commit, with clear feedback on what passed and what to fix." |
| 1:02–1:14 | Open Growth/Progression. Show approved progress and skills evidence. | "Approval follows fixed checks, not a model's opinion. Approved work unlocks the next ticket and builds an evidence-based growth record." |
| 1:14–1:25 | Return to the Dashboard. End on the next-step banner and sprint progress. | "DevSpace AI turns learning into a realistic team workflow: pick up work, collaborate, submit, improve, and progress." |

## Recording notes

- Do not show `.env`, provider keys, Railway/Vercel secret screens, or database tables.
- If live AI or voice is slow during recording, cut the waiting time in editing and keep the text fallback visible.
- If no demo pull request exists, stop at the GitHub submission screen and say what happens next; do not create a throwaway PR during the final take unless it was prepared in advance.
- End with the product name on screen for two seconds.

## Editor checklist

- Add captions for every voiceover line.
- Blur or crop out email addresses if using a real account instead of the demo account.
- Add three title cards only: "DevSpace AI", "A simulated AI engineering internship", and "Learn by working the sprint".
- Export as MP4, 1080p, under 100 MB if the submission portal has a size limit.

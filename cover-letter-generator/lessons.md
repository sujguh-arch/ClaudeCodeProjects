# Cover Letter Lessons

**Purpose:** Capture what the iteration loop teaches us — failure modes, rhythm fixes, POV patterns that work, patterns that don't. Specific to cover letters (not general writing).

**How to use:**
- Read this file before drafting a new letter
- After each QA iteration, append any new learning (one bullet per finding, with the cause)
- **When the user gives feedback on a draft, capture it here verbatim in the "User feedback" section below before iterating** — user calibration is the most valuable signal we have
- Prune entries once they become boilerplate — lessons should be punchy

---

## User feedback (verbatim → lesson)

<!-- Record user-provided feedback here. Format:
### [Company / date]
> user's feedback (quoted)
- Lesson extracted: …
- Action taken in rewrite: …
-->

_(none yet — v3 Anthropic draft is awaiting first review)_

### Anthropic v4 → v5 (2026-04-21)
> "Ok so it should be: Super interested in X role because of X reason in the market and X. Keep these heuristic less creativity and hard facts the better. Then bullet 1 about relevant experience (strong preference for 0-1). Then bullet 2 about if there was one thing the role wanted how I did it. Standard length for both and keep them compact and heuristic and clear as to what I'd deliver in value. Try again."

- **Structural lesson — the letter is now opener + 2 bullets, not 3 paragraphs of prose.**
  - Opener: one sentence, two reasons — `Super interested in [role] because [market reason] and [company-specific reason]`.
  - Bullet 1: relevant experience, **strong preference for 0-1**.
  - Bullet 2: the one thing the role wants, how I did it.
- **Register lesson — hard facts > creative analysis.** Drop hedged-claim prose ("I'd push", "where I'd lean", "co-dependency not moat"). Replace with heuristic + numbers ("agent adoption is gated by trust infrastructure, not accuracy"). Numbers are the anchor.
- **Bullet calibration.** Standard length, compact, both similar in length. Each bullet must clearly say what value was delivered (quantified).
- **Drop the think-piece POV paragraph entirely.** It was the AI-tell. Replace with a compact bullet that says "the role wants X, here's how I did it."
- **Action in rewrite (v5):** Restructure builder to render bullets, update QA to check opener-has-reasons + each-bullet-has-metric + bullet-length-parity, drop hedged-claim warning (register no longer calls for it).

---

### Anthropic v3 → v4 (2026-04-21)
> "Hahaha. This is such shit. Way too AI generated and not authentic, short, to the point just how like I am. I'd rather say something like: Super interested in this role as x and X. Lemme deep dive"

- **Lesson extracted — voice register is the whole game.** The QA was passing on a letter that sounded like a think-piece, not like the user. Short, blunt, contractions, fragments. "Lemme", "Super interested", "dig in" are the register. The essay-opener ("Claude's Computer Use release articulated the argument I've been making…") is AI-tell #1 even when it technically passes.
- **Ban essayistic openers even when no banned phrase triggers.** Hooks that read as a New Yorker lede ("X articulated the argument…", "The bet behind Y…") are not in the user's voice. The user's hook starts with a declaration of interest, not a pundit observation.
- **Preferred hook scaffold:** `Super interested in [role] — [reasons]`. Then bridge with `Lemme deep dive` into the POV.
- **Shorter is better.** Target 120-160 words, not 180-200. The 130-200 word range in SKILL.md is too loose; tighten toward 120-160.
- **Contractions + fragments are a feature, not a bug.** "That's co-dependency, not a moat." > "This is a co-dependency rather than a moat."
- **Drop the semi-academic hedges** ("for two years", "where I've been trying to work", "the thing I've been betting on internally"). Say it plain: "I've been doing X at Y".
- **Action in rewrite (v4):** Rebuild with "Super interested in [role] — for [N] reasons" opener, "Lemme deep dive" bridge, tight 120-160 word body. Kill the think-piece register.

---

## v1 → v3 (Anthropic, Staff PM Agents)

### Rhythm & AI tells

- **Em-dashes >3 in a 180-200 word letter reads as AI.** Two em-dashes is safe; four was the tell. The fix is rarely "swap the dash" — it's "restructure the sentence" (colon, semicolon, or just two sentences).
- **Two em-dashes in one sentence ("— clause —") almost always signals LLM.** Once we dropped the nested-dash hook, the letter sounded more like a person.
- **Sentence variance <0.35 = monotone.** All 20-27 word sentences reads corporate, even when every individual sentence is good. You need at least one sentence under 12 words for rhythm.
- **Better to split the hook into two sentences than to add a short sentence elsewhere.** The hook carries the most weight; a punchy second sentence right after the opener ("Product scaffolding is the next frontier, not bigger models.") lands harder than an interstitial short sentence inside the POV.

### Structure

- **The 4-sentence cap on POV is the right constraint.** 5-sentence POV drifted into "and another thing…" register. 3-4 sentences forces compression.
- **Hook doesn't need to mention the role.** It should mention the company's most recent concrete move (a product, a decision, a thesis shift) and connect it to something specific about you.
- **The POV paragraph needs one risk + one move.** A risk alone is commentary. A move alone is presumptuous. Together they read as someone who's been thinking about the business.
- **Ending on a "learned this at [prior co]" line is stronger than ending on a generalization.** It grounds the POV in a specific experience — makes the opinion feel earned, not borrowed.

### Opener patterns

- **"[Company product] articulated the argument I've been making…"** works because it flips the register: you're not asking for a job, you're agreeing with them about something. Be careful it doesn't read as condescending — requires that the argument actually be yours.
- **Never start with "I" in the first five words.** Even "I've been…" as sentence 2 is fine; it's the positioning that matters.

### POV register

- **Hedged-claim verbs ("I'd push", "the risk I'd watch", "where I'd lean") preserve humility while still making a claim.** Declarative POV ("Anthropic should…") reads as unwarranted.
- **The POV must have one noun the company's leadership would recognize as specific.** "Bedrock and Vertex" worked. "The AI landscape" would not. Test: could the paragraph be pasted into a letter for a different company with only the company name swapped?

### Close

- **"Happy to walk through any of the above" beats "Looking forward to hearing from you."** Implies the letter has content worth walking through; the other implies the letter was an application, not an argument.
- **Single-name sign-off (just "Sujoy") beats "Best, Sujoy" in short-form.** "Best regards" is a cover-letter AI tell.

---

## Open questions / hypotheses to test

- Does a 130-150 word letter read stronger than a 180-200 word letter? The shorter might force more POV density.
- Is there a hook pattern that works for a company that hasn't shipped anything recently / isn't news-worthy? (Everything so far assumes a recent product move to anchor to.)
- For earlier-stage companies, does the POV paragraph benefit from a distribution angle vs. a product angle?

---

## Per-company notes

### Anthropic (2026-04-21)
- First letter in this system. POV: enterprise moat through Bedrock/Vertex is a co-dependency, not a moat.
- Result: passed clean after 2 iterations (3 builds total).
- If writing for Anthropic again, avoid: "product scaffolding", "first-party developer surface" (used here).

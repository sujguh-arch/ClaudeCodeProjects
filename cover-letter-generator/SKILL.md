# Cover Letter Generator Skill

## Overview
Generates a short (130-200 word) PDF cover letter built around a business POV — not a template. The letter is three beats and nothing else:

1. **Hook** — 1-2 sentences. Why this company specifically. Anchored in something real (a recent move, a product decision, a thesis about them). Not "I'm excited to apply for…"
2. **Role fit** — 2 lines. What about *this role* (not the company) draws you: the specific scope, ambiguity, or surface area.
3. **Business POV** — the bet. Where you think the business is heading, where you'd push, what risk you'd watch. Reads like a memo from someone who's been thinking about them.

Sign-off. Done.

## CRITICAL: The POV is the whole letter
If the POV reads like a description of the company, the letter is dead. Before writing, go through `references/business-pov-prompts.md` and answer all four questions. Do not draft until you have concrete answers.

## CRITICAL: Every metric comes from `references/fact-set.md`
No invented numbers, clients, or titles. Reframing is allowed; invention is not. Same rule as `resume-tailored`.

## CRITICAL: Variety across applications
The validator tracks every letter you've shipped in `history/letter-history.json`. If the opener, POV framing, or closing rhythm recurs across recent letters, QA flags it. Do not template yourself.

## CRITICAL: Read `lessons.md` before you draft
`lessons.md` accumulates what the iteration loop has taught us — specific failure modes, rhythm fixes, POV patterns that work. It is the hard-won calibration layer that QA alone can't enforce. After every iteration, append the new learning. Prune when entries become boilerplate.

---

## Step 0: Read `lessons.md`

Do not skip. Five minutes here saves a failed iteration.

## Step 1: Research (30 min minimum)

Skim:
- Last 3 product launches (blog / changelog / release notes)
- Latest funding or earnings narrative
- One competitor's recent moves
- One critical take (HN thread, dissenting analyst, competitor tweet)

You must be able to name something specific the hiring manager would recognize as "this person looked."

## Step 2: Answer the Four POV Questions

From `references/business-pov-prompts.md`:
1. What's the thesis behind their next 18 months?
2. What's the non-obvious risk?
3. What would you actually do differently?
4. Why you specifically for this?

Write the answers in a scratch file. Do not compress yet — get them down raw.

## Step 3: Draft the Three Beats

### Hook (1-2 sentences, ~20-35 words)
Start with a concrete observation about the company, not yourself. The first five words should not contain "I".

Bad: "I'm applying for the Staff PM role at Anthropic because I've long admired…"
Good: "The bet behind Claude's Computer Use release — that product scaffolding matters more than model size — is the same bet I'd make, and the one that brought me to this application."

### Role fit (2 lines, ~25-40 words)
What about *the role* pulled you, not the company. The specific scope — ambiguity, surface area, reporting line.

Bad: "This role excites me because Anthropic is doing incredible work in AI safety."
Good: "The Staff PM, Agents role sits exactly where I've been trying to work: the seam between research velocity and enterprise readiness, where a bad latency budget can kill a great model."

### Business POV (3-5 sentences, ~70-120 words)
The memo. Hedged-claim register ("I'd push", "the bet here", "the risk I'd watch"). Must contain at least one company-specific noun (product, competitor, market term). Must contain at least one opinion the hiring manager could disagree with.

Bad (no opinion): "Anthropic is pushing the frontier of AI safety and I think that work is important."
Good: "The risk I'd be watching is that Claude's enterprise moat depends on Bedrock and Vertex distribution; if one reprices or launches a competing first-party agent, the GTM picture changes fast. I'd push harder on a first-party developer surface — not a console, a real workflow product — so the relationship with the builder isn't mediated by a cloud."

### Close (1 sentence)
Concrete, not "looking forward to". Just state what's next.

Good: "Happy to walk through any of the above."

### Sign-off
`Sujoy` — single name, no "Sincerely" or "Best regards" (those are AI tells in short-form).

## Step 4: Build the PDF

1. Edit the `CONTENT` constants in `scripts/build_cover_letter.js`:
   - `COMPANY`
   - `RECIPIENT` (or leave null for "Hiring Team")
   - `HOOK`
   - `ROLE_FIT`
   - `POV`
   - `CLOSE`
2. Run: `node scripts/build_cover_letter.js`
3. Convert to PDF: `soffice --headless --convert-to pdf`

No header. No contact block. No date. The letter is the content.

## Step 5: QA Validation

Run: `python3 qa/validate_cover_letter.py <pdf_path> --company <CompanyName>`

### Hard fails (must fix)
- Pages ≠ 1
- Word count outside 130-200
- Any paragraph >4 sentences
- Any banned phrase from `references/anti-patterns.md` (AI tells, clichés)
- Generic opener: first sentence starts with "I am", "I'm writing", "I'm excited", "As a"
- Business POV paragraph contains zero company-specific nouns
- Any metric not in `references/fact-set.md`
- Variety collision: opener or POV framing matches a letter sent in the last 30 days

### Warnings (should fix)
- "I" count >8
- Sentence-length variance too low (all medium sentences = bland)
- Adverb density >5%
- Em-dash density >3
- POV paragraph missing hedged-claim verb ("I'd", "I think", "the bet", "the risk")
- POV paragraph reads as description (no opinion verb detected)

### Pass criteria
- 0 hard fails
- 0-2 warnings (ideally 0)

## Step 6: Save to History

On pass: run with `--commit` to append the letter to `history/letter-history.json` (company, opener/POV 4-gram fingerprints, word count). Next letter's variety check runs against this.

## Step 7: Update `lessons.md`

Whatever this iteration taught you — a new AI tell, a rhythm pattern, a hook move that worked or didn't — append it as a bullet. One sentence max. The next letter reads these before drafting.

Rules:
- Keep it cover-letter-specific. General writing advice belongs elsewhere.
- Cite the cause, not just the symptom ("two em-dashes in one sentence reads as AI" beats "avoid em-dashes").
- Prune entries once they become boilerplate.

### If the user gave feedback on the draft
Before iterating the letter, capture the feedback in `lessons.md` under the **User feedback (verbatim → lesson)** section:
1. Quote the feedback verbatim.
2. Extract the generalizable lesson (what's the underlying principle?).
3. Note what you changed in the rewrite so we can tell after-the-fact whether the fix worked.

User feedback is the highest-signal input we have. Never discard it into the conversation and forget — it must land in `lessons.md`.

---

## File References
- `lessons.md` — Iteration learnings. **Read before drafting, update after every iteration.**
- `references/fact-set.md` — Validated facts. Symlink to `resume-tailored/references/fact-set.md`.
- `references/anti-patterns.md` — Banned phrases (clichés + AI tells).
- `references/business-pov-prompts.md` — Depth forcing function for the POV paragraph.
- `history/letter-history.json` — All shipped letters (variety check).
- `scripts/build_cover_letter.js` — PDF builder.
- `qa/validate_cover_letter.py` — QA validator.

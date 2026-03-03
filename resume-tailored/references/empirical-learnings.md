# Resume Calibration Learnings

## Empirical Character Capacities (11pt TNR, 0.5" margins)
Based on Scale AI iterations (5 builds, visual verification):

### Headers (bold italic)
- **Capacity: ~115-117 chars** (depends on char widths)
- Target: 108-115 for safe 1-line fit with 93-96% fill
- Previous estimate was 100 → 82-86% fill (too short!)
- Wide chars (m,w,o) reduce capacity by ~3-5 chars
- Narrow chars (i,l,t,1) increase capacity by ~3-5 chars

### Bullets (regular, indented)
- **2-line capacity: ~218-225 chars** (depends on char widths)
- Target doubles: 210-222 for safe 2 lines with 85%+ 2nd line fill
- Content with wide words (e.g. "entrepreneurially", "explainability") needs lower end (~210)
- Content with narrow words (e.g. "RL", "ML", "10%") can go higher (~222)
- **Dead zone: 119-195** → wraps to 2 lines with very short 2nd line
- **3-line danger: >225** with wide chars, >230 with narrow chars
- Singles: 100-110 chars for 1 line at 85-91% fill

### Skills
- Content capacity: ~95-100 chars after label for 1-line fit
- Label "Technical: " = ~12 chars visual, "Product: " = ~10 chars

### Spacing Parameters (296/44/210 for 13 bullets)
- line_spacing: 296 (controls line height within paragraphs)
- bullet_spacing: 44 (controls gap after bullets)  
- role_spacing: 210 (controls gap between roles)
- Airtable at 284/34/180 for 14 bullets → 93.4%
- Scale at 296/44/210 for 13 bullets → 93.6%
- Fewer bullets → need more spacing to fill page

## KEY INSIGHT: Character Count ≠ Visual Fill
Same char count can produce wildly different fill depending on letter widths.
- D3 at 224 chars → 2 lines (narrow chars: "RL", "ML", "7K+")
- D4 at 225 chars → 3 lines (wide chars: "Profit-Aware", "entrepreneurially")

## PROCESS: Fill-First, Trim-to-Fit
1. Write content ~5-10% longer than you think will fit
2. Build PDF
3. Run QA + visual verification
4. Fix lines: trim overflows, expand under-fills
5. Iterate 3-5 times per resume

## Uber Iteration (2 builds to pass)
- Longer title (50 chars vs 31) fits fine at 14pt — no page impact
- Bullets at 190-205 chars are in a **soft dead zone** — 2nd line fills only 65-75%. Expand to 215+ for proper fill.
- Fixed D4 (189→220) and C4 (190→219) and W1 (204→219) to eliminate hard fails
- JD mirroring: "ruthless prioritization", "metric-moving", "fuzzy user pain", "launching fast and iterating faster" — use the JD's own language
- 5 warning lines at 79-83% fill persist — this is a structural ceiling for these particular content combinations. Expanding further risks 3-line overflow.

## Plaid Iteration (2 builds to pass)
- QA repetition check caught "collaborating closely with engineering" in 2 bullets — this works
- 3 headers and 3 bullets overflowed on first build (same pattern as Scale/Uber)
- Fix pattern: trim 10-15 chars per overflow, rebuild, check again
- Shorter title ("PRODUCT MANAGER" = 29 chars) gives more vertical room
- Fintech domain mapping: JPM experience is gold for Plaid, emphasize "financial services" throughout
- "end-to-end" and "platform" are key Plaid culture words — wove them throughout
- Only 2 builds needed (down from 5 for Scale, 2 for Uber) — learnings compound

## Descript Iteration (3 builds to pass)
- D2/D3 had 3-line orphans ("Lighthouse", "gain") — even 1 extra word overflows
- QA caught repeated phrase "build vs. buy vs. partner" across 2 bullets — rewrote C2
- H3 wraps at 118 chars again — consistent with empirical ceiling ~115-117
- Tighter spacing (280/30/170) needed for content-heavy Descript resume
- "fog sculptor" JD language is gold — wove "ambiguous", "no existing playbook" throughout
- Build/buy/partner, customer discovery, product craft — distinct Descript culture signals
- 3 builds total (down from 5 for Scale, 2 for Uber, 2 for Plaid)

## Cumulative Learnings
- Scale: 5 iterations (calibration)
- Uber: 2 iterations (applied Scale learnings)
- Plaid: 2 iterations (applied Scale+Uber learnings)
- Descript: 3 iterations (more content → needed spacing adjustment)
- Pattern: first build always overflows, fix takes 1-2 more rounds
- QA v2 repetition check catches real issues every time
- Staff signals pass on all 4 builds

## Nectar Social BLIND TEST (3 builds to pass)
- JD fetched cold from recruiter site (Ashby required JS)
- Keywords: AI workflows, generative prompting, social commerce, ship fast, ownership, ambiguity
- First build: 3 headers wrapped (all ~118-127 chars) + skills wrapped
- Fix: trimmed all headers to 107-108 chars, trimmed skills
- 3 iterations to pass — consistent with Uber/Plaid pattern
- BLIND TEST VALIDATES: the skill + QA framework works on unseen JDs
- Iteration count: 3 (same as Descript, better than Scale's 5)

## FINAL SCORECARD
| Resume | Iterations | Page Fill | QA Result |
|--------|-----------|-----------|-----------|
| Scale AI | 5 | 93.6% | ✅ PASS |
| Uber | 2 | 93.6% | ✅ PASS |
| Plaid | 2 | 93.6% | ✅ PASS |
| Descript | 3 | 93.1% | ✅ PASS |
| Nectar (blind) | 3 | 93.6% | ✅ PASS |

## Codified Integration Techniques

Patterns extracted from the 5 builds above. Now formalized in SKILL.md Step 2 as the Theme-Bridge-Rewrite method and six integration patterns.

### Culture-Word Weaving
- **Plaid**: "end-to-end" and "platform" woven throughout — not in one bullet but across headers and multiple roles. These are Plaid's culture words; density matters.
- **Descript**: "fog sculptor" language ("ambiguous", "no existing playbook") used to reframe existing 0-to-1 experience. The JD's most colorful language is the best signal of what they value.
- **Nectar**: "AI workflows", "ship fast", "ownership" — mapped to existing facts about agentic AI, fast iteration, P&L ownership.
- **Technique**: Identify the JD's 2-3 culture words. Use them in at least 2 headers and 4+ bullets across different roles. Creates "cultural resonance" that reads as genuine fit, not keyword stuffing.

### JD-Native Language Mirroring
- **Uber**: "ruthless prioritization", "metric-moving", "fuzzy user pain", "launching fast and iterating faster" — used the JD's own phrases as bullet openers or qualifiers.
- **Technique**: Quote or closely paraphrase 2-3 distinctive JD phrases. Place in headers or as bullet context-setters. Signals the candidate speaks the company's language.

### Domain-Bridging from Adjacent Experience
- **Plaid**: JPM enterprise banking experience reframed as "financial services platform" work — directly relevant to Plaid's fintech domain.
- **Technique**: When the JD's domain doesn't match a role exactly, find the Adaptable Theme in fact-set.md that bridges the gap. Reframe the header and 1-2 bullets per role to emphasize the bridging theme.

### Theme-Activation Mapping

Each JD activates a different subset of Adaptable Themes from fact-set.md:

| Resume | Primary Themes Activated | Secondary Themes |
|--------|------------------------|-----------------|
| Scale AI | RL in production, Agentic AI, Enterprise clients | Platform strategy, 0-to-1 |
| Uber | Revenue optimization, Consumer product, Growth | P&L ownership, Experimentation |
| Plaid | Enterprise fintech, Platform strategy, Risk/compliance | ML automation, Promotion trajectory |
| Descript | 0-to-1 development, Ambiguity/builder culture, Product craft | User research, Vision setting |
| Nectar | AI workflows, Ship fast, Social commerce | Consumer product, Growth strategy |

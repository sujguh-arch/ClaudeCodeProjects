# Resume Tailoring Skill

## Overview
Generates a 1-page ATS-optimized resume tailored to a specific job posting.
Uses a fixed docx template (build_resume.js) with tunable content and spacing.

## CRITICAL: Fill-First, Trim-to-Fit Strategy
Times New Roman is a **proportional font** — character count is approximate. Visual fill from the rendered PDF is the only source of truth.

**Same char count → different visual fill** depending on letter widths:
- Wide chars (m, w, W, M, o, G, D) reduce capacity ~3-5 chars
- Narrow chars (i, l, t, 1, I, r, f) increase capacity ~3-5 chars
- "entrepreneurially" (wide) vs "RL" (narrow) = huge visual difference at same char count

### Iteration Process (expect 3-5 iterations per resume)
1. Write content **~5-10% longer** than capacity (intentionally overshoot)
2. Build PDF and run QA: `python3 validate_resume.py <pdf> --detail`
3. Fix overflows first (trim 3-line bullets to 2, trim wrapped headers to 1)
4. Fix under-fills next (expand short 2nd lines to ≥85% fill)
5. Tune spacing parameters to hit 93-98% page fill
6. Re-validate until QA passes with 0 hard fails and minimal warnings

## Step 1: Extract Keywords from JD
Read the JD and extract:
- **Must-have technical keywords** (AI/ML, LLM, RL, NLP, specific frameworks)
- **Soft/user-centric keywords** (user empathy, intuitive, trust, collaboration — often the JD's most distinctive signals and easy to miss)
- **Domain keywords** (industry, use cases, customer types)
- **Cultural/stage keywords** (0-to-1, ambiguity, early-stage, entrepreneurial, bias for action)
- **Leadership keywords** (cross-functional, vision, strategy, mentoring)

## Step 2: Map Keywords to Content (Substantive Changes Required)
Each resume must have **visible, substantive changes** from baseline — not just word swaps:
- Title matches JD role name exactly
- Headers reframed with JD keywords (restructured emphasis, not just 1-word swaps)
- At least 3-4 bullets per role materially rewritten
- Skills section rotated to match JD tech stack
- Document all changes in comments in the build script for auditability

### Staff-Level Signaling (REQUIRED — non-negotiable)
Every resume MUST include ALL of these signals:
1. **Team/org size**: "org of 15", "led 15-person ML team", "10-person cross-functional team"
2. **P&L ownership**: "P&L owner ($8–12M)"
3. **Promotion trajectory**: "Promoted to PM II"
4. **Vision/strategy**: "Set multi-year AI vision", "defined strategy"
5. **Enterprise clients** (recommended): Hyatt, B&B Hotels, eBay, DoorDash, Walmart
6. **0-to-1** (recommended): Signals builder/founder energy

## Step 3: Draft Content

### Title
- Match the JD's exact job title. ≤75 characters at 14pt centered.

### Header Italic Lines (per role)
- **Empirical capacity: ~115-117 chars** (bold italic 11pt TNR)
- **Target: 108-115 chars** for safe 1-line fit with ≥93% fill
- Wide-word headers (e.g. "recommendations", "entrepreneurial") → aim 108-112
- Narrow-word headers (e.g. "RL", "AI", "ML") → can go 112-115
- After building, if header wraps to 2 lines, trim. If <88% fill, expand.

### Bullets
- **Rewrite** bullets to lead with JD-relevant context and keywords
- **Reorder** within each role: most JD-relevant bullets first
- **Vary action verbs**: No repeats within same role, max 2x across resume
- Every bullet must pass: "Would this hold up in a behavioral interview?"
- Every metric must come from `references/fact-set.md` — no invention

### Bullet Length Calibration (Empirical from 5-iteration Scale AI validation)
| Type | Target Chars | Capacity | Goal |
|------|-------------|----------|------|
| **Single** | 100-110 | ~108-116 | Fills 1 line to ≥88%. Use 1-2 per resume. |
| **Double** | 215-225 | ~218-226 | Both lines ≥85% filled. This is the default. |
| ❌ DEAD ZONE | 119-195 | N/A | Orphan 2nd line (<50% fill). NEVER. |
| ❌ OVERFLOW | 226+ (wide) | N/A | Overflows to 3 lines. |
| ❌ OVERFLOW | 232+ (narrow) | N/A | Overflows to 3 lines. |

### Skills Lines
- Swap in JD-specific technical terms, drop least relevant
- Both lines MUST fit on exactly 1 line each
- **Target: 95-100 characters of content** after the bold label
- Label widths: "Technical: " ≈ 12 chars visual, "Product: " ≈ 10 chars visual

## Step 4: Build Resume
1. Copy `scripts/build_resume.js` to working directory
2. Edit content constants (TITLE, ROLES, SKILLS) + add change comments
3. Run: `node build_resume.js [line_spacing] [bullet_spacing] [role_spacing]`
4. Convert to PDF: `soffice --headless --convert-to pdf`
5. Check page count with `pdfinfo`

### Spacing Parameters (tune to bullet count for 93-98% fill)
| Total Bullets | line_spacing | bullet_spacing | role_spacing |
|--------------|-------------|----------------|-------------|
| 14 bullets | 284 | 34 | 180 |
| 13 bullets | 296 | 44 | 210 |
| 12 bullets | 304 | 50 | 230 |

Formula: fewer bullets → more spacing to fill the page. Start with the table, then binary search if page overflows or underfills.

## Step 5: QA Validation (v2)
Run: `python3 resume-qa/scripts/validate_resume.py <pdf> --detail`

### Hard Fails (must fix)
- Pages ≠ 1
- Page fill <91% or >99%
- Any line <65% fill (orphan/overflow)

### Warnings (should fix)
- Page fill 91-93% (aim for 93-98%)
- 2nd lines of doubles <85% fill (aim for ≥87%)
- Content lines <80% fill
- Repeated action verbs within same role
- Same verb starting >2 bullets across resume
- Missing staff signals (team size, P&L, promotion, vision)

### Pass Criteria
- 0 hard fails
- 0-2 warnings (ideally 0)
- All 4 required staff signals detected
- No verb repetition within roles

## Step 6: Visual Verification
After QA passes, render preview and manually verify:
- [ ] All headers on exactly 1 line, well-filled
- [ ] All double bullets are exactly 2 lines, 2nd line well-filled
- [ ] Single bullets are exactly 1 line
- [ ] Skills both on 1 line
- [ ] No orphan words
- [ ] No visible trailing whitespace
- [ ] Education visible at bottom
- [ ] Professional, polished appearance

## Common Failure Patterns and Fixes

### Header wraps to 2 lines
→ Trim 3-5 chars. Try: drop conjunction, abbreviate ("cross-functional" → "cross-func."), use narrower synonyms.

### Bullet overflows to 3 lines (orphan word on line 3)
→ Trim 8-15 chars from end. Usually means a trailing phrase can be cut.

### 2nd line of double bullet <85% fill
→ Expand by 8-15 chars. Add a qualifier, extra metric, or context phrase.

### Dead zone bullet (119-195 chars)
→ Either cut to <118 (make single) or expand to >215 (make double). Never leave in dead zone.

### Skills line wraps
→ Drop least-relevant skill term. Or abbreviate ("Reinforcement Learning" → "RL" only if "Reinforcement Learning" also appears in bullets).

### Page fill too low (<91%)
→ Increase spacing parameters. Or add content to short 2nd lines.

### Page fill too high (>99%) or 2 pages
→ Decrease spacing. Or drop 1 bullet from the longest role section. Or trim widest bullets.

## File References
- `references/fact-set.md` — Validated facts/metrics. NOTHING outside this file on the resume.
- `references/formatting-spec.md` — Detailed formatting spec with empirical measurements.
- `resume-qa/scripts/validate_resume.py` — QA validator (v2 with repetition + staff signal checks).
- `scripts/build_resume.js` — Template build script.

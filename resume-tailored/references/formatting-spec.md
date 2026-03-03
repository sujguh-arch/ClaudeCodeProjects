# Resume Formatting Specification

## Page Layout
- Paper: US Letter (8.5" × 11")
- Margins: 0.5" all sides
- Orientation: Portrait
- Target: Exactly 1 page, 93-98% filled

## Typography
| Element | Font | Size | Weight |
|---------|------|------|--------|
| Title | Times New Roman | 14pt | Bold, centered |
| Section headers | Times New Roman | 12pt | Bold, underlined |
| Role titles | Times New Roman | 11pt | Bold + Italic company |
| Header italics | Times New Roman | 11pt | Bold + Italic |
| Bullet text | Times New Roman | 11pt | Regular |
| Skills labels | Times New Roman | 11pt | Bold |
| Skills content | Times New Roman | 11pt | Regular |
| Education | Times New Roman | 11pt | Mixed |

## Content Strategy: Fill-First, Trim-to-Fit
TNR is proportional — character count is only approximate. **Visual fill from the rendered PDF is the source of truth.**

### CRITICAL INSIGHT: Character Count ≠ Visual Fill
Same char count produces different fill depending on letter widths.
- Wide chars (m, w, W, M, o, G, D) reduce effective capacity by ~3-5 chars
- Narrow chars (i, l, t, 1, I, r, f) increase effective capacity by ~3-5 chars
- Words like "entrepreneurially", "explainability", "recommendations" are very wide
- Words like "RL", "ML", "AI", "10%", "lift" are very narrow
- ALWAYS build PDF and check visual fill — never trust char count alone

### Empirical Character Targets (from 5-iteration Scale AI calibration)
| Element | Target Chars | Capacity | Goal |
|---------|-------------|----------|------|
| Header (bold italic, 1 line) | 108-115 | ~115-117 max | Fill to ≥93% |
| Single bullet (regular) | 100-110 | ~108-116 max | Fill to ≥88% |
| Double bullet (regular) | 215-225 | ~218-226 max | Both lines ≥85% |
| Skills content (after label) | 95-100 | ~100-108 max | Fill to ≥95% |
| Title | ≤75 | centered 14pt | 1 line |

### Dead Zones (NEVER write content in these ranges)
| Range | Problem |
|-------|---------|
| 119-195 chars | Wraps to 2 lines but 2nd line has <50% fill (orphan) |
| 226+ chars (wide words) | Overflows to 3 lines |
| 232+ chars (narrow words) | Overflows to 3 lines |

**Dead Zone Resolution** (common after keyword rewriting):
- **Preferred**: Expand to 215+ by adding a second metric, JD-context phrase, or qualifier from fact-set.md
- **Fallback**: Compress to <118 by stripping to core verb + object + metric
- The QA validator and build script both flag dead-zone bullets with resolution guidance

### Spacing Parameters
Spacing must be tuned based on total bullet count to hit 93-98% page fill:
| Total Bullets | line_spacing | bullet_spacing | role_spacing | Expected Fill |
|--------------|-------------|----------------|-------------|---------------|
| 14 bullets | 284 | 34 | 180 | ~93-94% |
| 13 bullets | 296 | 44 | 210 | ~93-94% |
| 12 bullets | 304 | 50 | 230 | ~93-94% |

Formula: fewer bullets → more spacing to fill the page.

### Iteration Process
1. Draft content ~5-10% longer than capacity (intentionally overshoot)
2. Build PDF with estimated spacing
3. Run QA validator: `python3 validate_resume.py <pdf> --detail`
4. Fix overflows first (trim 3-line bullets, wrapped headers)
5. Fix under-fills next (expand short 2nd lines to ≥85%)
6. Tune spacing to hit 93-98% page fill
7. Re-validate — expect 3-5 iterations per resume

## Validation Criteria (QA v2 — ALL must pass)
1. ✅ Exactly 1 page
2. ✅ Page fill: 93-98%
3. ✅ All content lines ≥80% filled; 2nd lines of doubles ≥85%
4. ✅ No 3-line bullets (no very short orphan lines)
5. ✅ Headers on 1 line each, ≥93% filled
6. ✅ Skills on 1 line each, ≥95% filled
7. ✅ Title on 1 line
8. ✅ Education visible at bottom
9. ✅ No repeated action verbs within same role
10. ✅ No verb starting >2 bullets across entire resume
11. ✅ Staff signals present (team size, P&L, promotion, vision — all 4 required)
12. ✅ Keyword coverage ≥90% of must-haves (enforced via `--keywords` flag in QA; hard-fail at <80%)

## Staff-Level Signaling (Required)
Every resume MUST include these signals — they are NOT optional:
- **Team/org size**: "org of 15", "led 15-person ML team", "10-person cross-functional team"
- **P&L ownership**: "P&L owner ($8–12M)"
- **Promotion trajectory**: "Promoted to PM II"
- **Vision/strategy**: "Set multi-year AI vision", "defined strategy"
- **Enterprise clients** (recommended): Named logos like Hyatt, B&B Hotels, eBay, DoorDash, Walmart
- **0-to-1 development** (recommended): Signals builder/founder energy

## Content Tailoring Per JD
Each resume must have VISIBLE, SUBSTANTIVE changes from baseline:
- Title matches JD role name exactly
- Headers reframed with JD keywords (not just swapped words — restructured emphasis)
- At least 3-4 bullets per role materially rewritten (not just word swaps)
- Skills section rotated to match JD tech stack
- Action verbs varied — no repeats within a role, max 2x across resume

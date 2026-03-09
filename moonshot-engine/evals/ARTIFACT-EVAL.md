# Artifact Engine Evaluation Specification

**Purpose:** State-of-the-art eval framework for Stage 03 (Artifact Engine) outputs. Combines programmatic hard gates with LLM-as-judge scoring for subjective criteria. Every artifact must pass ALL hard gates before subjective scoring begins.

**Philosophy:** The artifact is the centerpiece of the pipeline. It must demonstrate earned insight — something only Sujoy would hypothesize — not impressive-looking AI slop. Clarity beats impressiveness. Business insight + earned secrets are the core signal.

---

## Part 1: Hard Gates (Programmatic — Binary PASS/FAIL)

These are non-negotiable. A single FAIL blocks the artifact from advancing. Checked by code, no judgment calls.

### HG-01: Fact-Set Traceability
Every metric, number, percentage, or quantitative claim in the artifact must trace to `references/fact-set.md`.

**Check:** Extract all numbers/metrics from artifact text → search each in fact-set.md → flag any orphans.
- **PASS:** 100% of metrics found in fact-set.md
- **FAIL:** Any invented metric (even one)

### HG-02: Specificity Swap Test
Replace the target company name with a competitor throughout the artifact. If the artifact still reads coherently, it fails.

**Check:** Programmatic substitution (e.g., "Waymo" → "Aurora", "Anthropic" → "OpenAI") → LLM judge rates coherence of swapped version.
- **PASS:** Swapped version is clearly broken — references wrong products, wrong incidents, wrong architecture
- **FAIL:** Swapped version still makes sense (artifact is too generic)

### HG-03: Earned Secret Presence
At least one insight from `references/earned-secrets.md` must appear in the artifact — not just name-dropped, but structurally woven into the argument.

**Check:** Extract earned secret identifiers → search artifact for each → verify the secret is *applied* (not just quoted).
- **PASS:** ≥1 earned secret is a load-bearing part of the artifact's thesis
- **FAIL:** No earned secrets, or only surface-level mention ("As I learned at Duetto...")

### HG-04: Code Executes (Prototype artifacts only)
`python src/main.py` (or documented entry point) runs without errors.

**Check:** Execute the code, capture stdout/stderr.
- **PASS:** Exit code 0, meaningful output produced
- **FAIL:** Crashes, import errors, empty output

### HG-05: Word/Length Bounds
- README.md: 400-2000 words
- Architecture doc: 300-1500 words
- Strategy memo (if applicable): 2000-4000 words
- Executive summary: 200-500 words

**Check:** `wc -w` on each file.
- **PASS:** All within bounds
- **FAIL:** Any file outside bounds

### HG-06: Anti-Pattern Scan — AI Slop Detection
Scan for telltale AI-generated patterns:

**Hedging language (flag if >3 instances across artifact):**
- "This could potentially..."
- "It's worth noting that..."
- "It's important to consider..."
- "There are several..."
- "In today's rapidly..."
- "At its core..."
- "Fundamentally..."
- "Leveraging" (as verb)
- "In conclusion..."
- "Moving forward..."
- "It should be noted..."
- "The key takeaway is..."

**Structural tells (flag if any):**
- Every section has exactly 3 bullet points
- Suspiciously balanced pros/cons (exact same count)
- Every paragraph starts with a topic sentence + 3 supporting points
- Headers follow "The [Noun] [Noun]" pattern excessively (e.g., "The Optimization Paradigm")

**Missing signals (flag if absent):**
- No contrarian takes / no "here's what everyone gets wrong"
- No mention of what went wrong, what was learned the hard way
- No genuine trade-offs (everything presented as upside)
- No "I'd do this differently now"
- No specific failure or scar from experience

**Check:** Regex + count-based detection.
- **PASS:** ≤2 hedging instances, 0 structural tells, ≥2 of the "missing signals" present
- **FAIL:** >3 hedging instances, OR any structural tell, OR 0 of the missing signals present

### HG-07: Dependency Check (Prototype only)
Only standard/common libraries allowed (numpy, gymnasium, pandas, matplotlib, etc.).

**Check:** Parse imports → flag anything not in approved list.
- **PASS:** All imports from approved set
- **FAIL:** Requires niche/heavy dependencies without justification

### HG-08: AI Detection Resistance
All prose (README, architecture doc, strategy memo) must pass AI content detection. Uses the same signals GPTZero and similar detectors use: perplexity, burstiness, vocabulary diversity.

**Burstiness check:** AI text has uniform sentence complexity. Human text is bursty — short fragments mixed with long analytical sentences.
- Measure: Standard deviation of sentence lengths (words per sentence)
- Flag: If stdev < 4.0 (human writing typically 6-12, AI writing typically 2-4)

**Vocabulary diversity:** AI reuses the same sophisticated words. Human text mixes registers.
- Measure: Type-token ratio (unique words / total words) in 100-word windows
- Flag: If average TTR < 0.55 across windows

**Repetitive phrasing:** AI uses the same transition phrases and 3-grams.
- Measure: Count repeated 3-grams (excluding domain terms and code)
- Flag: If any non-domain 3-gram appears >3 times

**Sentence opener variety:** AI starts sentences the same way. Human text varies openers.
- Measure: First-word diversity across sentences
- Flag: If >30% of sentences start with the same word (especially "The", "This", "It")

**Check:** Combined analysis of all prose files.
- **PASS:** ≤1 of the 4 sub-checks flagged
- **FAIL:** ≥2 sub-checks flagged

### HG-09: Writing Style Match
The artifact prose should match Sujoy's natural writing voice — direct, concise, opinionated, concrete-first.

**Style markers (want PRESENT ≥4 of 6):**
- Short declarative sentences mixed with longer analytical ones
- Em-dash asides for emphasis (not semicolons or parenthetical hedges)
- Direct assertions ("This is X" not "It could be argued that X")
- Concrete before abstract (specific example, then generalization)
- Active voice dominant (>75% of sentences)
- First person used naturally ("I shipped", "I learned")

**Anti-style markers (want ABSENT — max 1):**
- Passive voice dominance ("it was determined that...")
- Academic hedging ("one might argue", "it is suggested")
- Corporate buzzwords without technical context ("synergize", "leverage", "utilize")
- Blogger transitions ("So, here's the thing...", "Let me tell you...")
- Numbered lists where flowing prose would be more natural

**Check:** Regex + structural analysis.
- **PASS:** ≥4 style markers present, ≤1 anti-style marker
- **FAIL:** <3 style markers present OR ≥3 anti-style markers

---

## Part 2: Subjective Criteria (LLM-as-Judge — Scored 1-5)

Each criterion is scored by an LLM judge with a calibrated prompt. The judge receives the artifact + reference files + scoring rubric. Minimum passing score: 3.5 average across all criteria, no individual score below 2.

### Dimension A: Earned Secret Depth (Weight: 3x)
*This is the highest-weighted dimension because it's the core differentiator.*

| # | Criterion | 5 (Exceptional) | 3 (Acceptable) | 1 (Failing) |
|---|-----------|-----------------|-----------------|-------------|
| A1 | **Secret as thesis** | The earned secret IS the artifact's thesis — remove it and the artifact collapses | Secret informs the thesis but isn't central | Secret is absent or decorative |
| A2 | **Non-obvious insight** | Someone reading this would say "I never thought of it that way" | Insight is valid but somewhat expected | Consensus wisdom repackaged |
| A3 | **Experience-grounded** | Specific details (what went wrong, the pivot moment, the before/after) that prove lived experience | References experience generally | Could have been written by someone who read about it |
| A4 | **Transferability demonstrated** | Shows exactly how the secret applies to the target company's specific problem with concrete mapping | Draws parallel but leaves application vague | States "this is transferable" without showing how |
| A5 | **Scar tissue visible** | Includes what went wrong, what was learned the hard way, what the speaker would do differently | Mentions challenges generally | All wins, no learning |

### Dimension B: Business Insight (Weight: 2x)

| # | Criterion | 5 (Exceptional) | 3 (Acceptable) | 1 (Failing) |
|---|-----------|-----------------|-----------------|-------------|
| B1 | **Problem identification** | Identifies a specific, non-obvious problem the company has (not just what they say publicly) | Addresses a known company challenge | Solves a generic industry problem |
| B2 | **Solution specificity** | Proposes a concrete approach with implementation steps, timelines, and expected outcomes | Proposes a direction with some specifics | Vague recommendations ("they should use AI") |
| B3 | **Market context** | Demonstrates understanding of competitive landscape and why this matters now | Some competitive awareness | No market context |
| B4 | **Financial/strategic thinking** | Connects technical solution to business outcomes (revenue, cost, retention, competitive moat) | Mentions business impact | Pure technical exercise with no business framing |
| B5 | **Stakeholder awareness** | Shows understanding of who would champion/resist this internally | Identifies the decision-maker | No organizational awareness |

### Dimension C: Technical Credibility (Weight: 2x)

| # | Criterion | 5 (Exceptional) | 3 (Acceptable) | 1 (Failing) |
|---|-----------|-----------------|-----------------|-------------|
| C1 | **Architecture soundness** | Design decisions are defensible, trade-offs are explicit, alternatives were considered | Architecture works but isn't deeply reasoned | Arbitrary architecture choices |
| C2 | **Domain vocabulary** | Uses the target company's technical terms correctly and naturally | Mostly correct terminology | Wrong or generic terms |
| C3 | **Scale awareness** | Discusses what changes at the company's actual scale (with specific numbers from intel) | Mentions scale generally | Prototype-only thinking |
| C4 | **Edge case thinking** | Identifies and addresses domain-specific edge cases | Some edge case awareness | Happy path only |
| C5 | **Production readiness gap** | Honest about what's prototype vs. production, with a specific bridge plan | Acknowledges the gap | Claims prototype IS production-ready, or ignores the gap |

### Dimension D: Clarity & Communication (Weight: 1.5x)

| # | Criterion | 5 (Exceptional) | 3 (Acceptable) | 1 (Failing) |
|---|-----------|-----------------|-----------------|-------------|
| D1 | **5-minute walkthrough** | Could present the artifact in a 5-minute narrative with clear arc | 7-10 minutes, somewhat rambling | Would take 15+ minutes to explain |
| D2 | **Audience adaptability** | Works for both PM and engineering audiences (has both strategic and technical layers) | Works well for one audience | Only interpretable by the author |
| D3 | **Visual hierarchy** | Clear headers, tables, formatted output — scannable in 30 seconds for the key insight | Readable but requires full read-through | Wall of text |
| D4 | **Narrative arc** | Problem → insight → evidence → proposal → "what I'd do next" | Has most narrative elements but order is off | Collection of observations without narrative |
| D5 | **Question bait** | Deliberately includes 2-3 provocative choices that invite "why did you..." questions | Some interesting decisions | No conversation starters |

### Dimension E: Authenticity (Weight: 2x)

| # | Criterion | 5 (Exceptional) | 3 (Acceptable) | 1 (Failing) |
|---|-----------|-----------------|-----------------|-------------|
| E1 | **Voice consistency** | Reads like a specific person with opinions, not a report generated by a system | Mostly has personality | Could be anyone's work |
| E2 | **Intellectual honesty** | Explicitly states limitations, where the analogy breaks down, what's uncertain | Some caveats noted | Oversells everything |
| E3 | **Contrarian signal** | Takes at least one position that goes against conventional wisdom, with evidence | Slightly unconventional framing | Pure consensus thinking |
| E4 | **Scars over stats** | Leads with what was learned from failure, not just success metrics | Mentions both wins and losses | Victory lap with no texture |
| E5 | **Imperfect on purpose** | Has deliberate rough edges that signal human authorship (strong opinions, incomplete ideas, "I'm not sure about X but...") | Some human touches | Polished to a suspicious sheen |

### Dimension F: Forward Test (Weight: 2x)

| # | Criterion | 5 (Exceptional) | 3 (Acceptable) | 1 (Failing) |
|---|-----------|-----------------|-----------------|-------------|
| F1 | **Hiring manager forward** | HM would Slack this to their team with "you need to see this" | Might mention it in a 1:1 | Would not share |
| F2 | **Team discussion value** | Would spark a 30-minute team discussion about the approach | Would get a "huh, interesting" | No discussion value |
| F3 | **Reveals a blind spot** | Points out something the company hasn't publicly addressed | Offers a known perspective with slight twist | Tells them what they already know |
| F4 | **Actionable next day** | Someone at the company could start implementing a piece of this tomorrow | Could inform a future project | Purely theoretical |
| F5 | **Competitive intelligence value** | Demonstrates knowledge or framework the company would want on their team | Shows relevant skills | Generic competence |

---

## Part 3: Composite Scoring

### Hard Gates
- All 7 gates must PASS (or N/A for type-specific gates)
- Any FAIL → artifact is blocked, must be fixed before subjective scoring

### Subjective Score
- 30 criteria across 6 dimensions
- Weighted scoring:
  - Dimension A (Earned Secret): 3x weight → 5 criteria × 3 = 15 weighted slots
  - Dimension B (Business Insight): 2x weight → 5 criteria × 2 = 10 weighted slots
  - Dimension C (Technical Credibility): 2x weight → 5 criteria × 2 = 10 weighted slots
  - Dimension D (Clarity): 1.5x weight → 5 criteria × 1.5 = 7.5 weighted slots
  - Dimension E (Authenticity): 2x weight → 5 criteria × 2 = 10 weighted slots
  - Dimension F (Forward Test): 2x weight → 5 criteria × 2 = 10 weighted slots
  - **Total weighted slots: 62.5**
  - **Max weighted score: 312.5**

### Thresholds
| Grade | Weighted Score | Requirements |
|-------|---------------|--------------|
| **Exceptional** | ≥275 (88%+) | All hard gates PASS, no individual criterion below 4 |
| **Production-ready** | ≥220 (70%+) | All hard gates PASS, no individual criterion below 3 |
| **Needs polish** | ≥175 (56%+) | All hard gates PASS, ≤3 criteria below 3 |
| **Needs rework** | <175 | Hard gate failures OR >3 criteria below 3 |

---

## Part 4: Diagnostic Output Format

The eval runner should produce:

```
═══════════════════════════════════════════
 ARTIFACT EVAL: {company} — {role}
═══════════════════════════════════════════

HARD GATES
──────────
  HG-01 Fact-Set Traceability    ✅ PASS  (12/12 metrics traced)
  HG-02 Specificity Swap         ✅ PASS  (swap coherence: 0.15 — clearly broken)
  HG-03 Earned Secret Presence   ✅ PASS  (2 secrets woven: ICP Pivot, RL Optimizer)
  HG-04 Code Executes            ✅ PASS  (exit 0, 47 lines output)
  HG-05 Word/Length Bounds       ✅ PASS  (README: 892w, arch: 614w)
  HG-06 AI Slop Detection        ✅ PASS  (1 hedge, 0 structural, 3/5 missing signals)
  HG-07 Dependency Check          ⬜ N/A   (strategy memo)

  Gate status: ALL PASS → proceeding to subjective scoring

SUBJECTIVE SCORES
─────────────────
  A: Earned Secret Depth     [4.6/5.0]  ████████████████████░░  (3x weight)
  B: Business Insight        [4.2/5.0]  ██████████████████░░░░  (2x weight)
  C: Technical Credibility   [4.0/5.0]  █████████████████░░░░░  (2x weight)
  D: Clarity & Communication [4.4/5.0]  ███████████████████░░░  (1.5x weight)
  E: Authenticity            [4.3/5.0]  ██████████████████░░░░  (2x weight)
  F: Forward Test            [4.1/5.0]  █████████████████░░░░░  (2x weight)

  Weighted score: 268.8 / 312.5 (86.0%)
  Grade: PRODUCTION-READY (borderline Exceptional)

FLAGGED ITEMS (score < 4)
─────────────────────────
  C3 Scale awareness (3.5): Architecture doc mentions scale but doesn't cite
     specific Waymo fleet numbers (450K+ rides/week).
  F4 Actionable next day (3.0): Proposals are directional — add a concrete
     "week 1 experiment" section.

RECOMMENDATIONS
───────────────
  1. Add fleet-scale numbers from intel.md to architecture.md scaling section
  2. Include a "smallest provable experiment" for each proposal
  3. Consider adding a failure scenario walkthrough to strengthen E4 (scars)
```

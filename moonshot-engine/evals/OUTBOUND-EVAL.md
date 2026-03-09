# Outbound Composer Evaluation Specification

**Purpose:** State-of-the-art eval framework for Stage 04 (Outbound Composer) outputs. Evaluates email, LinkedIn, follow-up, and warm intro messages. Programmatic hard gates + LLM-as-judge scoring.

**Philosophy:** The outbound is the delivery vehicle for the artifact. Tone is peer-to-peer + show don't tell. The artifact does the talking — the message is the invitation to look. Every failure mode matters equally: generic, too eager, shoehorned artifact, wrong tone.

---

## Part 1: Hard Gates (Programmatic — Binary PASS/FAIL)

All must pass before subjective scoring begins.

### HG-01: Word Count Limits
| Variant | Max Words | Check |
|---------|-----------|-------|
| Primary email body | 200 | `wc -w` on body (excluding subject/signature) |
| LinkedIn connection request | 300 chars | `wc -c` |
| LinkedIn InMail | 150 words | `wc -w` |
| Follow-up email | 100 words | `wc -w` |

- **PASS:** All variants within limits
- **FAIL:** Any variant exceeds limit

### HG-02: Anti-Pattern Scan
Scan all variants for banned phrases:

**Banned phrases (exact or close match):**
- "I'm passionate about..."
- "With X years of experience..."
- "I believe I'd be a great fit..."
- "I believe I would be a great fit..."
- "Unique combination of..."
- "At your convenience..."
- "I'm excited to apply..."
- "I love what you're building..."
- "Don't want to take too much of your time..."
- "I hope this email finds you well..."
- "Just following up..." (in follow-up only)
- "Bumping this to the top..."
- "I'm reaching out because..."
- "As a [title] with [N] years..."
- "I'd love the opportunity to..."

**Check:** Case-insensitive regex match across all variants.
- **PASS:** Zero banned phrases found
- **FAIL:** Any banned phrase found (even one)

### HG-03: Fact-Set Traceability
Every metric or quantitative claim must trace to `references/fact-set.md`.

**Check:** Extract numbers/percentages from all variants → verify each in fact-set.md.
- **PASS:** 100% traceable
- **FAIL:** Any invented metric

### HG-04: Specificity Swap Test
Replace company name + recipient name + company-specific references with a competitor.

**Check:** Substitute company → competitor, product references → competitor products. LLM rates whether swapped version still makes sense.
- **PASS:** Swapped version is clearly broken (references wrong incidents, wrong products, wrong people)
- **FAIL:** Swapped version reads fine (too generic)

### HG-05: Subject Line Check
- Under 60 characters
- Does NOT contain: "Application for", "Interested in", "Job", "Resume", "Opportunity"
- References the artifact or a specific company challenge

**Check:** Character count + keyword blacklist + LLM judges artifact/challenge reference.
- **PASS:** All three checks pass
- **FAIL:** Any check fails

### HG-06: AI Slop Detection — Outbound Specific

**Hedging language (flag if any in outbound — zero tolerance for short-form):**
- "It's worth noting..."
- "There are several reasons..."
- "Fundamentally..."
- "At its core..."
- "In today's landscape..."
- "Moving forward..."

**Structural tells:**
- Email has exactly 5 paragraphs with exactly the same sentence count
- Every sentence is the same length (±5 words)
- Uses semicolons in casual email context
- Uses em-dashes more than once

**Credential parade detection:**
- First paragraph mentions a degree, title, or company name (other than recipient's company)
- Lists more than 1 metric in the bridge section
- Any sentence of the form "At [Company], I [verb]ed [thing]" appearing more than once

**Check:** Regex + structural analysis.
- **PASS:** 0 hedging, 0 structural tells, 0 credential parade flags
- **FAIL:** Any flag triggered

### HG-07: Variant Completeness
All required variants must be present:
1. Primary email (with subject line)
2. LinkedIn connection request
3. LinkedIn InMail
4. Follow-up email
5. Warm intro request (with forwardable blurb)

**Check:** Section header detection.
- **PASS:** All 5 variants present
- **FAIL:** Any variant missing

### HG-08: CTA Presence
Every variant must have a clear call-to-action.

**Check:** LLM identifies the CTA in each variant. CTA must be specific (not "let me know").
- **PASS:** All variants have specific CTAs
- **FAIL:** Missing or vague CTA in any variant

### HG-09: Recipient Specificity
Primary email must reference the recipient by name and reference something specific about them (role, team, recent talk, post, background).

**Check:** Recipient name present + LLM judges whether recipient-specific content exists.
- **PASS:** Name + at least one specific recipient reference
- **FAIL:** Generic "Dear Hiring Manager" or no recipient personalization

### HG-10: AI Detection Resistance
All outbound prose must be undetectable as AI-generated. Short-form text (emails, LinkedIn) is the highest-risk surface for AI detection because hiring managers pattern-match on it daily.

**Burstiness check:** Sentence length variation.
- Measure: Stdev of sentence lengths per variant
- Flag: If stdev < 3.0 for any variant (short-form is naturally burstier than long-form)

**Opener variety:** First words of sentences.
- Measure: Diversity of sentence openers across all variants
- Flag: If >25% of sentences start with the same word

**Transition predictability:** AI emails use the same connective tissue.
- Measure: Count generic transitions ("Additionally", "Furthermore", "Moreover", "In addition")
- Flag: If any appear (zero tolerance in short-form outbound)

**Register consistency:** The email should sound like the same person throughout, not shift from casual to formal.
- Measure: LLM judges register consistency across paragraphs
- Flag: If register shifts noticeably between sections

**Check:** Combined analysis.
- **PASS:** ≤1 sub-check flagged
- **FAIL:** ≥2 sub-checks flagged

### HG-11: Writing Style Match
Outbound must sound like Sujoy, not like a template. His style is direct, compressed, concrete-first, peer-to-peer.

**Style markers for outbound (want PRESENT ≥3 of 5):**
- Leads with observation/insight, not self-introduction
- Uses specific numbers over adjectives ("20% to 60%+" not "dramatically improved")
- Short sentences for impact, longer for explanation
- Em-dash for asides (natural in his voice)
- Ends with a specific, light CTA (not formal)

**Anti-style markers (want ABSENT — zero tolerance):**
- Any sentence that starts with "I am a..."
- Any sentence longer than 40 words in the email body
- Passive voice in the CTA ("would be appreciated" vs. "20 minutes?")
- Generic openers ("I came across", "I noticed your company")

**Check:** Regex + sentence analysis.
- **PASS:** ≥3 style markers, 0 anti-style markers
- **FAIL:** <2 style markers OR any anti-style marker

---

## Part 2: Subjective Criteria (LLM-as-Judge — Scored 1-5)

Minimum passing: 3.5 average, no individual score below 2.

### Dimension A: Tone & Voice (Weight: 3x)
*Highest weight because tone is the #1 differentiator between outbound that gets replies and outbound that gets deleted.*

| # | Criterion | 5 (Exceptional) | 3 (Acceptable) | 1 (Failing) |
|---|-----------|-----------------|-----------------|-------------|
| A1 | **Peer-to-peer energy** | Reads like messaging a respected colleague at another company, not "applying" | Mostly conversational but occasionally formal | Reads like a cover letter |
| A2 | **Show don't tell** | Credentials are implied by the work described; never stated directly | One mention of a credential, but artifact leads | Opens with credentials |
| A3 | **Confidence without arrogance** | Certain about the insight, humble about fit — "I've seen this before, here's what I found" | Mostly confident, one moment of either underselling or overselling | Either desperate ("I'd be grateful for any time") or cocky ("You need me") |
| A4 | **Curiosity signal** | Genuine question or observation that shows the sender is thinking about the problem, not just the role | Some interest in the problem evident | Purely transactional — "I want this job" |
| A5 | **Human cadence** | Sentence length varies naturally. Some short. Some longer with a real thought. Not metronomic. | Mostly natural but a few robotic sentences | Every sentence is the same length and structure |

### Dimension B: Artifact Integration (Weight: 2.5x)

| # | Criterion | 5 (Exceptional) | 3 (Acceptable) | 1 (Failing) |
|---|-----------|-----------------|-----------------|-------------|
| B1 | **Natural mention** | Artifact comes up as evidence for a point being made, not as "BTW I built something" | Artifact mentioned with clear purpose but transition is slightly abrupt | "Please see attached" or artifact feels forced into the email |
| B2 | **Curiosity generation** | Reader would want to look at the artifact even if they weren't hiring — it sounds genuinely interesting | Reader would look if they were already interested in the candidate | Artifact mention is skippable |
| B3 | **Thesis preview** | Email hints at the artifact's key insight without giving it all away — creates a reason to open it | Describes what the artifact is but not why it's interesting | Either spoils the artifact or says nothing about it |
| B4 | **Access strategy** | Clear, low-friction way to access the artifact (link vs. "happy to share" vs. attachment) with appropriate gating | Access mentioned but somewhat vague | No mention of how to see the artifact |
| B5 | **Artifact-email coherence** | The email's hook and the artifact's thesis are the same story told at different zoom levels | Related but the connection requires inference | Email and artifact feel like separate projects |

### Dimension C: Hook Quality (Weight: 2x)

| # | Criterion | 5 (Exceptional) | 3 (Acceptable) | 1 (Failing) |
|---|-----------|-----------------|-----------------|-------------|
| C1 | **First-line hook** | Opening sentence makes the reader stop scrolling — it's either surprising, specific, or raises a question | Opening is relevant but doesn't stop the scroll | Opening is "I'm writing to express my interest..." |
| C2 | **Recency** | Hook references something from the last 3 months (news, product launch, incident, blog post) | References something from last 6 months | No timely reference, or references old news |
| C3 | **Insight over information** | Hook contains an observation or connection, not just a fact ("These two failures are the same problem" vs "I saw you had two incidents") | Hook has a point of view but it's somewhat obvious | Hook is just a fact without framing |
| C4 | **Recipient relevance** | Hook connects to something the specific recipient cares about (their team, their product area, their public statements) | Hook is relevant to the company but not the specific person | Hook is about the company generally |
| C5 | **Pattern interrupt** | Something in the first 2 sentences breaks the "cold email" pattern — unexpected framing, provocative question, contrarian take | Slightly unusual approach | Follows the standard cold outreach template |

### Dimension D: Failure Mode Detection (Weight: 2x)
*Each criterion tests one of the four failure modes the user identified.*

| # | Criterion | 5 (No failure) | 3 (Borderline) | 1 (Clear failure) |
|---|-----------|-----------------|-----------------|-------------|
| D1 | **Generic test** | Every sentence contains information specific to this company, person, or role | 1-2 sentences could apply to any company | Most sentences work for any AI company |
| D2 | **Eagerness test** | Confident and direct — states what was done, asks for a specific thing | Mostly controlled but one moment of overselling | Lists achievements, begs for time, or uses exclamation marks |
| D3 | **Shoehorn test** | Artifact mention feels like the natural conclusion of the email's argument | Artifact mention is relevant but transition is mechanical | Artifact feels jammed in — "Oh and I also built a thing" |
| D4 | **Tone test** | Sounds like Sujoy writing to a peer he respects | Mostly right but one sentence sounds off | Sounds like ChatGPT, a recruiter, or a desperate applicant |
| D5 | **Mobile scan test** | In 10 seconds of scanning on a phone, the key point and CTA are clear | Most of it is scannable | Dense paragraphs that require careful reading |

### Dimension E: Multi-Channel Strategy (Weight: 1.5x)

| # | Criterion | 5 (Exceptional) | 3 (Acceptable) | 1 (Failing) |
|---|-----------|-----------------|-----------------|-------------|
| E1 | **Channel differentiation** | Each variant (email, LinkedIn, InMail) leads with a different angle or facet | Slightly different framing per channel | Same message copy-pasted across channels |
| E2 | **Follow-up value ladder** | Follow-up adds genuinely new value — new insight, new data point, new connection to recent news | Adds some value but mostly rehashes | "Just checking in" or "bumping this" |
| E3 | **Sequence logic** | Clear rationale for which channel first, second, third + timing | Sequence exists but timing is vague | No multi-touch strategy |
| E4 | **Warm intro quality** | Forwardable blurb is genuinely forwardable — the connector doesn't need to rewrite it | Blurb exists but needs editing | No warm intro template or it's too long to forward |
| E5 | **Connection request economy** | LinkedIn request is under 300 chars AND contains a specific hook AND has a CTA | Under limit with some specificity | Generic "I'd love to connect" |

### Dimension F: Authenticity & Anti-Slop (Weight: 2x)

| # | Criterion | 5 (Exceptional) | 3 (Acceptable) | 1 (Failing) |
|---|-----------|-----------------|-----------------|-------------|
| F1 | **Sentence variety** | Mix of short punchy sentences and longer flowing ones. Some fragments. Feels like natural writing. | Mostly varied but a few metronomic stretches | Uniform sentence structure throughout |
| F2 | **Vocabulary naturalness** | Uses normal words a person would use in email. No "leverage", "synergy", "utilize", "holistic" | Mostly natural with 1-2 corporate words | Reads like a LinkedIn post generator |
| F3 | **Specific over general** | Every claim is specific: "20% to 60%+" not "significantly improved" | Mostly specific with 1-2 general claims | Vague throughout ("extensive experience", "proven track record") |
| F4 | **Imperfect formatting** | Not too polished — no perfect bullet points, no numbered lists in email body, feels dashed off (but is actually crafted) | Slightly over-formatted | Looks like it went through a template engine |
| F5 | **Honest gaps** | Acknowledges or doesn't hide the domain gap — frames it as an asset ("fresh eyes") or addresses it directly | Doesn't mention the gap but doesn't overclaim either | Claims domain expertise that doesn't exist |

---

## Part 3: Per-Variant Checks

Beyond the cross-cutting criteria above, each variant has specific checks:

### Primary Email
- [ ] Subject line intriguing enough to open (not clickbait)
- [ ] Body tells a mini-story: hook → bridge → artifact → ask
- [ ] Exactly one metric from fact-set.md (not a list)
- [ ] Signature: name + LinkedIn URL only (no title, no phone)

### LinkedIn Connection Request (≤300 chars)
- [ ] Hooks immediately (no "I came across your profile")
- [ ] Contains one specific reference (company challenge or artifact)
- [ ] Has a CTA or implied next step
- [ ] Does NOT start with "Hi [Name]" (wastes chars)

### LinkedIn InMail
- [ ] Different angle from primary email
- [ ] More casual tone than email
- [ ] References a different facet of the artifact or a different earned secret
- [ ] Shorter than email (100-150 words)

### Follow-Up Email
- [ ] References original email in 1 sentence max
- [ ] Adds ONE new piece of value (new insight, updated artifact, relevant news, framework)
- [ ] Under 100 words
- [ ] Subject line is "Re: [original subject]"
- [ ] Does NOT say "just following up" or "bumping this"

### Warm Intro Request
- [ ] Explains to the connector why this is a good match (not just "can you intro me")
- [ ] Forwardable blurb is ≤80 words
- [ ] Blurb contains: who Sujoy is, what he built, why it's relevant, LinkedIn link
- [ ] Connector can copy-paste without editing

---

## Part 4: Composite Scoring

### Hard Gates
- All 9 gates must PASS
- Any FAIL → outbound is blocked

### Subjective Score
- 30 criteria across 6 dimensions
- Weighted scoring:
  - Dimension A (Tone & Voice): 3x weight → 15 weighted slots
  - Dimension B (Artifact Integration): 2.5x weight → 12.5 weighted slots
  - Dimension C (Hook Quality): 2x weight → 10 weighted slots
  - Dimension D (Failure Mode Detection): 2x weight → 10 weighted slots
  - Dimension E (Multi-Channel): 1.5x weight → 7.5 weighted slots
  - Dimension F (Authenticity & Anti-Slop): 2x weight → 10 weighted slots
  - **Total weighted slots: 65**
  - **Max weighted score: 325**

### Thresholds
| Grade | Weighted Score | Requirements |
|-------|---------------|--------------|
| **Exceptional** | ≥286 (88%+) | All hard gates PASS, no individual criterion below 4 |
| **Production-ready** | ≥228 (70%+) | All hard gates PASS, no individual criterion below 3 |
| **Needs polish** | ≥182 (56%+) | All hard gates PASS, ≤3 criteria below 3 |
| **Needs rework** | <182 | Hard gate failures OR >3 criteria below 3 |

---

## Part 5: Diagnostic Output Format

```
═══════════════════════════════════════════
 OUTBOUND EVAL: {company} — {role}
═══════════════════════════════════════════

HARD GATES
──────────
  HG-01 Word Count Limits        ✅ PASS  (email: 187w, LI: 248c, InMail: 112w, FU: 89w)
  HG-02 Anti-Pattern Scan        ✅ PASS  (0 banned phrases)
  HG-03 Fact-Set Traceability    ✅ PASS  (3/3 metrics traced)
  HG-04 Specificity Swap         ✅ PASS  (swap coherence: 0.12)
  HG-05 Subject Line Check       ✅ PASS  (52 chars, no blacklist, references artifact)
  HG-06 AI Slop Detection        ✅ PASS  (0 hedge, 0 structural, 0 credential)
  HG-07 Variant Completeness     ✅ PASS  (5/5 variants)
  HG-08 CTA Presence             ✅ PASS  (5/5 specific CTAs)
  HG-09 Recipient Specificity    ✅ PASS  (Vishay Nihalani + Director PM reference)

  Gate status: ALL PASS → proceeding to subjective scoring

SUBJECTIVE SCORES
─────────────────
  A: Tone & Voice            [4.5/5.0]  ████████████████████░░  (3x weight)
  B: Artifact Integration    [4.3/5.0]  ██████████████████░░░░  (2.5x weight)
  C: Hook Quality            [4.8/5.0]  █████████████████████░  (2x weight)
  D: Failure Mode Detection  [4.2/5.0]  ██████████████████░░░░  (2x weight)
  E: Multi-Channel Strategy  [4.0/5.0]  █████████████████░░░░░  (1.5x weight)
  F: Authenticity            [4.4/5.0]  ███████████████████░░░  (2x weight)

  Weighted score: 284.1 / 325 (87.4%)
  Grade: PRODUCTION-READY (borderline Exceptional)

PER-VARIANT SCORES
──────────────────
  Primary Email        ✅ 14/14 checks pass
  LinkedIn Request     ✅ 4/4 checks pass
  LinkedIn InMail      ⚠️  3/4 (same angle as email — needs differentiation)
  Follow-Up Email      ✅ 5/5 checks pass
  Warm Intro Request   ✅ 4/4 checks pass

FLAGGED ITEMS
─────────────
  E1 Channel differentiation (3.5): InMail uses similar framing to email.
     Consider leading with the Drivership framework angle instead.
  D4 Tone test (3.5): Follow-up email second paragraph slightly over-explains
     the Duetto context. Trim to one sentence.

RECOMMENDATIONS
───────────────
  1. Differentiate InMail angle — lead with Drivership framework, not calibration
  2. Trim follow-up bridge paragraph from 2 sentences to 1
  3. Consider adding a provocative question to LinkedIn connection request
```

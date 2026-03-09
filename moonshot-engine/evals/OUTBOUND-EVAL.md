# Outbound Composer Evaluation Specification

**Purpose:** State-of-the-art eval framework for Stage 04 (Outbound Composer) outputs. Evaluates email, LinkedIn, follow-up, and warm intro messages. Programmatic hard gates + LLM-as-judge scoring.

**Philosophy:** The email is about THEIR problem, not about you. 3-4 sentences. Humble, curious, clear about what you're asking for. You're a person who's been genuinely thinking about their problem and wants to know if you're on the right track — not a salesperson pitching a deliverable.

**The bar:** Would you actually send this? If it reads like something an AI career coach would generate, it fails. If it sounds salesy, presumptuous, or over-confident, it fails. If it has em-dashes, semicolons, or "mirror-image" compound structures, it's AI. The right email sounds like you'd dash it off in 2 minutes — no polish, no pitch, just genuine curiosity and a clear ask.

**Tone north star:** "Hey, I've been thinking about your problem and have a question" — NOT "I built a thing, want to see it?"

---

## Part 1: Hard Gates (Programmatic — Binary PASS/FAIL)

All must pass before subjective scoring begins.

### HG-01: Word Count Limits
| Variant | Max Words | Check |
|---------|-----------|-------|
| Primary email body | 100 | wc -w on body (excluding subject/signature) |
| LinkedIn connection request | 300 chars | wc -c |
| LinkedIn InMail | 80 words | wc -w |
| Follow-up email | 60 words | wc -w |

- **PASS:** All variants within limits
- **FAIL:** Any variant exceeds limit

### HG-02: Anti-Pattern Scan

**Tier 1 — Instant kill (exact or close match):**
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
- "Just following up..."
- "Bumping this to the top..."
- "I'm reaching out because..."
- "As a [title] with [N] years..."
- "I'd love the opportunity to..."

**Tier 2 — Credential parade (also instant kill):**
- "I've worked on this exact problem"
- "I've solved this before"
- "I have experience in..."
- "My background in..."
- "In my current role at..."
- Any sentence matching "At [Company], I [verb]ed..." pattern
- Mentioning a previous employer by name in the email body (the artifact handles this)
- Listing a job title ("Senior Manager", "Product Manager", etc.)
- Mentioning a degree or school name

**Tier 3 — Focus violation (also instant kill):**
- More sentences about Sujoy than about the recipient's company/problem
- Any paragraph that is entirely about Sujoy's experience
- More than ONE metric from fact-set.md (zero is ideal; one max)

**Check:** Case-insensitive regex + structural analysis.
- **PASS:** Zero violations across all three tiers
- **FAIL:** Any violation

### HG-03: Fact-Set Traceability
If any metric appears, it must trace to fact-set.md. But ideally, zero metrics in the email — let the artifact carry the numbers.

**Check:** Extract numbers/percentages -> verify in fact-set.md.
- **PASS:** <=1 metric present AND it traces to fact-set.md
- **FAIL:** >1 metric OR any untraced metric

### HG-04: Specificity Swap Test
Replace company name + recipient name + company-specific references with a competitor.

**Check:** Substitute company -> competitor, product references -> competitor products. LLM rates coherence.
- **PASS:** Swapped version is clearly broken
- **FAIL:** Swapped version reads fine

### HG-05: Subject Line Check
- Under 60 characters
- Does NOT contain: "Application for", "Interested in", "Job", "Resume", "Opportunity"
- References a specific company challenge or artifact insight (not a generic topic)

**Check:** Character count + keyword blacklist + LLM judges specificity.
- **PASS:** All checks pass
- **FAIL:** Any check fails

### HG-06: AI Slop Detection — Outbound Specific

**Hedging language (zero tolerance):**
- "It's worth noting..."
- "There are several reasons..."
- "Fundamentally..."
- "At its core..."
- "In today's landscape..."
- "Moving forward..."
- "It should be noted..."

**Structural tells:**
- ANY em-dashes in primary email (em-dashes are natural in long-form artifacts; in a 4-sentence email they're an instant AI tell)
- More than 1 em-dash in any other variant
- Uses semicolons in casual email context
- Every sentence is within +/-5 words of the same length
- Email has exactly 5 paragraphs

**Salesy / presumptuous patterns (zero tolerance):**
- "Happy to share" / "Happy to walk you through" / "Happy to discuss"
- "Your actual [X]" / "Your real [X]" (presumptuous — you don't know their actual anything)
- "The fix" / "The solution" (too certain — you're asking, not telling)
- "I modeled this across your actual" (presumptuous framing)

**Over-explanation tells (catches the real failure mode):**
- Any paragraph longer than 3 sentences
- Bridge section that explains HOW something was done (should only hint WHAT was done)
- "Our biggest challenge was..." / "The key insight was..." / "What we found was..." (telling, not showing)

**Check:** Regex + structural analysis.
- **PASS:** 0 flags across all categories
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
Every variant must have a clear, specific, light call-to-action.

**Good CTAs:** "20 minutes?", "Want to see it?", "Worth a look?", "Coffee?"
**Bad CTAs:** "Let me know", "I'd love to discuss", "Would love the opportunity to chat"

**Check:** LLM identifies CTA per variant. Must be <=5 words and specific.
- **PASS:** All variants have short, specific CTAs
- **FAIL:** Missing, vague, or wordy CTA

### HG-09: Recipient Specificity
Primary email must reference the recipient by name and connect to something specific about their role/team/work.

- **PASS:** Name + at least one specific reference
- **FAIL:** Generic or no personalization

### HG-10: Focus Balance Test
The email must be about THEIR problem, not about Sujoy.

**Check:** LLM classifies each sentence as "about them" vs. "about me" vs. "neutral/artifact".
- **PASS:** >=60% of sentences are "about them" or "artifact". <=1 sentence is "about me".
- **FAIL:** >1 sentence classified as "about me" OR <50% "about them"

### HG-11: AI Detection Resistance

**Burstiness check:** Stdev of sentence lengths per variant.
- Flag: If stdev < 3.0

**Opener variety:** First words of sentences.
- Flag: If >25% start with the same word

**Transition predictability:** Generic transitions.
- Flag: If "Additionally", "Furthermore", "Moreover", "In addition" appear (zero tolerance)

**Check:** Combined analysis.
- **PASS:** <=1 sub-check flagged
- **FAIL:** >=2 sub-checks flagged

### HG-12: Writing Style Match
Sujoy's style: direct, compressed, concrete-first, peer-to-peer.

**Style markers (want PRESENT >=3 of 7):**
- Leads with observation/insight about THEIR problem, not self-introduction
- Short sentences for impact, longer only for the one key observation
- Humility/curiosity signal ("your take", "am I thinking about this right", "curious if")
- Lowercase subject line (casual, not corporate)
- Ends with a terse CTA (<=5 words)
- Total email is 3-5 sentences
- Active voice throughout

**Anti-style markers (want ABSENT — zero tolerance):**
- Any sentence starting with "I am a..."
- Any sentence longer than 35 words
- Passive voice in the CTA
- More than one paragraph about sender's experience
- Any sentence beginning "I've worked on..." / "I've solved..." / "I shipped..." / "In my role..."
- Em-dashes in email body (AI tell in short-form context)

- **PASS:** >=3 style markers, 0 anti-style markers
- **FAIL:** <2 style markers OR any anti-style marker

---

## Part 2: Subjective Criteria (LLM-as-Judge — Scored 1-5)

Minimum passing: 3.5 average, no individual score below 2.

### Dimension A: Tone & Voice (Weight: 3x)

| # | Criterion | 5 (Exceptional) | 3 (Acceptable) | 1 (Failing) |
|---|-----------|-----------------|-----------------|-------------|
| A1 | **Peer-to-peer** | Like texting a friend at another company about a problem you both find interesting | Conversational but still feels like "outreach" | Reads like a cover letter or cold email template |
| A2 | **Their problem, not my resume** | 90%+ of the email is about the company's challenge. Sujoy barely appears. The artifact does the talking. | Mostly about them but one sentence over-explains Sujoy's background | Pivots to "here's what I did" and stays there |
| A3 | **Confidence without claiming** | Shows understanding of the problem so clearly that competence is obvious without stating it | States one credential but doesn't dwell | Lists achievements or claims "I've solved this" |
| A4 | **Curiosity > credentials** | The email asks a question or makes an observation that shows genuine intellectual interest in the problem | Some interest in the problem evident | Purely transactional — wants a job, not a conversation |
| A5 | **Brevity as signal** | Says everything in 3-4 sentences. The restraint itself signals confidence — doesn't need to sell. | 5-6 sentences, slightly over-explains | 7+ sentences, feels like it needs to convince |

### Dimension B: Artifact Integration (Weight: 2.5x)

| # | Criterion | 5 (Exceptional) | 3 (Acceptable) | 1 (Failing) |
|---|-----------|-----------------|-----------------|-------------|
| B1 | **Artifact as punchline** | The email's argument leads naturally to the artifact as its logical conclusion — "I modeled this" | Artifact mentioned with purpose but transition is slightly mechanical | "BTW I built something" or "please see attached" |
| B2 | **Curiosity without spoiling** | Artifact mention makes the reader want to see it without explaining what's in it | Describes the artifact but gives too much away | Either spoils the key insight or says nothing interesting |
| B3 | **Implicit proof** | The artifact's existence proves competence — no need to explain credentials separately | Artifact partially replaces credential-stating | Artifact and credentials both stated redundantly |
| B4 | **Low-friction access** | "Happy to share" or link — doesn't attach, creates pull not push | Access method clear but slightly formal | No mention of how to see it |
| B5 | **One story, two zoom levels** | Email hook and artifact thesis are the same insight at different depths | Related but connection requires inference | Email and artifact feel like separate projects |

### Dimension C: Hook Quality (Weight: 2x)

| # | Criterion | 5 (Exceptional) | 3 (Acceptable) | 1 (Failing) |
|---|-----------|-----------------|-----------------|-------------|
| C1 | **Stop the scroll** | First sentence is surprising, specific, or raises a question the reader can't ignore | Relevant but doesn't surprise | "I'm writing to express my interest..." |
| C2 | **Recency** | References something from the last 3 months | Last 6 months | Old news or no timely reference |
| C3 | **Insight, not information** | Contains a connection or observation ("these two failures are the same problem") not just a fact | Has a point of view but it's somewhat obvious | Just states a fact |
| C4 | **About THEM** | Hook is about the recipient's specific problem, product, or team | About the company generally | About the sender |
| C5 | **Pattern interrupt** | First sentence breaks the "cold email" pattern — the reader thinks "this isn't a job seeker email" | Slightly unusual | Standard template pattern |

### Dimension D: Failure Mode Detection (Weight: 3x)

| # | Criterion | 5 (No failure) | 3 (Borderline) | 1 (Clear failure) |
|---|-----------|-----------------|-----------------|-------------|
| D1 | **Generic test** | Every sentence contains company/person-specific content. Swap names and it breaks. | 1 sentence could apply to any company | Most sentences are interchangeable |
| D2 | **Eagerness test** | Zero selling. States an observation, shares a thing, asks one question. Done. | Mostly restrained but one moment of overselling | Lists achievements, explains background, or begs for time |
| D3 | **Shoehorn test** | Artifact mention is the inevitable conclusion of the argument. Couldn't NOT mention it. | Relevant but transition is noticeable | Feels jammed in |
| D4 | **Tone test** | Sounds like a real person who happens to have built something interesting. No "applying" energy. | Mostly right but one sentence sounds like an applicant | Sounds like ChatGPT, a recruiter, or a desperate job seeker |
| D5 | **Focus test** | The email never pivots to "here's my background." The recipient's problem is the subject start to finish. | Brief pivot to experience (one sentence) that returns to their problem | Extended section about background or achievements |

### Dimension E: Multi-Channel Strategy (Weight: 1.5x)

| # | Criterion | 5 (Exceptional) | 3 (Acceptable) | 1 (Failing) |
|---|-----------|-----------------|-----------------|-------------|
| E1 | **Channel differentiation** | Each variant leads with a completely different angle or facet | Slightly different framing | Same message shortened |
| E2 | **Follow-up adds value** | New insight, new data point, new angle. Reader learns something new. | Some new value | "Just checking in" |
| E3 | **Sequence logic** | Clear rationale for channel order + timing | Sequence exists | No multi-touch thinking |
| E4 | **Warm intro quality** | Forwardable blurb needs zero editing by the connector | Needs minor edits | Too long or needs rewriting |
| E5 | **Connection request economy** | Under 300 chars, specific hook, CTA. Zero wasted words. | Specific but slightly long | Generic "love to connect" |

### Dimension F: Authenticity & Anti-Slop (Weight: 2x)

| # | Criterion | 5 (Exceptional) | 3 (Acceptable) | 1 (Failing) |
|---|-----------|-----------------|-----------------|-------------|
| F1 | **Sentence variety** | Mix of short punchy and longer flowing. Some fragments. Reads like natural writing. | Mostly varied | Uniform metronomic structure |
| F2 | **Vocabulary naturalness** | Words you'd use in a text message. No "leverage", "synergy", "utilize" | Mostly natural | LinkedIn post generator |
| F3 | **Zero vague claims** | Every claim is specific or doesn't appear at all. No "significantly improved" | 1 vague claim | Vague throughout |
| F4 | **Imperfect by design** | Feels dashed off but is actually crafted. No bullet points, no numbered lists in email. | Slightly over-formatted | Template engine output |
| F5 | **Doesn't hide the gap** | Doesn't claim domain expertise that doesn't exist. The artifact reframes the gap as fresh perspective. | Doesn't mention gap but doesn't overclaim | Claims AV/robotics experience |

---

## Part 3: Per-Variant Checks

### Primary Email
- [ ] 3-5 sentences total (not counting subject/signature)
- [ ] <=100 words
- [ ] >=60% of sentences about their problem
- [ ] <=1 sentence that references Sujoy's experience (hint, not explanation)
- [ ] Zero metrics OR exactly one metric
- [ ] No mention of job titles, company names (other than recipient's), degrees
- [ ] Signature: name + LinkedIn URL only

### LinkedIn Connection Request (<=300 chars)
- [ ] Hooks with their problem, not self-introduction
- [ ] Zero credential mentions
- [ ] CTA or implied next step
- [ ] Does NOT start with "Hi [Name]" (wastes chars)

### LinkedIn InMail (<=80 words)
- [ ] Different angle from primary email
- [ ] Different facet of the problem or different earned secret implication
- [ ] Shorter and more casual than email

### Follow-Up Email (<=60 words)
- [ ] ONE new piece of value (new insight, relevant news, updated artifact)
- [ ] References original in <=1 sentence
- [ ] Subject: "Re: [original subject]"
- [ ] Zero credential mentions

### Warm Intro Request
- [ ] Forwardable blurb <=60 words
- [ ] Blurb: who Sujoy is (one phrase), what he built (one phrase), why relevant (one phrase), LinkedIn
- [ ] Connector can copy-paste without editing

---

## Part 4: Composite Scoring

### Hard Gates
- All 12 gates must PASS
- Any FAIL -> outbound is blocked

### Subjective Score
- 30 criteria across 6 dimensions
- Weighted scoring:
  - Dimension A (Tone & Voice): 3x weight -> 15 weighted slots
  - Dimension B (Artifact Integration): 2.5x weight -> 12.5 weighted slots
  - Dimension C (Hook Quality): 2x weight -> 10 weighted slots
  - Dimension D (Failure Mode Detection): 3x weight -> 15 weighted slots
  - Dimension E (Multi-Channel): 1.5x weight -> 7.5 weighted slots
  - Dimension F (Authenticity & Anti-Slop): 2x weight -> 10 weighted slots
  - **Total weighted slots: 70**
  - **Max weighted score: 350**

### Thresholds
| Grade | Weighted Score | Requirements |
|-------|---------------|--------------|
| **Exceptional** | >=308 (88%+) | All hard gates PASS, no individual criterion below 4 |
| **Production-ready** | >=245 (70%+) | All hard gates PASS, no individual criterion below 3 |
| **Needs polish** | >=196 (56%+) | All hard gates PASS, <=3 criteria below 3 |
| **Needs rework** | <196 | Hard gate failures OR >3 criteria below 3 |

---

## Part 5: Gold Standard Reference

### PASS Example (Waymo)

**Subject:** question about waymo's calibration problem

Vishay, I've been thinking about why the school bus recall and the December blackout stalls look like opposite failures but might actually be the same one. Different contexts need different confidence thresholds, and a single dial can't do both.

I put together a model testing that idea against Waymo's 2025 incidents. Would genuinely love your take on whether I'm thinking about this right.

Coffee sometime?

Sujoy Guha
linkedin.com/in/sujguha

**Why this passes:**
- 4 sentences, ~65 words
- Humble and curious, not presumptuous
- Clear what the ask is ("your take on whether I'm thinking about this right")
- Zero em-dashes, zero semicolons, zero AI tells
- Lowercase subject line (casual, not corporate)
- Zero mention of Duetto, titles, or credentials
- "I put together a model" is humble, not "I modeled this across your actual failure modes"
- CTA is human ("Coffee sometime?" not "20 minutes?")
- Reads like a person who's been thinking, not a person who's pitching

### FAIL Example v2 (previous "fixed" version — still fails)

**Subject:** The school bus recall and the blackout are the same problem

Vishay — the December recall and the December blackout are mirror-image threshold failures. One too confident, one not enough. The root cause is the same: context-blind calibration.

I modeled this across your actual 2025 failure modes. Context-adaptive thresholds fix both — static and aggressive each break one. Happy to share.

20 minutes?

**Why this fails:**
- Em-dashes are AI tells in a 4-sentence email
- "Mirror-image threshold failures" — no human writes like this in an email
- "I modeled this across your actual" — presumptuous (you don't know their actual anything)
- "Happy to share" — salesy pitch energy
- "20 minutes?" — template cold email CTA
- "The root cause is the same: context-blind calibration" — too declarative, too certain
- Not humble or curious — reads like someone presenting findings, not asking a question
- No clear ask — what does Sujoy want from Vishay? Just "20 minutes" of what?

### FAIL Example v1 (original — catastrophic)

**Subject:** The school bus recall and the blackout are the same problem

Hi Vishay,

The December school bus recall (threshold too confident) and the December blackout stalls (threshold not confident enough) are mirror images of the same calibration failure — when should the planner act autonomously vs. defer to Fleet Response?

I've worked on this exact problem. At Duetto, I shipped a production RL engine making billions of daily pricing decisions. Our biggest challenge wasn't the model — it was calibrating when the system should decide on its own vs. defer to humans. We moved decision acceptance from 20% to 60%+ through context-dependent thresholds, not model improvements.

I built a prototype modeling the confidence calibration problem across Waymo's actual 2025 failure modes. Context-adaptive thresholds pass both the school bus test and the blackout test — the aggressive and static approaches each fail one. Happy to share.

20 minutes?

**Why this fails:**
- 137 words (over 100 limit)
- "I've worked on this exact problem" — overclaims
- Entire second paragraph is about Sujoy, not Waymo
- Mentions Duetto by name in the email
- Lists multiple metrics (billions, 20%, 60%+)
- "At Duetto, I shipped..." — classic credential parade
- Em-dashes throughout — obvious AI generation
- "Happy to share" — salesy
- Explains HOW the problem was solved instead of letting the artifact do that
- Shifts focus from their problem to sender's resume

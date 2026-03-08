# Pipeline Evaluation Criteria

**Purpose:** Grade every pipeline output across 6 stages. Each stage has ~20 eval criteria scored PASS / PARTIAL / FAIL. A pipeline run is production-ready when all stages score ≥80% PASS.

**How to use:** After generating any stage output, run through the relevant eval list below. Score each criterion, note failures, and iterate until passing.

---

## Stage 00: Role Monitor

| # | Criterion | PASS | PARTIAL | FAIL |
|---|-----------|------|---------|------|
| 1 | **Role freshness** | All roles posted within last 30 days | Some roles >30 days old | Stale roles (>60 days) |
| 2 | **URL validity** | All URLs resolve to active job postings | >80% resolve | <80% resolve or dead links |
| 3 | **Role-profile alignment** | All roles match ≥3 of Sujoy's superpowers | Most match ≥2 | Generic PM roles with no AI angle |
| 4 | **Level accuracy** | Role levels match 5+ years PM experience (Sr/Staff/Lead) | Includes 1-2 junior roles | Mostly junior roles |
| 5 | **Location match** | All roles in SF/NYC/Remote | Includes 1-2 other locations with note | Wrong geo entirely |
| 6 | **Compensation data** | Salary ranges included for ≥70% of roles | Included for ≥40% | No compensation data |
| 7 | **Team/department specified** | Team identified for every role | Team identified for >50% | No team info |
| 8 | **Dedup check** | No duplicate roles across sources | 1-2 near-duplicates flagged | Undetected duplicates |
| 9 | **Company coverage** | All target companies (OpenAI, Anthropic, Waymo) have ≥2 roles | Each has ≥1 | Missing a target company |
| 10 | **Hiring manager intel** | Hiring manager or PM leader identified for ≥50% of roles | Identified for ≥25% | No hiring manager info |
| 11 | **Role ranking** | Roles ranked by fit with clear rationale | Ranked without rationale | Unranked list |
| 12 | **Source diversity** | Roles found from ≥3 sources (careers page, LinkedIn, job boards) | ≥2 sources | Single source only |
| 13 | **JD availability** | Full JD text or link provided for each role | Summary provided | Title-only listing |
| 14 | **Preferred qualifications scan** | Notes which preferred quals Sujoy does/doesn't meet | Partial scan | No preferred qual analysis |
| 15 | **Fit score per role** | Quantified fit score (Strong/Partial/Gap counts) | Qualitative fit notes | No fit assessment |
| 16 | **Anti-pattern: generic roles** | No "Product Manager" without domain context | 1-2 generic titles | Mostly generic titles |
| 17 | **Anti-pattern: wrong domain** | No roles outside AI/ML/deep-tech | 1-2 adjacent roles noted | Healthcare PM, fintech PM etc. |
| 18 | **Update cadence recommendation** | Recommends when to re-scan (weekly, biweekly) | Mentions freshness | No re-scan guidance |
| 19 | **Network mapping** | Notes mutual connections or warm intro paths per role | Notes for ≥25% | No network mapping |
| 20 | **Action priority** | Clear "apply now" vs "monitor" vs "network first" per role | Some prioritization | Flat list |

---

## Stage 01: Company Intel

| # | Criterion | PASS | PARTIAL | FAIL |
|---|-----------|------|---------|------|
| 1 | **Recency** | All data from last 6 months with dates cited | Most data <12 months | Outdated (>12 months) |
| 2 | **Financial data** | Funding, valuation, revenue model documented | 2 of 3 present | No financial data |
| 3 | **Leadership roster** | CEO, CPO/VP Product, CTO, relevant PM leaders identified | Top 3 leaders identified | Only CEO |
| 4 | **Product landscape completeness** | All major products listed with recent launches | Core products listed | Incomplete product list |
| 5 | **Competitive positioning** | 2+ competitors analyzed with win/loss areas | 1 competitor comparison | No competitive analysis |
| 6 | **Source attribution** | All major claims have URLs or source citations | >50% sourced | Unsourced claims |
| 7 | **Culture signals** | Evidence from ≥3 sources (JDs, Glassdoor, talks, blog) | 2 sources | Single source or generic |
| 8 | **Interview process intel** | Known stages, formats, or tips from data points | Partial process info | No interview process info |
| 9 | **Tech stack/architecture** | Engineering blog, talks, or JD-derived tech details | Some tech details | No tech information |
| 10 | **Strategic direction** | Recent strategic moves with implications analyzed | News listed without analysis | No strategic analysis |
| 11 | **Sujoy-specific mapping** | Each company challenge mapped to specific Sujoy experience | 3+ mappings | Generic mappings or none |
| 12 | **Metric-backed mappings** | Sujoy-company mappings reference fact-set.md metrics | >50% reference metrics | No metrics cited |
| 13 | **Customer/user insight** | What customers say (Reddit, HN, X, reviews) | 1 source of customer voice | No customer perspective |
| 14 | **Hiring velocity** | How fast the company is hiring, which teams are growing | Team-level hiring noted | No hiring info |
| 15 | **Key people depth** | LinkedIn backgrounds, recent talks/posts for ≥3 people | Surface-level for ≥3 | Names only |
| 16 | **Gaps acknowledged** | Notes where intel is thin or uncertain | Some uncertainty flagged | Presents uncertain data as fact |
| 17 | **Anti-pattern: Wikipedia summary** | Goes beyond what's on the company's About page | Some unique insights | Reads like a Wikipedia article |
| 18 | **Anti-pattern: stale news** | No news items >6 months old presented as recent | 1-2 items borderline | Stale news presented as fresh |
| 19 | **Actionable for outbound** | Contains at least 1 detail usable as an email hook | Contains hooks | No actionable hooks |
| 20 | **Actionable for interview** | Contains at least 3 details usable in interview answers | Contains details | No interview-useful content |

---

## Stage 02: Role Analysis

| # | Criterion | PASS | PARTIAL | FAIL |
|---|-----------|------|---------|------|
| 1 | **JD keyword extraction** | Keywords categorized (technical, soft, domain, cultural, leadership) | 3+ categories | Flat keyword list |
| 2 | **Fit matrix completeness** | Every JD requirement mapped to Sujoy evidence | >80% mapped | <80% mapped |
| 3 | **Fit scoring** | Each fit scored Strong/Partial/Gap with rationale | Scored without rationale | No scoring |
| 4 | **Gap identification** | All gaps acknowledged honestly | Most gaps noted | Gaps hidden or ignored |
| 5 | **Gap mitigation** | Each gap has a specific mitigation strategy | >50% have mitigation | Gaps noted without mitigation |
| 6 | **Angle identification** | 2-3 strongest angles identified with evidence chains | 1-2 angles | No angles identified |
| 7 | **Earned secret integration** | Each angle references a specific earned secret from earned-secrets.md | >50% reference earned secrets | No earned secrets used |
| 8 | **Evidence specificity** | Every evidence point cites a specific metric from fact-set.md | >70% cite specific metrics | Generic evidence |
| 9 | **Narrative coherence** | Each angle tells a 3-sentence story (evidence → secret → insight) | Bullet points with context | Raw facts without narrative |
| 10 | **Artifact recommendation** | Specific artifact type recommended with rationale | Type recommended | No artifact recommendation |
| 11 | **Artifact thesis** | Clear thesis statement for what the artifact proves | Implied thesis | No thesis |
| 12 | **Artifact scope** | Defined scope with 3-5 concrete deliverables | Vague scope | No scope definition |
| 13 | **Resume notes** | Specific bullet rewording + keyword rotation for this role | Some tailoring notes | No resume guidance |
| 14 | **Differentiator clarity** | Clear statement of what makes Sujoy unique for THIS role | Generic differentiators | No differentiation |
| 15 | **Anti-pattern: overfitting** | Doesn't claim perfect fit where gaps exist | Minor overfitting | Claims expertise in areas with clear gaps |
| 16 | **Anti-pattern: generic angles** | Angles couldn't work for any other candidate | 1 angle is somewhat generic | All angles are generic "I'm a great PM" |
| 17 | **Specificity test** | Replace company name with "Acme Corp" — breaks the analysis | Partially breaks | Still makes sense |
| 18 | **Staff+ readiness** | Analysis would hold up if questioned by a staff-level interviewer | Minor gaps | Would crumble under scrutiny |
| 19 | **Claims audit** | Every metric verified against fact-set.md | >90% verified | Unverified or invented metrics |
| 20 | **Actionable handoff** | Analysis provides everything needed to start artifact + outbound | Minor gaps in handoff | Analysis sits alone, not connected to next stages |

---

## Stage 03: Artifact Engine

| # | Criterion | PASS | PARTIAL | FAIL |
|---|-----------|------|---------|------|
| 1 | **Code runs** | `python src/main.py` (or equivalent) executes without errors | Runs with minor warnings | Crashes or import errors |
| 2 | **Output meaningful** | Output tells a clear, interpretable story | Output is data without narrative | Output is noise or empty |
| 3 | **README complete** | README explains what, why, how to run, and connection to experience | Explains most sections | Missing or minimal README |
| 4 | **Architecture doc** | architecture.md with design decisions, trade-offs, scaling notes | Some architecture notes | No architecture documentation |
| 5 | **Forward test** | A hiring manager would forward to their team with "check this out" | Might share in a conversation | Would not forward |
| 6 | **Specificity test** | Artifact only makes sense for THIS company/role | Mostly specific | Generic demo with company name swapped in |
| 7 | **Earned secret embedded** | Core earned secret is demonstrated, not just mentioned | Secret referenced but not demonstrated | No earned secret connection |
| 8 | **Technical credibility** | Would pass scrutiny from a senior engineer on the team | Minor technical gaps | Fundamentally flawed |
| 9 | **Narrative woven in** | Code comments and README connect to Sujoy's experience naturally | Connection feels forced | No connection to experience |
| 10 | **Complexity appropriate** | Not too simple (toy demo) and not too complex (hard to follow) | Slightly over/under | Way too simple or incomprehensible |
| 11 | **Results support thesis** | Output data directly supports the artifact's thesis | Partially supports | Results contradict thesis |
| 12 | **Explainability layer** | Decisions include reasoning traces or annotations | Some explainability | Black box output |
| 13 | **Production thinking** | "What I'd do differently at scale" section | Mentions scale briefly | No production considerations |
| 14 | **Code quality** | Clean, well-organized, typed where appropriate | Readable but messy | Spaghetti code |
| 15 | **Dependencies minimal** | Only standard/common libraries (numpy, gymnasium, etc.) | 1-2 unusual deps | Heavy/niche dependencies |
| 16 | **Comparison structure** | Multiple approaches compared (not just one solution) | Implicit comparison | Single approach only |
| 17 | **Visual/tabular output** | Results presented in tables, charts, or formatted output | Some formatting | Raw numbers dumped |
| 18 | **Anti-pattern: over-engineering** | Focused on demonstrating the insight, not showing off code | Slightly over-engineered | Framework-level code for a demo |
| 19 | **Anti-pattern: tutorial style** | Original thinking, not a tutorial walkthrough | Some tutorial elements | Reads like a course project |
| 20 | **Conversation starter** | Artifact raises questions the interviewer would want to discuss | Somewhat interesting | Dead end, no follow-up questions |

---

## Stage 04: Outbound Composer

| # | Criterion | PASS | PARTIAL | FAIL |
|---|-----------|------|---------|------|
| 1 | **Word count** | Primary email ≤200 words | ≤250 words | >250 words |
| 2 | **Hook in first line** | First sentence is a specific insight or artifact reference | First sentence is relevant but generic | First sentence is "I'm excited to apply" |
| 3 | **No credential parade** | Does NOT list degrees, years of experience, or company names in first paragraph | Minor credential mention | Opens with resume summary |
| 4 | **Artifact integration** | References the artifact naturally, not as "please see attached" | Mentions artifact | No artifact reference |
| 5 | **Company-specific hook** | References a specific recent event, product, or challenge | References general company direction | Generic company flattery |
| 6 | **CTA clarity** | Clear, specific ask (20 min call, share repo, etc.) | Vague CTA | No CTA or "let me know" |
| 7 | **Tone: confident, not desperate** | Reads as peer-to-peer, not job seeker to gatekeeper | Mostly confident | Desperate or obsequious |
| 8 | **Tone: human, not AI** | Reads like a real person wrote it | Slightly polished | Obvious AI-generated phrasing |
| 9 | **Anti-pattern scan** | None of: "passionate about", "unique combination", "at your convenience", "I believe I would be a great fit" | 1 borderline phrase | Multiple banned phrases |
| 10 | **Specificity test** | Email only makes sense for this company + role + recipient | Mostly specific | Swap company name, still works |
| 11 | **Earned secret tease** | Hints at a non-obvious insight without giving everything away | Mentions insight area | No insight teased |
| 12 | **LinkedIn connection request** | ≤300 chars, specific, not generic | Specific but long | Generic connection request |
| 13 | **LinkedIn InMail** | Shorter than email, different angle, clear ask | Same as email shortened | No InMail variant |
| 14 | **Follow-up email** | Adds new value (new insight, new artifact angle), not just "checking in" | Some new value | "Just following up" |
| 15 | **Warm intro request** | Forwardable blurb provided, specific ask to connector | Blurb provided | No warm intro template |
| 16 | **Recipient research** | Email references something specific about the recipient (talk, post, background) | Generic to anyone in the role | No recipient personalization |
| 17 | **Subject line** | Specific, intriguing, under 60 chars | Relevant but generic | "Job Application" or "Introduction" |
| 18 | **Mobile readable** | Short paragraphs, no walls of text, scannable in 10 seconds | Mostly scannable | Dense paragraphs |
| 19 | **Risk check** | Nothing that could be perceived as arrogant, presumptuous, or tone-deaf | Minor tone risk | Clearly off-putting |
| 20 | **Multi-channel coherence** | Email, LinkedIn, InMail tell different facets of the same story | Slight redundancy | Same message copy-pasted across channels |

---

## Stage 05: Interview Prep

| # | Criterion | PASS | PARTIAL | FAIL |
|---|-----------|------|---------|------|
| 1 | **Question count** | ≥15 predicted questions | 10-14 questions | <10 questions |
| 2 | **Question category coverage** | Product sense, behavioral, technical, strategy all represented | 3 of 4 categories | ≤2 categories |
| 3 | **Company-specific questions** | ≥5 questions reference specific company product/challenge | 3-4 company-specific | All generic PM questions |
| 4 | **Story bank mapping** | Each behavioral question mapped to a specific story with metrics | >50% mapped | Stories listed without mapping |
| 5 | **Earned secret in answers** | ≥3 answers lead with an earned secret as the punchline | 1-2 earned secret answers | No earned secrets in answers |
| 6 | **Metric precision** | Every metric in answers matches fact-set.md | >80% match | Invented or rounded metrics |
| 7 | **STAR format** | Behavioral answers follow Situation-Task-Action-Result | Most follow structure | Unstructured answers |
| 8 | **Differentiator weaving** | Answers highlight what makes Sujoy unique (not generic PM answers) | Some differentiation | Could be any PM's answers |
| 9 | **Interviewer intelligence** | Background, interests, recent posts for ≥2 likely interviewers | 1 interviewer profiled | No interviewer intel |
| 10 | **Interviewer rapport hooks** | Specific rapport-building points per interviewer (shared interests, backgrounds) | Generic hooks | No rapport strategy |
| 11 | **Artifact walkthrough prep** | Script for presenting the artifact in 5-10 minutes | Outline provided | No artifact presentation prep |
| 12 | **Objection handling** | Prepared responses for likely objections (domain gap, level, etc.) | 1-2 objections addressed | No objection prep |
| 13 | **"Why this company" answer** | Specific, authentic, references company intel | Somewhat specific | Generic "I love your mission" |
| 14 | **"Why this role" answer** | Maps specific experience to specific role requirements | Partially mapped | "I'm passionate about PM" |
| 15 | **Technical depth readiness** | Can go 2-3 levels deep on RL, ML, or domain technical topics | 1-2 levels deep | Surface-level only |
| 16 | **Product case framework** | Clear framework for product sense questions specific to this company's domain | Generic PM framework | No framework |
| 17 | **Question bank for interviewer** | 3-5 specific questions Sujoy should ask the interviewer | Generic questions | No questions prepared |
| 18 | **Anti-pattern: rehearsed** | Answers sound natural, not scripted | Slightly scripted | Obviously memorized |
| 19 | **Anti-pattern: humble brag** | Achievements stated as facts, not false modesty | Minor humble bragging | "I don't want to brag but..." |
| 20 | **Mock interview readiness** | Prep is structured enough to run a mock interview from it | Could run partial mock | Not structured for practice |

---

## Cross-Stage Evals (Apply to Every Stage)

| # | Criterion | PASS | PARTIAL | FAIL |
|---|-----------|------|---------|------|
| 1 | **Claims audit** | Every metric traced to fact-set.md | >90% traced | Invented numbers |
| 2 | **Specificity test** | Output breaks if you swap company name | Partially breaks | Still works with any company |
| 3 | **Earned secret depth** | Earned secrets add genuine insight, not just name-dropped | Some depth | Name-dropped only |
| 4 | **Narrative consistency** | Same story told consistently across all stages | Minor inconsistencies | Contradictory claims |
| 5 | **Forward test** | Would a hiring manager/recruiter forward this? | Maybe share verbally | Would not share |

---

## Scoring Guide

**Per stage:** Count PASS, PARTIAL, FAIL across 20 criteria.
- **Production-ready:** ≥16 PASS, 0 FAIL
- **Needs polish:** ≥12 PASS, ≤2 FAIL
- **Needs rework:** <12 PASS or >2 FAIL

**Per pipeline run:** All 6 stages must be "Production-ready" or "Needs polish" to ship.

**How to iterate:**
1. Run evals after generating each stage
2. Fix all FAILs immediately
3. Attempt to upgrade PARTIALs to PASS
4. Re-run evals to confirm fixes
5. Move to next stage only when current stage is ≥"Needs polish"

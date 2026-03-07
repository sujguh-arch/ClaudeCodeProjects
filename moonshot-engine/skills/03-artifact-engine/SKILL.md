---
name: artifact-engine
description: Generates deep work artifacts (technical prototypes, strategy memos, case studies, hybrids) tailored to a target company and role. The core differentiator of the Moonshot Engine. Use after both company intel and role analysis are complete.
---

# Artifact Engine Skill

## Purpose
Generate deep work artifacts that go beyond prototypes. The core differentiator of the Moonshot Engine. Every artifact must pass the test: **"Would a hiring manager at this company forward this to their team?"**

Key insight from The Skip article: "Prototypes are table stakes. AI tools have made it possible for anyone to spin one up in 30 minutes. The differentiator is what's behind the prototype."

## How to Run
User says: "Generate artifact for [company] [role]"
Requires: `targets/{company}/intel.md` and `targets/{company}/role-analysis.md` must exist.

## Process

### Step 1: Read Inputs
Load and synthesize:
- `targets/{company}/intel.md` — Company challenges, product landscape, competitive dynamics
- `targets/{company}/role-analysis.md` — Artifact recommendation, strongest angles, gaps
- `references/profile.md` — Sujoy's narrative and superpowers
- `references/earned-secrets.md` — Non-obvious insights to weave in
- `references/fact-set.md` — Validated metrics for any claims

### Step 2: Select Artifact Type
Read the recommendation from role-analysis.md. Confirm or override based on:
- Is there a specific company problem surfaced in intel that demands a particular artifact type?
- Does the role's interview process favor one type? (e.g., take-home → prototype, case interview → strategy memo)

### Step 3: Generate Artifact

#### Type A: Technical Prototype
**What to build:** A working code artifact that demonstrates technical competence mapped to the company's domain.

**Structure:**
```
targets/{company}/artifact/
├── README.md              # Overview, motivation, how to run
├── src/                   # Working code
├── docs/
│   ├── architecture.md    # Architecture rationale + trade-off analysis
│   ├── scaling.md         # How this would scale in production
│   └── cost-model.md      # Estimated costs at company's scale
└── demo/                  # Screenshots, GIFs, or hosted demo link
```

**Depth requirements (what makes it more than a prototype):**
- **Architecture rationale:** Why this design, what alternatives were considered, what trade-offs were made
- **Scaling analysis:** How this would work at the company's scale (cite specific numbers from intel)
- **Cost model:** What this would cost to run in production
- **Connection to experience:** Reference how Sujoy solved a similar problem differently at Duetto/C1/JPMC

**Example artifacts by company:**
- **OpenAI:** Agentic pricing optimizer using OpenAI's API — demonstrates production agentic AI patterns with explainability layer. Connects to Duetto's pricing acceptance improvement.
- **Anthropic:** AI trust/explainability framework — a working system that surfaces reasoning chains for autonomous decisions. Connects to Duetto's 20%→60%+ acceptance.
- **Waymo:** RL-based optimization system with the "optimizer over pretrained model" pattern. Demonstrates production RL deployment strategy.

#### Type B: Strategy Memo
**What to build:** A company-specific strategic analysis that demonstrates product thinking + technical depth.

**Structure:**
```
targets/{company}/artifact/
├── memo.md                # The strategy document
├── appendix/
│   ├── market-analysis.md # Supporting data
│   ├── technical-spec.md  # Technical feasibility assessment
│   └── prototype/         # Optional: working code that proves a key point
└── executive-summary.md   # 1-page version for email attachment
```

**Depth requirements:**
- **Specific to this company** — Must reference their actual products, challenges, competitive dynamics
- **Informed by earned secrets** — Weave in non-obvious insights from Sujoy's experience
- **Actionable** — Not just analysis. Include a concrete implementation roadmap.
- **Technically grounded** — Include technical specifics that show this wasn't written by someone who's never shipped

#### Type C: Case Study Synthesis
**What to build:** A transferable framework from Sujoy's experience mapped to the target company's challenge.

**Structure:**
```
targets/{company}/artifact/
├── case-study.md          # The full case study
├── framework.md           # The extracted, transferable framework
└── application.md         # How the framework applies to [company]'s specific challenge
```

**Depth requirements:**
- **Real numbers** — All metrics from fact-set.md only
- **Transferable framework** — Not "I did this at Duetto." Instead: "Here's the framework I developed, validated across 3 companies, and how it applies to your specific challenge."
- **Honest about context differences** — Acknowledge where the analogy breaks down

#### Type D: Hybrid
Combine any two of the above. Most common: Strategy Memo + Working Prototype.

The prototype IS the evidence for the strategy. "Here's what I think you should build, and here's a working version of the core idea."

### Step 4: Quality Checks

Before finalizing, verify:
- [ ] **Specificity test:** Could this artifact only be about this company? (If you could swap company names, it fails.)
- [ ] **Earned secret test:** Does it contain at least 1 insight from earned-secrets.md?
- [ ] **Staff+ test:** Would this hold up in a staff-level product or technical interview?
- [ ] **Forward test:** Would the hiring manager forward this to their team?
- [ ] **Claims test:** Every metric references fact-set.md. No invented numbers.
- [ ] **Code test (if prototype):** Does it actually run? Is it clean, well-documented?

### Step 5: Output
All artifacts go to `targets/{company}/artifact/`.
The artifact README.md should be self-contained — someone should be able to understand the artifact without any other context.

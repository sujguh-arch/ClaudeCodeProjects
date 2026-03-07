---
name: role-analysis
description: Parses job descriptions and produces fit analysis with gap assessment, angle identification, artifact type recommendation, and resume tailoring notes. Use after company intel is generated.
---

# Role Analysis Skill

## Purpose
Given a job description (pasted text or URL), produce a comprehensive fit analysis that identifies the strongest angles, honest gaps, and recommends the artifact type. This skill bridges company intel and artifact generation.

## How to Run
User says: "Analyze this role: [paste JD or URL]"
Requires: `targets/{company}/intel.md` should exist (run company intel first).

## Process

### Step 1: Extract Keywords from JD
Reuse the proven methodology from `resume-tailored/SKILL.md` Step 1:
- **Must-have technical keywords** (AI/ML, LLM, RL, NLP, specific frameworks)
- **Soft/user-centric keywords** (user empathy, intuitive, trust, collaboration)
- **Domain keywords** (industry, use cases, customer types)
- **Cultural/stage keywords** (0-to-1, ambiguity, early-stage, bias for action)
- **Leadership keywords** (cross-functional, vision, strategy, mentoring)

### Step 2: Gap Analysis
Create a honest, two-column assessment:

| JD Requirement | Sujoy's Evidence | Strength |
|---|---|---|
| [requirement] | [specific fact from fact-set.md or "GAP"] | Strong / Partial / Gap |

**Rules:**
- Every "Strong" claim MUST reference a specific fact from `references/fact-set.md`
- "Partial" means related experience but not exact match — explain the bridge
- "Gap" is honest — flag it, then suggest how to address it (learning plan, transferable skill, or artifact that demonstrates capability)
- Count: Strong / Partial / Gap ratio. If Gaps > 30% of requirements, flag role as a stretch.

### Step 3: Angle Identification
Based on the gap analysis, identify the **2-3 strongest angles** to lead with:

For each angle:
- **The angle:** 1 sentence
- **The evidence:** Specific fact(s) from fact-set
- **The earned secret:** Which insight from `earned-secrets.md` makes this angle uniquely compelling
- **The narrative:** How to frame this in outbound + interview

### Step 4: Artifact Recommendation
Based on role type + company challenges + strongest angles, recommend the artifact:

**Decision matrix:**

| Signal | → Artifact Type |
|---|---|
| Role is hands-on (IC, engineering, solutions) | Technical prototype |
| Role is strategic (PM lead, strategy, director) | Strategy memo + prototype |
| Role emphasizes customer impact / case studies | Case study synthesis |
| Role is ambiguous or new function | Hybrid (strategy + working code) |
| Company is in "prove it" mode (startup, new team) | Technical prototype (bias toward action) |
| Company values thought leadership | Strategy memo |

Output:
- **Primary recommendation:** [artifact type] with rationale
- **Artifact thesis:** 1-sentence description of what the artifact should demonstrate
- **Artifact scope:** What to build (specific enough to start immediately)

### Step 5: Resume Tailoring Notes
Generate notes that feed directly into the `resume-tailored` skill:
- Title to use (match JD exactly)
- Which bullets to lead with per role
- Keywords to weave in
- Header italic line reframing suggestions
- Skills line rotation

### Step 6: Output
Write to `targets/{company}/role-analysis.md`:

```markdown
# Role Analysis: [Role Title] at [Company]
**Generated:** [date]
**JD Source:** [URL or "pasted"]

## JD Keywords
[categorized keyword lists]

## Fit Assessment
[the gap analysis table]
**Fit Score:** [X Strong / Y Partial / Z Gap]

## Strongest Angles
### Angle 1: [name]
[evidence + earned secret + narrative]

### Angle 2: [name]
[evidence + earned secret + narrative]

### Angle 3: [name]
[evidence + earned secret + narrative]

## Artifact Recommendation
**Type:** [recommendation]
**Thesis:** [what it should demonstrate]
**Scope:** [what to build]

## Resume Notes
[tailoring instructions for resume-tailored skill]

## Gaps to Address
[honest gap list with mitigation strategies]
```

---
name: company-intel
description: Produces deep, structured intelligence reports on target companies including product landscape, competitive dynamics, culture signals, and Sujoy-specific opportunity mapping. Use before role analysis or artifact generation.
---

# Company Intelligence Skill

## Purpose
Produce a deep, structured intelligence report on a target company. This is the foundation that feeds into role analysis, artifact generation, and outbound messaging. The report must surface information that only someone who genuinely researched the company would know — not generic Wikipedia-level facts.

## How to Run
User says: "Run company intel for [company]" or provides a company name.

## Process

### Step 1: Company Overview
Research and document:
- **Mission & stage** — What they're building, funding stage, last round, valuation
- **Headcount & growth** — Current size, hiring velocity, recent layoffs or expansions
- **Key leadership** — CEO, CPO, CTO, VP Eng, relevant team leads
- **Revenue model** — How they make money (API, enterprise contracts, consumer, etc.)

### Step 2: Product Landscape
- **Core products** — What they ship, who uses it, pricing tiers
- **Tech stack & architecture bets** — What they've publicly discussed (blog posts, talks, papers)
- **Recent launches** — Products or features shipped in the last 6 months
- **Product gaps** — What customers complain about (Reddit, HN, X, G2, trust pilot)
- **Open-source contributions** — Repos, models released, research papers

### Step 3: Competitive Dynamics
- **Direct competitors** — Who they compete with head-to-head
- **Competitive advantages** — Where they're winning and why
- **Competitive weaknesses** — Where they're losing (honest assessment)
- **Market positioning** — How they differentiate in their own messaging vs. reality

### Step 4: Recent News & Strategic Moves (Last 6 Months)
Search for:
- `[company] news [current year]`
- `[company] announcement [last 3 months]`
- `[company] blog [last 6 months]`
- `[company] funding OR acquisition OR partnership [last 6 months]`

Document:
- Key announcements, partnerships, product launches
- Leadership changes
- Strategic pivots or new directions
- Regulatory or policy developments affecting them

### Step 5: Culture Signals
- **From job postings** — What language do they use? (e.g., "high agency", "mission-driven", "move fast")
- **From Glassdoor/Blind** — Top 3 positive and negative themes
- **From leadership talks** — What do their leaders emphasize in podcasts, blog posts, conferences?
- **Interview process** — What's their known interview style? (take-home, system design, behavioral, whiteboard)

### Step 6: Sujoy-Specific Opportunity Mapping
This is the unique section. Map Sujoy's experience to the company's specific challenges:

| Company Challenge | Sujoy's Relevant Experience | Earned Secret That Applies |
|---|---|---|
| [challenge from research] | [specific fact from fact-set.md] | [insight from earned-secrets.md] |

Identify:
- **2-3 problems this company has that Sujoy has already solved** (in a different domain)
- **The strongest narrative angle** — What story ties Sujoy's experience to this company's mission?
- **The "so what"** — Why should this company care about Sujoy specifically vs. any other strong PM?

### Step 7: Key People
For each relevant team/function:
- **Hiring managers** — Name, title, LinkedIn, recent posts/talks
- **Team leads** — Who runs the team this role reports into
- **Potential warm connections** — Check for Berkeley, Stanford, JPMC, C1, Duetto, Wayfair alumni
- **Recruiters** — Who's posting the roles, recruiter LinkedIn profiles

## Output Format
Write to `targets/{company}/intel.md`:

```markdown
# Company Intelligence: [Company]
**Generated:** [date]
**Confidence:** [High/Medium — based on data freshness and source quality]

## Overview
[2-3 paragraph summary]

## Product Landscape
[structured findings]

## Competitive Dynamics
[structured findings]

## Recent News & Strategic Moves
[bullet list with dates]

## Culture & Interview Signals
[structured findings]

## Sujoy-Specific Opportunity Map
[the mapping table + narrative]

## Key People
[structured contact list]

## Sources
[URLs of all sources consulted]
```

## Quality Check
Before finalizing, verify:
- [ ] At least 5 distinct, recent sources cited
- [ ] Opportunity mapping references specific facts from `fact-set.md`
- [ ] Key people section has at least 2 named individuals with LinkedIn profiles
- [ ] The "so what" is specific enough that it couldn't apply to any other PM candidate

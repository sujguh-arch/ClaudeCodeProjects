---
name: role-monitor
description: Scans target company career pages for roles matching Sujoy's profile. Produces prioritized role lists with relevance scoring and hiring manager identification. Use when checking for new opportunities or refreshing the pipeline.
---

# Role Monitor Skill

## Purpose
Scan target company career pages for roles matching Sujoy Guha's profile. Produce a prioritized list of opportunities with relevance scoring and key contact identification.

## Target Companies
- **OpenAI** — https://openai.com/careers
- **Anthropic** — https://www.anthropic.com/careers
- **Waymo** — https://waymo.com/careers

## How to Run
User says: "Check for new roles at [company]" or "Scan all targets"

## Process

### Step 1: Fetch Career Pages
For each target company:
1. Web search: `[company] careers open roles [current month] [current year]`
2. Fetch the careers page and extract all open positions
3. Also search: `[company] [role type] job posting site:linkedin.com OR site:lever.co OR site:greenhouse.io`

### Step 2: Filter for Relevance
Match roles against Sujoy's profile using these keywords (from `references/fact-set.md`):

**High relevance keywords** (match 3+ = high priority):
- Product Management, Product Manager, PM
- AI, ML, Machine Learning, Reinforcement Learning
- Platform, Infrastructure, Systems
- Enterprise, B2B, Solutions
- Strategy, Growth, Revenue
- Agentic, Autonomous, Decision Systems
- Pricing, Optimization, Recommendations

**Adjacent role types** (still relevant):
- Solutions Engineer, Solutions Architect
- AI Success, Customer Engineering
- Technical Program Manager
- Product Strategy, Business Strategy
- Applied Research (product-facing)

**Filter out:**
- Pure research roles requiring PhD
- Junior/entry-level roles
- Roles requiring 10+ years in a specific niche Sujoy hasn't touched (e.g., security, infra SRE)

### Step 3: Score & Prioritize
For each matching role, assign:
- **Relevance**: High / Medium / Low (based on keyword overlap + role level)
- **Angle match**: Which of Sujoy's superpowers maps best (RL, agentic AI, enterprise adoption, 0-to-1, P&L)
- **Recommended artifact type**: Technical prototype / Strategy memo / Case study / Hybrid

### Step 4: Identify Key Contacts
For each high-relevance role:
1. Search LinkedIn: `[hiring manager title] [team name] [company] site:linkedin.com`
2. Check the job posting for recruiter name/email
3. Search for team leads who've posted about the role on LinkedIn/X
4. Note any mutual connections or warm paths

### Step 5: Output
Write results to `targets/{company}/open-roles.md` in this format:

```markdown
# Open Roles — [Company]
**Last scanned:** [date]

## High Priority

### [Role Title]
- **URL:** [link]
- **Team:** [department/team]
- **Posted:** [date if available]
- **Relevance:** High
- **Why it fits:** [1-2 sentences mapping to Sujoy's experience]
- **Strongest angle:** [which superpower to lead with]
- **Recommended artifact:** [type]
- **Key contacts:**
  - Hiring Manager: [name, title, LinkedIn URL if found]
  - Recruiter: [name, email if found]
  - Warm paths: [mutual connections if any]

## Medium Priority
[same format]
```

## Refresh Cadence
- Run weekly or on-demand
- Flag new roles since last scan with [NEW] tag
- Remove roles that have been taken down

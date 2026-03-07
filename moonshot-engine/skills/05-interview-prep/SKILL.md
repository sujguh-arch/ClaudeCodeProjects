---
name: interview-prep
description: Prepares company-specific interview packages with predicted questions, story bank mapping, mock interview scoring, and post-interview debriefs. Supports pre-interview prep, mock interview, and debrief modes. Use when an interview is scheduled or to build confidence before applying.
---

# Interview Prep Skill

## Purpose
Prepare Sujoy for company-specific interviews using insights from the Moonshot Engine pipeline. Inspired by Noam Segal's [AI Interview Coach](https://www.lennysnewsletter.com/p/how-to-use-ai-in-your-next-job-interview) and the strategies from ["Three Job Searches, Three AI Roles: What Actually Worked"](https://theskip.substack.com/p/three-job-searches-three-ai-roles).

Key insight from Janie Lee (VP Product, Abridge): "Go deep or go home — depth of effort signals day-one operational approach."

## How to Run
User says: "Prep me for [company] interview" or "Run mock interview for [company] [role]"
Requires: `targets/{company}/intel.md` and `targets/{company}/role-analysis.md` should exist (but can run standalone with a JD).

## Modes

### Mode 1: Pre-Interview Prep
Generates a comprehensive prep package.

### Mode 2: Mock Interview
Interactive mock interview with scoring.

### Mode 3: Post-Interview Debrief
Analyzes what went well/poorly after an interview.

---

## Mode 1: Pre-Interview Prep

### Step 1: Company Research Brief
Pull from `targets/{company}/intel.md`:
- Company mission, recent news, competitive position
- Culture signals and what they value in candidates
- Known interview format and style

### Step 2: Predicted Questions
Generate 15-20 predicted questions in categories:

**Product sense (5-6 questions):**
- Based on company's actual product challenges from intel
- "How would you approach [specific product challenge from intel]?"
- "Design a solution for [problem surfaced in competitive analysis]"

**Behavioral (5-6 questions):**
- Based on JD keywords and culture signals
- Map each to a specific Sujoy story from fact-set.md
- Include the "earned secret" version — the non-obvious twist

**Technical (3-4 questions):**
- Based on tech stack and architecture from intel
- RL, agentic AI, ML infrastructure, system design
- Calibrated to the role level

**Leadership & strategy (3-4 questions):**
- Vision setting, team building, stakeholder management
- 0-to-1 vs. scale decisions
- Cross-functional alignment

### Step 3: Story Bank
Map Sujoy's experiences to likely questions:

| Question Theme | Best Story | Source (fact-set) | Earned Secret Twist |
|---|---|---|---|
| [theme] | [story summary] | [specific metrics] | [insight from earned-secrets.md] |

**Story selection rules:**
- Each story should be usable for 2-3 different question types
- Never use the same story for more than 3 questions
- Lead with the most impressive metric, but save the earned secret for depth
- Every story must have: Situation (brief), Action (specific), Result (quantified), Insight (the "so what")

### Step 4: Interviewer Intelligence
For each known interviewer:
- Name, title, background (from LinkedIn)
- Likely focus areas based on their role
- Recent talks, posts, or papers they've published
- Rapport hooks: shared interests, alma mater, former companies

### Step 5: Differentiation Coaching
What makes Sujoy different from other candidates who will also prep with AI:
- **Earned secrets** — Insights that can't be googled
- **Specific numbers** — Real metrics, not vague claims
- **The pivot stories** — Moments where he challenged the plan and was right
- **The artifact** — He already built something for this company

### Output
Write to `targets/{company}/interview-prep.md`

---

## Mode 2: Mock Interview

### Setup
1. Ask Sujoy which interview type: Product, Behavioral, Technical, or Mixed
2. Select 4-6 questions from the predicted questions
3. Set the tone: supportive, challenging, or adversarial

### During Mock
For each question:
1. Present the question
2. Let Sujoy answer (free-form text)
3. Score the answer on 5 dimensions (1-5 scale):
   - **Substance:** Did it answer the actual question with concrete evidence?
   - **Structure:** Was it organized (STAR, or clear framework)?
   - **Relevance:** Did it connect to this company's specific context?
   - **Credibility:** Were claims specific and believable?
   - **Differentiation:** Did it contain something only Sujoy could say?
4. Provide feedback:
   - What worked
   - What to change
   - If score < 3 on any dimension: provide a rewritten version at 4-5 quality

### After Mock
- Overall score summary
- Top 3 strengths demonstrated
- Top 3 areas to improve
- Updated story bank recommendations

---

## Mode 3: Post-Interview Debrief

### Input
Sujoy shares: What questions were asked, how he answered, what felt strong/weak.

### Analysis
1. Score each recalled answer on the 5 dimensions
2. Identify patterns: Are certain dimensions consistently weak?
3. Compare self-assessment to likely interviewer perception
4. Generate a "what to do differently" list for next rounds

### If Rejected
- Analyze likely rejection reasons based on the interview
- Identify which gaps to close
- Recommend whether to reapply and when
- Update story bank with learnings

"""
LLM-as-judge prompts for subjective evaluation of artifacts and outbound messages.
Returns structured scoring prompts that can be sent to any Claude/OpenAI API.
"""

from dataclasses import dataclass


@dataclass
class JudgePrompt:
    dimension: str
    weight: float
    system_prompt: str
    user_prompt_template: str
    criteria: list[dict]


# ─────────────────────────────────────────────
# ARTIFACT JUDGE PROMPTS
# ─────────────────────────────────────────────

ARTIFACT_SYSTEM_PROMPT = """You are an expert evaluator for job search artifacts — deep work outputs (prototypes, strategy memos, case studies) created to demonstrate competence to a target company.

You evaluate from the perspective of a Staff+ PM or senior hiring manager at the target company. Your job is to score each criterion on a 1-5 scale with a 1-sentence justification.

Scoring calibration:
- 5: Exceptional — this would make a hiring manager stop and forward to their team
- 4: Strong — clearly above average, shows genuine depth
- 3: Acceptable — meets the bar but doesn't stand out
- 2: Below average — noticeable weakness that undermines credibility
- 1: Failing — would hurt the candidate's chances

Be harsh but fair. A 3 should be the true median, not a polite failure. Reserve 5 for genuinely exceptional work.

IMPORTANT: You are checking for AUTHENTICITY. AI-generated content that sounds impressive but lacks genuine insight should score low. The key question is: "Could someone who hasn't lived through these experiences have written this?"

Output format — respond with ONLY valid JSON:
{
  "dimension": "<dimension name>",
  "scores": [
    {"id": "<criterion id>", "score": <1-5>, "justification": "<1 sentence>"},
    ...
  ],
  "dimension_average": <float>
}"""


def artifact_judge_prompts(
    artifact_text: str,
    fact_set: str,
    earned_secrets: str,
    company_intel: str,
    role_analysis: str,
) -> list[JudgePrompt]:
    """Generate all LLM judge prompts for artifact evaluation."""

    context_block = f"""
## Reference Materials

### Fact Set (validated metrics — all claims must come from here)
{fact_set}

### Earned Secrets (non-obvious insights from lived experience)
{earned_secrets}

### Company Intel
{company_intel}

### Role Analysis
{role_analysis}

---

## Artifact Under Evaluation
{artifact_text}
"""

    prompts = []

    # Dimension A: Earned Secret Depth (3x weight)
    prompts.append(JudgePrompt(
        dimension="A: Earned Secret Depth",
        weight=3.0,
        system_prompt=ARTIFACT_SYSTEM_PROMPT,
        user_prompt_template=f"""Score the following artifact on Earned Secret Depth.

The earned secrets from this candidate's experience are provided in the reference materials. Evaluate whether the artifact uses these secrets as load-bearing structural elements — not just decorative mentions.

Criteria:
- A1: Secret as thesis — Is an earned secret THE thesis of the artifact? Remove it and the artifact collapses (5) vs. absent/decorative (1)
- A2: Non-obvious insight — Would a reader say "I never thought of it that way" (5) vs. consensus wisdom repackaged (1)
- A3: Experience-grounded — Specific details (what went wrong, the pivot moment, before/after) proving lived experience (5) vs. could have been written from reading about it (1)
- A4: Transferability demonstrated — Shows exactly how the secret applies to target company's specific problem with concrete mapping (5) vs. states "this is transferable" without showing how (1)
- A5: Scar tissue visible — Includes what went wrong and what was learned the hard way (5) vs. all wins, no learning (1)

{context_block}""",
        criteria=[
            {"id": "A1", "name": "Secret as thesis"},
            {"id": "A2", "name": "Non-obvious insight"},
            {"id": "A3", "name": "Experience-grounded"},
            {"id": "A4", "name": "Transferability demonstrated"},
            {"id": "A5", "name": "Scar tissue visible"},
        ]
    ))

    # Dimension B: Business Insight (2x weight)
    prompts.append(JudgePrompt(
        dimension="B: Business Insight",
        weight=2.0,
        system_prompt=ARTIFACT_SYSTEM_PROMPT,
        user_prompt_template=f"""Score the following artifact on Business Insight.

Evaluate whether the artifact demonstrates genuine understanding of the target company's business — not just their technology. The strongest artifacts connect technical work to business outcomes.

Criteria:
- B1: Problem identification — Identifies a specific, non-obvious problem the company has (5) vs. solves a generic industry problem (1)
- B2: Solution specificity — Proposes concrete approach with implementation steps, timelines, expected outcomes (5) vs. vague "they should use AI" (1)
- B3: Market context — Demonstrates understanding of competitive landscape and timing (5) vs. no market context (1)
- B4: Financial/strategic thinking — Connects technical solution to business outcomes (revenue, cost, retention, moat) (5) vs. pure technical exercise (1)
- B5: Stakeholder awareness — Shows understanding of who would champion/resist this internally (5) vs. no organizational awareness (1)

{context_block}""",
        criteria=[
            {"id": "B1", "name": "Problem identification"},
            {"id": "B2", "name": "Solution specificity"},
            {"id": "B3", "name": "Market context"},
            {"id": "B4", "name": "Financial/strategic thinking"},
            {"id": "B5", "name": "Stakeholder awareness"},
        ]
    ))

    # Dimension C: Technical Credibility (2x weight)
    prompts.append(JudgePrompt(
        dimension="C: Technical Credibility",
        weight=2.0,
        system_prompt=ARTIFACT_SYSTEM_PROMPT,
        user_prompt_template=f"""Score the following artifact on Technical Credibility.

Evaluate from the perspective of a senior engineer at the target company. The artifact should demonstrate that this person has actually shipped systems, not just studied them.

Criteria:
- C1: Architecture soundness — Design decisions are defensible, trade-offs explicit, alternatives considered (5) vs. arbitrary choices (1)
- C2: Domain vocabulary — Uses target company's technical terms correctly and naturally (5) vs. wrong/generic terms (1)
- C3: Scale awareness — Discusses what changes at company's actual scale with specific numbers from intel (5) vs. prototype-only thinking (1)
- C4: Edge case thinking — Identifies and addresses domain-specific edge cases (5) vs. happy path only (1)
- C5: Production readiness gap — Honest about prototype vs. production with a specific bridge plan (5) vs. claims prototype IS production-ready or ignores gap (1)

{context_block}""",
        criteria=[
            {"id": "C1", "name": "Architecture soundness"},
            {"id": "C2", "name": "Domain vocabulary"},
            {"id": "C3", "name": "Scale awareness"},
            {"id": "C4", "name": "Edge case thinking"},
            {"id": "C5", "name": "Production readiness gap"},
        ]
    ))

    # Dimension D: Clarity & Communication (1.5x weight)
    prompts.append(JudgePrompt(
        dimension="D: Clarity & Communication",
        weight=1.5,
        system_prompt=ARTIFACT_SYSTEM_PROMPT,
        user_prompt_template=f"""Score the following artifact on Clarity & Communication.

The best artifacts are clear enough to present in 5 minutes AND deep enough to discuss for an hour. Clarity beats impressiveness. An artifact that takes 30 minutes to understand fails even if the content is strong.

Criteria:
- D1: 5-minute walkthrough — Could present in 5 minutes with clear narrative arc (5) vs. would take 15+ minutes (1)
- D2: Audience adaptability — Works for both PM and engineering audiences (5) vs. only interpretable by author (1)
- D3: Visual hierarchy — Clear headers, tables, scannable in 30 seconds for key insight (5) vs. wall of text (1)
- D4: Narrative arc — Problem → insight → evidence → proposal → next steps (5) vs. collection of observations (1)
- D5: Question bait — 2-3 provocative choices that invite "why did you..." questions (5) vs. no conversation starters (1)

{context_block}""",
        criteria=[
            {"id": "D1", "name": "5-minute walkthrough"},
            {"id": "D2", "name": "Audience adaptability"},
            {"id": "D3", "name": "Visual hierarchy"},
            {"id": "D4", "name": "Narrative arc"},
            {"id": "D5", "name": "Question bait"},
        ]
    ))

    # Dimension E: Authenticity (2x weight)
    prompts.append(JudgePrompt(
        dimension="E: Authenticity",
        weight=2.0,
        system_prompt=ARTIFACT_SYSTEM_PROMPT,
        user_prompt_template=f"""Score the following artifact on Authenticity.

This is the AI slop detector. The key question: "Would a senior PM reading this say 'a person wrote this' or 'AI wrote this'?" Look for hedging language, suspiciously clean structure, consensus takes without conviction, and missing scars.

Criteria:
- E1: Voice consistency — Reads like a specific person with opinions (5) vs. could be anyone's work (1)
- E2: Intellectual honesty — Explicitly states limitations, where the analogy breaks down, what's uncertain (5) vs. oversells everything (1)
- E3: Contrarian signal — Takes at least one position against conventional wisdom with evidence (5) vs. pure consensus thinking (1)
- E4: Scars over stats — Leads with what was learned from failure, not just success metrics (5) vs. victory lap with no texture (1)
- E5: Imperfect on purpose — Has deliberate rough edges that signal human authorship (strong opinions, incomplete ideas, "I'm not sure about X but...") (5) vs. polished to suspicious sheen (1)

{context_block}""",
        criteria=[
            {"id": "E1", "name": "Voice consistency"},
            {"id": "E2", "name": "Intellectual honesty"},
            {"id": "E3", "name": "Contrarian signal"},
            {"id": "E4", "name": "Scars over stats"},
            {"id": "E5", "name": "Imperfect on purpose"},
        ]
    ))

    # Dimension F: Forward Test (2x weight)
    prompts.append(JudgePrompt(
        dimension="F: Forward Test",
        weight=2.0,
        system_prompt=ARTIFACT_SYSTEM_PROMPT,
        user_prompt_template=f"""Score the following artifact on the Forward Test.

Imagine you are a PM Director at the target company. You receive this artifact from a candidate. Score how likely you would be to share it, discuss it, and act on it.

Criteria:
- F1: Hiring manager forward — Would Slack this to team with "you need to see this" (5) vs. would not share (1)
- F2: Team discussion value — Would spark 30-minute team discussion (5) vs. no discussion value (1)
- F3: Reveals a blind spot — Points out something the company hasn't publicly addressed (5) vs. tells them what they already know (1)
- F4: Actionable next day — Someone could start implementing a piece tomorrow (5) vs. purely theoretical (1)
- F5: Competitive intelligence value — Demonstrates knowledge/framework the company would want on their team (5) vs. generic competence (1)

{context_block}""",
        criteria=[
            {"id": "F1", "name": "Hiring manager forward"},
            {"id": "F2", "name": "Team discussion value"},
            {"id": "F3", "name": "Reveals a blind spot"},
            {"id": "F4", "name": "Actionable next day"},
            {"id": "F5", "name": "Competitive intelligence value"},
        ]
    ))

    return prompts


# ─────────────────────────────────────────────
# OUTBOUND JUDGE PROMPTS
# ─────────────────────────────────────────────

OUTBOUND_SYSTEM_PROMPT = """You are an expert evaluator for cold outreach messages — emails and LinkedIn messages sent by job seekers to hiring managers. You've read thousands of cold emails and can instantly detect what works and what doesn't.

You evaluate from the perspective of a busy hiring manager receiving 50+ cold emails per week. Your job is to score each criterion on a 1-5 scale with a 1-sentence justification.

Scoring calibration:
- 5: Exceptional — you'd reply to this email within the hour
- 4: Strong — you'd flag it to revisit, maybe reply this week
- 3: Acceptable — you'd read the whole thing but might not reply
- 2: Below average — you'd skim and delete
- 1: Failing — you'd delete after the first sentence

The #1 signal you're looking for: Does this email sound like a person who has already been thinking about your problem, or like someone who wants a job? Does it sound like a real person wrote it, or like AI generated it?

CRITICAL PHILOSOPHY: The email is about THEIR problem, not about the sender. Humble, curious, clear about the ask. The voice is "underling PM with a lot of potential" -- shows depth through the quality of the question, not through credentials. Self-deprecating, hedging naturally, casual. Contains sentence fragments, contractions, casual word choices. Reads like it was dashed off at 11pm by someone who couldn't stop thinking about something. 2026 elite standard: Clay-caliber. If the email has em-dashes, zero contractions, uniform sentence length, or zero hedging/uncertainty, it's AI.

Output format — respond with ONLY valid JSON:
{
  "dimension": "<dimension name>",
  "scores": [
    {"id": "<criterion id>", "score": <1-5>, "justification": "<1 sentence>"},
    ...
  ],
  "dimension_average": <float>
}"""


def outbound_judge_prompts(
    outbound_text: str,
    artifact_readme: str,
    fact_set: str,
    earned_secrets: str,
    company_intel: str,
) -> list[JudgePrompt]:
    """Generate all LLM judge prompts for outbound evaluation."""

    context_block = f"""
## Reference Materials

### Fact Set (validated metrics)
{fact_set}

### Earned Secrets
{earned_secrets}

### Company Intel
{company_intel}

### Artifact README (what the artifact is)
{artifact_readme}

---

## Outbound Package Under Evaluation
{outbound_text}
"""

    prompts = []

    # Dimension A: Tone & Voice (3x weight)
    prompts.append(JudgePrompt(
        dimension="A: Tone & Voice",
        weight=3.0,
        system_prompt=OUTBOUND_SYSTEM_PROMPT,
        user_prompt_template=f"""Score this outbound package on Tone & Voice.

The target tone is: peer-to-peer with humility. Like an underling PM with a lot of potential reaching out to someone senior whose work they genuinely admire. Specific about own work, humble about position, genuinely curious about theirs. Self-deprecating ("probably overthinking it"), hedging naturally ("not sure if"), casual ("kind of", "super different", "totally get it"). Reads like a real person who was genuinely thinking about something and decided to reach out.

Criteria:
- A1: Peer-to-peer — Like texting a friend at another company about a problem you both find interesting (5) vs. reads like a cover letter or cold email template (1)
- A2: Their problem, not my resume — 90%+ of the email is about the company's challenge. Sender barely appears. The artifact does the talking. (5) vs. pivots to "here's what I did" and stays there (1)
- A3: Confidence without claiming — Shows understanding of the problem so clearly that competence is obvious without stating it (5) vs. lists achievements or claims "I've solved this" (1)
- A4: Curiosity > credentials — The email asks a question or makes an observation showing genuine intellectual interest in the problem (5) vs. purely transactional (1)
- A5: Brevity as signal — Says everything in 3-4 sentences. The restraint itself signals confidence — doesn't need to sell. (5) vs. 7+ sentences, feels like it needs to convince (1)

{context_block}""",
        criteria=[
            {"id": "A1", "name": "Peer-to-peer"},
            {"id": "A2", "name": "Their problem, not my resume"},
            {"id": "A3", "name": "Confidence without claiming"},
            {"id": "A4", "name": "Curiosity > credentials"},
            {"id": "A5", "name": "Brevity as signal"},
        ]
    ))

    # Dimension B: Artifact Integration (2.5x weight)
    prompts.append(JudgePrompt(
        dimension="B: Artifact Integration",
        weight=2.5,
        system_prompt=OUTBOUND_SYSTEM_PROMPT,
        user_prompt_template=f"""Score this outbound package on Artifact Integration.

The artifact is the centerpiece. The email exists to deliver the artifact naturally. The mention should feel inevitable — a natural conclusion of the argument being made, not a sales pitch.

Criteria:
- B1: Natural mention — Artifact comes up as evidence for a point being made (5) vs. "please see attached" (1)
- B2: Curiosity generation — Reader would want to look at artifact even if not hiring (5) vs. skippable mention (1)
- B3: Thesis preview — Hints at artifact's key insight without giving it all away (5) vs. spoils it or says nothing (1)
- B4: Access strategy — Clear, low-friction way to access artifact (5) vs. no mention of how to see it (1)
- B5: Artifact-email coherence — Email's hook and artifact's thesis are the same story at different zoom levels (5) vs. feel like separate projects (1)

{context_block}""",
        criteria=[
            {"id": "B1", "name": "Natural mention"},
            {"id": "B2", "name": "Curiosity generation"},
            {"id": "B3", "name": "Thesis preview"},
            {"id": "B4", "name": "Access strategy"},
            {"id": "B5", "name": "Artifact-email coherence"},
        ]
    ))

    # Dimension C: Hook Quality (2x weight)
    prompts.append(JudgePrompt(
        dimension="C: Hook Quality",
        weight=2.0,
        system_prompt=OUTBOUND_SYSTEM_PROMPT,
        user_prompt_template=f"""Score this outbound package on Hook Quality.

The hook is the first 1-2 sentences. It determines whether the email gets read or deleted. The best hooks contain an INSIGHT, not just information. They make the reader stop scrolling.

Criteria:
- C1: First-line hook — Opening makes reader stop scrolling (surprising, specific, raises a question) (5) vs. "I'm writing to express my interest" (1)
- C2: Recency — References something from last 3 months (5) vs. no timely reference (1)
- C3: Insight over information — Contains an observation/connection, not just a fact (5) vs. just a fact without framing (1)
- C4: Recipient relevance — Connects to something the specific recipient cares about (5) vs. about the company generally (1)
- C5: Business framing / value signal — The email shows the sender thinks like someone who could work on this team. Frames the problem at the business/product level (scaling, growth, unit economics, user trust) not just the technical level. Reader thinks "this person would be useful here." (5) vs. pure technical observation with no business context, or no signal at all that sender could help (1)

{context_block}""",
        criteria=[
            {"id": "C1", "name": "First-line hook"},
            {"id": "C2", "name": "Recency"},
            {"id": "C3", "name": "Insight over information"},
            {"id": "C4", "name": "Recipient relevance"},
            {"id": "C5", "name": "Business framing / value signal"},
        ]
    ))

    # Dimension D: Failure Mode Detection (3x weight — critical)
    prompts.append(JudgePrompt(
        dimension="D: Failure Mode Detection",
        weight=3.0,
        system_prompt=OUTBOUND_SYSTEM_PROMPT,
        user_prompt_template=f"""Score this outbound package on Failure Mode Detection.

This is the most important dimension. Test for the five failure modes that kill outbound messages. Each criterion tests one specific failure mode. Be ruthless — if ANY of these fail, the outbound won't get replies.

Criteria:
- D1: Generic test — Every sentence contains company/person-specific content. Swap names and it breaks. (5=none generic) vs. most sentences are interchangeable (1)
- D2: Eagerness test — Zero selling. States an observation, shares a thing, asks one question. Done. (5=no eagerness) vs. lists achievements, explains background, begs for time (1)
- D3: Shoehorn test — Artifact mention is the inevitable conclusion of the argument. Couldn't NOT mention it. (5=flows naturally) vs. feels jammed in (1)
- D4: Tone test — Sounds like a real person who happens to have built something interesting. No "applying" energy. (5=authentic) vs. sounds like ChatGPT, a recruiter, or a desperate job seeker (1)
- D5: Focus test — The email never pivots to "here's my background." The recipient's problem is the subject start to finish. (5=never pivots) vs. extended section about background or achievements (1)

{context_block}""",
        criteria=[
            {"id": "D1", "name": "Generic test"},
            {"id": "D2", "name": "Eagerness test"},
            {"id": "D3", "name": "Shoehorn test"},
            {"id": "D4", "name": "Tone test"},
            {"id": "D5", "name": "Focus test"},
        ]
    ))

    # Dimension E: Multi-Channel Strategy (1.5x weight)
    prompts.append(JudgePrompt(
        dimension="E: Multi-Channel Strategy",
        weight=1.5,
        system_prompt=OUTBOUND_SYSTEM_PROMPT,
        user_prompt_template=f"""Score this outbound package on Multi-Channel Strategy.

A great outbound package isn't one message — it's a coordinated multi-touch campaign across email, LinkedIn, and warm intros. Each touch should add value, not just repeat.

Criteria:
- E1: Channel differentiation — Each variant leads with a different angle/facet (5) vs. same message copy-pasted (1)
- E2: Follow-up value ladder — Follow-up adds genuinely new value (new insight, data, news) (5) vs. "just checking in" (1)
- E3: Sequence logic — Clear rationale for channel order + timing (5) vs. no multi-touch strategy (1)
- E4: Warm intro quality — Forwardable blurb is genuinely forwardable as-is (5) vs. no template or too long (1)
- E5: Connection request economy — Under 300 chars AND specific hook AND CTA (5) vs. "I'd love to connect" (1)

{context_block}""",
        criteria=[
            {"id": "E1", "name": "Channel differentiation"},
            {"id": "E2", "name": "Follow-up value ladder"},
            {"id": "E3", "name": "Sequence logic"},
            {"id": "E4", "name": "Warm intro quality"},
            {"id": "E5", "name": "Connection request economy"},
        ]
    ))

    # Dimension F: Authenticity & Anti-Slop (2x weight)
    prompts.append(JudgePrompt(
        dimension="F: Authenticity & Anti-Slop",
        weight=2.0,
        system_prompt=OUTBOUND_SYSTEM_PROMPT,
        user_prompt_template=f"""Score this outbound package on Authenticity & Anti-Slop.

The AI slop detector for outbound. 2026 standard: a busy hiring manager can spot LLM output in under 3 seconds. The bar is Clay-caliber -- research-first, trigger-based, 50-125 words. Look for: uniform sentence structure, corporate vocabulary, over-polished formatting, zero hedging/uncertainty, zero contractions, zero fragments. Most importantly: does this feel like a real person wrote it at 11pm because they couldn't stop thinking about something, or like a system generated it?

Criteria:
- F1: Sentence variety + fragments — Mix of short punchy (3-7 word) and longer flowing (15-25 word) sentences. At least one deliberate fragment ("Probably overthinking it." / "The speed compliance tension."). High burstiness. (5) vs. uniform metronomic structure, all sentences same length (1)
- F2: Vocabulary naturalness — Words you'd use in a text message: "kind of", "super", "stuff", "run into", "figure out". Contractions everywhere (I'm, I'd, don't, that's). No "leverage/synergy/utilize/holistic/navigate/landscape". (5) vs. formal vocabulary throughout, LinkedIn post generator (1)
- F3: Human texture — Contains things a template engine would never produce: self-deprecation ("probably overthinking it"), natural uncertainty ("not sure if"), casual hedging ("I know"), genuine personality. The writer's specific voice comes through -- not just "a person" but THIS person. (5) vs. every word feels chosen by committee, zero personality (1)
- F4: Imperfect by design — Feels like it was written in one sitting by someone who was excited. No bullet points, no numbered lists, no em-dashes, no parallel structure. Tone shifts naturally from slightly specific opening to casual close. Register isn't uniform. (5) vs. perfect structure, template engine output (1)
- F5: Context without credentials — Self-positions as "underling PM with potential": specific about own work ("RL for pricing"), humble about position ("different domain, I know"), genuinely curious about theirs. Reader understands WHY sender cares without seeing their resume. Gives the recipient an explicit out ("totally get it if not"). (5) vs. either no context (stranger analyzing your failures) or too much (credential dump) (1)

{context_block}""",
        criteria=[
            {"id": "F1", "name": "Sentence variety"},
            {"id": "F2", "name": "Vocabulary naturalness"},
            {"id": "F3", "name": "Human texture"},
            {"id": "F4", "name": "Imperfect formatting"},
            {"id": "F5", "name": "Context without credentials"},
        ]
    ))

    return prompts

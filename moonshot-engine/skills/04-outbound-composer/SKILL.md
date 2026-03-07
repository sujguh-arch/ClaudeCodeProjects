---
name: outbound-composer
description: Composes personalized cold emails and LinkedIn messages to hiring managers that reference deep work artifacts. Generates email, InMail, connection request, follow-up, and warm intro variants. Use after artifact is generated.
---

# Outbound Composer Skill

## Purpose
Compose highly personalized outbound messages (email, LinkedIn) to hiring managers that reference the deep work artifact naturally. The outbound must feel like it was written by someone who genuinely understands the company's challenges — because it was informed by the company intel and artifact.

## How to Run
User says: "Compose outbound for [company] [role]"
Requires: `targets/{company}/intel.md`, `targets/{company}/role-analysis.md`, and `targets/{company}/artifact/` must exist.

## Anti-Patterns (NEVER do these)
- "I'm passionate about [company]'s mission..."
- "With X years of experience in..."
- "I believe I'd be a great fit because..."
- Listing credentials or titles
- Generic flattery ("I love what you're building")
- Any line that could apply to any company if you swap the name
- Attaching resume as the lead (the artifact leads, resume follows)

## Process

### Step 1: Read Inputs
- `targets/{company}/intel.md` — Recent news, challenges, key people
- `targets/{company}/role-analysis.md` — Strongest angles, artifact thesis
- `targets/{company}/artifact/` — What was built, the README
- `references/earned-secrets.md` — The non-obvious insight to reference

### Step 2: Identify the Hook
The hook is the specific, recent thing about the company that connects to the artifact. It should:
- Reference something from the last 3 months (news, launch, blog post, talk)
- Connect to a problem the artifact addresses
- Show that Sujoy actually pays attention to this company (not mass outreach)

### Step 3: Compose Primary Email

**Structure (5 parts, under 200 words total):**

1. **Subject line** (under 60 chars)
   - Must reference the artifact or a specific company challenge
   - Examples: "RL optimizer for [product] — built a prototype" / "Enterprise trust framework for [product]"
   - Never: "Application for [Role Title]" / "Interested in [Company]"

2. **Opening** (1-2 sentences)
   - Reference the specific hook (recent news, product challenge, talk by the hiring manager)
   - Show genuine understanding, not googled facts

3. **Bridge** (1-2 sentences)
   - Connect Sujoy's experience to their specific challenge
   - Use ONE concrete metric from fact-set.md (not a list of achievements)
   - Frame as "I've solved a version of this problem" not "I'm qualified"

4. **Artifact hook** (1-2 sentences)
   - "I put together [specific thing] that [specific value proposition]"
   - Include how to access it (link, attachment reference, "happy to share")
   - The artifact should sound interesting enough that they'd want to look at it even if they weren't hiring

5. **Close** (1 sentence)
   - Light, specific CTA
   - "Would love 20 minutes to walk through the approach" or similar
   - No desperation, no "I'm available at your convenience"

**Signature:**
```
Sujoy Guha
[LinkedIn URL]
```

### Step 4: Generate Variants

**LinkedIn connection request** (300 char max):
- Even more concise — hook + artifact mention + CTA
- No "I see you're hiring for..." — that's what everyone says

**LinkedIn InMail** (shorter than email, same structure):
- 100-150 words max
- More casual tone

**Follow-up email** (1 week later, if no response):
- Reference the original email briefly
- Add ONE new piece of value (new insight, updated artifact, relevant news)
- Still under 100 words
- Never: "Just following up" / "Bumping this to the top"

**Warm intro request** (if mutual connection exists):
- Template for asking a mutual connection to make the intro
- Include context for the introducer (why this is a good match)
- Include a forwardable blurb the introducer can copy-paste

### Step 5: Quality Checks

Before finalizing:
- [ ] **Word count:** Primary email under 200 words
- [ ] **Specificity test:** Would this email only make sense for this company + this person?
- [ ] **Anti-pattern check:** None of the banned phrases appear
- [ ] **Hook freshness:** References something from the last 3 months
- [ ] **Artifact integration:** The artifact is mentioned naturally, not shoehorned
- [ ] **Tone check:** Confident but not arrogant. Interested but not desperate. Specific but not overwhelming.
- [ ] **Claims check:** Any metric references fact-set.md

### Step 6: Output
Write to `targets/{company}/outbound-email.md`:

```markdown
# Outbound Package: [Role] at [Company]
**Generated:** [date]
**Target contact:** [name, title]

## Primary Email
**Subject:** [subject line]

[email body]

## LinkedIn Connection Request
[300 char message]

## LinkedIn InMail
[message]

## Follow-up Email (send 1 week later if no response)
**Subject:** Re: [original subject]

[follow-up body]

## Warm Intro Request (if mutual connection available)
**To:** [mutual connection name]

[request]

**Forwardable blurb:**
[copy-pasteable intro text]
```

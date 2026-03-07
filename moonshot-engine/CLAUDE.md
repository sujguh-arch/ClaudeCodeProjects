# Moonshot App Engine

## What This Is
A composable, CLI-based engine for deep, personalized job search outreach. Built for Sujoy Guha targeting AI roles at OpenAI, Anthropic, and Waymo.

This is NOT a template generator. Every output must be specific enough that swapping company names would break it.

## Architecture
6 composable skills that run in sequence. See `pipeline/run.md` for the full flow diagram.

```
00-role-monitor  → Find relevant open roles
01-company-intel → Deep company research
02-role-analysis → JD parsing, fit analysis, artifact recommendation
03-artifact-engine → Generate deep work artifacts (prototype + strategy)
04-outbound-composer → Personalized email/LinkedIn outreach
05-interview-prep → Company-specific interview coaching
```

## Reference Files (READ BEFORE ANY SKILL)
- `references/profile.md` — Sujoy's canonical narrative and transferable superpowers
- `references/fact-set.md` — Validated metrics. ALL claims must come from here. No invention.
- `references/earned-secrets.md` — Non-obvious insights from Sujoy's experience. Use these to add depth.

## How to Use

### Full Pipeline
Say: "Run the full pipeline for [Company], here's the JD: [paste or URL]"

This runs all skills in sequence and outputs everything to `targets/{company}/`.

### Individual Skills
Say any of:
- "Check for new roles at [Company]"
- "Run company intel for [Company]"
- "Analyze this role: [paste JD]"
- "Generate artifact for [Company] [Role]"
- "Compose outbound for [Company] [Role]"
- "Prep me for [Company] interview"
- "Run mock interview for [Company]"

### Resume Tailoring
For resume generation, use the existing `resume-tailored/` skill separately. The role analysis skill generates tailoring notes that feed into it.

## Quality Standards

### The Forward Test
Every artifact must pass: "Would a hiring manager forward this to their team?"

### The Specificity Test
Every output must pass: "Could this only be about this company?" If you swap company names and it still works, it fails.

### The Staff+ Test
Every artifact must pass: "Would this hold up in a staff-level interview?"

### The Claims Test
Every metric must reference `references/fact-set.md`. No invented numbers. Reframing is allowed; fabrication is not.

## Target Companies
| Company | Key Angle | Artifact Bias |
|---------|-----------|---------------|
| OpenAI | Agentic AI + enterprise adoption | Hybrid (prototype + strategy) |
| Anthropic | AI trust/explainability + 0-to-1 | Strategy memo + prototype |
| Waymo | RL in production + real-time systems | Technical prototype |

## IMPORTANT Constraints
- NEVER generate outputs that claim experiences not in fact-set.md
- NEVER use anti-patterns listed in `04-outbound-composer/SKILL.md`
- NEVER generate generic artifacts — every output must be company-specific
- When in doubt about a claim, flag it rather than invent

## Verification (YOU MUST run after each skill)
After generating any output, self-verify:
1. **Claims audit:** Search output for numbers/metrics → confirm each exists in `references/fact-set.md`
2. **Specificity audit:** Replace company name with "Acme Corp" — if output still makes sense, it's too generic. Fix it.
3. **Anti-pattern scan:** Check outbound emails against banned phrases in `04-outbound-composer/SKILL.md`
4. **Artifact code check:** If prototype, confirm code runs with `python3 src/main.py` or equivalent
5. Report verification results before presenting output to user

## Testing the Pipeline
To validate the full engine end-to-end:
```bash
# 1. Verify directory structure
find moonshot-engine/ -name "*.md" | sort

# 2. Verify symlink to fact-set
cat moonshot-engine/references/fact-set.md | head -5

# 3. Verify all skills have SKILL.md
ls moonshot-engine/skills/*/SKILL.md

# 4. Verify all target companies have output folders
ls moonshot-engine/targets/

# 5. Run a single skill and verify output quality
# (use role-monitor as smoke test — it produces verifiable output)
```

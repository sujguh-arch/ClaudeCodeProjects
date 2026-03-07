# Moonshot Engine — Pipeline Guide

## Quick Start
Open `moonshot-engine/` in Claude Code. The CLAUDE.md orchestrator handles everything.

**Full pipeline command:**
> "Run the full pipeline for [Company], here's the JD: [paste JD or URL]"

**Individual skill commands:**
> "Check for new roles at [Company]"
> "Run company intel for [Company]"
> "Analyze this role: [JD]"
> "Generate artifact for [Company] [Role]"
> "Compose outbound for [Company] [Role]"
> "Prep me for [Company] interview"

---

## Pipeline Sequence

```
┌──────────────────┐
│  00-role-monitor  │  "Check for new roles at OpenAI"
│  (scan careers)   │  → targets/{company}/open-roles.md
└────────┬─────────┘
         │ pick a role
         ▼
┌──────────────────┐
│ 01-company-intel  │  "Run company intel for OpenAI"
│ (deep research)   │  → targets/{company}/intel.md
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 02-role-analysis  │  "Analyze this role: [JD]"
│ (fit + artifact   │  → targets/{company}/role-analysis.md
│  recommendation)  │  → resume tailoring notes
└────────┬─────────┘
         │
         ├──────────────────────┐
         ▼                      ▼
┌──────────────────┐  ┌──────────────────┐
│ 03-artifact-eng   │  │ resume-tailored   │
│ (build artifact)  │  │ (tailor resume)   │
│ → artifact/       │  │ → resume/         │
└────────┬─────────┘  └──────────────────┘
         │
         ▼
┌──────────────────┐
│ 04-outbound       │  "Compose outbound for OpenAI [Role]"
│ (email + LinkedIn)│  → targets/{company}/outbound-email.md
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 05-interview-prep │  "Prep me for OpenAI interview"
│ (questions + mock)│  → targets/{company}/interview-prep.md
└──────────────────┘
```

## Per-Company Output Structure
After running the full pipeline:
```
targets/openai/
├── open-roles.md        # Available roles (from role monitor)
├── intel.md             # Company deep-dive
├── role-analysis.md     # JD analysis + fit assessment
├── artifact/            # The deep work artifact
│   ├── README.md
│   ├── src/
│   ├── docs/
│   └── ...
├── outbound-email.md    # Email + LinkedIn variants
├── resume/              # Tailored resume (from resume-tailored skill)
└── interview-prep.md    # Predicted questions + story bank
```

## Tips
- **Always run company intel first** — it feeds everything else
- **Review role-analysis before artifact generation** — confirm the artifact recommendation
- **Outbound composer needs the artifact** — it references it in the email
- **Interview prep can run anytime** — even before applying, to build confidence
- **Re-run role monitor weekly** — roles turn over fast at these companies

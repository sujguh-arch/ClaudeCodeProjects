# Technical Prototype Template

## Artifact Structure
```
artifact/
├── README.md              # Start here — overview, motivation, how to run
├── src/                   # Working code (Python preferred, or match company's stack)
│   ├── main.py           # Entry point
│   └── ...               # Modular, clean, documented
├── docs/
│   ├── architecture.md    # Why this design, alternatives considered, trade-offs
│   ├── scaling.md         # How this scales at [company]'s production volume
│   └── cost-model.md      # Estimated costs at scale
├── tests/                 # At least 3 meaningful tests
└── demo/                  # Screenshots, terminal output, or GIF
```

## README.md Template

```markdown
# [Artifact Name]: [One-line description]

## Why I Built This
[1-2 sentences connecting to the company's specific challenge. Reference intel.]

## What It Does
[3-4 bullet points describing functionality]

## Key Design Decisions
1. **[Decision]** — [Why, and what alternative was considered]
2. **[Decision]** — [Why]
3. **[Decision]** — [Why]

## How to Run
```bash
[exact commands to install and run]
```

## What I'd Do Differently at [Company] Scale
[2-3 sentences about production considerations — this is what separates prototype from artifact]

## Connection to My Experience
[1-2 sentences referencing relevant Duetto/C1/JPMC work — with specific metrics from fact-set]
```

## Depth Requirements Checklist
- [ ] Code actually runs
- [ ] Architecture.md explains WHY, not just WHAT
- [ ] Scaling.md references specific numbers from company intel (user count, request volume, etc.)
- [ ] At least 1 earned secret woven into the design rationale
- [ ] Tests exist and pass
- [ ] Could present this in a 15-minute technical deep-dive without additional prep

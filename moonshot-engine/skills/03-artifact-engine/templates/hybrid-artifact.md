# Hybrid Artifact Template

## Purpose
The most powerful artifact type: strategy + working code. The prototype IS the evidence for the strategy. "Here's what I think you should build, and here's a working version of the core idea."

## Artifact Structure
```
artifact/
├── README.md              # Overview tying strategy + code together
├── strategy/
│   ├── memo.md            # Condensed strategy (1000-1500 words, not full memo)
│   └── executive-summary.md  # 1-page version
├── prototype/
│   ├── src/               # Working code
│   ├── tests/             # Tests
│   └── demo/              # Visual evidence it works
└── docs/
    ├── why-both.md        # Why strategy alone isn't enough, why code alone isn't enough
    └── next-steps.md      # What you'd build in weeks 2-4 if hired
```

## README.md Template

```markdown
# [Title]: [Strategy + Prototype] for [Company]

## The Thesis
[1-2 sentences: What I believe [Company] should do about [challenge], and why I built a prototype to prove it.]

## The Strategy (TL;DR)
[3-4 bullet points from the strategy memo]

## The Prototype
[What it does, how to run it, what it demonstrates]

## Why Both Matter
The strategy shows I understand the problem space deeply. The prototype shows I can execute. Together, they demonstrate what I'd bring on day one.

## My Relevant Experience
[1-2 sentences with specific metrics from fact-set connecting to this challenge]
```

## Depth Requirements Checklist
- [ ] Strategy and prototype reinforce each other (not disconnected)
- [ ] Strategy is condensed (not a full 3000-word memo — save depth for conversation)
- [ ] Prototype demonstrates the most impactful claim from the strategy
- [ ] Both reference the same company challenge from intel.md
- [ ] "Next steps" shows what you'd do with more time — signals you're thinking beyond the demo

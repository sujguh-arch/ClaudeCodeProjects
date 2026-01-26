# resume_bullet_improver

A tiny CLI tool that rewrites resume bullets into stronger, more metric-driven, product-oriented bullets.

## Goals
- Fast: run locally, no external dependencies required for v1
- Deterministic-ish: repeatable transformations (rule-based)
- Enforces constraints: length, tense, and formatting

## Inputs
- Plain text file with bullets, one per line
- Lines may start with "-" or "•" or be raw text
- Blank lines should be ignored

## Outputs
- Print improved bullets to stdout
- Optionally write to an output file

## CLI
- `python -m src.improve --in data/input.txt`
- `python -m src.improve --in data/input.txt --out data/output.txt`
- `python -m src.improve --in data/input.txt --style pm --max-chars 160`
- `python -m src.improve --in data/input.txt --dry-run`

## Styles (v1)
- `pm` (default): product manager tone
- `compact`: shorter, punchier
- `impact`: pushes metrics and outcomes more aggressively

## Rules (v1)
- Start with a strong action verb
- Prefer past tense
- Prefer structure: Verb + What + How + Impact
- Encourage metrics placeholders if missing: e.g. “[+X%]”, “[N users]”, “[<$] cost]”
- Remove filler: “responsible for”, “helped with”, “worked on”
- Keep each bullet <= max chars (default 180) by trimming trailing clauses

## Example
Input:
- responsible for improving onboarding

Output:
- Improved customer onboarding flow by simplifying steps and removing friction, increasing activation by [+X%].
# Manual Test Cases for Resume Bullet Improver

## Setup

First, create a test input file `data/input.txt`:

```
- responsible for improving customer onboarding
• worked on a cross-functional team to launch new payment feature
* helped with the migration of legacy systems to cloud infrastructure
Led team of 5 engineers to deliver API platform serving 1M requests/day
Analyzed user behavior data to identify churn patterns and increased retention by 15%
  - Created roadmap for mobile app features
was involved in sprint planning and backlog grooming
tasked with managing vendor relationships
Improved page load time from 4s to 1.2s, reducing bounce rate by 30%
Built and shipped internal analytics dashboard used by 50+ stakeholders
```

---

## Test 1: Basic Usage (Default Style)

**Command:**
```bash
python -m src.improve --in data/input.txt
```

**What to look for:**
- All bullets are prefixed with `- `
- Filler phrases like "responsible for", "worked on", "helped with" are removed
- Each bullet starts with a strong action verb (capitalized)
- Bullets without metrics have impact placeholders like `[+X%]` or `[metric]`
- Bullets with existing metrics (like "15%", "1M requests") do NOT get additional placeholders

---

## Test 2: Dry Run Mode

**Command:**
```bash
python -m src.improve --in data/input.txt --dry-run
```

**What to look for:**
- Output shows numbered pairs: `1. ORIGINAL:` and `   IMPROVED:`
- Easy to compare original vs improved side by side
- No `- ` prefix on improved bullets in this mode
- All bullets are numbered sequentially

---

## Test 3: Compact Style

**Command:**
```bash
python -m src.improve --in data/input.txt --style compact
```

**What to look for:**
- Verbs should be shorter/punchier (Led, Built, Shipped, Cut, Grew, etc.)
- Impact placeholders are shorter format like `([+X%])` or `+[X%] [metric]`
- Overall bullets should feel more concise

---

## Test 4: Impact Style

**Command:**
```bash
python -m src.improve --in data/input.txt --style impact
```

**What to look for:**
- Verbs emphasize achievement (Delivered, Achieved, Generated, Accelerated, etc.)
- Impact clauses are more aggressive ("generating [+X%] lift", "saving [$X] annually")
- Focus on outcomes and results

---

## Test 5: Custom Max Characters (Short)

**Command:**
```bash
python -m src.improve --in data/input.txt --max-chars 100
```

**What to look for:**
- No bullet exceeds 100 characters (verify with `wc -c` or character count)
- Bullets are trimmed at clause boundaries (commas, periods) not mid-word
- Trimmed bullets still end with proper punctuation

---

## Test 6: Custom Max Characters (Very Short)

**Command:**
```bash
python -m src.improve --in data/input.txt --max-chars 60
```

**What to look for:**
- Bullets are aggressively shortened
- Some bullets may end with `...` if no good break point
- All bullets remain grammatically coherent (no cut-off words)

---

## Test 7: Output to File

**Command:**
```bash
python -m src.improve --in data/input.txt --out data/output.txt
```

**What to look for:**
- Output is printed to stdout
- Message appears: "Output written to: data/output.txt"
- File `data/output.txt` exists and contains the same improved bullets
- Running `diff` between stdout capture and file shows no difference

---

## Test 8: Combined Options

**Command:**
```bash
python -m src.improve --in data/input.txt --style impact --max-chars 150 --out data/impact_output.txt
```

**What to look for:**
- Impact style verbs and placeholders are used
- All bullets are <= 150 characters
- Both stdout and file output are present
- Bullets that had to be trimmed still make sense

---

## Test 9: Error Handling - Missing Input File

**Command:**
```bash
python -m src.improve --in nonexistent.txt
```

**What to look for:**
- Error message: "Error: Input file not found: nonexistent.txt"
- Exit code is non-zero (check with `echo $?`)
- No crash or traceback

---

## Test 10: Error Handling - Missing Required Argument

**Command:**
```bash
python -m src.improve
```

**What to look for:**
- argparse error message about required argument `--in`
- Usage information is displayed
- Exit code is non-zero

---

## Test 11: Bullets Already Starting with Strong Verbs

**Command:**
Create a file `data/strong_verbs.txt`:
```
Led the product redesign initiative
Delivered quarterly OKRs ahead of schedule
Shipped 3 major features in Q4
```

Then run:
```bash
python -m src.improve --in data/strong_verbs.txt --dry-run
```

**What to look for:**
- Verbs like "Led", "Delivered", "Shipped" are preserved (not duplicated)
- Proper capitalization is maintained
- Impact placeholders added only where metrics are missing

---

## Test 12: Empty Lines and Mixed Bullet Formats

**Command:**
Create a file `data/mixed.txt`:
```
- First bullet with dash

• Second bullet with dot

* Third with asterisk
  Fourth with leading spaces

Fifth with no marker
```

Then run:
```bash
python -m src.improve --in data/mixed.txt
```

**What to look for:**
- All 5 bullets are processed (empty lines ignored)
- Leading markers (-, •, *) are removed
- Leading/trailing whitespace is stripped
- Each output line has consistent `- ` prefix

---

## Test 13: Dry Run Does NOT Write to File

**Command:**
```bash
rm -f data/dry_test.txt
python -m src.improve --in data/input.txt --out data/dry_test.txt --dry-run
ls data/dry_test.txt
```

**What to look for:**
- Dry run output is shown (side-by-side comparison)
- File `data/dry_test.txt` does NOT exist (ls should fail)
- This confirms --dry-run prevents file writing even when --out is specified

---

## Verification Tips

1. **Check character counts:**
   ```bash
   python -m src.improve --in data/input.txt --max-chars 100 | while read line; do echo "${#line} $line"; done
   ```

2. **Compare styles:**
   ```bash
   echo "=== PM ===" && python -m src.improve --in data/input.txt --style pm | head -3
   echo "=== COMPACT ===" && python -m src.improve --in data/input.txt --style compact | head -3
   echo "=== IMPACT ===" && python -m src.improve --in data/input.txt --style impact | head -3
   ```

3. **Verify filler removal:**
   ```bash
   echo "responsible for managing the team" > /tmp/filler.txt
   python -m src.improve --in /tmp/filler.txt --dry-run
   # Should show "responsible for" removed in improved version
   ```

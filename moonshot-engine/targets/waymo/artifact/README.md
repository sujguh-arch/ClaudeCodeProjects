# Confidence Threshold Calibration for Autonomous Driving Behaviors

**The school bus recall and the SF blackout are the same problem.**

Waymo's two biggest incidents of 2025 were mirror images:
- **School bus recall (Dec 2025):** 3,067 vehicles recalled after robotaxis illegally passed stopped school buses ≥20 times. The planner was **too confident** — it didn't request human confirmation for a scenario it should have deferred on.
- **SF blackout (Dec 2025):** 1,500+ stalls at dead traffic lights. The planner was **not confident enough** — it overwhelmed Fleet Response with confirmation requests, blocking arterial roads and impeding emergency vehicles.

Both failures stem from the same root cause: **the confidence threshold between "I can handle this" and "I need human help" was miscalibrated for the context.** This isn't an ML problem — it's a trust calibration problem.

I've solved this exact problem before.

## Why I Built This

At Duetto, I shipped a production RL engine that makes billions of daily pricing decisions. The hardest challenge wasn't the model — it was calibrating when the system should act autonomously vs. defer to humans. Pricing acceptance went from 20% to 60%+ not through model improvements, but through **context-dependent confidence thresholds** and **trust engineering** (explainability, the ICP pivot to GMs over Revenue Managers).

This prototype models the confidence threshold calibration problem using Waymo's actual architecture:
- **Assertive threshold too high** → school-bus-type failures (overrides social norms)
- **Assertive threshold too low** → blackout-type failures (overwhelms human support pipeline)
- The optimal threshold is **context-dependent**: different for school zones vs. construction zones vs. dead traffic lights vs. normal intersections

## What It Does

A Gymnasium-based driving environment modeling 5 scenarios that stress-test Waymo's actual failure modes:

1. **School zone with stopped bus** — Must defer to social/legal norms even when physically safe
2. **Dead traffic light intersection** — Must act decisively without human confirmation
3. **Construction zone with conflicting signals** — Must handle contradictory guidance
4. **Normal 4-way intersection** — Baseline behavior (should be autonomous)
5. **Occluded pedestrian near school** — Must balance caution with throughput

Three confidence calibration strategies compete:
1. **Static threshold** — Fixed confidence boundary (Waymo's pre-2025 approach: too cautious everywhere)
2. **Context-adaptive threshold** — Threshold varies by scenario context (the correct approach)
3. **Aggressive threshold** — Low bar for human help (causes school-bus-type overconfidence)

### Key Results
The context-adaptive threshold:
- **Zero school bus violations** (defers in school zones)
- **Zero blackout stalls** (acts decisively at dead lights)
- **Fewer Fleet Response requests** (only asks for help when genuinely needed)

## How to Run

```bash
pip install numpy gymnasium
python src/main.py
```

## Connection to Duetto Experience

| Waymo's Problem | Duetto's Equivalent | What I Learned |
|---|---|---|
| When should the planner defer to Fleet Response? | When should the RL engine defer to the LP solver? | Context-dependent thresholds, not global settings |
| School bus recall (too confident) | Early RL: too aggressive pricing, hotel pushback | Prove parity in safe contexts before expanding |
| SF blackout (not confident enough) | Late-stage LP: too conservative, leaving money on table | "500 years of exploration" to find optimal boundary |
| Drivership framework (social norms) | ICP pivot (GMs not RMs) | Trust isn't a technology problem — it's a go-to-market problem |
| Fleet Response overwhelm at scale | Support ticket volume from confused Revenue Managers | Explainability reduces human-in-the-loop volume |

## What I'd Propose at Waymo

1. **Context-dependent confidence taxonomy:** Classify scenarios by risk profile (school zones, construction, weather, normal) and set different deference thresholds per category. The school bus failure was a taxonomy failure — school zones should have had the lowest confidence threshold (most likely to defer).

2. **Confidence threshold as a product surface:** The threshold isn't just an ML hyperparameter — it's a product decision that affects rider experience, fleet throughput, regulatory trust, and support costs. It should be owned by Product, not just ML.

3. **Deference budget per shift:** Like Duetto's "exploration budget" — the planner gets a fixed number of Fleet Response requests per hour. This forces smarter deference decisions and prevents blackout-type cascade failures.

4. **Trust-building progression:** New cities start with lower confidence thresholds (more deference). As the planner accumulates miles and the Critic validates behavior, thresholds increase. Same pattern as Duetto's RL rollout: start with RL-as-optimizer (safe), expand to autonomous pricing as trust builds.

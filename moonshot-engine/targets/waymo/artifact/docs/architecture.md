# Architecture: RL-as-Optimizer Pattern

## Why Not End-to-End RL?

End-to-end RL achieves higher peak composite scores but has **3.56 standard deviation on safety** vs. **0.69 for the optimizer** and **0.57 for the rule-based baseline**. In autonomous driving, a single safety violation is catastrophic. The optimizer pattern eliminates tail risk by construction.

## The Three-Layer Architecture

```
┌──────────────────────────────────────┐
│  Layer 3: RL Optimizer               │
│  - Proposes adjustments to baseline  │
│  - Trained via simulation            │
│  - Safety-constrained exploration    │
└──────────────┬───────────────────────┘
               │ adjustments (comfort, efficiency)
               ▼
┌──────────────────────────────────────┐
│  Layer 2: Safety Gate                │
│  - Compares RL proposal to baseline  │
│  - Rejects if safety degrades        │
│  - Logs rejection reasons            │
└──────────────┬───────────────────────┘
               │ approved plan
               ▼
┌──────────────────────────────────────┐
│  Layer 1: Rule-Based Planner         │
│  - Always runs as baseline           │
│  - Provides safety floor             │
│  - Falls back if RL is rejected      │
└──────────────────────────────────────┘
```

## Why This Works

1. **Baseline always runs.** The rule-based planner produces a plan for every scenario. This is never skipped.

2. **RL proposes, doesn't decide.** The RL agent suggests adjustments to the baseline plan — smoother trajectories, tighter gap acceptance, more efficient routes. It doesn't generate plans from scratch.

3. **Safety gate is deterministic.** The gate checks: "Does the RL adjustment reduce safety below baseline?" If yes, the adjustment is rejected and the baseline plan executes. This is a hard constraint, not a soft penalty.

4. **Training is offline.** The RL agent trains in simulation (pre-computed exploration), not in the real world. At Duetto, this was "500 years of exploration in minutes" — the same approach works for driving simulation.

## Design Trade-offs

| Choice | Alternative | Why This |
|--------|-------------|----------|
| RL adjusts baseline, not replaces | End-to-end RL | Safety floor guarantee; lower variance |
| Deterministic safety gate | Learned safety critic | Verifiable, auditable, regulator-friendly |
| Offline training only | Online learning | No real-world exploration risk |
| Scenario-complexity-indexed policy | Monolithic policy | Faster convergence per scenario type |

## At Waymo Scale

This prototype uses simplified scenarios. At Waymo's scale:
- The rule-based planner = Waymo's existing planner stack
- The RL optimizer = learned refinement layer on top
- The safety gate = formal verification against safety envelope
- Training = billions of simulation miles (Waymo's existing sim infrastructure)

The pattern scales because the RL agent's decision space is bounded by the baseline — it only needs to learn "how to improve," not "how to drive from scratch."

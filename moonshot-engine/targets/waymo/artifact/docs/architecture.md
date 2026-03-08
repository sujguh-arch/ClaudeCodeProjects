# Architecture: Confidence Threshold Calibration

## The Problem

Waymo's planner makes a binary decision every moment: **act autonomously** or **defer to Fleet Response (human confirmation)**. The threshold between these two modes caused both of Waymo's biggest 2025 failures:

| Incident | Threshold Error | Result |
|---|---|---|
| School bus recall (Dec 2025) | Too confident | 3,067 vehicles recalled, ≥20 illegal school bus passes |
| SF blackout (Dec 2025) | Not confident enough | 1,500+ stalls, blocked arterials, impeded emergency vehicles |
| Construction zone (Phoenix) | Too confident + wrong guidance | Drove into oncoming traffic |
| Pedestrian strike (Santa Monica) | Too confident near occlusion | Struck 9-year-old near school |

These are **not four different problems**. They are **one problem** — context-dependent confidence calibration — expressed in four different scenarios.

## The Three Strategies Modeled

```
                    CONFIDENCE THRESHOLD SPECTRUM
    ←── Too Cautious ─────────── Optimal ─────────── Too Aggressive ──→

    Static (0.45)          Context-Adaptive          Aggressive (0.85)
    ┌─────────────┐       ┌─────────────────┐       ┌──────────────┐
    │ Same bar for │       │ School zone:0.07│       │ Same high bar│
    │ ALL contexts │       │ Dead light: 0.91│       │ for ALL      │
    │              │       │ Construction:0.2│       │ contexts     │
    │ Result:      │       │ Normal:    0.75 │       │              │
    │ Overwhelms   │       │                 │       │ Result:      │
    │ Fleet Resp   │       │ Result:         │       │ Passes buses │
    │ during peak  │       │ ZERO safety     │       │ Hits peds    │
    │              │       │ ZERO stalls     │       │ Wrong lanes  │
    └─────────────┘       └─────────────────┘       └──────────────┘
```

## Why Context-Dependent Thresholds Work

The context-adaptive strategy uses 7 environmental features to set its confidence:

| Feature | Effect on Confidence | Rationale |
|---|---|---|
| School zone | **Strongly reduces** (-0.8) | Legal/safety obligation to defer |
| Construction | **Reduces** (-0.4) | Conflicting signals need human judgment |
| Traffic light dead | **Slightly reduces** (-0.3) | But time_pressure compensates |
| Pedestrian density | **Reduces** (-0.5) | High-risk for false confidence |
| Visibility | **Increases** (+0.4) | Good visibility = more confident |
| Time pressure | **Increases** (+0.5) | Can't afford to wait (blackout scenario) |
| Fleet Response load | **Reduces deference** (-0.6) | If fleet is overwhelmed, be autonomous |

The last feature is critical: **when Fleet Response is overwhelmed, the threshold INCREASES to reduce requests.** This prevents the blackout cascade — the system self-regulates its human-in-the-loop dependency.

## The Duetto Parallel

At Duetto, I solved the exact same calibration problem for RL-based pricing:

| Design Decision | Duetto Implementation | Waymo Application |
|---|---|---|
| Context taxonomy | New hotel vs. established vs. holiday | School zone vs. normal vs. construction |
| Conservative default | New hotels: RL as optimizer over LP | New cities: low confidence threshold |
| Trust escalation | Establish track record → expand autonomy | Accumulate miles → raise threshold |
| Deference budget | "Exploration budget" — limited RL experiments per day | Fleet Response budget — limited requests per hour |
| Explainability | Every RL price has reasoning trace | Every deference/autonomy decision logged with context |
| ICP pivot | Sell to GMs (who want profit), not RMs (who fear replacement) | Frame for riders (who want trust), not just engineers (who want metrics) |

## Scaling Considerations

This prototype uses a simple weighted linear model for threshold calibration. At Waymo scale:

1. **Feature set would be richer:** Road segment classification, historical incident density, regulatory zone mapping, real-time fleet telemetry
2. **Training would use Waymo's simulation infrastructure:** The Waymo World Model (built on DeepMind's Genie 3) could generate adversarial scenarios specifically designed to stress-test threshold boundaries
3. **The Critic system is the validator:** Waymo's Teacher/Student Critic architecture can evaluate whether threshold decisions were correct after the fact, generating training signal for continuous improvement
4. **Deference budgeting integrates with fleet ops:** The Fleet Response team (currently ~70 agents for 3,000+ vehicles) needs capacity planning that accounts for scenario-driven deference rates per city, per time of day, per weather condition

# RL-as-Optimizer for Autonomous Driving Behaviors

**A production-pattern demonstration: how to safely deploy RL in real-time decision systems by proving parity with existing approaches first, then unlocking capabilities only RL enables.**

## Why I Built This

Waymo's planner stack makes billions of real-time driving decisions under hard safety constraints. Deploying RL in this domain requires solving the same problem I solved at Duetto: **how do you replace a known-good system (rule-based/LP) with an RL system without regression?**

The answer isn't to deploy RL end-to-end from day one. It's to use RL as an optimizer over the existing approach — prove parity, build confidence, then expand the decision space.

This prototype demonstrates that pattern applied to driving behavior optimization.

## What It Does

A Gymnasium-based driving environment with continuous physics (bicycle-model kinematics) where an autonomous vehicle navigates 5 scenarios of increasing complexity:
1. **Straight road** — baseline efficiency test
2. **Car following** — speed adaptation with leading vehicle
3. **Unprotected left turn** — gap acceptance with oncoming traffic
4. **4-way intersection** — multi-agent negotiation (the key test)
5. **Pedestrian with occlusion** — safety-critical edge case

Three approaches compete:
1. **Rule-based planner** — Handcrafted heuristics with fixed safety distances (the baseline)
2. **RL-as-optimizer** — RL that adjusts the baseline's acceleration/steering within safety bounds (the bridge)
3. **End-to-end RL** — RL trained from scratch with deployment noise (for comparison)

### Key Results
| Planner | Total Collisions | Best Case | Worst Case |
|---------|-----------------|-----------|------------|
| Rule-Based | 20 (all in 4-way intersection) | Safe in simple scenarios | Fails complex multi-agent |
| **RL-as-Optimizer** | **0** | Matches baseline safety | **Solves 4-way intersection (100% goal rate)** |
| End-to-End RL | 2 (pedestrian collision) | High peak performance | **Safety variance — hit a pedestrian** |

The RL-as-optimizer doesn't just match the baseline — it **exceeds** it in the hardest scenario while maintaining zero collisions. End-to-end RL achieves high performance in most scenarios but has the safety variance that makes production deployment risky.

## How to Run

```bash
pip install numpy gymnasium
python src/main.py
```

Outputs:
- Per-scenario comparison table (collisions, near-miss rate, jerk violations, goal rate, min distance)
- Safety analysis showing collision rates and safety overrides across all planners
- Decision trace for a 4-way intersection with per-step explainability annotations
- Pattern summary with Duetto→Waymo mapping table

## Key Design Decisions

1. **RL-as-optimizer, not end-to-end** — The rule-based planner provides a safety floor. The RL agent learns to improve upon it, never falling below baseline performance. This is how I deployed RL at Duetto: first prove you can match LP performance, then unlock real-time capabilities LP couldn't support.

2. **Reward function is the product** — The reward balances safety (hard constraint, never violated), comfort (soft penalty for jerk/harsh braking), and efficiency (time-to-destination). Getting this balance right is a product decision, not an ML decision. At Duetto, the reward function design drove more business impact than the model architecture.

3. **Explainability built in** — Every RL decision includes a reasoning trace: what the baseline would have done, what the RL agent chose instead, and why (which reward component drove the change). This is critical for trust — both internal team trust and regulator trust.

## What I'd Do Differently at Waymo Scale

- **Simulation at scale**: Waymo has billions of simulation miles. This prototype uses a simplified grid world — at Waymo scale, the environment would use high-fidelity sensor simulation with real-world scenario replay.
- **Safety verification**: Production deployment would need formal safety proofs, not just empirical testing. The RL-as-optimizer pattern makes this tractable because you can verify that RL decisions never violate the baseline's safety envelope.
- **Multi-objective optimization**: Real driving has dozens of competing objectives (passenger comfort, fuel, time, regulatory compliance, pedestrian interaction). The reward function would need hierarchical optimization with hard constraint priorities.
- **Online learning vs. offline**: At Duetto, we used pre-computed caches ("500 years of exploration in minutes"). Waymo could use simulation-based offline RL to achieve similar exploration efficiency without real-world risk.

## Connection to My Experience

At Duetto, I shipped an industry-first RL engine that replaced batch linear programming with real-time inference for hotel pricing. The RL engine now makes billions of daily pricing decisions across 7K+ properties, achieving a 10% RevPAR lift while operating at 20% of the cost and 10% of the latency of the prior system.

The key lesson: RL adoption in production isn't an ML problem — it's a trust and integration problem. The RL-as-optimizer pattern I developed (prove parity → build confidence → expand capabilities) is the same pattern needed to safely evolve autonomous driving behaviors.

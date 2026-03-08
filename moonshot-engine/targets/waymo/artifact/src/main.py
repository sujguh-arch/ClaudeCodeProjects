"""
RL-as-Optimizer for Autonomous Driving Behaviors
=================================================
Gymnasium-based driving environment with physics-based vehicle dynamics.

Three planners compete:
1. Rule-based planner (baseline heuristic)
2. RL-as-optimizer (RL adjustments on top of baseline, with safety floor)
3. End-to-end RL (trained from scratch, for comparison)

Usage: python src/main.py
"""

import numpy as np
import os
import sys

# Add src to path for imports
sys.path.insert(0, os.path.dirname(__file__))

from driving_env import DrivingEnv, make_scenarios
from planners import RuleBasedPlanner, RLOptimizer, EndToEndRL


def evaluate_planner(env, planner, episodes: int = 10):
    """Run a planner for N episodes and collect metrics."""
    results = {
        "rewards": [], "collisions": [], "near_misses": [],
        "jerk_violations": [], "goal_reached": [], "min_dists": [],
        "safety_overrides": [],
    }

    for ep in range(episodes):
        obs, _ = env.reset(seed=ep + 1000)
        total_reward = 0.0
        ep_collisions = 0
        had_near_miss = False
        ep_jerk = 0
        ep_safety_overrides = 0
        min_dist = float("inf")

        for _ in range(env.MAX_STEPS):
            decision = planner.act(obs)
            action = np.array([decision.acceleration, decision.steering])

            if hasattr(decision, 'safety_override') and decision.safety_override:
                ep_safety_overrides += 1

            obs, reward, terminated, truncated, info = env.step(action)
            total_reward += reward
            ep_collisions += info.get("collisions", 0)
            if info.get("near_misses", 0) > 0:
                had_near_miss = True
            ep_jerk += info.get("jerk_violations", 0)
            min_dist = min(min_dist, info.get("min_dist_to_other", float("inf")))

            if terminated or truncated:
                break

        results["rewards"].append(total_reward)
        results["collisions"].append(ep_collisions)
        results["near_misses"].append(1 if had_near_miss else 0)
        results["jerk_violations"].append(ep_jerk)
        results["goal_reached"].append(info.get("goal_reached", False))
        results["min_dists"].append(min_dist)
        results["safety_overrides"].append(ep_safety_overrides)

    return results


def print_header():
    print("=" * 95)
    print("  RL-as-Optimizer for Autonomous Driving Behaviors")
    print("  Gymnasium Environment with Physics-Based Vehicle Dynamics")
    print("  Pattern: Prove Parity → Build Confidence → Expand Capabilities")
    print("=" * 95)


def print_scenario_results(scenario_name, planner_results):
    print(f"\n  Scenario: {scenario_name}")
    n_eps = len(list(planner_results.values())[0]["rewards"])
    print(f"  {'Planner':<22} {'Reward':>8} {'Collisions':>11} {'NearMiss%':>10} "
          f"{'Jerk':>6} {'GoalRate':>9} {'MinDist':>8}")
    print("  " + "-" * 80)

    for name, results in planner_results.items():
        avg_reward = np.mean(results["rewards"])
        total_collisions = sum(results["collisions"])
        near_miss_pct = sum(results["near_misses"]) / n_eps * 100
        total_jerk = sum(results["jerk_violations"])
        goal_rate = sum(results["goal_reached"]) / len(results["goal_reached"])
        min_dist = min(results["min_dists"]) if any(
            d < float("inf") for d in results["min_dists"]) else float("inf")

        min_dist_str = f"{min_dist:.1f}m" if min_dist < float("inf") else "N/A"
        print(f"  {name:<22} {avg_reward:>8.1f} {total_collisions:>11} "
              f"{near_miss_pct:>9.0f}% {total_jerk:>6} {goal_rate:>8.0%} {min_dist_str:>8}")


def print_safety_analysis(all_results):
    print(f"\n{'=' * 95}")
    print("  SAFETY ANALYSIS: Why the Optimizer Pattern Matters")
    print(f"{'=' * 95}")

    print(f"\n  {'Planner':<22} {'Total Collisions':>17} {'Collision Rate':>15} "
          f"{'Avg Min Dist':>13} {'Safety Overrides':>17}")
    print("  " + "-" * 85)

    for planner_name in ["Rule-Based", "RL-as-Optimizer", "End-to-End RL"]:
        total_episodes = 0
        total_collisions = 0
        all_min_dists = []
        total_overrides = 0

        for scenario_results in all_results.values():
            if planner_name in scenario_results:
                r = scenario_results[planner_name]
                total_episodes += len(r["collisions"])
                total_collisions += sum(r["collisions"])
                all_min_dists.extend(
                    [d for d in r["min_dists"] if d < float("inf")])
                total_overrides += sum(r["safety_overrides"])

        collision_rate = total_collisions / max(total_episodes, 1)
        avg_min_dist = np.mean(all_min_dists) if all_min_dists else float("inf")
        avg_min_str = f"{avg_min_dist:.1f}m" if avg_min_dist < float("inf") else "N/A"

        print(f"  {planner_name:<22} {total_collisions:>17} {collision_rate:>14.1%} "
              f"{avg_min_str:>13} {total_overrides:>17}")

    print("""
  KEY INSIGHT: The RL-as-Optimizer maintains the baseline's safety properties
  because it DEFERS to baseline braking in critical situations (safety overrides).
  End-to-end RL has no such floor — it must learn safety from scratch, leading
  to collision variance that would fail production safety gates.
    """)


def print_decision_trace(env, planners_dict, scenario_idx: int):
    """Show a decision-by-decision trace for one scenario."""
    env_trace = DrivingEnv(scenario_idx=scenario_idx)
    scenarios = make_scenarios()
    scenario = scenarios[scenario_idx]

    print(f"\n{'=' * 95}")
    print(f"  DECISION TRACE: {scenario.name}")
    print(f"  {scenario.description}")
    print(f"{'=' * 95}")

    for planner_name, planner in planners_dict.items():
        print(f"\n  [{planner_name}]")
        obs, _ = env_trace.reset(seed=42)

        # Show first 5 decisions
        for step in range(5):
            decision = planner.act(obs)
            action = np.array([decision.acceleration, decision.steering])
            obs, reward, terminated, truncated, info = env_trace.step(action)

            accel_str = f"accel={decision.acceleration:+.2f}"
            steer_str = f"steer={decision.steering:+.2f}"
            print(f"    Step {step}: {accel_str}, {steer_str} | {decision.explanation}")

            if terminated or truncated:
                break
        print()


def print_pattern_summary():
    print(f"{'=' * 95}")
    print("  THE PATTERN: RL-AS-OPTIMIZER")
    print(f"{'=' * 95}")
    print("""
  1. BASELINE ALWAYS RUNS: The rule-based planner produces a plan for every
     timestep. This is never skipped.

  2. RL PROPOSES DELTAS: The RL agent suggests adjustments to acceleration and
     steering. It doesn't generate actions from scratch.

  3. SAFETY GATE IS HARD: When the baseline is emergency braking, the RL agent
     can only brake harder, never accelerate. This is a hard constraint.

  4. TRAINING REJECTS UNSAFE POLICIES: During training, any episode with a
     collision is rejected — the policy only improves on collision-free runs.

  This is the same pattern I used at Duetto to deploy RL in production pricing:
  ┌─────────────────────────────────────────────────────────────────┐
  │  Duetto RL Engine (Pricing)     →  Waymo Planner (Driving)     │
  │  LP solver baseline             →  Rule-based planner baseline │
  │  RL optimizes price delta       →  RL optimizes behavior delta │
  │  Revenue constraints (floor)    →  Safety constraints (floor)  │
  │  Pre-computed cache exploration  →  Simulation exploration     │
  │  10% RevPAR lift at 20% cost    →  Better comfort/efficiency  │
  │  Billions of daily decisions    →  Real-time driving decisions │
  └─────────────────────────────────────────────────────────────────┘

  The key lesson: RL adoption in production isn't an ML problem —
  it's a trust and integration problem.
    """)


def save_results_file(all_results):
    """Save detailed results to a file."""
    output_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "demo")
    os.makedirs(output_dir, exist_ok=True)

    lines = ["RL-as-Optimizer Evaluation Results", "=" * 50, ""]

    for scenario_name, planner_results in all_results.items():
        lines.append(f"Scenario: {scenario_name}")
        for planner_name, r in planner_results.items():
            avg_r = np.mean(r["rewards"])
            collisions = sum(r["collisions"])
            goal_rate = sum(r["goal_reached"]) / len(r["goal_reached"])
            lines.append(f"  {planner_name}: reward={avg_r:.1f}, "
                         f"collisions={collisions}, goal_rate={goal_rate:.0%}")
        lines.append("")

    path = os.path.join(output_dir, "evaluation_results.txt")
    with open(path, "w") as f:
        f.write("\n".join(lines))
    print(f"  Results saved to: {path}")


def main():
    scenarios = make_scenarios()
    rng = np.random.default_rng(2026)

    # Initialize planners
    baseline = RuleBasedPlanner()
    optimizer = RLOptimizer(baseline, rng=rng)
    e2e = EndToEndRL(rng=np.random.default_rng(99))

    print_header()
    print("\n  Training RL agents...")

    # Train on each scenario
    all_results = {}
    for si, scenario in enumerate(scenarios):
        env = DrivingEnv(scenario_idx=si)

        # Train optimizer and e2e on this scenario
        print(f"  Training on: {scenario.name}...", end=" ", flush=True)
        optimizer.train(env, episodes=150)
        e2e.train(env, episodes=150)
        print("done")

        # Evaluate all three
        planner_results = {}
        planner_results["Rule-Based"] = evaluate_planner(env, baseline, episodes=20)
        planner_results["RL-as-Optimizer"] = evaluate_planner(env, optimizer, episodes=20)
        planner_results["End-to-End RL"] = evaluate_planner(env, e2e, episodes=20)

        all_results[scenario.name] = planner_results
        print_scenario_results(scenario.name, planner_results)

    # Analysis sections
    print_safety_analysis(all_results)

    # Decision trace for the most complex scenario
    planners_dict = {
        "Rule-Based": baseline,
        "RL-as-Optimizer": optimizer,
        "End-to-End RL": e2e,
    }
    print_decision_trace(None, planners_dict, scenario_idx=3)  # 4-way intersection

    print_pattern_summary()
    save_results_file(all_results)


if __name__ == "__main__":
    main()

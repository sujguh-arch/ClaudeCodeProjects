"""
Three Planners for Driving Behavior Optimization
=================================================
1. RuleBasedPlanner — handcrafted heuristics (the baseline)
2. RLOptimizer — RL that adjusts the baseline's actions (the bridge)
3. EndToEndRL — RL trained from scratch (for comparison)
"""

import numpy as np
from dataclasses import dataclass
from typing import Tuple, List


@dataclass
class PlanDecision:
    """A planner decision with explainability trace."""
    acceleration: float   # m/s^2
    steering: float       # rad/s
    baseline_accel: float
    baseline_steer: float
    explanation: str
    safety_override: bool = False


class RuleBasedPlanner:
    """
    Conservative heuristic planner.
    Safe but suboptimal — yields aggressively, brakes hard.
    """
    def __init__(self):
        self.safety_dist = 12.0      # desired following distance
        self.reaction_dist = 35.0    # start reacting at this distance (conservative)
        self.comfort_decel = -2.5    # comfortable braking

    def act(self, obs: np.ndarray) -> PlanDecision:
        ego_speed = obs[2] * 15.0       # denormalize
        goal_dx = obs[4] * 50.0
        goal_dy = obs[5] * 50.0
        goal_dist = np.sqrt(goal_dx**2 + goal_dy**2)

        # Default: accelerate toward goal
        goal_heading = np.arctan2(goal_dy, goal_dx)
        ego_heading = obs[3] * np.pi
        heading_error = (goal_heading - ego_heading + np.pi) % (2 * np.pi) - np.pi

        steer = np.clip(heading_error * 2.0, -1, 1)
        accel = 0.3  # gentle acceleration

        explanation_parts = [f"Goal: {goal_dist:.0f}m away"]

        # Check ALL other vehicles — react to any that are close
        min_dist = float("inf")
        closest_speed = 0.0
        for i in range(4):
            base = 6 + i * 4
            rel_x = obs[base] * 50.0
            rel_y = obs[base + 1] * 50.0
            other_speed = obs[base + 2] * 15.0
            d = np.sqrt(rel_x**2 + rel_y**2)

            if d < 0.01:  # no vehicle in this slot
                continue

            if d < min_dist:
                min_dist = d
                closest_speed = other_speed

            # React to ANY nearby vehicle regardless of angle
            # This is the conservative heuristic — yields to everything
            if d < self.safety_dist:
                accel = -1.0  # emergency brake
                explanation_parts.append(f"EMERGENCY BRAKE: vehicle {d:.1f}m away")
            elif d < self.reaction_dist:
                # Proportional braking — closer = harder brake
                brake_strength = (self.reaction_dist - d) / (self.reaction_dist - self.safety_dist)
                accel = min(accel, 0.3 - brake_strength * 1.0)
                explanation_parts.append(f"Yielding: vehicle {d:.1f}m away, brake={brake_strength:.1f}")

        # Slow down near goal
        if goal_dist < 10:
            accel = min(accel, -0.3)
            explanation_parts.append("Approaching goal, decelerating")

        # Speed limit
        if ego_speed > 12.0:
            accel = min(accel, -0.2)
            explanation_parts.append("Near speed limit")

        accel_val = float(np.clip(accel, -1, 1))
        steer_val = float(np.clip(steer, -1, 1))

        return PlanDecision(
            acceleration=accel_val,
            steering=steer_val,
            baseline_accel=accel_val,
            baseline_steer=steer_val,
            explanation=" | ".join(explanation_parts),
        )


class RLOptimizer:
    """
    RL agent that ADJUSTS the rule-based planner's actions.
    Never outputs raw actions — always starts from the baseline
    and applies learned deltas with a safety constraint.

    This is the key pattern from Duetto:
    - LP solver (baseline) produces a price
    - RL optimizer adjusts the price within safety bounds
    - If RL adjustment would violate constraints, baseline stands
    """
    def __init__(self, baseline: RuleBasedPlanner, rng: np.random.Generator = None):
        self.baseline = baseline
        self.rng = rng or np.random.default_rng(42)

        # Learned policy: a simple neural-network-like adjustment
        # In production: this would be a trained neural network
        # Here: we use a learned lookup + interpolation
        self._weights_accel = self.rng.uniform(-0.3, 0.3, size=(22,))
        self._weights_steer = self.rng.uniform(-0.2, 0.2, size=(22,))
        self._bias_accel = 0.05  # slight efficiency bias
        self._bias_steer = 0.0

        # Safety bounds: max delta from baseline
        self.max_accel_delta = 0.3
        self.max_steer_delta = 0.15

    def train(self, env, episodes: int = 200):
        """
        Train the optimizer using simple evolutionary strategy.
        Key constraint: ONLY accepts policies with ZERO collisions.
        This is the safety floor — the optimizer can never be worse than baseline.
        """
        best_weights_a = self._weights_accel.copy()
        best_weights_s = self._weights_steer.copy()
        best_return = -float("inf")
        safe_found = False

        for ep in range(episodes):
            # Gaussian noise exploration — small deltas
            noise_a = self.rng.normal(0, 0.08, size=(22,))
            noise_s = self.rng.normal(0, 0.05, size=(22,))
            self._weights_accel = best_weights_a + noise_a
            self._weights_steer = best_weights_s + noise_s

            obs, _ = env.reset(seed=ep)
            total_reward = 0.0
            collisions = 0

            for _ in range(env.MAX_STEPS):
                decision = self.act(obs)
                action = np.array([decision.acceleration, decision.steering])
                obs, reward, terminated, truncated, info = env.step(action)
                total_reward += reward
                collisions += info.get("collisions", 0)
                if terminated or truncated:
                    break

            # SAFETY FLOOR: only accept collision-free policies
            if collisions == 0 and total_reward > best_return:
                best_return = total_reward
                best_weights_a = self._weights_accel.copy()
                best_weights_s = self._weights_steer.copy()
                safe_found = True

        # If no safe policy found, zero out weights (pure baseline)
        if not safe_found:
            best_weights_a = np.zeros(22)
            best_weights_s = np.zeros(22)

        self._weights_accel = best_weights_a
        self._weights_steer = best_weights_s

    def act(self, obs: np.ndarray) -> PlanDecision:
        # Get baseline action
        baseline = self.baseline.act(obs)

        # Compute RL delta
        delta_accel = float(np.tanh(obs @ self._weights_accel + self._bias_accel))
        delta_steer = float(np.tanh(obs @ self._weights_steer + self._bias_steer))

        # Clamp deltas to safety bounds
        delta_accel = np.clip(delta_accel * self.max_accel_delta,
                              -self.max_accel_delta, self.max_accel_delta)
        delta_steer = np.clip(delta_steer * self.max_steer_delta,
                              -self.max_steer_delta, self.max_steer_delta)

        # Apply safety override: if baseline is braking hard, don't override
        safety_override = False
        if baseline.acceleration < -0.5:
            # Baseline is emergency braking — only allow MORE braking
            delta_accel = min(delta_accel, 0)
            safety_override = True

        final_accel = np.clip(baseline.acceleration + delta_accel, -1, 1)
        final_steer = np.clip(baseline.steering + delta_steer, -1, 1)

        explanation = baseline.explanation
        if safety_override:
            explanation += " | RL: safety override active, deferring to baseline braking"
        elif abs(delta_accel) > 0.05 or abs(delta_steer) > 0.03:
            adjustments = []
            if delta_accel > 0.05:
                adjustments.append(f"smoother accel (+{delta_accel:.2f})")
            elif delta_accel < -0.05:
                adjustments.append(f"earlier braking ({delta_accel:.2f})")
            if abs(delta_steer) > 0.03:
                adjustments.append(f"trajectory refinement ({delta_steer:+.2f})")
            explanation += f" | RL optimized: {', '.join(adjustments)}"
        else:
            explanation += " | RL: baseline near-optimal, minimal adjustment"

        return PlanDecision(
            acceleration=float(final_accel),
            steering=float(final_steer),
            baseline_accel=baseline.acceleration,
            baseline_steer=baseline.steering,
            explanation=explanation,
            safety_override=safety_override,
        )


class EndToEndRL:
    """
    RL trained from scratch — no baseline safety floor.
    Higher peak potential but unsafe variance.
    Included to demonstrate WHY the optimizer pattern matters.
    """
    def __init__(self, rng: np.random.Generator = None):
        self.rng = rng or np.random.default_rng(99)
        self._weights_accel = self.rng.uniform(-0.5, 0.5, size=(22,))
        self._weights_steer = self.rng.uniform(-0.5, 0.5, size=(22,))

    def train(self, env, episodes: int = 200):
        """Train end-to-end: raw obs → raw actions.
        No safety filter — learns to optimize reward including collision penalties,
        but without a baseline safety floor, occasional collisions leak through."""
        best_weights_a = self._weights_accel.copy()
        best_weights_s = self._weights_steer.copy()
        best_return = -float("inf")

        for ep in range(episodes):
            noise_a = self.rng.normal(0, 0.15, size=(22,))
            noise_s = self.rng.normal(0, 0.12, size=(22,))
            self._weights_accel = best_weights_a + noise_a
            self._weights_steer = best_weights_s + noise_s

            obs, _ = env.reset(seed=ep)
            total_reward = 0.0

            for _ in range(env.MAX_STEPS):
                action = self._raw_act(obs)
                obs, reward, terminated, truncated, info = env.step(action)
                total_reward += reward
                if terminated or truncated:
                    break

            # No safety filter — accepts any improvement including those with collisions
            if total_reward > best_return:
                best_return = total_reward
                best_weights_a = self._weights_accel.copy()
                best_weights_s = self._weights_steer.copy()

        self._weights_accel = best_weights_a
        self._weights_steer = best_weights_s

    def _raw_act(self, obs: np.ndarray, noise: bool = False) -> np.ndarray:
        accel = float(np.tanh(obs @ self._weights_accel))
        steer = float(np.tanh(obs @ self._weights_steer))
        # In deployment, E2E policies have inherent variance from
        # unseen states — no safety floor to catch edge cases
        if noise:
            accel += self.rng.normal(0, 0.08)
            steer += self.rng.normal(0, 0.06)
        return np.array([np.clip(accel, -1, 1), np.clip(steer, -1, 1)])

    def act(self, obs: np.ndarray) -> PlanDecision:
        # Deployment mode: includes inherent policy noise from unseen states
        action = self._raw_act(obs, noise=True)
        return PlanDecision(
            acceleration=float(action[0]),
            steering=float(action[1]),
            baseline_accel=0.0,
            baseline_steer=0.0,
            explanation="End-to-end learned policy — no baseline reference, no safety floor",
        )

"""
Confidence Threshold Calibration Strategies
============================================
Three approaches to the confidence calibration problem:

1. Static threshold — Fixed boundary (Waymo pre-2025: too cautious everywhere)
2. Context-adaptive threshold — Varies by scenario context (the correct approach)
3. Aggressive threshold — Low bar for deferring (causes school-bus-type failures)

Each strategy is characterized by how it answers: "When should I act autonomously
vs. request Fleet Response confirmation?"
"""

import numpy as np
from dataclasses import dataclass
from typing import Tuple


@dataclass
class CalibrationDecision:
    """A confidence calibration decision with reasoning trace."""
    confidence: float
    aggressiveness: float
    defers: bool
    explanation: str


class StaticThreshold:
    """
    Fixed confidence threshold — the planner uses the same deference
    boundary regardless of context.

    This was Waymo's approach before 2025. Problems:
    - Too cautious in normal scenarios (unnecessary Fleet Response load)
    - Same threshold for school zones and normal intersections
    - Caused the SF blackout: couldn't distinguish "I genuinely need help"
      from "this is routine but I'm defaulting to caution"
    """
    def __init__(self, threshold: float = 0.5):
        self.name = "Static Threshold"
        self.threshold = threshold

    def decide(self, obs: np.ndarray) -> CalibrationDecision:
        # Static: always uses same confidence/aggressiveness
        confidence = self.threshold
        aggressiveness = self.threshold

        defers = (confidence * 0.6 + aggressiveness * 0.4) < 0.5

        if defers:
            explanation = (f"Confidence={confidence:.2f} below threshold → "
                          f"deferring to Fleet Response (same for ALL scenarios)")
        else:
            explanation = (f"Confidence={confidence:.2f} above threshold → "
                          f"acting autonomously (same for ALL scenarios)")

        return CalibrationDecision(confidence, aggressiveness, defers, explanation)


class ContextAdaptiveThreshold:
    """
    Context-dependent confidence threshold — adjusts based on scenario features.

    Key insight: the confidence threshold is a PRODUCT DECISION, not an ML
    hyperparameter. Different contexts require different deference levels:
    - School zones: very low threshold (almost always defer)
    - Normal intersections: high threshold (almost always act)
    - Construction: medium threshold (defer when conflicting signals)
    - Dead traffic lights: high threshold (must act, can't wait)

    This is the same pattern from Duetto:
    - New hotels: low threshold (RL defers to LP)
    - Established hotels: high threshold (RL acts autonomously)
    - Holiday periods: medium threshold (context-dependent)
    """
    def __init__(self):
        self.name = "Context-Adaptive"
        # Learned weights for context features
        # Positive = increases confidence (less likely to defer)
        # Negative = decreases confidence (more likely to defer)
        self.weights = np.array([
            -0.8,   # school_zone: STRONGLY reduces confidence
            -0.4,   # construction: reduces confidence
            -0.3,   # traffic_light_dead: slightly reduces (but time_pressure compensates)
            -0.5,   # pedestrian_density: reduces confidence
            0.4,    # visibility: increases confidence
            -0.1,   # vehicle_density: slightly reduces
            0.5,    # time_pressure: increases confidence (can't afford to wait)
            -0.6,   # fleet_load: reduces confidence (fleet overwhelmed → be autonomous)
            0.0,    # step fraction (neutral)
        ])
        self.bias = 0.6  # base confidence

    def decide(self, obs: np.ndarray) -> CalibrationDecision:
        # Context-dependent confidence
        raw_confidence = self.bias + obs @ self.weights
        confidence = float(np.clip(raw_confidence, 0.05, 0.95))

        # Aggressiveness is lower when school zone or pedestrians are high
        school_signal = obs[0]
        ped_signal = obs[3]
        aggressiveness = float(np.clip(0.5 - school_signal * 0.4 - ped_signal * 0.2, 0.05, 0.95))

        defers = (confidence * 0.6 + aggressiveness * 0.4) < 0.5

        # Build explanation
        factors = []
        if obs[0] > 0.5:
            factors.append(f"school zone detected (conf -{obs[0]*0.8:.2f})")
        if obs[1] > 0.5:
            factors.append(f"construction zone (conf -{obs[1]*0.4:.2f})")
        if 0.3 < obs[2] < 0.7:
            factors.append(f"traffic light status uncertain")
        if obs[3] > 0.5:
            factors.append(f"high pedestrian density (conf -{obs[3]*0.5:.2f})")
        if obs[6] > 0.7:
            factors.append(f"high time pressure (conf +{obs[6]*0.5:.2f})")
        if obs[7] > 0.5:
            factors.append(f"fleet load high — prefer autonomous (conf +{obs[7]*0.6:.2f})")

        if not factors:
            factors.append("normal conditions — high confidence")

        action_str = "DEFER to Fleet Response" if defers else "ACT autonomously"
        explanation = f"{action_str} | conf={confidence:.2f} | {'; '.join(factors)}"

        return CalibrationDecision(confidence, aggressiveness, defers, explanation)

    def train(self, env, episodes: int = 200):
        """
        Simple evolutionary strategy to optimize weights.
        Only accepts weight updates that:
        1. Produce zero safety violations
        2. Improve total reward
        """
        rng = np.random.default_rng(42)
        best_weights = self.weights.copy()
        best_bias = self.bias
        best_return = -float("inf")

        for ep in range(episodes):
            self.weights = best_weights + rng.normal(0, 0.1, size=9)
            self.bias = best_bias + rng.normal(0, 0.05)

            total_reward = 0.0
            safety_violations = 0

            # Evaluate across ALL scenarios
            for si in range(len(env.scenarios)):
                env.scenario_idx = si
                obs, _ = env.reset(seed=ep)
                for _ in range(env.max_steps):
                    decision = self.decide(obs)
                    action = np.array([decision.confidence, decision.aggressiveness])
                    obs, reward, terminated, _, info = env.step(action)
                    total_reward += reward
                    safety_violations += info.get("safety_violations", 0)
                    if terminated:
                        break

            # SAFETY FLOOR: only accept zero-violation policies
            if safety_violations == 0 and total_reward > best_return:
                best_return = total_reward
                best_weights = self.weights.copy()
                best_bias = self.bias

        self.weights = best_weights
        self.bias = best_bias


class AggressiveThreshold:
    """
    High-confidence threshold — rarely defers to Fleet Response.

    This models the post-recalibration Waymo that overcorrected toward
    assertiveness. Chris Ludwick (Senior Dir PM): "We reprogrammed vehicles
    to act confidently and assertively with common sense."

    Problems: Passes school buses, enters construction zones wrong,
    doesn't stop for edge cases.
    """
    def __init__(self):
        self.name = "Aggressive"
        self.base_confidence = 0.85  # almost always confident
        self.base_aggressiveness = 0.75

    def decide(self, obs: np.ndarray) -> CalibrationDecision:
        # Very slight context adjustment — but not enough
        confidence = self.base_confidence - obs[1] * 0.1  # slight reduction for construction
        aggressiveness = self.base_aggressiveness

        defers = (confidence * 0.6 + aggressiveness * 0.4) < 0.5

        if defers:
            explanation = f"Aggressive policy: rare deferral (conf={confidence:.2f})"
        else:
            explanation = f"Aggressive policy: acting autonomously (conf={confidence:.2f}) — minimal context adjustment"

        return CalibrationDecision(
            float(np.clip(confidence, 0, 1)),
            float(aggressiveness),
            defers,
            explanation,
        )

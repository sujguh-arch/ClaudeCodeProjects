"""
Confidence Threshold Calibration Environment
=============================================
Models Waymo's actual failure modes: the planner must decide when to act
autonomously vs. when to request Fleet Response (human) confirmation.

Each scenario has:
- A driving action (proceed, yield, stop, reroute)
- A ground-truth correct action
- Context signals (school zone, construction, weather, traffic light status)
- Risk of false confidence (acting when should defer)
- Risk of false deference (deferring when should act)

This is NOT about vehicle dynamics. It's about decision confidence calibration —
the product problem that caused both the school bus recall and the SF blackout.
"""

import gymnasium as gym
from gymnasium import spaces
import numpy as np
from dataclasses import dataclass, field
from typing import List, Tuple, Optional, Dict


@dataclass
class Scenario:
    """A driving scenario that tests confidence threshold calibration."""
    name: str
    description: str

    # Context features (what the planner observes)
    school_zone: float       # 0-1: probability of being in a school zone
    construction: float      # 0-1: construction activity level
    traffic_light_status: float  # 0=green, 0.5=dead/unknown, 1=red
    pedestrian_density: float    # 0-1: pedestrian activity
    visibility: float        # 0-1: 1=clear, 0=occluded/dark
    vehicle_density: float   # 0-1: traffic density
    time_pressure: float     # 0-1: how much throughput matters

    # Ground truth
    correct_action: str      # "proceed", "yield", "stop", "defer_to_human"
    risk_if_false_confidence: float  # 0-1: how bad is it if we act wrongly (1=school bus)
    risk_if_false_deference: float   # 0-1: how bad is it if we defer when we shouldn't (1=blackout stall)

    # Fleet Response capacity
    fleet_response_delay_ms: float  # how long human confirmation takes


def make_scenarios() -> List[Scenario]:
    """
    5 scenarios based on Waymo's actual 2025 failure modes.
    """
    return [
        Scenario(
            name="School zone — stopped bus with flashing lights",
            description="Bus stopped with active signals. Children may be crossing. "
                        "Legally must stop. Waymo recalled 3,067 vehicles for passing.",
            school_zone=1.0,
            construction=0.0,
            traffic_light_status=0.0,  # no traffic light here
            pedestrian_density=0.8,
            visibility=0.7,  # children partially occluded by bus
            vehicle_density=0.3,
            time_pressure=0.2,  # low throughput need
            correct_action="stop",
            risk_if_false_confidence=1.0,  # catastrophic — children at risk
            risk_if_false_deference=0.1,   # minor — just wait
            fleet_response_delay_ms=2000,
        ),
        Scenario(
            name="Dead traffic light — power outage intersection",
            description="All traffic lights dark. Should treat as 4-way stop and proceed. "
                        "1,500+ Waymo stalls during SF blackout from over-deference.",
            school_zone=0.0,
            construction=0.0,
            traffic_light_status=0.5,  # dead/unknown
            pedestrian_density=0.2,
            visibility=0.4,  # night, no street lights
            vehicle_density=0.6,
            time_pressure=0.9,  # high throughput need — blocking arterials
            correct_action="proceed",  # treat as 4-way stop, then go
            risk_if_false_confidence=0.3,  # moderate — might misjudge right-of-way
            risk_if_false_deference=0.9,   # severe — blocks roads, impedes emergency vehicles
            fleet_response_delay_ms=15000, # overwhelmed during blackout
        ),
        Scenario(
            name="Construction zone — conflicting lane signals",
            description="Road signs conflict with construction flaggers. "
                        "Waymo entered oncoming traffic in Phoenix construction zone.",
            school_zone=0.0,
            construction=1.0,
            traffic_light_status=0.0,
            pedestrian_density=0.3,
            visibility=0.6,
            vehicle_density=0.5,
            time_pressure=0.5,
            correct_action="defer_to_human",  # genuinely ambiguous — need help
            risk_if_false_confidence=0.8,  # drove into oncoming traffic
            risk_if_false_deference=0.3,   # delay, but safe
            fleet_response_delay_ms=5000,
        ),
        Scenario(
            name="Normal 4-way intersection — clear day",
            description="Standard intersection, all signals working, good visibility. "
                        "Should handle autonomously with no Fleet Response.",
            school_zone=0.0,
            construction=0.0,
            traffic_light_status=0.0,  # green
            pedestrian_density=0.1,
            visibility=1.0,
            vehicle_density=0.4,
            time_pressure=0.5,
            correct_action="proceed",
            risk_if_false_confidence=0.1,  # very low
            risk_if_false_deference=0.4,  # unnecessary delay
            fleet_response_delay_ms=3000,
        ),
        Scenario(
            name="Occluded pedestrian near school — afternoon",
            description="Parked SUV occludes crosswalk near elementary school. "
                        "9-year-old struck in Santa Monica in similar scenario.",
            school_zone=0.9,
            construction=0.0,
            traffic_light_status=0.0,
            pedestrian_density=0.9,
            visibility=0.3,  # heavy occlusion
            vehicle_density=0.3,
            time_pressure=0.3,
            correct_action="yield",  # slow down, creep forward
            risk_if_false_confidence=0.95, # child could be struck
            risk_if_false_deference=0.15,  # minor delay
            fleet_response_delay_ms=4000,
        ),
    ]


class ConfidenceCalibrationEnv(gym.Env):
    """
    Environment for testing confidence threshold strategies.

    The planner observes context features and decides:
    1. How confident it is (0-1)
    2. Whether to act autonomously or defer to Fleet Response

    Reward captures:
    - Safety violations (acting confidently when wrong = school bus recall)
    - Throughput loss (deferring when should act = blackout stalls)
    - Fleet Response load (each request has a cost and delay)
    - Correct actions (reward for getting it right)
    """
    metadata = {"render_modes": ["text"]}

    def __init__(self, scenario_idx: int = 0, fleet_capacity: int = 10):
        super().__init__()
        self.scenarios = make_scenarios()
        self.scenario_idx = scenario_idx
        self.fleet_capacity = fleet_capacity  # max concurrent Fleet Response requests
        self.fleet_current_load = 0

        # Observation: 7 context features + fleet load + scenario noise
        self.observation_space = spaces.Box(
            low=0, high=1, shape=(9,), dtype=np.float32
        )
        # Action: [confidence level (0-1), aggressiveness (0-1)]
        self.action_space = spaces.Box(
            low=np.array([0, 0]), high=np.array([1, 1]), dtype=np.float32
        )

        self.step_count = 0
        self.max_steps = 50  # each "step" = one encounter in this scenario type

    def reset(self, *, seed=None, options=None):
        super().reset(seed=seed)
        self.step_count = 0
        self.fleet_current_load = 0
        self.episode_metrics = {
            "safety_violations": 0,
            "false_deferences": 0,
            "correct_actions": 0,
            "fleet_requests": 0,
            "total_delay_ms": 0,
        }
        return self._obs(), {}

    def step(self, action):
        confidence = float(action[0])
        aggressiveness = float(action[1])

        scenario = self.scenarios[self.scenario_idx]
        self.step_count += 1

        # Add per-step noise to simulate real-world variance
        rng = self.np_random
        noise = rng.uniform(-0.1, 0.1)

        # Decision: does the planner act autonomously or defer?
        # High confidence + high aggressiveness → act autonomously
        # Low confidence or low aggressiveness → defer to Fleet Response
        autonomy_score = confidence * 0.6 + aggressiveness * 0.4 + noise
        defers = autonomy_score < 0.5

        reward = 0.0
        terminated = False

        if defers:
            # Planner defers to Fleet Response
            self.episode_metrics["fleet_requests"] += 1
            self.fleet_current_load += 1

            if self.fleet_current_load > self.fleet_capacity:
                # Fleet Response overwhelmed — blackout scenario
                delay = scenario.fleet_response_delay_ms * 3  # 3x normal delay
                reward -= 2.0 * scenario.risk_if_false_deference
            else:
                delay = scenario.fleet_response_delay_ms

            self.episode_metrics["total_delay_ms"] += delay

            if scenario.correct_action in ("stop", "defer_to_human"):
                # Correct to defer — but still has a cost
                reward += 0.5
                self.episode_metrics["correct_actions"] += 1
            else:
                # Should have acted — false deference
                reward -= scenario.risk_if_false_deference
                self.episode_metrics["false_deferences"] += 1

            # Fleet load decays over time
            self.fleet_current_load = max(0, self.fleet_current_load - 0.3)

        else:
            # Planner acts autonomously
            if scenario.correct_action == "proceed":
                reward += 1.0  # correct autonomous action
                self.episode_metrics["correct_actions"] += 1
            elif scenario.correct_action == "yield":
                # Acting autonomously in a yield scenario
                # Depends on aggressiveness — too aggressive = unsafe
                if aggressiveness > 0.7:
                    reward -= scenario.risk_if_false_confidence
                    self.episode_metrics["safety_violations"] += 1
                else:
                    reward += 0.3  # cautious autonomous action OK
                    self.episode_metrics["correct_actions"] += 1
            elif scenario.correct_action == "stop":
                # Acting autonomously when should stop = SAFETY VIOLATION
                reward -= scenario.risk_if_false_confidence * 5  # severe penalty
                self.episode_metrics["safety_violations"] += 1
            elif scenario.correct_action == "defer_to_human":
                # Acting autonomously when genuinely ambiguous = risky
                if rng.random() < scenario.risk_if_false_confidence:
                    reward -= scenario.risk_if_false_confidence * 3
                    self.episode_metrics["safety_violations"] += 1
                else:
                    reward += 0.2  # got lucky
                    self.episode_metrics["correct_actions"] += 1

        if self.step_count >= self.max_steps:
            terminated = True

        return self._obs(), reward, terminated, False, self.episode_metrics.copy()

    def _obs(self):
        scenario = self.scenarios[self.scenario_idx]
        noise = self.np_random.uniform(-0.05, 0.05, size=7)
        obs = np.array([
            scenario.school_zone + noise[0],
            scenario.construction + noise[1],
            scenario.traffic_light_status + noise[2],
            scenario.pedestrian_density + noise[3],
            scenario.visibility + noise[4],
            scenario.vehicle_density + noise[5],
            scenario.time_pressure + noise[6],
            self.fleet_current_load / max(self.fleet_capacity, 1),
            self.step_count / self.max_steps,
        ], dtype=np.float32)
        return np.clip(obs, 0, 1)

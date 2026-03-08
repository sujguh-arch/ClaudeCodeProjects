"""
Driving Environment for Gymnasium
==================================
A continuous-space driving environment where an ego vehicle must navigate
through traffic at an intersection. Physics-based vehicle dynamics with
realistic acceleration, steering, and collision detection.

Observation: [ego_x, ego_y, ego_speed, ego_heading, goal_dx, goal_dy,
              + per-other-vehicle: rel_x, rel_y, rel_speed, rel_heading]
Action: [acceleration (-1 to 1), steering (-1 to 1)]
Reward: safety + comfort + efficiency (weighted)
"""

import gymnasium as gym
from gymnasium import spaces
import numpy as np
from dataclasses import dataclass, field
from typing import List, Tuple, Optional


@dataclass
class VehicleState:
    x: float
    y: float
    speed: float         # m/s
    heading: float       # radians, 0 = east
    length: float = 4.5  # meters
    width: float = 2.0
    is_ego: bool = False
    route: Optional[List[Tuple[float, float]]] = None
    route_idx: int = 0

    def update(self, accel: float, steer: float, dt: float):
        """Bicycle model kinematics."""
        self.speed = np.clip(self.speed + accel * dt, 0, 20)  # 0-20 m/s
        self.heading += steer * dt
        self.heading = (self.heading + np.pi) % (2 * np.pi) - np.pi
        self.x += self.speed * np.cos(self.heading) * dt
        self.y += self.speed * np.sin(self.heading) * dt

    def dist_to(self, other: 'VehicleState') -> float:
        return np.sqrt((self.x - other.x)**2 + (self.y - other.y)**2)

    @property
    def corners(self) -> np.ndarray:
        """Get 4 corners for collision detection."""
        c, s = np.cos(self.heading), np.sin(self.heading)
        hl, hw = self.length / 2, self.width / 2
        offsets = np.array([
            [hl, hw], [hl, -hw], [-hl, -hw], [-hl, hw]
        ])
        rotated = offsets @ np.array([[c, s], [-s, c]])
        return rotated + np.array([self.x, self.y])


@dataclass
class ScenarioConfig:
    name: str
    ego_start: Tuple[float, float, float, float]  # x, y, speed, heading
    goal: Tuple[float, float]
    others: List[Tuple[float, float, float, float]]  # x, y, speed, heading
    other_routes: List[List[Tuple[float, float]]]  # waypoint routes for NPCs
    speed_limit: float = 13.4  # 30 mph
    description: str = ""


def make_scenarios() -> List[ScenarioConfig]:
    return [
        ScenarioConfig(
            name="Straight road — clear",
            ego_start=(-50, 0, 10, 0),
            goal=(50, 0),
            others=[],
            other_routes=[],
            description="Baseline: no obstacles",
        ),
        ScenarioConfig(
            name="Car following — slow lead",
            ego_start=(-50, 0, 10, 0),
            goal=(50, 0),
            others=[(-20, 0, 6, 0)],
            other_routes=[[(50, 0)]],
            description="Slow vehicle ahead, must manage following distance",
        ),
        ScenarioConfig(
            name="Unprotected left turn",
            ego_start=(0, -30, 5, np.pi / 2),
            goal=(0, 30),
            others=[
                (40, 2, 11, np.pi),     # oncoming from right
                (-35, -2, 10, 0),        # oncoming from left
            ],
            other_routes=[
                [(-50, 2)],
                [(50, -2)],
            ],
            description="Gap acceptance with two oncoming vehicles",
        ),
        ScenarioConfig(
            name="4-way intersection",
            ego_start=(-50, 0, 8, 0),
            goal=(50, 0),
            others=[
                (3, -40, 7, np.pi / 2),     # from south, staggered
                (50, 3, 6, np.pi),            # from east, slower
                (-3, 50, 5, -np.pi / 2),     # from north, slowest
            ],
            other_routes=[
                [(3, 55)],
                [(-55, 3)],
                [(-3, -55)],
            ],
            description="Complex multi-agent intersection negotiation",
        ),
        ScenarioConfig(
            name="Pedestrian with occlusion",
            ego_start=(-40, 0, 10, 0),
            goal=(40, 0),
            others=[
                (-5, -6, 1.2, np.pi / 2),   # pedestrian crossing
                (-10, 4, 0, 0),               # parked car (stationary occluder)
            ],
            other_routes=[
                [(-5, 6)],
                [(-10, 4)],  # stationary
            ],
            description="Must slow for potentially occluded pedestrian",
        ),
    ]


class DrivingEnv(gym.Env):
    """
    Continuous driving environment with physics-based dynamics.

    Observation space: ego state (6) + per-vehicle relative state (4 each), padded to max 4 others
    Action space: [acceleration, steering] both in [-1, 1]
    """
    metadata = {"render_modes": ["text"]}

    MAX_OTHERS = 4
    DT = 0.1  # 10Hz control
    MAX_STEPS = 300  # 30 seconds

    # Reward weights — these ARE the product decisions
    W_SAFETY = 10.0      # hard penalty for collisions/near-misses
    W_COMFORT = 1.0      # penalty for jerk, harsh braking
    W_EFFICIENCY = 0.5   # reward for progress toward goal
    W_GOAL = 50.0        # bonus for reaching goal

    # Safety thresholds
    COLLISION_DIST = 4.0     # meters — collision (vehicles are 4.5m long)
    NEAR_MISS_DIST = 7.0     # meters — near miss
    COMFORT_ACCEL = 3.0      # m/s^2 — comfortable max
    COMFORT_JERK = 25.0      # m/s^3 — comfortable max (action change/dt)

    def __init__(self, scenario_idx: int = 0):
        super().__init__()
        self.scenarios = make_scenarios()
        self.scenario_idx = scenario_idx

        # Observation: ego(6) + 4 * other(4) = 22
        self.observation_space = spaces.Box(
            low=-np.inf, high=np.inf, shape=(22,), dtype=np.float32
        )
        # Action: [acceleration_normalized, steering_normalized]
        self.action_space = spaces.Box(
            low=np.array([-1, -1]), high=np.array([1, 1]), dtype=np.float32
        )

        self.ego: Optional[VehicleState] = None
        self.others: List[VehicleState] = []
        self.goal: Tuple[float, float] = (0, 0)
        self.step_count = 0
        self.prev_accel = 0.0
        self.episode_metrics = {
            "collisions": 0, "near_misses": 0, "jerk_violations": 0,
            "goal_reached": False, "total_reward": 0.0,
            "min_dist_to_other": float("inf"),
        }

    def reset(self, *, seed=None, options=None):
        super().reset(seed=seed)
        cfg = self.scenarios[self.scenario_idx]

        self.ego = VehicleState(*cfg.ego_start, is_ego=True)
        self.goal = cfg.goal
        self.others = []
        for i, (x, y, s, h) in enumerate(cfg.others):
            route = cfg.other_routes[i] if i < len(cfg.other_routes) else []
            self.others.append(VehicleState(x, y, s, h, route=route))

        self.step_count = 0
        self.prev_accel = 0.0
        self.episode_metrics = {
            "collisions": 0, "near_misses": 0, "jerk_violations": 0,
            "goal_reached": False, "total_reward": 0.0,
            "min_dist_to_other": float("inf"),
        }
        return self._obs(), {}

    def step(self, action):
        accel = float(action[0]) * 5.0   # scale to +-5 m/s^2
        steer = float(action[1]) * 0.5   # scale to +-0.5 rad/s

        # Update ego
        self.ego.update(accel, steer, self.DT)

        # Update others (simple: follow route at constant speed)
        for v in self.others:
            if v.route and v.route_idx < len(v.route):
                tx, ty = v.route[v.route_idx]
                dx, dy = tx - v.x, ty - v.y
                target_heading = np.arctan2(dy, dx)
                heading_diff = (target_heading - v.heading + np.pi) % (2 * np.pi) - np.pi
                v.update(0, heading_diff * 2, self.DT)
                if np.sqrt(dx**2 + dy**2) < 3.0:
                    v.route_idx += 1

        self.step_count += 1

        # Compute reward components
        reward = 0.0
        terminated = False
        truncated = False

        # Safety: collisions and near misses
        for v in self.others:
            d = self.ego.dist_to(v)
            self.episode_metrics["min_dist_to_other"] = min(
                self.episode_metrics["min_dist_to_other"], d
            )
            if d < self.COLLISION_DIST:
                reward -= self.W_SAFETY * 10
                self.episode_metrics["collisions"] += 1
                terminated = True
            elif d < self.NEAR_MISS_DIST:
                reward -= self.W_SAFETY * (1 - (d - self.COLLISION_DIST) /
                                           (self.NEAR_MISS_DIST - self.COLLISION_DIST))
                self.episode_metrics["near_misses"] += 1

        # Comfort: penalize harsh acceleration and jerk
        jerk = abs(accel - self.prev_accel) / self.DT
        if abs(accel) > self.COMFORT_ACCEL:
            reward -= self.W_COMFORT * (abs(accel) - self.COMFORT_ACCEL)
        if jerk > self.COMFORT_JERK:
            reward -= self.W_COMFORT * 0.5 * (jerk - self.COMFORT_JERK)
            self.episode_metrics["jerk_violations"] += 1
        self.prev_accel = accel

        # Efficiency: reward progress toward goal + speed maintenance
        goal_dist = np.sqrt((self.ego.x - self.goal[0])**2 +
                            (self.ego.y - self.goal[1])**2)
        reward += self.W_EFFICIENCY * self.ego.speed * self.DT / max(goal_dist, 1)
        # Penalize stopping — vehicles should make progress
        if self.ego.speed < 1.0:
            reward -= 0.1

        # Goal reached
        if goal_dist < 5.0:
            reward += self.W_GOAL
            self.episode_metrics["goal_reached"] = True
            terminated = True

        # Timeout
        if self.step_count >= self.MAX_STEPS:
            truncated = True

        # Out of bounds
        if abs(self.ego.x) > 100 or abs(self.ego.y) > 100:
            reward -= 10
            terminated = True

        self.episode_metrics["total_reward"] += reward
        return self._obs(), reward, terminated, truncated, self.episode_metrics.copy()

    def _obs(self):
        obs = np.zeros(22, dtype=np.float32)
        # Ego state
        obs[0] = self.ego.x / 50.0
        obs[1] = self.ego.y / 50.0
        obs[2] = self.ego.speed / 15.0
        obs[3] = self.ego.heading / np.pi
        obs[4] = (self.goal[0] - self.ego.x) / 50.0
        obs[5] = (self.goal[1] - self.ego.y) / 50.0

        # Other vehicles (relative)
        for i, v in enumerate(self.others[:self.MAX_OTHERS]):
            base = 6 + i * 4
            obs[base] = (v.x - self.ego.x) / 50.0
            obs[base + 1] = (v.y - self.ego.y) / 50.0
            obs[base + 2] = v.speed / 15.0
            obs[base + 3] = (v.heading - self.ego.heading) / np.pi

        return obs

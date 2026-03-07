# Interview Prep: PM, Planner and Driving Behaviors at Waymo
**Generated:** 2026-03-07

---

## Company Context
- Mission: Be the world's most trusted driver
- 10M+ rider-only trips, 100M+ real-world driving miles, billions of sim miles
- Expanding to new cities — scaling the Waymo Driver domestically + internationally
- Alphabet subsidiary, competing with Tesla FSD, Zoox, Aurora, Cruise (paused)
- Known for safety-first approach and deep technical rigor

## Known Interview Signals
- Hybrid format, technically rigorous
- Values deep technical understanding even for PM roles
- Culture: Google heritage but more mission-driven, "first-of-their-kind playbooks"
- Likely emphasis on ambiguity tolerance, cross-functional leadership, data-driven decisions

---

## Predicted Questions

### Product Sense (6 questions)

1. **"How would you prioritize improvements to the Waymo Driver's behavior at unprotected left turns?"**
   → Lead with data-driven framework: fleet data → failure mode taxonomy → impact vs. frequency matrix → user comfort vs. safety trade-off. Reference Duetto's approach to prioritizing pricing scenarios.

2. **"Design a system to evaluate driving behavior quality across different cities with different driving cultures."**
   → Framework: define universal safety metrics + city-specific comfort/efficiency metrics. Reference building attribution frameworks at C1 across 400+ partners.

3. **"How would you decide when a new driving behavior is ready to deploy to the fleet?"**
   → The RL-as-optimizer pattern: prove parity in simulation → A/B test with safety constraints → staged rollout. Reference RL deployment at Duetto (a few hotels → 40% of user base in 6 months).

4. **"A new city has different traffic patterns than existing markets. How do you adapt the planner?"**
   → 0-to-1 in each market, similar to scaling from 1 hub to 8 at Wayfair. Framework: identify constraint differences, test transfer learning, local calibration.

5. **"Riders complain the car is too cautious at intersections. How do you balance safety and rider experience?"**
   → Pricing acceptance story: 20%→60%+ at Duetto. Trust is built through transparency (explainability) and gradual capability expansion, not by making the system less safe.

6. **"How would you measure the success of a planner improvement?"**
   → Multi-metric framework: safety (hard constraint), comfort (rider NPS, jerk metrics), efficiency (trip time, energy). A/B testing with proper holdout. Reference experimentation platforms at C1 and JPMC.

### Behavioral (6 questions)

7. **"Tell me about a time you shipped a technically complex product under ambiguity."**
   → **Story: RL engine at Duetto.** Ambiguity: should we use RL at all or improve LP? Pivot: RL as optimizer, not replacement. Result: industry-first RL engine, 10% RevPAR lift. **Earned secret:** The first step wasn't modeling — it was proving equivalence.

8. **"Describe a time you had to pivot your approach."**
   → **Story: Wayfair routing engine.** Leadership wanted dashboard. Identified root-cause failures needed optimization, not monitoring. Pivoted to constraint-based engine. Result: 20%+ failure reduction. **Earned secret:** Talk to the user, not the buyer.

9. **"How do you drive alignment across cross-functional teams?"**
   → **Story: Multi-year AI vision at Duetto.** Aligned engineering, data science, sales, and customer success around autonomous pricing. Key: frame vision in terms each team cares about (eng: technical challenge; sales: competitive wins; CS: retention lift).

10. **"Tell me about a time you made a decision with incomplete data."**
    → **Story: C1 mobile-first bet.** Sold iOS Safari Extension to leadership before market validation. Grew from 0 to 4M users. Key: smallest possible proof (beta pod testing) before committing.

11. **"How do you mentor and develop team members?"**
    → **Story:** Mentored 4 product analysts + 2 junior PMs at Duetto, hired Analytics Manager. Framework: pair on hard problems, give increasing ownership, create safe-to-fail environments.

12. **"Describe a conflict with engineering and how you resolved it."**
    → **Story: RL as research vs. production at Duetto.** ML team wanted research-grade RL. Product needed production deployment. Resolution: the optimizer pattern satisfied both — RL in production, but grounded in empirical data and constrained exploration.

### Technical (4 questions)

13. **"Explain how reinforcement learning works and how you'd apply it to driving behavior optimization."**
    → Clear explanation: agent, environment, state, action, reward. Key nuances: reward shaping is the product decision; exploration vs. exploitation is a business/safety trade-off, not just ML. Reference: "At Duetto, getting the reward function right drove more business impact than the model architecture."

14. **"How would you design a simulation pipeline for testing planner changes?"**
    → Framework: scenario generation (from fleet data + edge cases), fidelity levels (simple→high-fi), metrics (safety, comfort, efficiency), regression testing, coverage metrics. Reference: Duetto's pre-computed caches as offline simulation equivalent.

15. **"What are the trade-offs between rule-based and learned planners?"**
    → This IS the artifact. Walk through the prototype results: rules are safe but suboptimal in complex scenarios; E2E RL is capable but high variance; RL-as-optimizer gets the best of both.

16. **"How do you think about technical debt in ML systems?"**
    → Reference Duetto: replacing batch LP with real-time RL was a technical debt resolution. Key: measure debt by capability gap (what can't we do?) not by code age.

### Leadership & Strategy (4 questions)

17. **"What's your vision for how autonomous driving planner technology should evolve over the next 3 years?"**
    → RL-as-optimizer pattern expanding: more scenarios, more cities, eventually the optimizer handles most decisions and the rules handle edge cases (inversion of current state). Reference: Duetto vision — from AI-assisted to AI-autonomous.

18. **"How do you build trust with regulators and riders in autonomous driving?"**
    → **THE earned secret question.** Framework from Duetto: explainability → gradual adoption → ICP pivot. For Waymo: explainability for regulators (decision audit trails), gradual city-by-city expansion for rider trust, find the right champion stakeholder per market.

19. **"How would you approach expanding Waymo to international markets?"**
    → Reference Wayfair scaling from 1 hub to 8 (domestic + international). Framework: identify constraint differences per market, build adaptable architecture, local partnerships, regulatory mapping.

20. **"Why Waymo? Why this role?"**
    → "I've spent my career deploying AI systems that make real-time, high-stakes decisions autonomously — from pricing to routing. Waymo is the highest-stakes version of this problem. The planner is where my RL and optimization experience maps most directly, and scaling the Driver to new markets is the 0-to-1 challenge I've done multiple times."

---

## Story Bank Mapping

| Question Theme | Best Story | Key Metric | Earned Secret Twist |
|---|---|---|---|
| Technical complexity + ambiguity | RL engine at Duetto | 10% RevPAR, 4x optimization | RL as optimizer, not replacement |
| Pivot / changing course | Wayfair dashboard→optimizer | 20%+ failure reduction | Talk to user, not buyer |
| Scaling / 0-to-1 | C1 mobile (0→4M users) | 30% ARR growth | Smallest provable thing first |
| Enterprise trust | Duetto pricing acceptance | 20%→60%+ acceptance | ICP pivot: GMs not RMs |
| Cross-functional alignment | Duetto multi-year vision | 15-person team, 3 product lines | Frame in each team's language |
| Data-driven decisions | C1 recommendation engine | 25% CTR lift, 12% RPAU | MAB over collaborative filtering for cold-start |
| Optimization under constraints | Wayfair routing | 20M+ shipments, 20K+ suppliers | Constraint-based > dashboard |

---

## Interviewer Intelligence

### Vishay Nihalani — Director of Product Management
- Actively hiring for his team
- Likely focus: can you handle technical depth + product judgment in ambiguity?
- Rapport hook: both in Product Management leadership at deep-tech companies

### Saswat Panigrahi — Chief Product Officer
- If you meet the CPO, questions will be strategic (vision, scaling, international)
- Rapport hook: product strategy + long-term vision alignment

---

## Differentiation Strategy
What makes Sujoy different from other candidates:
1. **Actually shipped RL in production** — not research, not demos, production at scale
2. **The optimizer pattern** — a repeatable framework for safe RL deployment
3. **Built the artifact** — the prototype demonstrates exactly what he'd bring on day one
4. **Trust engineering** — solved the hardest part of autonomous AI (getting humans to hand over decisions)
5. **Physical-world optimization** — Wayfair routing (20M shipments) bridges to physical-world AV challenges

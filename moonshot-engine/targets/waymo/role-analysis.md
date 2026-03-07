# Role Analysis: Product Manager, Planner and Driving Behaviors at Waymo

**Generated:** 2026-03-07
**JD Source:** https://ev.careers/jobs/250493981-product-manager-driving-behaviors

---

## JD Keywords

**Must-have technical:** AI/ML, Planning technologies, autonomous driving, fleet data, capability and engineering trade-offs, technical tools, computer science
**Soft/user-centric:** cross-functional collaboration, alignment, communication
**Domain:** autonomous vehicles, planner, driving behavior, domestic and international markets, hardware platforms, transportation
**Cultural/stage:** fast-changing environment, ambiguity, first-of-their-kind playbooks, mission-driven
**Leadership:** roadmap, product vision, technical strategy, long-term product focus areas, driving alignment across the company

**Preferred:** robotics, ML, MBA, new technology introduction, positive global impact

---

## Fit Assessment

| JD Requirement | Sujoy's Evidence | Strength |
|---|---|---|
| BS in CS/engineering or equivalent | Dual BA Data Science (ML, AI, Econometrics) + Economics, UC Berkeley | **Strong** |
| 4-8 years product management experience | ~5.5 years: Duetto (Apr 2025-present), C1 (Dec 2023-Dec 2024), JPMC (Jun 2021-Dec 2023), Wayfair (Oct 2020-Jun 2021) | **Strong** |
| AI/ML and Planning technologies | Shipped RL engine in production at Duetto; ML-powered ranking at JPMC; MAB recommendation engine at C1 | **Strong** |
| Gather/dissect large quantities of data | Billions of daily pricing recommendations at Duetto; 40K+ enterprise clients at JPMC; 20M+ shipments at Wayfair | **Strong** |
| Deep technical understanding + technical tools | Python, SQL, RL, LLMs/RAG, NLP, MLOps, A/B testing from skills pool; hands-on with RL engine architecture | **Strong** |
| Cross-functional collaboration | Led 15 at Duetto, 10-person team at C1, 15-person ML team at JPMC | **Strong** |
| Delivering in fast-changing/ambiguous environments | 3 zero-to-one product lines at Duetto; pivoted dashboard→optimization engine at Wayfair | **Strong** |
| Roadmap and product vision | Set multi-year AI vision for Analytics org at Duetto; sold mobile-first bet to C1 leadership | **Strong** |
| Autonomous vehicles / robotics experience | GAP — No direct AV/robotics experience | **Gap** |
| Scale domestically and internationally | Scaled from 1 hub to 8 (domestic + international) at Wayfair; 7K+ properties globally at Duetto | **Partial** |
| Master's/MBA or equivalent | Stanford Y2E2 Scholar (graduate-level coursework), no formal Master's degree | **Partial** |
| New technology introduction | Shipped industry-first RL engine at Duetto; first mobile surface at C1 | **Strong** |

**Fit Score:** 9 Strong / 2 Partial / 1 Gap

**Gap Mitigation:** The autonomous vehicles gap is domain-specific, not capability-specific. Sujoy's RL in production + real-time optimization experience is the exact technical skillset applied in a different domain. The artifact should demonstrate this transferability explicitly.

---

## Strongest Angles

### Angle 1: RL in Production — Same Problem, Different Domain
**Evidence:** Shipped industry-first RL engine at Duetto that replaced batch linear programming with real-time inference. Billions of daily pricing decisions. 10% RevPAR lift, 4x optimization, 20% of cost, 10% of latency vs prior system.

**Earned Secret:** The breakthrough wasn't deploying RL end-to-end. It was using RL as an optimizer over a pre-trained model — proving parity on known workloads first, then expanding to capabilities only RL enables. "500 years of exploration in minutes" via pre-computed caches.

**Narrative:** Waymo's planner stack uses RL for driving decisions — real-time optimization under uncertainty with safety constraints. Sujoy has done exactly this in a different domain: real-time pricing optimization under business constraints. The technical patterns transfer directly: reward function design, exploration vs. exploitation balancing, serving infrastructure, and the critical challenge of proving a new approach matches the old one before expanding the decision space.

### Angle 2: Trust Engineering — Getting Humans to Trust Autonomous AI
**Evidence:** Moved pricing acceptance from 20% to 60%+ at Duetto through explainability and the ICP pivot (Revenue Managers → General Managers).

**Earned Secret:** The ICP pivot — realizing the target audience was GMs, not RMs, and reframing value from RevPAR to total profit. The AI adoption problem is a go-to-market problem disguised as a technology problem.

**Narrative:** Waymo's core challenge isn't just building a safe driver — it's building trust with riders, regulators, and cities. Sujoy has solved this exact trust-engineering problem: getting humans to hand over high-stakes decisions to an AI system. The same patterns apply — explainability, gradual adoption, proving value at small scale before expanding, and finding the right stakeholder to champion the technology.

### Angle 3: Optimization Under Constraints + The Pivot Instinct
**Evidence:** At Wayfair, built constraint-based routing engine for 20M+ shipments across 20K+ suppliers. Pivoted from planned dashboard to optimization engine. Reduced failure rate 20%+, shrinkage ~15%, improved on-time delivery ~20%. Scaled from 1 hub to 8 domestic + international.

**Earned Secret:** The pivot framework — talk to the actual user (not the buyer), prove the smallest possible thing first, align strategy with the company's aspirational state.

**Narrative:** Waymo's planner optimizes under real-world constraints (safety, comfort, efficiency, traffic rules). Sujoy has built optimization engines that handle multi-constraint problems at scale. The Wayfair routing engine is structurally similar to fleet routing/planning — and his instinct to pivot from a monitoring tool to an optimization engine shows the kind of product judgment Waymo needs as they scale the Driver across new markets.

---

## Artifact Recommendation

**Type:** Technical Prototype
**Rationale:** The role is hands-on (4-8 years IC PM, not management), deeply technical (AI/ML, Planning), and the JD emphasizes "ability to use technical tools and deep technical understanding." A working prototype will resonate more than a strategy memo with this audience.

**Thesis:** Demonstrate the RL-as-optimizer pattern applied to a driving-adjacent optimization problem — showing how RL can safely replace a rule-based system by proving parity first, then unlocking new capabilities.

**Scope:** Build a simplified RL-based route/behavior optimizer that:
1. Takes a constraint-based environment (intersections, traffic rules, comfort preferences)
2. Uses RL as an optimizer over a baseline heuristic planner
3. Proves parity with the heuristic approach, then demonstrates scenarios where RL outperforms
4. Includes explainability layer (why the RL agent made each decision)
5. Visualizes the learning process and decision trade-offs

**Technical approach:** Python + stable-baselines3 or custom RL loop, gymnasium environment, matplotlib/plotly visualization. Include architecture.md explaining why this pattern (RL-as-optimizer) is how you safely deploy RL in production systems.

---

## Resume Notes
- **Title:** Product Manager, Driving Behaviors (match JD exactly)
- **Lead bullets per role:**
  - Duetto: RL engine, real-time inference, billions of daily decisions
  - C1: Mobile 0-to-1, scaling (0→4M users)
  - JPMC: Semantic search, ML-powered ranking, 40K+ enterprises
  - Wayfair: Constraint-based routing optimization, 20M+ shipments
- **Keywords to weave:** AI/ML, planning, real-time systems, fleet data, cross-functional alignment, ambiguity, roadmap, technical strategy, scaling domestic + international
- **Skills line rotation:** Python, SQL, Reinforcement Learning, NLP, MLOps, A/B Testing, Real-Time Systems, Deep Learning → emphasize RL and Real-Time Systems

---

## Gaps to Address
| Gap | Mitigation |
|---|---|
| No AV/robotics experience | Artifact demonstrates transferability of RL production patterns. Frame as "same technical class of problem, different domain." Reference Wayfair routing as physical-world optimization. |
| No formal Master's/MBA | Stanford Y2E2 Scholar + Berkeley inaugural Data Science cohort covers graduate-level rigor. |

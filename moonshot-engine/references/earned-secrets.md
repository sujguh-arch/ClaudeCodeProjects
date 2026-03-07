# Earned Secrets — Sujoy Guha

**These are non-obvious insights that only someone who has lived through these problems would carry. They are the differentiator in outbound artifacts and interviews — they signal depth that can't be faked.**

---

## 1. The ICP Pivot: Why Enterprise AI Adoption Fails When You Sell to the Wrong Buyer

**Context:** At Duetto, moved pricing acceptance from 20% to 60%+.

**The secret:** The initial assumption was that Revenue Managers (RMs) were the target user. Wrong. The real decision-maker was the General Manager (GM) of the hotel. RMs care about RevPAR — a metric that doesn't capture the full value of AI-driven pricing. GMs care about **total property profit**.

**The playbook:**
1. Built explainability and granular adoption controls (let users see and override AI reasoning)
2. Proved profit lift through automation at a few properties
3. **Pivoted the selling motion** — reframed value from RevPAR lift to total profit optimization
4. Pivoted the ICP from RMs to GMs, who had the authority and incentive to adopt

**Why this matters universally:** Most AI products fail not because the model is wrong, but because they're selling the wrong metric to the wrong buyer. The AI adoption problem is a **go-to-market problem disguised as a technology problem**.

---

## 2. RL in Production: The Optimizer Pattern

**Context:** Shipped industry-first RL engine at Duetto, replacing batch linear programming.

**The secret:** Selling a frontier technology and actually integrating it was far harder than building it. The breakthrough wasn't deploying RL end-to-end from day one. It was using RL **as an optimizer over a pre-trained model**.

**The playbook:**
1. **Step 1 wasn't modeling — it was proving equivalence.** Used RL as an optimizer on top of existing models. Proved it could achieve the same revenue lift as LP, but with pre-computed caches (simulating 500 years of exploration in minutes vs. seconds-per-decision with LP).
2. **Grounded RL in empirical data** — didn't let it explore freely. Constrained exploration to validated price ranges.
3. **Tested with a handful of hotels first** — built confidence before scaling.
4. **The forcing function:** Once RL-as-optimizer was proven, it enabled entirely new capabilities (agentic pricing, real-time decisioning) that LP simply couldn't support. Going back to LP would have been a sunk cost — RL unlocked the roadmap.

**The inverse lesson:** Without the optimizer approach, RL would have remained a research project. Many teams try to ship frontier ML end-to-end and fail. The pattern is: **prove equivalence first, then unlock capabilities only the new approach enables.**

**Why this matters universally:** Any company deploying RL (or any frontier ML) in production faces this same adoption challenge. The optimizer pattern — prove parity on known workloads, then expand to new capabilities — is a repeatable framework.

---

## 3. AI Data Pipelines: Edge Cases Are the Product

**Context:** At Capital One Shopping, rebuilt merchant onboarding from 4-day manual QA to under 1 hour.

**The secret:** The 80% of merchants that are straightforward to onboard are table stakes. The differentiation — and the moat — is handling the weird 20% gracefully.

**The playbook:**
1. **Reuse architecture that works** — Don't rebuild from scratch. Identify which parts of the existing pipeline actually work well and preserve them.
2. **Human-in-the-loop at the right moments** — Pure automation creates more cleanup work. The key is knowing which decisions need human judgment and instrumenting those touchpoints.
3. **Target highest pain first** — Don't boil the ocean. Know what to solve because it's the biggest pain point vs. what you can solve but shouldn't yet.
4. **Know when to say "I shouldn't do this"** — Not every problem should be automated. Some edge cases are better handled manually than with a fragile AI solution.

**Why this matters universally:** Every AI pipeline team overestimates automation coverage and underestimates edge case handling. The companies that win are the ones that handle the long tail gracefully, not the ones with the best happy-path performance.

---

## 4. The Pivot Framework: Aspirational State + Model Readiness

**Context:** Pivoted dashboard→optimization engine at Wayfair, RL research→RL-as-optimizer at Duetto.

**The secret:** The framework for knowing when to pivot has three components:

1. **Talk to the actual user, not the buyer.** The person requesting the feature (leadership, sales) isn't always the person suffering from the problem. At Wayfair, leadership wanted a dashboard. The supply chain operators needed an optimization engine. The user tells you the truth.

2. **Prove the smallest possible thing first.** Before committing to a big bet, find the cheapest experiment that would change your mind. At Duetto, the smallest provable thing was: "Can RL match LP performance on cached data?"

3. **Company evolution and aspirational state matter.** Strategy should reflect where the company is going, not where it is. At Duetto, the aspirational state was real-time autonomous pricing — and RL was the only path there. The pivot wasn't abandoning the plan; it was aligning the plan with the aspirational state.

4. **"Models are good enough for next move."** Don't wait for perfect. Ship when the model is good enough to prove the next step in the roadmap. Iterate from there.

**Why this matters universally:** Most PMs pivot too late (sunk cost) or too early (insufficient signal). This framework — user truth + smallest proof + aspirational alignment + "good enough" — creates a repeatable decision process.

---

## How to Use These Secrets

**In outbound emails:** Reference the pattern, not the detail. "I've seen the ICP pivot problem firsthand — happy to share what I learned about reframing AI value for the right buyer."

**In artifacts:** Build the artifact around the insight. If targeting a company struggling with AI adoption, the artifact should demonstrate the ICP pivot framework applied to their specific challenge.

**In interviews:** These are your "earned insight" stories. They demonstrate first-principles thinking that can't be replicated by studying case studies or taking courses.

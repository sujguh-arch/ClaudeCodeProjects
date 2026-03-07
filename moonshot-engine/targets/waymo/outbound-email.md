# Outbound Package: PM, Planner and Driving Behaviors at Waymo
**Generated:** 2026-03-07
**Target contact:** Vishay Nihalani, Director of Product Management, Waymo

---

## Primary Email

**Subject:** RL-as-optimizer pattern for driving behaviors — built a prototype

Hi Vishay,

I've been thinking about the challenge of deploying RL in Waymo's planner stack — specifically, how you safely evolve driving behaviors without regressing on safety guarantees.

At Duetto, I shipped an industry-first RL engine that replaced batch linear programming with real-time inference for pricing across 7K+ properties. The breakthrough wasn't deploying RL end-to-end — it was using RL as an optimizer over the existing system, proving parity first, then unlocking capabilities the old approach couldn't support. Same safety-critical constraint: a bad pricing decision costs revenue; a bad driving decision costs lives.

I put together a working prototype that applies this RL-as-optimizer pattern to driving behaviors — three planners compete across five scenarios, and the optimizer consistently matches baseline safety while finding better comfort and efficiency solutions. Happy to share the repo or walk through the approach.

Would love 20 minutes to discuss how this pattern maps to your team's work.

Sujoy Guha
linkedin.com/in/sujguha

---

## LinkedIn Connection Request
(300 char max)

Vishay — I've been exploring the RL-as-optimizer pattern for safe deployment in real-time decision systems (shipped production RL at Duetto for pricing). Built a prototype applying it to driving behaviors. Would love to connect and share.

---

## LinkedIn InMail

Hi Vishay,

Saw your team is hiring for PM, Planner and Driving Behaviors. I shipped an industry-first RL engine at Duetto — real-time inference replacing batch LP, billions of daily decisions. The deployment pattern I developed (RL as optimizer over existing planner, prove parity before expanding) maps directly to safe behavior evolution.

Built a prototype demonstrating the pattern. Happy to share — would love 20 minutes.

Sujoy

---

## Follow-up Email (send 1 week later if no response)

**Subject:** Re: RL-as-optimizer pattern for driving behaviors — built a prototype

Hi Vishay,

Quick follow-up — I also put together an architecture doc showing how the RL-as-optimizer pattern scales from prototype to production, including the safety gate layer that makes formal verification tractable.

The core insight from my Duetto experience: the hardest part of production RL isn't the model — it's building trust in autonomous decisions. We moved pricing acceptance from 20% to 60%+ by solving explainability first. Same challenge for autonomous driving trust with riders and regulators.

Happy to share both the prototype and the architecture thinking.

Sujoy

---

## Warm Intro Request (if mutual connection available)

**To:** [mutual connection name]

Hey [name] — I see you're connected to Vishay Nihalani at Waymo. I'm exploring a PM role on his Planner/Driving Behaviors team and would love an intro if you're comfortable. I built a prototype demonstrating how RL can safely optimize driving behaviors (based on my experience shipping production RL at Duetto). Here's a blurb you can forward:

**Forwardable blurb:**

"Hey Vishay — wanted to connect you with Sujoy Guha, a Senior AI/ML PM at Duetto who shipped production RL engines for real-time pricing (billions of daily decisions, 10% RevPAR lift). He built a prototype demonstrating an RL-as-optimizer pattern for driving behaviors and would love 20 minutes to walk through the approach. His LinkedIn: linkedin.com/in/sujguha"

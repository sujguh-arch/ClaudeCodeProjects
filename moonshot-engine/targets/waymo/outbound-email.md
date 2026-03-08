# Outbound Package: PM, Planner and Driving Behaviors at Waymo
**Generated:** 2026-03-08
**Target contact:** Vishay Nihalani, Director of Product Management, Waymo

---

## Primary Email

**Subject:** The school bus recall and the blackout are the same problem

Hi Vishay,

The December school bus recall (threshold too confident) and the December blackout stalls (threshold not confident enough) are mirror images of the same calibration failure — when should the planner act autonomously vs. defer to Fleet Response?

I've worked on this exact problem. At Duetto, I shipped a production RL engine making billions of daily pricing decisions. Our biggest challenge wasn't the model — it was calibrating when the system should decide on its own vs. defer to humans. We moved decision acceptance from 20% to 60%+ through context-dependent thresholds, not model improvements.

I built a prototype modeling the confidence calibration problem across Waymo's actual 2025 failure modes. Context-adaptive thresholds pass both the school bus test and the blackout test — the aggressive and static approaches each fail one. Happy to share.

20 minutes?

Sujoy Guha
linkedin.com/in/sujguha

---

## LinkedIn Connection Request
(300 char max)

Vishay — I've been studying Waymo's confidence calibration problem (school bus recall vs blackout stalls = same threshold failure). Shipped production RL with similar trust calibration challenges at Duetto. Built a prototype. Would love to connect.

---

## LinkedIn InMail

Hi Vishay,

I noticed your team is hiring for PM, Planner and Driving Behaviors. The role's core challenge — scaling the Waymo Driver across contexts — is fundamentally a confidence calibration problem. Different scenarios need different deference thresholds: school zones ≠ dead traffic lights ≠ construction zones.

I've solved this in production. At Duetto, pricing acceptance went from 20% to 60%+ through context-dependent thresholds and explainability — the same pattern Waymo's Drivership framework is reaching toward.

Built a prototype modeling the calibration across your actual 2025 incident scenarios. Would love 20 minutes.

Sujoy

---

## Follow-up Email (1 week later)

**Subject:** Re: The school bus recall and the blackout are the same problem

Hi Vishay,

One more thought: the Drivership framework Waymo published in February defines good driving as alignment between "exhibited driving behavior and the expectations of society" — distinguishing empirical, normative, and furtherance expectations.

At Duetto, we faced the same framing problem for RL pricing. Our breakthrough wasn't a better model — it was an ICP pivot: we stopped optimizing for Revenue Managers (who feared AI replacement) and started optimizing for General Managers (who wanted profit growth). Acceptance went from 20% to 60%+ overnight.

For Waymo, I'd argue the analogous pivot is framing Drivership not as a safety engineering metric but as a rider trust surface — different riders and regulators have different expectation profiles, and the planner's confidence calibration should reflect that.

Happy to dig into this over coffee if you're open to it.

Sujoy

---

## Warm Intro Request

**Forwardable blurb:**

"Hey Vishay — wanted to connect you with Sujoy Guha, a Senior AI/ML PM at Duetto. He shipped a production RL engine making billions of daily decisions and has been studying Waymo's confidence calibration challenge (the connection between the school bus recall and the blackout stalls). Built a working prototype modeling the problem. Would be worth 20 minutes. LinkedIn: linkedin.com/in/sujguha"

---

## Outbound Strategy Notes

**Sending timing:** Tuesday-Thursday, 8-10am PT
**Attachment:** Do NOT attach artifact on first email. The subject line + prototype mention creates curiosity. Share only if they reply.
**If no response after follow-up:** Try reaching out to Saswat Panigrahi (CPO) or Nick Rose (PM, Expansion) as alternative entry points.
**LinkedIn profile alignment:** Before sending, update LinkedIn headline to emphasize "RL in production" and "trust calibration" — they will check.

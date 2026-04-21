# Anti-Patterns — Banned Phrases & AI Tells

**RULE: Every phrase in this file is a hard fail when it appears in the letter. Fix it before the letter ships.**

Most of these are phrases that signal "LLM wrote this" or "template". A few are cover-letter-specific clichés. The validator regexes case-insensitively and on word boundaries.

---

## Generic cover-letter clichés (hard fail)

- passionate about
- excited to apply
- excited for the opportunity
- excited about the opportunity
- thrilled to apply
- thrilled to be
- I would love to
- I'd love the opportunity
- team player
- hit the ground running
- wear many hats
- fast-paced environment
- results-driven
- proven track record
- I am writing to
- I'm writing to
- I believe I am
- I believe I would
- strong fit
- perfect fit
- ideal candidate
- dream job
- dream role
- I hope this email finds you well
- please find attached
- please find enclosed
- thank you for your consideration
- thank you for considering
- look forward to hearing
- looking forward to hearing
- at your earliest convenience
- do not hesitate to
- don't hesitate to

## AI tells (hard fail — these scream LLM)

- delve
- delves into
- delving into
- tapestry
- navigate the complexities
- navigating the complexities
- ever-evolving
- ever-changing
- in today's fast-paced
- in today's competitive
- in today's dynamic
- in today's digital
- stands as a testament
- testament to
- it's worth noting
- it is worth noting
- it's important to note
- it is important to note
- it's worth mentioning
- moreover
- furthermore
- additionally,
- nevertheless
- nonetheless
- in essence
- in conclusion
- to summarize
- to sum up
- cutting-edge
- state-of-the-art
- best-in-class
- world-class
- next-level
- game-changer
- game-changing
- paradigm shift
- paradigm
- synergy
- synergies
- synergize
- leverage
- leveraging
- leveraged
- harness
- harnessing
- unleash
- unlock the power
- unlocking
- elevate
- elevating
- transformative
- revolutionize
- revolutionary
- groundbreaking
- innovative solutions
- embark on a journey
- embark on
- on a journey
- stand the test of time
- holistic approach
- comprehensive approach
- robust solution
- robust framework
- seamless integration
- seamlessly
- myriad
- plethora
- intricate
- intricacies
- nuanced understanding
- realm of
- realm
- landscape of
- in the landscape
- pivotal role
- crucial role
- vital role
- essential role
- play a key role
- key role
- key player
- key driver
- multifaceted
- multi-faceted
- bespoke
- foster
- fosters
- fostering
- whilst
- amongst
- furthermore,
- indeed,
- notably,

## Structural tells (hard fail)

- Sentences starting with "As a [noun]," — classic cover letter opener, almost always empty
- Sentences starting with "With [N] years of experience" — lazy
- Paragraph starting with "I am" — orient outward, not at yourself
- Paragraph ending with "excited" / "eager" / "thrilled" — hollow
- Lists of 3+ adjectives ("curious, collaborative, and driven") — filler

## Soft warnings (flagged, not failed)

- Em-dashes more than 3x in a short letter (AI over-uses them)
- First-person pronoun ("I") count >8 (letter should face outward)
- Any word ending in -ization used more than once
- Adverb density >5% (adverbs kill voice)
- Starting >1 sentence with "And" or "But" (once is fine, more is affect)

---

## How to fix

If the validator hits a banned phrase, don't synonym-swap — **rewrite the sentence**. The phrase is usually a symptom of a lazy thought. Ask: what am I actually trying to say? Say that.

Example:
- ❌ "I'm passionate about AI and leveraging LLMs to unlock new user value."
- ✅ "I think the interesting work in AI over the next two years is less about bigger models and more about the product scaffolding around them — latency budgets, fallback paths, explainability."

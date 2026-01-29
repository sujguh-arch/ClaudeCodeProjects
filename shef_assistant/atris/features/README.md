# Features

This directory tracks all features built using the atrisDev protocol.

Each feature has:
- `[feature-name]/idea.md` - Problem, solution, diagrams, success criteria
- `[feature-name]/build.md` - Implementation plan, files changed, testing
- `[feature-name]/validate.md` - End-to-end simulation script

---

## Features Built

### availability-check
Check dish availability before prefill to prevent failed orders
- Files: automation/lib/availability.ts, automation/prefill.ts, automation/check-availability-json.ts, src/app/api/prefill/check/route.ts, src/components/features/cart/CartPreview.tsx, src/lib/types.ts
- Status: shipped
- Keywords: availability, sold out, pre-check, smart ordering

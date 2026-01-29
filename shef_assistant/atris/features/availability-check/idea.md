# availability-check — Verify dishes before ordering

## Problem

Current prefill blindly adds items without checking availability. When dishes are sold out, automation fails mid-run. Wastes time, leaves cart in inconsistent state.

## Solution

Check each dish URL for "Add to cart" button before attempting to add. If unavailable (button missing or disabled), skip the item and log why. Show availability status in UI before prefill starts.

## Visual Flow

```
Current (Broken):
┌──────────────────────────────────────────┐
│ User clicks "Prefill Cart"               │
│   ↓                                      │
│ Loop through items                       │
│   ↓                                      │
│ Navigate to dish URL                     │
│   ↓                                      │
│ Try to add (FAILS if unavailable) ✗     │
│   ↓                                      │
│ Automation crashes or skips              │
└──────────────────────────────────────────┘

New (Smart):
┌──────────────────────────────────────────┐
│ User clicks "Prefill Cart"               │
│   ↓                                      │
│ PRE-CHECK: Scan all dish URLs            │
│   ↓                                      │
│ Filter: available = ✓  unavailable = ✗   │
│   ↓                                      │
│ Show preview: "3 available, 1 sold out"  │
│   ↓                                      │
│ User confirms                            │
│   ↓                                      │
│ Prefill ONLY available items ✓          │
└──────────────────────────────────────────┘
```

## Success Criteria

1. **Check works**: Navigate to dish URL, detect "Add to cart" button presence
2. **Skip logic**: If unavailable, skip item with clear log message
3. **UI shows status**: Preview modal displays availability before prefill
4. **No false positives**: Available dishes pass check, unavailable ones fail

## Acceptance Test

```
Given:
  - Item A: https://shef.com/dish/chicken (available)
  - Item B: https://shef.com/dish/spinach (sold out)

When: User clicks "Prefill Cart"

Then:
  - Pre-check runs
  - Modal shows: "1 available, 1 unavailable (Spinach Curry)"
  - User confirms
  - Only Item A added to cart
  - Log: "Skipped Spinach Curry - unavailable"
```

## Non-Goals (Pareto Cut)

- ❌ Don't check portion sizes or pricing
- ❌ Don't retry unavailable items
- ❌ Don't notify user outside of preview modal
- ❌ Don't cache availability (check fresh every time)

Ship fast. These can come later if needed.

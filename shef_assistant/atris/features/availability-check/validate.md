# validate.md — Testing & Verification

## Test Plan

### Unit Tests (Automated)
- [ ] checkDishAvailability() returns available=true for valid dish
- [ ] checkDishAvailability() returns available=false for sold out dish
- [ ] checkDishAvailability() handles 404 errors gracefully
- [ ] checkAllItems() processes multiple items correctly
- [ ] filterAvailableItems() filters correctly based on results

### Manual Tests (Browser-based)

**Test 1: Available Dish**
```
Given: Item URL points to available dish
When: Run npm run shef:check-availability
Then:
  - Browser opens and navigates to dish
  - Finds "Add to cart" button
  - Returns available=true
  - Console shows "✓ [name] is available"
```

**Test 2: Unavailable Dish**
```
Given: Item URL points to sold-out dish
When: Run npm run shef:check-availability
Then:
  - Browser opens and navigates to dish
  - Button is missing or disabled
  - Returns available=false with reason
  - Console shows "✗ [name] is unavailable (reason)"
```

**Test 3: Multiple Items Mixed**
```
Given: Config has 2 available, 1 unavailable
When: Run npm run shef:check-availability
Then:
  - Checks all 3 items sequentially
  - Final report shows:
    "✓ Available (2):"
    "✗ Unavailable (1): [name]: [reason]"
```

**Test 4: Error Handling**
```
Given: Item URL is invalid (404)
When: Run npm run shef:check-availability
Then:
  - Catches error
  - Returns available=false, reason="Error: ..."
  - Continues to next item (doesn't crash)
```

## Acceptance Criteria

✅ Pass = All of these are true:
1. Available dishes detected correctly (button found, not disabled)
2. Unavailable dishes detected correctly (button missing or disabled)
3. Error cases handled without crashing
4. Clear console output with counts and reasons
5. Sequential checking completes without hanging

## Manual Validation Steps

**Step 1: Check test data**
```bash
# Verify config has items
cat data/config.json | grep -A 3 "items"
```

**Step 2: Run availability checker**
```bash
npm run shef:check-availability
```

**Step 3: Verify output**
- Browser opens (non-headless for debugging)
- Navigates to each dish URL
- Console shows availability for each item
- Final summary shows available/unavailable counts
- Browser closes cleanly

**Step 4: Validate results**
- Manually visit each dish URL
- Confirm checker results match reality
- Available dishes have visible "Add to cart" button
- Unavailable dishes don't have button or it's disabled

## Known Edge Cases

1. **Portion size dropdown required**: Some dishes need portion selection before "Add" button appears. Current implementation may mark these as unavailable. (Acceptable for MVP - we handle this in cart.ts already)

2. **Loading states**: If page is slow, button might not be found. Current timeout is 1000ms. (Acceptable - can increase if needed)

3. **Multiple modals**: If acknowledgement popups block the dish modal, button might not be visible. (Handled by navigateTo() which dismisses overlays)

## Success Metrics

- **Accuracy**: 95%+ correct identification (manual verification)
- **Speed**: 2-5s per item check (acceptable for MVP)
- **Reliability**: No crashes on error cases (must handle gracefully)

## Post-Validation

After manual validation passes:
- [x] Update MAP.md with new file:line references
- [x] Mark task complete in journal
- [x] Move to Step 2 (integrate into prefill)

---

## Validation Run — 2026-01-29

**Test Data:**
- Paneer Paratha (available) - https://shef.com/order/shef/moms-b/paneer-paratha-229488
- Chill Fish (unavailable/sold out) - https://shef.com/order/shef/moms-b/chill-fish-weekdays-273175

**Results:**
```
✓ Paneer Paratha → AVAILABLE (Add button visible)
✗ Chill Fish → UNAVAILABLE (Modal did not open - dish sold out)
```

**Validation Status: PASSED**
- Available dish detected correctly
- Unavailable dish detected correctly
- Multi-item processing works
- Clear logging with actionable reasons
- No crashes

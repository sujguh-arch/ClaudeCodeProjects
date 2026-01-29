# build.md — Implementation Plan

## Overview

Add availability checking before prefill. Check each dish URL for "Add to cart" button, filter unavailable items, show status in preview modal.

## Files to Change

### 1. New: automation/lib/availability.ts
**Create new module for availability checks**

```typescript
export async function checkDishAvailability(
  page: Page,
  url: string,
  name: string
): Promise<{ available: boolean; reason?: string }>

export async function checkAllItems(
  browser: BrowserContext,
  items: ConfigItem[]
): Promise<AvailabilityResult[]>
```

**Logic:**
- Navigate to dish URL
- Look for "Add to cart" or "Update cart" button
- If button exists and not disabled → available = true
- If button missing or disabled → available = false, reason = "Sold out" or "Unavailable"
- Handle errors (404, timeout) → available = false, reason = "Error: {message}"

### 2. Update: automation/prefill.ts
**Import availability checker, filter items before adding**

Add before `runPrefill()` loop (L428-434):
```typescript
// Check availability first
const availabilityResults = await checkAllItems(context, config.items);
const availableItems = availabilityResults.filter(r => r.available);
const unavailableItems = availabilityResults.filter(r => !r.available);

log(`Availability check: ${availableItems.length} available, ${unavailableItems.length} unavailable`);

// Log unavailable items
unavailableItems.forEach(item => {
  log(`Skipped ${item.name} - ${item.reason}`);
});

// Only process available items
for (const result of availableItems) {
  const item = config.items.find(i => i.url === result.url);
  await addItemToCart(page, item);
}
```

### 3. New API: src/app/api/prefill/check/route.ts
**New endpoint to check availability before prefill**

```typescript
POST /api/prefill/check
Body: { items: ShefItem[] }
Response: {
  available: ShefItem[],
  unavailable: Array<{ item: ShefItem, reason: string }>
}
```

Spawns availability checker script, returns results.

### 4. Update: src/components/features/cart/CartPreview.tsx
**Show availability status in preview modal**

Add before item list (L30-46):
- Button: "Check Availability"
- Loading state while checking
- Results section:
  - Green: "✓ 3 items available"
  - Red: "✗ 1 unavailable: Spinach Curry (Sold out)"
- Disable "Start Prefill" if all items unavailable

### 5. Update: src/hooks/useAutomation.ts
**Add checkAvailability function**

```typescript
const checkAvailability = async (items: ShefItem[]) => {
  const response = await fetch('/api/prefill/check', {
    method: 'POST',
    body: JSON.stringify({ items })
  });
  return response.json();
};
```

### 6. Update: src/lib/types.ts
**Add availability types**

```typescript
export interface AvailabilityResult {
  name: string;
  url: string;
  available: boolean;
  reason?: string; // "Sold out", "Error: 404", etc.
}
```

## Implementation Steps

**Step 1: Build availability checker (automation layer)**
1. Create `automation/lib/availability.ts`
2. Implement `checkDishAvailability()` - navigate, check button
3. Implement `checkAllItems()` - loop through items
4. Test with manual script: `npm run shef:check-availability`

**Step 2: Integrate into prefill**
1. Update `automation/prefill.ts` - filter items before loop
2. Test: Run prefill with mix of available/unavailable items
3. Verify logs show skipped items

**Step 3: Add API endpoint**
1. Create `src/app/api/prefill/check/route.ts`
2. Spawn availability checker, return results
3. Test endpoint manually with curl

**Step 4: Update UI**
1. Add "Check Availability" button to CartPreview
2. Show results (available/unavailable counts + details)
3. Disable prefill if all unavailable
4. Test UI flow end-to-end

## Testing Checklist

- [ ] Available dish detected correctly
- [ ] Unavailable dish (sold out) detected correctly
- [ ] Error cases handled (404, timeout)
- [ ] UI shows correct counts
- [ ] Prefill skips unavailable items
- [ ] Logs show clear skip reasons
- [ ] Preview modal disables button when all unavailable

## Non-Functional Requirements

- **Performance**: Availability check adds ~2-5s per item (parallel would be faster but complex)
- **Error handling**: Failed checks should not block prefill, just mark as unavailable
- **Logging**: Clear, actionable messages ("Skipped X - Sold out")

## Success = MVP Shipped

When:
- User sees "2 available, 1 unavailable" before prefill
- Prefill only adds available items
- Logs explain why items skipped

Then: Ship it. Iterate based on real usage.

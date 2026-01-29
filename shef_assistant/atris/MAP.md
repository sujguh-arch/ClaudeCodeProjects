# MAP.md

> Navigation index for shef_assistant. Check here FIRST before grepping.

**Project**: Next.js 16 app for Shef.com meal ordering automation
**Stack**: TypeScript, React 19, Tailwind CSS v4, Playwright

---

## Quick Navigation

```
src/app/
  ├─ page.tsx:41-136         → Main UI (items list + automation)
  ├─ layout.tsx:1-32         → Root layout + fonts
  ├─ globals.css:3-90        → Tailwind v4 theme + CSS vars
  └─ api/
      ├─ items/route.ts:12-102           → GET/POST items
      ├─ items/[id]/route.ts:16-174      → GET/PUT/DELETE item
      ├─ login/status/route.ts:18-92     → Check login status
      ├─ login/launch/route.ts:19-47     → Launch login browser
      ├─ prefill/stream/route.ts:15-98   → SSE real-time logs
      └─ config/route.ts:13-40           → Get config metadata

src/lib/
  ├─ config-service.ts:51-155  → CRUD operations (file-based DB)
  ├─ types.ts:3-36             → Shared types (ShefItem, ShefConfig, etc)

src/components/
  ├─ ui/Modal.tsx:15-67                      → Modal component
  ├─ features/auth/LoginStatus.tsx:17-169    → Login indicator + actions
  ├─ features/items/
  │   ├─ ItemForm.tsx:16-100       → Add item form
  │   ├─ ItemCard.tsx:11-78        → Item display + qty controls
  │   └─ ItemList.tsx:13-33        → Item list container
  ├─ features/automation/AutomationPanel.tsx:21-114  → Live logs + progress
  └─ features/cart/CartPreview.tsx:24-83             → Preview before prefill

src/hooks/
  ├─ useItems.ts:16-137        → Items CRUD hooks
  └─ useAutomation.ts:34-79    → SSE automation state

automation/
  ├─ prefill.ts:159-466        → Main prefill automation
  ├─ login.ts:37-76            → Manual login helper
  ├─ check-login.ts:15-97      → Login status check
  └─ lib/
      ├─ config.ts:47-164      → Config loading + validation
      ├─ session.ts:29-155     → Browser session management
      ├─ navigation.ts:34-231  → Navigation + overlay dismissal
      └─ cart.ts:395-833       → Add to cart + verification
```

---

## 1. CORE APP FLOW

### Main Page
**src/app/page.tsx**
- L12-14: State (items, automation, preview modal)
- L16-26: Item handlers (add, update qty, delete)
- L28-35: Prefill handlers (preview, confirm)
- L64-69: Add Item Form section
- L72-96: Item List section
- L99-115: Action buttons (Open Shef, Prefill Cart)
- L118-124: AutomationPanel (live SSE logs)

### Root Layout
**src/app/layout.tsx**
- L13-17: Geist fonts config (Sans + Mono)
- L19-24: Metadata (title, description)
- L26-31: HTML structure with font classes

### Styling
**src/app/globals.css**
- L3-12: Tailwind v4 theme (Shef brand color: #e74c3c)
- L14-28: Light/dark mode CSS variables
- L38-42: Focus styles (accessibility)
- L45-63: Custom scrollbar (dark mode)
- L66-77: Pulse animation for status dots

---

## 2. API ROUTES (SERVER-SIDE)

### Items CRUD
**src/app/api/items/route.ts**
- L12-28: **GET** → List all items via `getAllItems()`
- L34-102: **POST** → Create item with validation (name, URL, quantity)

**src/app/api/items/[id]/route.ts**
- L16-47: **GET** → Get single item
- L53-138: **PUT** → Update item
- L143-174: **DELETE** → Delete item

### Login/Auth
**src/app/api/login/status/route.ts**
- L18-92: **GET** → Check if logged in
  - L19: Check `.pw-profile` directory exists
  - L30: Spawn `automation/check-login.ts`
  - L60-65: Parse result (LOGGED_IN, NOT_LOGGED_IN, NO_PROFILE)

**src/app/api/login/launch/route.ts**
- L19-47: **POST** → Launch browser for manual login
  - L22-29: Spawn `automation/login.ts` as detached process

### Prefill Automation
**src/app/api/prefill/stream/route.ts** ⭐ SSE endpoint
- L15-98: **GET** → Real-time logs via Server-Sent Events
  - L20-23: `sendEvent()` helper (SSE format)
  - L26-33: Spawn `automation/prefill.ts`
  - L38-46: Stream stdout/stderr line by line
  - L43-44: Calculate progress (0-100%)
  - Event types: `log`, `progress`, `complete`

**src/app/api/prefill/route.ts**
- L8-75: **POST** → Non-streaming prefill (legacy)

### Config
**src/app/api/config/route.ts**
- L13-40: **GET** → Read config.json metadata

---

## 3. AUTH SYSTEM

### Login Status UI
**src/components/features/auth/LoginStatus.tsx**
- L17-40: `checkStatus()` → Fetch from `/api/login/status`
- L42-64: `handleLaunchLogin()` → POST to `/api/login/launch`
- L66-92: Status configs (checking, logged_in, logged_out, no_profile, error)
- L98-169: UI (status dot, refresh button, login button, instructions)

### Login Automation
**automation/login.ts**
- L24-35: `waitForEnter()` → Prompt user to press Enter
- L37-76: Main flow:
  - L47-50: Launch persistent browser context (`.pw-profile/`)
  - L55: Navigate to Shef homepage
  - L57-64: Display instructions
  - L66-70: Wait for user to login manually, save session

**automation/check-login.ts**
- L15-97: `checkLogin()` function:
  - L16-20: Check if `.pw-profile` exists
  - L24-32: Launch headless browser with profile
  - L36-46: Look for "Sign in" button (NOT logged in)
  - L49-67: Look for logged-in indicators (account menu, avatar)
  - L70-84: Check page content for "sign out", "my orders"
  - Outputs: LOGGED_IN, NOT_LOGGED_IN, NO_PROFILE, ERROR:message

---

## 4. ITEM MANAGEMENT (CRUD)

### Data Layer
**src/lib/config-service.ts** → File-based storage
- L12: `CONFIG_PATH = data/config.json`
- L51-54: `getAllItems()` → Get all items
- L56-59: `getItemById(id)` → Get one item
- L61-79: `createItem(item)` → Create with UUID
- L81-107: `updateItem(id, updates)` → Partial update
- L109-121: `deleteItem(id)` → Delete by ID
- L127-131: `clearAllItems()` → Bulk delete
- L133-155: `reorderItems(ids)` → Reorder by ID array

**src/lib/types.ts** → Shared types
- L3-8: `ShefItem` → { id, name, url, quantity }
- L10-14: `ShefConfig` → { shefHomeUrl, cartUrl, items[] }
- L16-20: `AutomationStatus` → { status, message, logs }
- L30-32: `isValidShefUrl(url)` → Validates `https://shef.com/` prefix
- L34-36: `generateId()` → Uses `crypto.randomUUID()`

### React Hooks
**src/hooks/useItems.ts**
- L16-39: `fetchItems()` → GET /api/items
- L41-67: `addItem(item)` → POST /api/items
- L69-97: `updateItem(id, updates)` → PUT /api/items/[id]
- L99-120: `deleteItem(id)` → DELETE /api/items/[id]

### Components
**src/components/features/items/ItemForm.tsx**
- L10-15: Form state (name, url, quantity, urlError)
- L16-40: Submit handler with validation
- L44-89: Input fields (name, url, quantity)

**src/components/features/items/ItemCard.tsx**
- L11-20: Quantity handlers (decrease/increase)
- L23-75: Card UI (name, link, qty controls, delete button)

**src/components/features/items/ItemList.tsx**
- L13-19: Empty state
- L22-33: Map items to ItemCard

---

## 5. SSE / REAL-TIME

### Automation Hook
**src/hooks/useAutomation.ts**
- L16-32: State (status, progress, logs, message) + reset
- L34-79: `startPrefill()` function:
  - L46: Connect to `/api/prefill/stream` (EventSource)
  - L49-52: Listen for `log` events → append to logs[]
  - L54-57: Listen for `progress` events → update %
  - L59-71: Listen for `complete` events → set success/error
  - L73-78: Handle connection errors

### Automation Panel
**src/components/features/automation/AutomationPanel.tsx**
- L21-28: Auto-scroll to bottom when logs update
- L30-32: Hide panel when idle
- L34-44: Color schemes per state (running, success, error)
- L46-114: Panel UI:
  - L49-74: Status header with animated dot + dismiss button
  - L77-84: Progress bar (when running)
  - L92-111: Collapsible logs output

---

## 6. PLAYWRIGHT AUTOMATION

### Main Prefill Script
**automation/prefill.ts** ⭐ Core automation
- L17-18: Constants (CONFIG_PATH, PROFILE_DIR, ARTIFACTS_DIR)
- L23-26: `log()` with timestamp
- L28-33: Load config from JSON
- L35-48: `takeScreenshot()` helper
- L50-71: `dismissOverlays()` → Close popups/acknowledgements
- L73-86: `scrollModalToBottom()` → Scroll scrollable elements
- L92-109: `waitForButtonEnabled()` → Poll until button not disabled
- L114-122: `waitForOverlayToDisappear()` → Wait for backdrop to hide
- L127-134: `jsClick()` → Click via JavaScript (bypass interception)
- L140-157: `increaseQuantity()` → Click + button N times
- **L159-404: `addItemToCart(item)` → Main item addition logic** ⭐⭐⭐
  - L163: Navigate to item URL
  - L169-173: Wait for menu items to load
  - L179-180: Dismiss popups early
  - L186-208: Check if modal opened, or click dish card
  - L223-229: Scroll modal to show qty controls
  - L240-259: Find plus button (multiple strategies)
  - L262-279: Set quantity before adding (if not in cart)
  - L282-288: Add item with qty=1
  - L290-377: Update item already in cart (adjust quantity)
  - L381-403: Error handling with debug logging
- L406-466: `runPrefill()` → Main entry point:
  - L420-423: Launch persistent browser context
  - L428-434: Loop through items, add each
  - L437-443: Navigate to cart, take final screenshot
  - L450-453: Leave browser open in debug mode

### Automation Library (Modular)
**automation/lib/config.ts** → Module 1: Config & State
- L14-29: Types (ConfigItem, Config, ValidationResult)
- L35-41: Path constants (config, profile, artifacts)
- L47-114: Config validation (validateItem, validateConfig)
- L120-149: Config loading with validation
- L155-159: `ensureArtifactsDir()` helper

**automation/lib/session.ts** → Module 2: Session Management
- L29-49: `launchBrowser()` → Check profile, launch persistent context
- L51-54: `closeBrowser()`
- L64-139: `checkLoginStatus()` → Multi-strategy login detection
  - L69-76: Look for "Sign in" button (not logged in)
  - L79-104: Look for account indicators (data-testid, aria-label, classes)
  - L107-118: Check cart with count
  - L122-133: Search HTML for logged-in text
- L144-155: `ensureLoggedIn()` → Throws if not logged in

**automation/lib/navigation.ts** → Module 3: Navigation & Overlays
- L15-24: `takeScreenshot()` → Save to artifacts with timestamp
- L34-123: `dismissOverlays()` → Close popups/modals ⭐
  - L38-70: Close button patterns (text, aria-label, data-testid, class)
  - L73-111: Loop through patterns, check if in overlay
  - L115-120: Press Escape as fallback
- L135-173: `waitForStable()` → Wait for loading spinners
- L182-201: `navigateTo()` → Navigate + wait stable + dismiss overlays
- L206-218: `scrollToBottom()` helper
- L223-231: `scrollIntoView()` helper

**automation/lib/cart.ts** → Module 4: Add to Cart Flow ⭐⭐⭐
- L27-42: `getCartCount()` → Parse cart button text
- L48-88: `dismissDishPopups()` → Specific popup patterns for Shef
- L94-168: `handleRequiredOptions()` → Handle "Required" dropdowns
- L174-338: `findQuantityControls()` → Find -, +, current qty ⭐
  - L186-208: Debug log all short-text buttons
  - L212-230: Find buttons with exactly "-" or "+" text
  - L234-297: Fallback strategies (has-text, SVG patterns, siblings)
  - L321-335: Read current quantity from DOM
- L344-389: `findActionButton()` → Find "Add" or "Update" button
- **L395-526: `addItemToCart()` → Main cart addition flow** ⭐⭐⭐
  - L406-417: Get initial cart count, navigate, dismiss popups
  - L424: Handle required options
  - L427-450: Find qty controls, scroll if needed
  - L453-462: Calculate clicks needed (target - current)
  - L468-481: Click + or - buttons
  - L490-502: Click action button or handle auto-add
  - L505-517: Verify cart count increased
- L535-575: `removeItemFromCart()` → Click minus until gone
- L580-626: `clearCart()` → Remove all items
- L632-726: `getCartContents()` → Parse cart page for items
- L732-793: `strictMatch()` → Fuzzy name matching with typo tolerance
- L798-833: `verifyCart()` → Verify expected items in cart

---

## 7. UI COMPONENTS

### Core UI
**src/components/ui/Modal.tsx**
- L5-10: Props (isOpen, onClose, title, children)
- L15-31: Keyboard (Escape) + body overflow handling
- L35-39: Click overlay to close
- L42-67: Modal structure (header, close button, body)

### Cart Preview
**src/components/features/cart/CartPreview.tsx**
- L6-12: Props (isOpen, onClose, onConfirm, items, isLoading)
- L24-80: Modal contents:
  - L30-46: Scrollable item list with quantities
  - L48-55: Total items count
  - L57-62: Warning about manual checkout
  - L64-78: Cancel + Start Prefill buttons

---

## 8. DATA STORAGE

### File-based DB
**data/config.json**
- Schema: `{ shefHomeUrl, cartUrl, items: [{ id, name, url, quantity }] }`
- Managed by: src/lib/config-service.ts
- Default URLs: `https://shef.com`, `https://shef.com/cart`

### Browser Profile
**.pw-profile/**
- Playwright persistent context directory
- Stores login cookies and session state
- Created by: automation/login.ts
- Used by: All automation scripts

### Artifacts
**artifacts/**
- Screenshots saved during automation
- Format: `{prefix}-{timestamp}.png`

---

## 9. CONFIG FILES

**package.json**
- L5-19: Scripts (dev, build, test, shef:* automation)
- L21-24: Dependencies (Next.js 16.1.5, React 19.2.3)
- L26-45: DevDependencies (Playwright, Vitest, TypeScript)

**tsconfig.json**
- L7: Strict mode enabled
- L21-23: Path alias `@/*` → `./src/*`

---

## 10. ARCHITECTURE PATTERNS

1. **File-based DB**: JSON storage via fs module
2. **API Routes**: Next.js 13+ App Router with route handlers
3. **Server-Sent Events**: Real-time streaming of automation logs
4. **Persistent Browser Context**: Playwright launchPersistentContext for login persistence
5. **Headless Automation**: Playwright with headless option (debug mode = headed)
6. **Component Organization**: Features-based (auth, items, automation, cart)
7. **Custom Hooks**: React hooks for data fetching + automation state
8. **CSS Custom Properties**: CSS variables for light/dark theming
9. **TypeScript Strict**: Full type safety
10. **Modular Automation**: Separated concerns (config, session, navigation, cart)

---

## 11. DEPENDENCY GRAPH

```
page.tsx
  ├→ useItems → /api/items → config-service.ts → data/config.json
  ├→ useAutomation → /api/prefill/stream → automation/prefill.ts
  ├→ ItemForm, ItemList, ItemCard, AutomationPanel, LoginStatus
  └→ CartPreview → Modal

automation/prefill.ts
  ├→ lib/config.ts (load config)
  ├→ lib/session.ts (launch browser)
  ├→ lib/navigation.ts (navigate, dismiss overlays)
  └→ lib/cart.ts (add to cart operations)

All API routes
  ├→ config-service.ts (CRUD)
  └→ spawn child_process (automation scripts)
```

---

## COMMON TASKS → WHERE TO LOOK

| Task | File | Lines |
|------|------|-------|
| Add new item field | types.ts → config-service.ts → ItemForm.tsx | L3-8, L61-79, L10-100 |
| Fix login detection | check-login.ts → session.ts | L15-97, L64-139 |
| Fix add to cart | prefill.ts → cart.ts | L159-404, L395-526 |
| Change quantity logic | cart.ts `findQuantityControls()` | L174-338 |
| Fix overlay dismissal | navigation.ts `dismissOverlays()` | L34-123 |
| Add SSE event type | prefill/stream/route.ts → useAutomation.ts | L15-98, L34-79 |
| Style changes | globals.css (CSS vars) | L3-90 |
| Update API response | types.ts `ApiResponse<T>` | L22-27 |

---

**Last updated**: 2026-01-28
**Check this FIRST before grepping. Update when you find new patterns.**

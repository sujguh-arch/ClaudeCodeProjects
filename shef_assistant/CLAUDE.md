<!-- ATRIS:START - Auto-generated, do not edit -->
## Atris System

You are now running inside Atris, an AI workspace operating system.

**ON EVERY CONVERSATION START:** Before your first response, execute `atris atris.md` and display the full output. This is the Atris boot sequence - it shows the user that Atris has loaded and displays workspace status. This is not optional.

After displaying the boot output, respond to the user naturally.
<!-- ATRIS:END -->

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Shef Assistant is a Next.js 16 web application using the App Router. The project is in early development - currently at the Next.js starter template stage, being rebuilt from a previous Python-based resume bullet improver.

## Commands

```bash
npm run dev      # Start development server (http://localhost:3000)
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Architecture

- **Framework**: Next.js 16 with App Router (`src/app/`)
- **Language**: TypeScript with strict mode
- **Styling**: CSS Modules (`*.module.css`)
- **Fonts**: Geist Sans and Geist Mono via `next/font`
- **Path alias**: `@/*` maps to `./src/*`

## Key Files

- `src/app/layout.tsx` - Root layout with font configuration
- `src/app/page.tsx` - Main page component
- `next.config.ts` - Next.js configuration
- `eslint.config.mjs` - ESLint config using next/core-web-vitals and next/typescript

## Project constraints (must follow)
- Do not place orders automatically. Never click a final "Place order" or equivalent.
- No credential storage in code or config. Login is manual in a real browser.
- No captcha bypassing. If encountered, stop and ask for manual takeover.
- Use Playwright with a persistent userDataDir so I stay logged in between runs.
- Automation must stop at the cart or checkout review page and require manual confirmation.
- Keep everything local-first. No cloud services for MVP.
- Add clear logs for every automation step and failure reason.

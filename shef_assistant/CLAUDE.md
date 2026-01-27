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

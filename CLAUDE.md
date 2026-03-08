# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**portfolio-vision** is a Japanese stock portfolio Monte Carlo simulator (株式ポートフォリオ シミュレーター). It visualizes probability distributions of future portfolio values using historical stock price data. The requirements document is at `docs/requirements.md` (in Japanese).

The app is early-stage — currently scaffolded with the Vite React template and shadcn/ui, with most features yet to be built.

## Commands

- `npm run dev` — Start dev server (Vite)
- `npm run build` — Type-check with `tsc -b` then build with Vite
- `npm run lint` — ESLint (flat config)
- `npm run preview` — Preview production build

No test framework is configured yet.

## Tech Stack

- **React 19 + TypeScript** with Vite 7
- **Tailwind CSS v4** (via `@tailwindcss/vite` plugin)
- **shadcn/ui** (radix-nova style, components in `src/components/ui/`)
- **react-router v7** for routing
- **lucide-react** for icons

## Path Aliases

`@/*` maps to `./src/*` (configured in both `tsconfig.json` and `vite.config.ts`).

## shadcn/ui Configuration

- Style: `radix-nova`, base color: `neutral`, icon library: `lucide`
- Not using RSC (`"rsc": false`)
- Component aliases: `@/components/ui` (UI), `@/components` (components), `@/lib` (lib), `@/hooks` (hooks)
- Utility function `cn()` is in `src/lib/utils.ts`

## Planned Architecture (from requirements)

The app is a SPA with a two-panel layout: stock input panel (left) and results/charts (right).

Key planned layers:
- `src/providers/` — Stock data providers behind a `StockDataProvider` interface (Yahoo Finance now, J-Quants later)
- `src/workers/` — Web Worker for Monte Carlo simulation (must not block UI)
- `src/store/` — Zustand store for portfolio and simulation state
- `src/hooks/` — `useSimulation`, `useStockData`
- `src/utils/` — Statistics calculations (covariance, correlation) and Monte Carlo engine
- `src/components/{portfolio,charts,results}/` — Feature-grouped components

## Key Domain Concepts

- Monte Carlo simulation using Geometric Brownian Motion (GBM)
- Phase 1: independent stock model; Phase 2: correlated model via Cholesky decomposition
- Log returns, annualized return/volatility, Sharpe ratio, max drawdown
- Data persisted in localStorage; stock price cache in sessionStorage
- All UI text is in Japanese

## Git

- Commit messages should be written in English

## TypeScript

Strict mode enabled. Key settings in `tsconfig.app.json`:
- `noUnusedLocals`, `noUnusedParameters`
- `erasableSyntaxOnly` (type-only imports)
- Target ES2022, JSX react-jsx


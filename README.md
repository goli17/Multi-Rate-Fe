# Multi-Rate Pricing Frontend

React + Vite client for the Multi-Rate Pricing Calculator.

## Prerequisites

- Node.js 20+
- Running API from `Multi-Rate-BE`

## Setup

```bash
cp .env.example .env
npm install
npm run dev
```

App: `http://localhost:5173`

## Environment

| Variable | Description |
|---|---|
| `VITE_API_URL` | API base including `/api/v1` |

## Features

- Sign up / log in
- Document list and draft editor
- Line items with percent or fixed discount + tax
- Server-driven totals display
- Finalize (read-only afterward)
- Date-range summary report

## E2E tests

Requires API + Postgres. From this directory:

```bash
npx playwright install chromium
npm run test:e2e
```

## Deployed URL

_Add production frontend URL here after deploy._

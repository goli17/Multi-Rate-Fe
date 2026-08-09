# Multi-Rate Pricing Calculator — Frontend

React + Vite + TypeScript client for the Multi-Rate Pricing Calculator.

Companion API: `Multi-Rate-BE`.

## Prerequisites

- Node.js 20+
- Running API from `Multi-Rate-BE` (`http://localhost:3000/api/v1` by default)

## Setup

```bash
cp .env.example .env
npm install
npm run dev
```

App: `http://localhost:5173` (or the next free port Vite reports, often `5174`).

### Environment

| Variable | Description |
|---|---|
| `VITE_API_URL` | API base including `/api/v1` (default `http://localhost:3000/api/v1`) |

## Features

- Sign up / email OTP verification / log in
- Create drafts with title, customer, issue date, and **currency**
- Document list with skeleton loading
- Draft editor: placeholders for line inputs (no pre-filled zeros)
- Quantity and unit price must be **greater than 0** to save a line
- Leaving an empty draft prompts: add a line, delete, or **keep as draft**
- **Server-driven totals only** — the UI formats API amounts in the document currency
- Finalize (read-only afterward)
- Date-range summary report filtered by currency

## Money display policy

- Line subtotal, discount amount, tax amount, line total, and document totals come from the API response.
- The client only runs `formatMoney()` for display (locale currency formatting).
- Saving a line or finalizing always refreshes the document from the server so totals stay consistent.

## E2E tests

Requires API + Postgres. From this directory:

```bash
npx playwright install chromium
npm run test:e2e
```

## Deployed URL

_Add production frontend URL here after deploy._

Point `VITE_API_URL` at the deployed API `/api/v1` and ensure the API `CORS_ORIGIN` includes your frontend origin.

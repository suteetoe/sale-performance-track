# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Start dev server
pnpm build        # prisma generate + next build
pnpm lint         # Next.js ESLint
pnpm db:generate  # Regenerate Prisma client after schema changes
pnpm db:studio    # Open Prisma Studio to inspect DB
```

Always use `pnpm` — never `npm` or `yarn`.

## Architecture

This app measures Sales Performance: scan/enter an Invoice No → look up the Sale Order creation time and Delivery Order completion time → display duration.

**Data flow:**
1. User inputs an Invoice No (QR scan or manual)
2. `GET /api/performance?invoice=...` calls `src/lib/getPerformance.ts`
3. Result page (`/result?invoice=...`) is a Server Component that calls `getPerformance()` directly and renders `PerformanceCard`

**Core business logic** is in `src/lib/getPerformance.ts`:
- Queries `IcTrans` (trans_flag=44) to find the Invoice
- Joins `ApArTransDetail` to find the linked Sale Order (trans_flag=36) — this is the **start time**
- Joins `IcTransDetail` to find the linked Delivery Order (trans_flag=701) — this is the **end time**
- Returns `PerformanceResult` (status: "completed" | "in_progress")

**Time handling** in `src/lib/performance.ts`:
- `doc_date` and `doc_time` are stored in Thai time (UTC+7) as separate fields
- `combineDateTime()` merges them into a proper UTC `Date`
- Durations are labeled in Thai (วัน/ชั่วโมง/นาที)

## Database

Existing PostgreSQL DB (read-only mapping). Three Prisma models:

| Model | Table | Key fields |
|-------|-------|-----------|
| `IcTrans` | `ic_trans` | Composite PK `(doc_no, trans_flag)`: 36=Sale Order, 44=Invoice, 701=Delivery |
| `ApArTransDetail` | `ap_ar_trans_detail` | `doc_no`→Invoice, `billing_no`→Sale Order |
| `IcTransDetail` | `ic_trans_detail` | `doc_no`→Delivery, `ref_doc_no`→Invoice |

`ic_trans` has a composite PK — do **not** use Prisma relations across tables; query each model separately and join in application code.

## Key Components

- `QrScanner` — client-only (loaded with `dynamic(..., { ssr: false })`), uses html5-qrcode with "environment" camera
- `PerformanceCard` — timeline card with color-coded duration badge (green ≤1d, yellow ≤3d, red >3d)
- `/api/debug` route — raw DB inspection tool, can be deleted once no longer needed

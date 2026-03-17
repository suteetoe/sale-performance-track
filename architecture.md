# Sale Performance Tracker — Architecture

## Overview

Web application สำหรับวัด Sale Performance โดยนับเวลาตั้งแต่วันที่สร้าง Sale Order
จนถึงวันที่สร้างเอกสาร Delivery Order โดยเริ่มจากการ Scan QR Code บน Sale Invoice

---

## Data Flow

```
┌─────────────────────────────────────────────────────────┐
│                    User Action                          │
│         Scan QR Code หรือ Manual Input (Invoice No.)    │
└───────────────────────┬─────────────────────────────────┘
                        │ Invoice No.
                        ▼
┌─────────────────────────────────────────────────────────┐
│                  API Route                              │
│           GET /api/performance/[invoiceNo]              │
└───────────────────────┬─────────────────────────────────┘
                        │
          ┌─────────────┼──────────────────────┐
          ▼             ▼                       ▼
    ic_trans      ap_ar_trans_detail      ic_trans_detail
  (trans_flag=44)  doc_no=Invoice No.      item_code=Invoice No.
   [ตรวจสอบ]        billing_no=SO No.            │
                        │                       ▼
                        ▼                   ic_trans
                    ic_trans             (trans_flag=701)
                 (trans_flag=36)           (End Time)
                  (Start Time)
                        │                       │
                        └──────────┬────────────┘
                                   ▼
                     Performance = End - Start
                     (Duration in days/hours/minutes)
```

---

## Database Schema (Existing PostgreSQL)

```dbml
-- ic_trans เก็บทุกประเภทเอกสาร แยกด้วย trans_flag
Table ic_trans {
  doc_no     varchar(255) [pk]
  trans_flag int          [pk]   -- 36=Sale Order | 44=Sale Invoice | 701=Delivery Order
  doc_date   date
  doc_time   varchar(10)         -- format: "HH:MM" (เวลาไทย UTC+7)
}

-- เชื่อมโยง Sale Invoice → Sale Order
Table ap_ar_trans_detail {
  roworder   int          [pk, increment]
  doc_no     varchar(50)  [ref: > ic_trans.doc_no]   -- Sale Invoice doc_no (trans_flag=44)
  billing_no varchar(50)  [ref: > ic_trans.doc_no]   -- Sale Order doc_no   (trans_flag=36)
}

-- เชื่อมโยง Delivery Order → Sale Invoice
Table ic_trans_detail {
  roworder  int          [pk, increment]
  doc_no    varchar(255) [ref: > ic_trans.doc_no]   -- Delivery Order doc_no (trans_flag=701)
  item_code varchar(255) [ref: > ic_trans.doc_no]   -- Sale Invoice doc_no   (trans_flag=44)
}
```

### Relationships
- Invoice (44) ←→ Sale Order (36) : ผ่าน `ap_ar_trans_detail`
  - `ap_ar_trans_detail.doc_no`     = Invoice No.
  - `ap_ar_trans_detail.billing_no` = Sale Order No.
- Delivery (701) ←→ Invoice (44) : ผ่าน `ic_trans_detail`
  - `ic_trans_detail.doc_no`    = Delivery Order doc_no
  - `ic_trans_detail.item_code` = Invoice No.

---

## Tech Stack

| Layer      | Technology                        | Version  |
|------------|-----------------------------------|----------|
| Framework  | Next.js (App Router)              | 14+      |
| Language   | TypeScript                        | 5+       |
| Styling    | Tailwind CSS                      | 3+       |
| ORM        | Prisma                            | 5+       |
| Database   | PostgreSQL                        | existing |
| QR Scanner | html5-qrcode                      | latest   |

---

## Project Structure

```
sale-performance-track/
├── prisma/
│   └── schema.prisma               # Prisma models
│
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                # Home: QR Scanner + Manual Input
│   │   ├── result/
│   │   │   └── [invoiceNo]/
│   │   │       └── page.tsx        # Performance Result page
│   │   └── api/
│   │       └── performance/
│   │           └── [invoiceNo]/
│   │               └── route.ts    # API: query + คำนวณ duration
│   │
│   ├── components/
│   │   ├── QrScanner.tsx           # Camera-based QR scanner
│   │   ├── ManualInput.tsx         # Manual Invoice No. input form
│   │   └── PerformanceCard.tsx     # Timeline result display
│   │
│   └── lib/
│       ├── prisma.ts               # Prisma client singleton
│       └── performance.ts          # Duration calculation utility
│
├── architecture.md
├── .env                            # DATABASE_URL
└── package.json
```

---

## API Design

### `GET /api/performance/[invoiceNo]`

**Response (Success)**
```json
{
  "invoiceNo": "INV/2024/00123",
  "saleOrder": {
    "doc_no": "SO/2024/00456",
    "doc_date": "2024-01-10",
    "doc_time": "09:00:00",
    "datetime": "2024-01-10T09:00:00"
  },
  "deliveryOrder": {
    "doc_no": "DO/2024/00789",
    "doc_date": "2024-01-12",
    "doc_time": "14:30:00",
    "datetime": "2024-01-12T14:30:00"
  },
  "duration": {
    "days": 2,
    "hours": 5,
    "minutes": 30,
    "totalMinutes": 3330,
    "label": "2 วัน 5 ชั่วโมง 30 นาที"
  }
}
```

**Response (Error)**
```json
{
  "error": "NOT_FOUND",
  "message": "ไม่พบ Invoice หมายเลข INV/2024/00123"
}
```

---

## Page Design

### หน้าหลัก `/`
- QR Scanner (ใช้ camera)
- Manual Input: ช่อง input + ปุ่ม Search
- เมื่อ scan หรือ submit → redirect ไปยัง `/result/[invoiceNo]`

### หน้าผล `/result/[invoiceNo]`
```
┌──────────────────────────────────────────┐
│  Invoice: INV/2024/00123                 │
├──────────────────────────────────────────┤
│  ● Sale Order   SO/2024/00456            │
│    10 ม.ค. 2567  09:00 น.               │
│         │                               │
│         │  2 วัน 5 ชั่วโมง 30 นาที      │
│         │                               │
│  ● Delivery     DO/2024/00789            │
│    12 ม.ค. 2567  14:30 น.               │
└──────────────────────────────────────────┘
```

---

## Performance Measurement

```
Start = ic_trans (trans_flag=36) doc_date + doc_time
        linked via ap_ar_trans_detail: doc_no=Invoice → billing_no=SO
        fallback = ic_trans (trans_flag=44) ถ้าไม่พบ SO

End   = ic_trans (trans_flag=701) doc_date + doc_time
        linked via ic_trans_detail: item_code=Invoice → doc_no=Delivery
        fallback = new Date() (ปัจจุบัน) ถ้ายังไม่มี Delivery

Duration = End - Start  (all timestamps in UTC, doc_time stored as UTC+7)
```

---

## Development Phases

| Phase | รายการ | สถานะ |
|-------|--------|-------|
| 1 | Project Setup (Next.js + Tailwind + Prisma) | ✅ |
| 2 | Prisma Schema + API Route | ✅ |
| 3 | QR Scanner + Manual Input UI | ✅ |
| 4 | Result Page + Performance Display | ✅ |

## Schema Change Log

| วันที่ | รายการเปลี่ยนแปลง |
|--------|-----------------|
| 2026-03-17 | รวม `sale_order` + `sale_invoice` → `ic_trans` (trans_flag: 36/44) |
| 2026-03-17 | เปลี่ยน `sale_invoice_ref` → `ap_ar_trans_detail` (billing_no แทน doc_ref_no) |
| 2026-03-17 | เปลี่ยน `delivery_order` → `pp_shipment`, `delivery_order_detail` → `pp_shipment_detail` |
| 2026-03-17 | เปลี่ยน Delivery: `pp_shipment`/`pp_shipment_detail` → `ic_trans` (trans_flag=701) + `ic_trans_detail` (item_code=Invoice) |

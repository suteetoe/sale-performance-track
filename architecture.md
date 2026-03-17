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
                        │ Invoice No. (e.g. INV/2024/00123)
                        ▼
┌─────────────────────────────────────────────────────────┐
│                  API Route                              │
│           GET /api/performance/[invoiceNo]              │
└───────────────────────┬─────────────────────────────────┘
                        │
          ┌─────────────┼─────────────┐
          ▼             ▼             ▼
   sale_invoice   sale_invoice_ref   delivery_order_detail
                        │                     │
                        ▼                     ▼
                   sale_order          delivery_order
                  (Start Time)         (End Time)
                        │                     │
                        └─────────┬───────────┘
                                  ▼
                    Performance = End - Start
                    (Duration in days/hours/minutes)
```

---

## Database Schema (Existing PostgreSQL)

```dbml
Table sale_order {
  doc_no   varchar(255) [pk]
  doc_date date
  doc_time varchar(10)           -- format: "HH:MM:SS"
}

Table sale_invoice {
  doc_no   varchar(255) [pk]
  doc_date date
  doc_time varchar(10)
}

Table sale_invoice_ref {
  id         int          [pk, increment]
  doc_no     varchar(50)  [ref: > sale_invoice.doc_no]   -- Invoice No.
  doc_ref_no varchar(50)  [ref: > sale_order.doc_no]     -- Sale Order No.
}

Table delivery_order {
  doc_no   varchar(255) [pk]
  doc_date date
  doc_time varchar(10)
}

Table delivery_order_detail {
  id              int          [pk, increment]
  doc_no          varchar(255) [ref: > delivery_order.doc_no]
  delivery_doc_no varchar(255) [ref: > sale_invoice.doc_no]  -- Invoice No.
}
```

### Relationships
- `sale_invoice` ←→ `sale_order` : ผ่าน `sale_invoice_ref`
  - `sale_invoice_ref.doc_no` = Invoice No.
  - `sale_invoice_ref.doc_ref_no` = Sale Order No.
- `delivery_order` ←→ `sale_invoice` : ผ่าน `delivery_order_detail`
  - `delivery_order_detail.doc_no` = Delivery Order No.
  - `delivery_order_detail.delivery_doc_no` = Invoice No.

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
Start = sale_order.doc_date + sale_order.doc_time
End   = delivery_order.doc_date + delivery_order.doc_time

Duration = End - Start
```

---

## Development Phases

| Phase | รายการ | สถานะ |
|-------|--------|-------|
| 1 | Project Setup (Next.js + Tailwind + Prisma) | - |
| 2 | Prisma Schema + API Route | - |
| 3 | QR Scanner + Manual Input UI | - |
| 4 | Result Page + Performance Display | - |

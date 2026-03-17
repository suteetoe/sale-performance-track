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
    ic_trans      ap_ar_trans_detail      pp_shipment_detail
  (trans_flag=44)  doc_no=Invoice No.      ref_doc_no=Invoice No.
   [ตรวจสอบ]        billing_no=SO No.            │
                        │                       ▼
                        ▼                  pp_shipment
                    ic_trans              (End Time)
                 (trans_flag=36)
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
-- Sale Order (trans_flag=36) และ Sale Invoice (trans_flag=44) อยู่ใน table เดียวกัน
Table ic_trans {
  doc_no     varchar(255) [pk]
  trans_flag int          [pk]   -- 36=Sale Order, 44=Sale Invoice
  doc_date   date
  doc_time   varchar(10)         -- format: "HH:MM:SS"
}

-- เชื่อมโยง Sale Invoice → Sale Order
Table ap_ar_trans_detail {
  roworder   int          [pk, increment]
  doc_no     varchar(50)  [ref: > ic_trans.doc_no]   -- Sale Invoice doc_no (trans_flag=44)
  billing_no varchar(50)  [ref: > ic_trans.doc_no]   -- Sale Order doc_no   (trans_flag=36)
}

-- Delivery Order
Table pp_shipment {
  doc_no   varchar(255) [pk]
  doc_date date
  doc_time varchar(10)
}

-- เชื่อมโยง Delivery → Sale Invoice
Table pp_shipment_detail {
  roworder   int          [pk, increment]
  doc_no     varchar(255) [ref: > pp_shipment.doc_no]  -- Delivery Order doc_no
  ref_doc_no varchar(255) [ref: > ic_trans.doc_no]     -- Sale Invoice doc_no (trans_flag=44)
}
```

### Relationships
- `ic_trans` (Invoice, trans_flag=44) ←→ `ic_trans` (Sale Order, trans_flag=36) : ผ่าน `ap_ar_trans_detail`
  - `ap_ar_trans_detail.doc_no`     = Invoice No. (trans_flag=44)
  - `ap_ar_trans_detail.billing_no` = Sale Order No. (trans_flag=36)
- `pp_shipment` ←→ `ic_trans` (Invoice) : ผ่าน `pp_shipment_detail`
  - `pp_shipment_detail.doc_no`     = Delivery Order doc_no
  - `pp_shipment_detail.ref_doc_no` = Invoice No. (trans_flag=44)

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
Start = ic_trans.doc_date + doc_time  WHERE doc_no = billing_no AND trans_flag = 36
End   = pp_shipment.doc_date + doc_time  (linked via pp_shipment_detail.ref_doc_no = invoice_no)

Duration = End - Start
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

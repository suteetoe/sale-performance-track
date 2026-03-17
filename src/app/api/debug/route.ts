import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Debug endpoint — ใช้ตรวจสอบข้อมูลในแต่ละ table
 * GET /api/debug?invoice=R6811/80003
 *
 * ลบ file นี้ออกหลังจาก debug เสร็จแล้ว
 */
export async function GET(req: NextRequest) {
  const invoiceNo = req.nextUrl.searchParams.get("invoice");

  if (!invoiceNo) {
    return NextResponse.json({ error: "กรุณาระบุ ?invoice=..." }, { status: 400 });
  }

  // 1. ค้นหาใน ic_trans ทุก trans_flag (ไม่กรอง)
  const icTransAll = await prisma.icTrans.findMany({
    where: { doc_no: invoiceNo },
    select: { doc_no: true, trans_flag: true, doc_date: true, doc_time: true },
  });

  // 2. ค้นหาใน ap_ar_trans_detail ทั้ง doc_no และ billing_no
  const apArByDocNo = await prisma.apArTransDetail.findMany({
    where: { doc_no: invoiceNo },
  });
  const apArByBillingNo = await prisma.apArTransDetail.findMany({
    where: { billing_no: invoiceNo },
  });

  // 3. ดู sample 5 rows แรกของ ap_ar_trans_detail (เพื่อดูว่ามีข้อมูลแบบไหน)
  const apArSample = await prisma.apArTransDetail.findMany({
    take: 5,
    orderBy: { roworder: "desc" },
  });

  // 4. หา sale_order ที่อาจเชื่อมกับ invoice นี้ใน ic_trans (trans_flag=36)
  //    โดยค้นหา doc_no ที่ขึ้นต้นเหมือนกัน (เผื่อ format ต่างกัน)
  const docPrefix = invoiceNo.split("/")[0]; // เช่น "R6811"
  const icTransSamePrefix = await prisma.icTrans.findMany({
    where: {
      doc_no: { startsWith: docPrefix },
      trans_flag: 36,
    },
    select: { doc_no: true, trans_flag: true, doc_date: true, doc_time: true },
    take: 5,
  });

  // 5. ค้นหาใน pp_shipment_detail
  const shipmentDetail = await prisma.deliveryOrderDetail.findMany({
    where: { ref_doc_no: invoiceNo },
    include: { delivery: true },
  });

  return NextResponse.json({
    invoice_queried: invoiceNo,

    ic_trans: {
      found: icTransAll.length,
      records: icTransAll,
      note: "trans_flag: 36=Sale Order, 44=Sale Invoice",
    },

    ap_ar_trans_detail: {
      by_doc_no:     { found: apArByDocNo.length,     records: apArByDocNo },
      by_billing_no: { found: apArByBillingNo.length, records: apArByBillingNo },
      sample_5_latest: {
        note: "ตัวอย่าง 5 rows ล่าสุดใน ap_ar_trans_detail (ดูว่า format doc_no/billing_no เป็นแบบไหน)",
        records: apArSample,
      },
    },

    ic_trans_sale_order_same_prefix: {
      note: `Sale Order ใน ic_trans ที่ขึ้นต้นด้วย "${docPrefix}" (trans_flag=36)`,
      found: icTransSamePrefix.length,
      records: icTransSamePrefix,
    },

    pp_shipment_detail: {
      found: shipmentDetail.length,
      records: shipmentDetail,
    },
  });
}

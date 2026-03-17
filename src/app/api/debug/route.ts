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

  // 1. ค้นหาใน ic_trans ทุก trans_flag
  const icTransAll = await prisma.icTrans.findMany({
    where: { doc_no: invoiceNo },
    select: { doc_no: true, trans_flag: true, doc_date: true, doc_time: true },
  });

  // 2. ค้นหาใน ap_ar_trans_detail
  const apArByDocNo = await prisma.apArTransDetail.findMany({
    where: { doc_no: invoiceNo },
  });
  const apArByBillingNo = await prisma.apArTransDetail.findMany({
    where: { billing_no: invoiceNo },
  });

  // 3. ค้นหาใน ic_trans_detail (delivery link)
  const icTransDetailByItemCode = await prisma.icTransDetail.findMany({
    where: { item_code: invoiceNo },
  });

  // 3b. ดึง Delivery Order จาก ic_trans (trans_flag=701)
  const deliveryDocNos = icTransDetailByItemCode.map((d) => d.doc_no);
  const deliveryOrders = deliveryDocNos.length > 0
    ? await prisma.icTrans.findMany({
        where: { doc_no: { in: deliveryDocNos }, trans_flag: 701 },
      })
    : [];

  return NextResponse.json({
    invoice_queried: invoiceNo,

    ic_trans: {
      note: "trans_flag: 36=SO, 44=Invoice, 701=Delivery",
      found: icTransAll.length,
      records: icTransAll,
    },

    ap_ar_trans_detail: {
      by_doc_no:     { found: apArByDocNo.length,     records: apArByDocNo },
      by_billing_no: { found: apArByBillingNo.length, records: apArByBillingNo },
    },

    ic_trans_detail: {
      note: "item_code = Invoice doc_no, doc_no = Delivery doc_no",
      by_item_code: { found: icTransDetailByItemCode.length, records: icTransDetailByItemCode },
      delivery_orders: { found: deliveryOrders.length, records: deliveryOrders },
    },
  });
}

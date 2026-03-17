import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { combineDateTime, calcDuration } from "@/lib/performance";

const TRANS_FLAG_SALE_ORDER   = 36;
const TRANS_FLAG_SALE_INVOICE = 44;

export async function GET(req: NextRequest) {
  const invoiceNo = req.nextUrl.searchParams.get("invoice");

  if (!invoiceNo) {
    return NextResponse.json(
      { error: "BAD_REQUEST", message: "กรุณาระบุ Invoice No. (?invoice=...)" },
      { status: 400 }
    );
  }

  // 1. ดึงข้อมูล Invoice จาก ic_trans (trans_flag=44)
  const invoice = await prisma.icTrans.findFirst({
    where: { doc_no: invoiceNo, trans_flag: TRANS_FLAG_SALE_INVOICE },
  });

  if (!invoice) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: `ไม่พบ Invoice หมายเลข ${invoiceNo}` },
      { status: 404 }
    );
  }

  // 2. พยายามหา Sale Order จาก ap_ar_trans_detail
  //    doc_no = Invoice, billing_no = Sale Order
  const apArDetail = await prisma.apArTransDetail.findFirst({
    where: { doc_no: invoiceNo },
  });

  let startDoc: typeof invoice;
  let startDocType: "sale_order" | "sale_invoice";

  if (apArDetail) {
    // 3a. พบ link → ดึง Sale Order จาก ic_trans (trans_flag=36)
    const saleOrder = await prisma.icTrans.findFirst({
      where: { doc_no: apArDetail.billing_no, trans_flag: TRANS_FLAG_SALE_ORDER },
    });

    if (saleOrder) {
      startDoc = saleOrder;
      startDocType = "sale_order";
    } else {
      // พบ link แต่ไม่พบ SO ใน ic_trans → fallback ใช้ invoice
      startDoc = invoice;
      startDocType = "sale_invoice";
    }
  } else {
    // 3b. ไม่พบ link → fallback ใช้ invoice เป็นจุดเริ่มต้น
    startDoc = invoice;
    startDocType = "sale_invoice";
  }

  // 4. หา Delivery Order จาก pp_shipment_detail
  const deliveryDetail = await prisma.deliveryOrderDetail.findFirst({
    where: { ref_doc_no: invoiceNo },
    include: { delivery: true },
  });

  if (!deliveryDetail) {
    return NextResponse.json(
      { error: "NO_DELIVERY", message: `ยังไม่มีเอกสาร Delivery สำหรับ Invoice ${invoiceNo}` },
      { status: 404 }
    );
  }

  const { delivery } = deliveryDetail;

  const startDateTime = combineDateTime(startDoc.doc_date, startDoc.doc_time);
  const endDateTime   = combineDateTime(delivery.doc_date, delivery.doc_time);
  const duration      = calcDuration(startDateTime, endDateTime);

  return NextResponse.json({
    invoiceNo,
    startDocType,   // "sale_order" | "sale_invoice"
    startDoc: {
      doc_no:   startDoc.doc_no,
      doc_date: startDoc.doc_date,
      doc_time: startDoc.doc_time,
      datetime: startDateTime.toISOString(),
    },
    deliveryOrder: {
      doc_no:   delivery.doc_no,
      doc_date: delivery.doc_date,
      doc_time: delivery.doc_time,
      datetime: endDateTime.toISOString(),
    },
    duration,
  });
}

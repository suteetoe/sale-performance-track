import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { combineDateTime, calcDuration } from "@/lib/performance";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ invoiceNo: string }> }
) {
  const { invoiceNo } = await params;
  const decodedInvoiceNo = decodeURIComponent(invoiceNo);

  // 1. หา Sale Order จาก sale_invoice_ref
  const invoiceRef = await prisma.saleInvoiceRef.findFirst({
    where: { doc_no: decodedInvoiceNo },
    include: { saleOrder: true },
  });

  if (!invoiceRef) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: `ไม่พบ Invoice หมายเลข ${decodedInvoiceNo}` },
      { status: 404 }
    );
  }

  // 2. หา Delivery Order จาก delivery_order_detail
  const deliveryDetail = await prisma.deliveryOrderDetail.findFirst({
    where: { delivery_doc_no: decodedInvoiceNo },
    include: { delivery: true },
  });

  if (!deliveryDetail) {
    return NextResponse.json(
      { error: "NO_DELIVERY", message: `ยังไม่มีเอกสาร Delivery สำหรับ Invoice ${decodedInvoiceNo}` },
      { status: 404 }
    );
  }

  const { saleOrder } = invoiceRef;
  const { delivery } = deliveryDetail;

  const soDateTime = combineDateTime(saleOrder.doc_date, saleOrder.doc_time);
  const doDateTime = combineDateTime(delivery.doc_date, delivery.doc_time);
  const duration = calcDuration(soDateTime, doDateTime);

  return NextResponse.json({
    invoiceNo: decodedInvoiceNo,
    saleOrder: {
      doc_no: saleOrder.doc_no,
      doc_date: saleOrder.doc_date,
      doc_time: saleOrder.doc_time,
      datetime: soDateTime.toISOString(),
    },
    deliveryOrder: {
      doc_no: delivery.doc_no,
      doc_date: delivery.doc_date,
      doc_time: delivery.doc_time,
      datetime: doDateTime.toISOString(),
    },
    duration,
  });
}

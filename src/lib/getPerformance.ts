import { prisma } from "@/lib/prisma";
import { combineDateTime, calcDuration, type Duration } from "@/lib/performance";

const TRANS_FLAG_SALE_ORDER   = 36;
const TRANS_FLAG_SALE_INVOICE = 44;

export interface DocInfo {
  doc_no: string;
  doc_date: Date;
  doc_time: string;
  datetime: string;
}

export interface PerformanceResult {
  invoiceNo: string;
  startDocType: "sale_order" | "sale_invoice";
  startDoc: DocInfo;
  deliveryOrder: DocInfo;
  duration: Duration;
}

export interface PerformanceError {
  error: "NOT_FOUND" | "NO_DELIVERY" | "NO_SALE_ORDER" | "BAD_REQUEST";
  message: string;
}

export type GetPerformanceResult = PerformanceResult | PerformanceError;

export async function getPerformance(invoiceNo: string): Promise<GetPerformanceResult> {
  // 1. ดึงข้อมูล Invoice จาก ic_trans (trans_flag=44)
  const invoice = await prisma.icTrans.findFirst({
    where: { doc_no: invoiceNo, trans_flag: TRANS_FLAG_SALE_INVOICE },
  });

  if (!invoice) {
    return { error: "NOT_FOUND", message: `ไม่พบ Invoice หมายเลข ${invoiceNo}` };
  }

  // 2. พยายามหา Sale Order จาก ap_ar_trans_detail
  const apArDetail = await prisma.apArTransDetail.findFirst({
    where: { doc_no: invoiceNo },
  });

  let startDoc: typeof invoice;
  let startDocType: "sale_order" | "sale_invoice";

  if (apArDetail) {
    const saleOrder = await prisma.icTrans.findFirst({
      where: { doc_no: apArDetail.billing_no, trans_flag: TRANS_FLAG_SALE_ORDER },
    });
    if (saleOrder) {
      startDoc = saleOrder;
      startDocType = "sale_order";
    } else {
      startDoc = invoice;
      startDocType = "sale_invoice";
    }
  } else {
    // ไม่พบ link → fallback ใช้ invoice เป็นจุดเริ่มต้น
    startDoc = invoice;
    startDocType = "sale_invoice";
  }

  // 3. หา Delivery Order จาก pp_shipment_detail
  const deliveryDetail = await prisma.deliveryOrderDetail.findFirst({
    where: { ref_doc_no: invoiceNo },
    include: { delivery: true },
  });

  if (!deliveryDetail) {
    return { error: "NO_DELIVERY", message: `ยังไม่มีเอกสาร Delivery สำหรับ Invoice ${invoiceNo}` };
  }

  const { delivery } = deliveryDetail;
  const startDateTime = combineDateTime(startDoc.doc_date, startDoc.doc_time);
  const endDateTime   = combineDateTime(delivery.doc_date, delivery.doc_time);
  const duration      = calcDuration(startDateTime, endDateTime);

  return {
    invoiceNo,
    startDocType,
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
  };
}

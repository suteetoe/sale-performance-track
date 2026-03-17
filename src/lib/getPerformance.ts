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
  status: "completed" | "in_progress";
  startDocType: "sale_order" | "sale_invoice"; // จุดเริ่มต้นที่ใช้คำนวณ duration
  saleOrder?: DocInfo;   // มีเฉพาะเมื่อพบ Sale Order
  invoice: DocInfo;      // มีเสมอ
  deliveryOrder?: DocInfo; // มีเฉพาะเมื่อ completed
  duration: Duration;    // SO (หรือ Invoice) → Delivery (หรือ NOW)
}

export interface PerformanceError {
  error: "NOT_FOUND" | "BAD_REQUEST";
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

  const invoiceDateTime = combineDateTime(invoice.doc_date, invoice.doc_time);
  const invoiceDocInfo: DocInfo = {
    doc_no:   invoice.doc_no,
    doc_date: invoice.doc_date,
    doc_time: invoice.doc_time,
    datetime: invoiceDateTime.toISOString(),
  };

  // 2. พยายามหา Sale Order จาก ap_ar_trans_detail
  const apArDetail = await prisma.apArTransDetail.findFirst({
    where: { doc_no: invoiceNo },
  });

  let saleOrderDocInfo: DocInfo | undefined;
  let startDateTime: Date;
  let startDocType: "sale_order" | "sale_invoice";

  if (apArDetail) {
    const saleOrder = await prisma.icTrans.findFirst({
      where: { doc_no: apArDetail.billing_no, trans_flag: TRANS_FLAG_SALE_ORDER },
    });
    if (saleOrder) {
      const soDateTime = combineDateTime(saleOrder.doc_date, saleOrder.doc_time);
      saleOrderDocInfo = {
        doc_no:   saleOrder.doc_no,
        doc_date: saleOrder.doc_date,
        doc_time: saleOrder.doc_time,
        datetime: soDateTime.toISOString(),
      };
      startDateTime = soDateTime;
      startDocType  = "sale_order";
    } else {
      startDateTime = invoiceDateTime;
      startDocType  = "sale_invoice";
    }
  } else {
    startDateTime = invoiceDateTime;
    startDocType  = "sale_invoice";
  }

  // 3. หา Delivery Order จาก pp_shipment_detail
  const deliveryDetail = await prisma.deliveryOrderDetail.findFirst({
    where: { ref_doc_no: invoiceNo },
    include: { delivery: true },
  });

  if (!deliveryDetail) {
    // ยังไม่มี Delivery → in_progress: คำนวณ duration ถึงปัจจุบัน
    const durationToNow = calcDuration(startDateTime, new Date());
    return {
      invoiceNo,
      status:      "in_progress",
      startDocType,
      saleOrder:   saleOrderDocInfo,
      invoice:     invoiceDocInfo,
      duration:    durationToNow,
    };
  }

  // 4. completed
  const { delivery } = deliveryDetail;
  const endDateTime = combineDateTime(delivery.doc_date, delivery.doc_time);
  const duration    = calcDuration(startDateTime, endDateTime);

  return {
    invoiceNo,
    status:      "completed",
    startDocType,
    saleOrder:   saleOrderDocInfo,
    invoice:     invoiceDocInfo,
    deliveryOrder: {
      doc_no:   delivery.doc_no,
      doc_date: delivery.doc_date,
      doc_time: delivery.doc_time,
      datetime: endDateTime.toISOString(),
    },
    duration,
  };
}

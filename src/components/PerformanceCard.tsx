import type { Duration } from "@/lib/performance";
import type { DocInfo } from "@/lib/getPerformance";

interface PerformanceCardProps {
  invoiceNo: string;
  status: "completed" | "in_progress";
  startDocType: "sale_order" | "sale_invoice";
  saleOrder?: DocInfo;
  invoice: DocInfo;
  deliveryOrder?: DocInfo;
  duration: Duration;
}

function formatThaiDateTime(datetime: string): string {
  const d = new Date(datetime);
  return d.toLocaleString("th-TH", {
    timeZone: 'Asia/Bangkok',
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getDurationColor(totalMinutes: number): string {
  if (totalMinutes <= 60 * 24)     return "text-green-600";
  if (totalMinutes <= 60 * 24 * 3) return "text-yellow-600";
  return "text-red-600";
}

// ── Sub-components ─────────────────────────────────────────────

function TimelineNode({ color }: { color: "blue" | "emerald" | "orange" }) {
  const bg = color === "blue" ? "bg-blue-600"
           : color === "emerald" ? "bg-emerald-500"
           : "bg-orange-400";
  return <div className={`w-3 h-3 rounded-full ${bg} mt-1 shrink-0`} />;
}

function TimelineLine() {
  return <div className="w-0.5 flex-1 bg-gray-200 my-1" />;
}

function TimelineRow({
  label,
  docNo,
  datetime,
  nodeColor,
  showLine = true,
}: {
  label: string;
  docNo: string;
  datetime: string;
  nodeColor: "blue" | "emerald" | "orange";
  showLine?: boolean;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <TimelineNode color={nodeColor} />
        {showLine && <TimelineLine />}
      </div>
      <div className={showLine ? "pb-4" : "pb-1"}>
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
        <p className="font-semibold text-gray-800">{docNo}</p>
        <p className="text-sm text-gray-500">{formatThaiDateTime(datetime)}</p>
      </div>
    </div>
  );
}

function DurationBadge({ duration, color }: { duration: Duration; color: string }) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="w-0.5 flex-1 bg-gray-200" />
      </div>
      <div className="flex items-center py-2">
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
          <p className={`text-sm font-bold ${color}`}>{duration.label}</p>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────

export default function PerformanceCard({
  invoiceNo,
  status,
  startDocType,
  saleOrder,
  invoice,
  deliveryOrder,
  duration,
}: PerformanceCardProps) {
  const durationColor = getDurationColor(duration.totalMinutes);
  const isInProgress  = status === "in_progress";

  return (
    <div className="w-full max-w-sm bg-white rounded-2xl shadow-md overflow-hidden">

      {/* Header */}
      <div className="bg-blue-600 px-5 py-4 flex items-start justify-between gap-2">
        <div>
          <p className="text-blue-200 text-xs font-medium uppercase tracking-wide">Invoice</p>
          <p className="text-white font-semibold text-lg leading-tight">{invoiceNo}</p>
        </div>
        {isInProgress && (
          <span className="shrink-0 mt-1 inline-flex items-center gap-1 bg-orange-400 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            กำลังจัดส่งสินค้า
          </span>
        )}
      </div>

      {/* Timeline */}
      <div className="px-5 py-5 flex flex-col gap-0">

        {/* Sale Order (ถ้ามี) */}
        {saleOrder && (
          <TimelineRow
            label="Sale Order"
            docNo={saleOrder.doc_no}
            datetime={saleOrder.datetime}
            nodeColor="blue"
            showLine
          />
        )}

        {/* Invoice */}
        <TimelineRow
          label={startDocType === "sale_invoice" ? "Sale Invoice (เริ่มต้น)" : "Sale Invoice"}
          docNo={invoice.doc_no}
          datetime={invoice.datetime}
          nodeColor="blue"
          showLine
        />

        {/* Duration */}
        <DurationBadge duration={duration} color={durationColor} />

        {/* End node */}
        {isInProgress ? (
          // In-progress: แสดงสถานะ
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="w-0.5 h-3 bg-gray-200" />
              <TimelineNode color="orange" />
            </div>
            <div className="pt-3 pb-1">
              <p className="text-xs text-orange-500 font-semibold uppercase tracking-wide">
                กำลังจัดส่งสินค้า
              </p>
              <p className="text-sm text-gray-400">ยังไม่มีเอกสาร Delivery</p>
            </div>
          </div>
        ) : (
          // Completed: แสดง Delivery
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="w-0.5 h-3 bg-gray-200" />
              <TimelineNode color="emerald" />
            </div>
            <div className="pt-3">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Delivery Order</p>
              <p className="font-semibold text-gray-800">{deliveryOrder!.doc_no}</p>
              <p className="text-sm text-gray-500">{formatThaiDateTime(deliveryOrder!.datetime)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Summary bar */}
      <div className={`border-t px-5 py-3 flex justify-between items-center ${
        isInProgress ? "bg-orange-50 border-orange-100" : "bg-gray-50 border-gray-100"
      }`}>
        <span className="text-xs text-gray-400">
          {isInProgress ? "ระยะเวลา (ถึงปัจจุบัน)" : "ระยะเวลารวม"}
        </span>
        <span className={`font-bold text-sm ${durationColor}`}>{duration.label}</span>
      </div>

    </div>
  );
}

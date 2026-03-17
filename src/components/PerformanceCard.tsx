import type { Duration } from "@/lib/performance";

interface DocInfo {
  doc_no: string;
  doc_date: string | Date;
  doc_time: string;
  datetime: string;
}

interface PerformanceCardProps {
  invoiceNo: string;
  saleOrder: DocInfo;
  deliveryOrder: DocInfo;
  duration: Duration;
}

function formatThaiDateTime(datetime: string): string {
  const d = new Date(datetime);
  return d.toLocaleString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getDurationColor(totalMinutes: number): string {
  if (totalMinutes <= 60 * 24) return "text-green-600";       // ≤ 1 วัน
  if (totalMinutes <= 60 * 24 * 3) return "text-yellow-600";  // ≤ 3 วัน
  return "text-red-600";                                       // > 3 วัน
}

export default function PerformanceCard({
  invoiceNo,
  saleOrder,
  deliveryOrder,
  duration,
}: PerformanceCardProps) {
  const durationColor = getDurationColor(duration.totalMinutes);

  return (
    <div className="w-full max-w-sm bg-white rounded-2xl shadow-md overflow-hidden">
      {/* Header */}
      <div className="bg-blue-600 px-5 py-4">
        <p className="text-blue-200 text-xs font-medium uppercase tracking-wide">Invoice</p>
        <p className="text-white font-semibold text-lg leading-tight">{invoiceNo}</p>
      </div>

      {/* Timeline */}
      <div className="px-5 py-5 flex flex-col gap-0">
        {/* Sale Order */}
        <div className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="w-3 h-3 rounded-full bg-blue-600 mt-1 shrink-0" />
            <div className="w-0.5 flex-1 bg-gray-200 my-1" />
          </div>
          <div className="pb-4">
            <p className="text-xs text-gray-400 font-medium">Sale Order</p>
            <p className="font-semibold text-gray-800">{saleOrder.doc_no}</p>
            <p className="text-sm text-gray-500">{formatThaiDateTime(saleOrder.datetime)}</p>
          </div>
        </div>

        {/* Duration */}
        <div className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="w-0.5 h-4 bg-gray-200" />
            <div className="w-0.5 flex-1 bg-gray-200" />
          </div>
          <div className="flex items-center py-2">
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
              <p className={`text-sm font-bold ${durationColor}`}>{duration.label}</p>
            </div>
          </div>
        </div>

        {/* Delivery Order */}
        <div className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="w-0.5 h-4 bg-gray-200" />
            <div className="w-3 h-3 rounded-full bg-emerald-500 mt-1 shrink-0" />
          </div>
          <div className="pt-4">
            <p className="text-xs text-gray-400 font-medium">Delivery Order</p>
            <p className="font-semibold text-gray-800">{deliveryOrder.doc_no}</p>
            <p className="text-sm text-gray-500">{formatThaiDateTime(deliveryOrder.datetime)}</p>
          </div>
        </div>
      </div>

      {/* Summary bar */}
      <div className="bg-gray-50 border-t border-gray-100 px-5 py-3 flex justify-between items-center">
        <span className="text-xs text-gray-400">ระยะเวลารวม</span>
        <span className={`font-bold text-sm ${durationColor}`}>{duration.label}</span>
      </div>
    </div>
  );
}

import Link from "next/link";
import PerformanceCard from "@/components/PerformanceCard";

interface PerformanceData {
  invoiceNo: string;
  saleOrder: {
    doc_no: string;
    doc_date: string;
    doc_time: string;
    datetime: string;
  };
  deliveryOrder: {
    doc_no: string;
    doc_date: string;
    doc_time: string;
    datetime: string;
  };
  duration: {
    days: number;
    hours: number;
    minutes: number;
    totalMinutes: number;
    label: string;
  };
}

interface ErrorData {
  error: string;
  message: string;
}

async function getPerformance(invoiceNo: string): Promise<PerformanceData | ErrorData> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const res = await fetch(
    `${baseUrl}/api/performance/${encodeURIComponent(invoiceNo)}`,
    { cache: "no-store" }
  );
  return res.json();
}

export default async function ResultPage({
  params,
}: {
  params: Promise<{ invoiceNo: string }>;
}) {
  const { invoiceNo } = await params;
  const decodedInvoiceNo = decodeURIComponent(invoiceNo);
  const data = await getPerformance(decodedInvoiceNo);

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-sm">
      {/* Back */}
      <div className="w-full">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 transition-colors"
        >
          ← Scan ใหม่
        </Link>
      </div>

      {"error" in data ? (
        /* Error state */
        <div className="w-full bg-white rounded-2xl shadow-md p-6 text-center">
          <div className="text-4xl mb-3">
            {data.error === "NO_DELIVERY" ? "📦" : "🔍"}
          </div>
          <p className="font-semibold text-gray-800">{data.message}</p>
          <p className="text-sm text-gray-400 mt-1">Invoice: {decodedInvoiceNo}</p>
        </div>
      ) : (
        /* Success state */
        <PerformanceCard
          invoiceNo={data.invoiceNo}
          saleOrder={data.saleOrder}
          deliveryOrder={data.deliveryOrder}
          duration={data.duration}
        />
      )}
    </div>
  );
}

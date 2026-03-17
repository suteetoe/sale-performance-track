import { redirect } from "next/navigation";
import Link from "next/link";
import PerformanceCard from "@/components/PerformanceCard";

interface DocInfo {
  doc_no: string;
  doc_date: string;
  doc_time: string;
  datetime: string;
}

interface PerformanceData {
  invoiceNo: string;
  startDocType: "sale_order" | "sale_invoice";
  startDoc: DocInfo;
  deliveryOrder: DocInfo;
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
    `${baseUrl}/api/performance?invoice=${encodeURIComponent(invoiceNo)}`,
    { cache: "no-store" }
  );
  return res.json();
}

export default async function ResultPage({
  searchParams,
}: {
  searchParams: Promise<{ invoice?: string }>;
}) {
  const { invoice } = await searchParams;

  // ไม่มี invoice param → redirect กลับหน้าหลัก
  if (!invoice) redirect("/");

  const invoiceNo = invoice;
  const data = await getPerformance(invoiceNo);

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
          <p className="text-sm text-gray-400 mt-1">Invoice: {invoiceNo}</p>
        </div>
      ) : (
        /* Success state */
        <PerformanceCard
          invoiceNo={data.invoiceNo}
          startDocType={data.startDocType}
          startDoc={data.startDoc}
          deliveryOrder={data.deliveryOrder}
          duration={data.duration}
        />
      )}
    </div>
  );
}

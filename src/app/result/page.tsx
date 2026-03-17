import { redirect } from "next/navigation";
import Link from "next/link";
import PerformanceCard from "@/components/PerformanceCard";
import { getPerformance } from "@/lib/getPerformance";

export default async function ResultPage({
  searchParams,
}: {
  searchParams: Promise<{ invoice?: string }>;
}) {
  const { invoice } = await searchParams;

  // ไม่มี invoice param → redirect กลับหน้าหลัก
  if (!invoice) redirect("/");

  const data = await getPerformance(invoice);

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
          <p className="text-sm text-gray-400 mt-1">Invoice: {invoice}</p>
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

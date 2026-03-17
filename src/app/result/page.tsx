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
        /* Invoice ไม่พบในระบบ */
        <div className="w-full bg-white rounded-2xl shadow-md p-6 text-center">
          <div className="text-4xl mb-3">🔍</div>
          <p className="font-semibold text-gray-800">{data.message}</p>
          <p className="text-sm text-gray-400 mt-1">Invoice: {invoice}</p>
        </div>
      ) : (
        /* พบข้อมูล — completed หรือ in_progress */
        <PerformanceCard
          invoiceNo={data.invoiceNo}
          status={data.status}
          startDocType={data.startDocType}
          saleOrder={data.saleOrder}
          invoice={data.invoice}
          deliveryOrder={data.deliveryOrder}
          duration={data.duration}
        />
      )}
    </div>
  );
}

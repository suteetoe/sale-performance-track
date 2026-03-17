"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import ManualInput from "@/components/ManualInput";

// html5-qrcode ต้องการ browser environment
const QrScanner = dynamic(() => import("@/components/QrScanner"), {
  ssr: false,
  loading: () => (
    <div className="w-full max-w-sm h-12 bg-gray-100 rounded-xl animate-pulse" />
  ),
});

export default function HomePage() {
  const router = useRouter();

  const handleResult = (invoiceNo: string) => {
    router.push(`/result/${encodeURIComponent(invoiceNo)}`);
  };

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-sm">
      {/* Title */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-800">Sale Performance</h1>
        <p className="text-sm text-gray-500 mt-1">
          Scan QR Code บน Invoice เพื่อดูประสิทธิภาพการส่งมอบ
        </p>
      </div>

      {/* QR Scanner */}
      <div className="w-full">
        <QrScanner onScan={handleResult} />
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3 w-full">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400">หรือ</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Manual Input */}
      <ManualInput onSubmit={handleResult} />
    </div>
  );
}

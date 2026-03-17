"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

interface QrScannerProps {
  onScan: (result: string) => void;
}

export default function QrScanner({ onScan }: QrScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isStarted, setIsStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerId = "qr-reader";

  const start = async () => {
    setError(null);
    try {
      const scanner = new Html5Qrcode(containerId);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          stop();
          onScan(decodedText.trim());
        },
        undefined
      );
      setIsStarted(true);
    } catch {
      setError("ไม่สามารถเปิดกล้องได้ กรุณาอนุญาตการเข้าถึงกล้อง");
    }
  };

  const stop = async () => {
    if (scannerRef.current?.isScanning) {
      await scannerRef.current.stop();
      scannerRef.current.clear();
    }
    setIsStarted(false);
  };

  useEffect(() => {
    return () => {
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        id={containerId}
        className="w-full max-w-sm rounded-xl overflow-hidden bg-gray-100"
        style={{ minHeight: isStarted ? "300px" : "0px" }}
      />

      {error && (
        <p className="text-sm text-red-500 text-center">{error}</p>
      )}

      {!isStarted ? (
        <button
          onClick={start}
          className="w-full max-w-sm py-3 px-6 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 active:bg-blue-800 transition-colors"
        >
          เปิดกล้อง Scan QR Code
        </button>
      ) : (
        <button
          onClick={stop}
          className="w-full max-w-sm py-3 px-6 bg-gray-500 text-white rounded-xl font-medium hover:bg-gray-600 transition-colors"
        >
          หยุด
        </button>
      )}
    </div>
  );
}

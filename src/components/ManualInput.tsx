"use client";

import { useState } from "react";

interface ManualInputProps {
  onSubmit: (invoiceNo: string) => void;
}

export default function ManualInput({ onSubmit }: ManualInputProps) {
  const [value, setValue] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed) {
      onSubmit(trimmed);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full max-w-sm">
      <div className="flex flex-col gap-1">
        <label htmlFor="invoice-input" className="text-sm text-gray-500 font-medium">
          หรือกรอกเลข Invoice ด้วยตนเอง
        </label>
        <input
          id="invoice-input"
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="เช่น INV/2024/00123"
          className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      <button
        type="submit"
        disabled={!value.trim()}
        className="w-full py-3 px-6 bg-gray-800 text-white rounded-xl font-medium hover:bg-gray-900 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        ค้นหา
      </button>
    </form>
  );
}

import { NextRequest, NextResponse } from "next/server";
import { getPerformance } from "@/lib/getPerformance";

export async function GET(req: NextRequest) {
  const invoiceNo = req.nextUrl.searchParams.get("invoice");

  if (!invoiceNo) {
    return NextResponse.json(
      { error: "BAD_REQUEST", message: "กรุณาระบุ Invoice No. (?invoice=...)" },
      { status: 400 }
    );
  }

  const result = await getPerformance(invoiceNo);

  if ("error" in result) {
    const status = result.error === "NOT_FOUND" ? 404 : 400;
    return NextResponse.json(result, { status });
  }

  return NextResponse.json(result);
}

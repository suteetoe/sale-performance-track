import { describe, it, expect } from "vitest";
import { combineDateTime, calcDuration } from "../performance";

// helper: สร้าง midnight UTC ของวันที่กำหนด (เหมือนที่ Prisma ส่งมา)
function midnightUTC(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

// ─── combineDateTime ──────────────────────────────────────────────────────────

describe("combineDateTime", () => {
  it("เวลากลางวัน 09:33 ICT → 02:33 UTC วันเดียวกัน", () => {
    const result = combineDateTime(midnightUTC("2024-01-15"), "09:33");
    expect(result.toISOString()).toBe("2024-01-15T02:33:00.000Z");
  });

  it("07:00 ICT พอดี → 00:00 UTC วันเดียวกัน", () => {
    const result = combineDateTime(midnightUTC("2024-01-15"), "07:00");
    expect(result.toISOString()).toBe("2024-01-15T00:00:00.000Z");
  });

  it("ก่อน 07:00 ICT (06:00) → ข้ามวันกลับไป UTC วันก่อน (23:00)", () => {
    const result = combineDateTime(midnightUTC("2024-01-15"), "06:00");
    expect(result.toISOString()).toBe("2024-01-14T23:00:00.000Z");
  });

  it("เที่ยงคืน 00:00 ICT → 17:00 UTC วันก่อน", () => {
    const result = combineDateTime(midnightUTC("2024-01-15"), "00:00");
    expect(result.toISOString()).toBe("2024-01-14T17:00:00.000Z");
  });

  it("23:59 ICT → 16:59 UTC วันเดียวกัน", () => {
    const result = combineDateTime(midnightUTC("2024-01-15"), "23:59");
    expect(result.toISOString()).toBe("2024-01-15T16:59:00.000Z");
  });

  it("รูปแบบที่มี seconds HH:MM:SS", () => {
    const result = combineDateTime(midnightUTC("2024-01-15"), "09:33:45");
    expect(result.toISOString()).toBe("2024-01-15T02:33:45.000Z");
  });

  it("เที่ยง 12:00 ICT → 05:00 UTC วันเดียวกัน", () => {
    const result = combineDateTime(midnightUTC("2024-01-15"), "12:00");
    expect(result.toISOString()).toBe("2024-01-15T05:00:00.000Z");
  });

  it("ข้ามปี: 01:00 ICT วันที่ 1 ม.ค. → 18:00 UTC วันที่ 31 ธ.ค. ปีก่อน", () => {
    // เวลา 01:00 ICT = UTC ลบ 6 ชั่วโมง → 18:00 UTC ของ 31 Dec
    const result = combineDateTime(midnightUTC("2024-01-01"), "01:00");
    expect(result.toISOString()).toBe("2023-12-31T18:00:00.000Z");
  });

  it("ข้ามปีอธิกสุรทิน: 00:00 ICT วันที่ 1 มี.ค. 2024 → 17:00 UTC วันที่ 29 ก.พ. 2024", () => {
    // 2024 เป็นปีอธิกสุรทิน (มี 29 Feb)
    const result = combineDateTime(midnightUTC("2024-03-01"), "00:00");
    expect(result.toISOString()).toBe("2024-02-29T17:00:00.000Z");
  });

  it("ไม่ควรแก้ไข date object ต้นฉบับ (immutability)", () => {
    const original = midnightUTC("2024-01-15");
    const originalISO = original.toISOString();
    combineDateTime(original, "09:33");
    expect(original.toISOString()).toBe(originalISO);
  });

  it("06:59 ICT → 23:59 UTC วันก่อน (boundary ก่อน 07:00)", () => {
    const result = combineDateTime(midnightUTC("2024-01-15"), "06:59");
    expect(result.toISOString()).toBe("2024-01-14T23:59:00.000Z");
  });

  it("07:01 ICT → 00:01 UTC วันเดียวกัน (boundary หลัง 07:00)", () => {
    const result = combineDateTime(midnightUTC("2024-01-15"), "07:01");
    expect(result.toISOString()).toBe("2024-01-15T00:01:00.000Z");
  });
});

// ─── calcDuration ─────────────────────────────────────────────────────────────

describe("calcDuration", () => {
  function makeDate(isoStr: string) {
    return new Date(isoStr);
  }

  it("2 ชั่วโมง 30 นาที", () => {
    const start = makeDate("2024-01-15T02:33:00.000Z");
    const end = makeDate("2024-01-15T05:03:00.000Z");
    const d = calcDuration(start, end);
    expect(d.days).toBe(0);
    expect(d.hours).toBe(2);
    expect(d.minutes).toBe(30);
    expect(d.totalMinutes).toBe(150);
    expect(d.label).toBe("2 ชั่วโมง 30 นาที");
  });

  it("2 วัน 3 ชั่วโมง 45 นาที", () => {
    const start = makeDate("2024-01-13T00:00:00.000Z");
    const end = makeDate("2024-01-15T03:45:00.000Z");
    const d = calcDuration(start, end);
    expect(d.days).toBe(2);
    expect(d.hours).toBe(3);
    expect(d.minutes).toBe(45);
    expect(d.label).toBe("2 วัน 3 ชั่วโมง 45 นาที");
  });

  it("ครบ 1 วันพอดี ไม่มีชั่วโมงและนาที", () => {
    const start = makeDate("2024-01-14T00:00:00.000Z");
    const end = makeDate("2024-01-15T00:00:00.000Z");
    const d = calcDuration(start, end);
    expect(d.days).toBe(1);
    expect(d.hours).toBe(0);
    expect(d.minutes).toBe(0);
    expect(d.label).toBe("1 วัน");
  });

  it("1 วัน ข้ามชั่วโมง → label แสดงแค่วัน+นาที", () => {
    const start = makeDate("2024-01-14T00:00:00.000Z");
    const end = makeDate("2024-01-15T00:30:00.000Z");
    const d = calcDuration(start, end);
    expect(d.days).toBe(1);
    expect(d.hours).toBe(0);
    expect(d.minutes).toBe(30);
    expect(d.label).toBe("1 วัน 30 นาที");
  });

  it("0 นาที (เวลาเดียวกัน)", () => {
    const t = makeDate("2024-01-15T02:33:00.000Z");
    const d = calcDuration(t, t);
    expect(d.totalMinutes).toBe(0);
    expect(d.label).toBe("0 นาที");
  });

  it("in_progress: SO 08:00 ICT เทียบกับ 10:00 ICT → 2 ชั่วโมง", () => {
    // Sale Order สร้างเวลา 08:00 ICT วันที่ 2024-01-15
    // doc_date = midnight UTC 2024-01-15, doc_time = "08:00"
    const startDateTime = combineDateTime(midnightUTC("2024-01-15"), "08:00");
    // "ปัจจุบัน" = 10:00 ICT = 03:00 UTC วันเดียวกัน
    const now = makeDate("2024-01-15T03:00:00.000Z");
    const d = calcDuration(startDateTime, now);
    expect(d.hours).toBe(2);
    expect(d.minutes).toBe(0);
    expect(d.label).toBe("2 ชั่วโมง");
  });

  it("in_progress: SO 06:30 ICT (ข้ามวัน UTC) เทียบกับ 09:00 ICT → 2 ชั่วโมง 30 นาที", () => {
    // Sale Order สร้างเวลา 06:30 ICT → 23:30 UTC วันก่อน
    const startDateTime = combineDateTime(midnightUTC("2024-01-15"), "06:30");
    expect(startDateTime.toISOString()).toBe("2024-01-14T23:30:00.000Z");
    // ปัจจุบัน 09:00 ICT = 02:00 UTC วันที่ 15
    const now = makeDate("2024-01-15T02:00:00.000Z");
    const d = calcDuration(startDateTime, now);
    expect(d.hours).toBe(2);
    expect(d.minutes).toBe(30);
  });
});

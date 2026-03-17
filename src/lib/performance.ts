export interface Duration {
  days: number;
  hours: number;
  minutes: number;
  totalMinutes: number;
  label: string;
}

// doc_time ในฐานข้อมูลเก็บเป็นเวลาไทย (UTC+7)
const TZ_OFFSET_HOURS = 7;

/**
 * รวม doc_date (Date) + doc_time (string "HH:MM" หรือ "HH:MM:SS") เป็น Date object (UTC)
 *
 * doc_date จาก Prisma = midnight UTC ของวันนั้น
 * doc_time = เวลาในโซน UTC+7 (เวลาไทย)
 * → ใช้ setUTCHours และหัก offset 7 ชั่วโมง เพื่อให้ได้ UTC ที่ถูกต้อง
 *
 * ตัวอย่าง: doc_time "09:33" ICT → 02:33 UTC
 */
export function combineDateTime(date: Date, time: string): Date {
  const [hours, minutes, seconds] = time.split(":").map(Number);
  const result = new Date(date); // copy midnight UTC
  result.setUTCHours(
    (hours ?? 0) - TZ_OFFSET_HOURS,
    minutes ?? 0,
    seconds ?? 0,
    0,
  );
  return result;
}

/**
 * คำนวณ duration ระหว่าง 2 DateTime
 */
export function calcDuration(start: Date, end: Date): Duration {
  const diffMs = end.getTime() - start.getTime();
  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} วัน`);
  if (hours > 0) parts.push(`${hours} ชั่วโมง`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes} นาที`);

  return { days, hours, minutes, totalMinutes, label: parts.join(" ") };
}

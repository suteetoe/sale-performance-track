export interface Duration {
  days: number;
  hours: number;
  minutes: number;
  totalMinutes: number;
  label: string;
}

/**
 * รวม doc_date (Date) + doc_time (string "HH:MM" หรือ "HH:MM:SS") เป็น Date object (UTC)
 *
 * doc_date จาก Prisma = midnight UTC ของวันนั้น
 * doc_time = เวลาในโซน UTC+7 (เวลาไทย)
 * → สร้าง ISO 8601 string พร้อม offset +07:00 แล้วให้ Date constructor แปลงเป็น UTC
 *
 * ตัวอย่าง: doc_time "09:33" ICT → "2024-01-15T09:33:00+07:00" → 2024-01-15T02:33:00Z
 */
export function combineDateTime(date: Date, time: string): Date {
  const dateStr = date.toISOString().split("T")[0]; // "YYYY-MM-DD"
  const timeStr = time.length === 5 ? `${time}:00` : time; // ให้มี seconds เสมอ
  return new Date(`${dateStr}T${timeStr}+07:00`);
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

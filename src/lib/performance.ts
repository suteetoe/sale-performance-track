export interface Duration {
  days: number;
  hours: number;
  minutes: number;
  totalMinutes: number;
  label: string;
}

/**
 * รวม doc_date (Date) + doc_time (string "HH:MM:SS") เป็น Date object
 */
export function combineDateTime(date: Date, time: string): Date {
  const [hours, minutes, seconds] = time.split(":").map(Number);
  const result = new Date(date);
  result.setHours(hours ?? 0, minutes ?? 0, seconds ?? 0, 0);
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

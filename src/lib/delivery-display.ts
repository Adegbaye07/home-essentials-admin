const DELIVERY_DAYS_MAX_OFFSET = 2;

function addCalendarDays(from: Date, days: number): Date {
  const d = new Date(from.getTime());
  d.setDate(d.getDate() + days);
  return d;
}

function ordinalDay(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

/** e.g. "11th August" in local timezone */
export function formatOrdinalDateLocal(d: Date): string {
  const month = d.toLocaleString("en-GB", { month: "long" });
  return `${ordinalDay(d.getDate())} ${month}`;
}

export function deliveryDayRange(deliveryDays: number): { min: number; max: number } | null {
  if (deliveryDays < 1) return null;
  return { min: deliveryDays, max: deliveryDays + DELIVERY_DAYS_MAX_OFFSET };
}

export function formatDeliveryDaysShort(deliveryDays: number): string {
  const range = deliveryDayRange(deliveryDays);
  if (!range) return "—";
  return `${range.min}–${range.max} days`;
}

export function formatDeliveryWindow(deliveryDays: number, from: Date = new Date()): string {
  const range = deliveryDayRange(deliveryDays);
  if (!range) return "";
  const start = addCalendarDays(from, range.min);
  const end = addCalendarDays(from, range.max);
  return `This takes approximately ${range.min} to ${range.max} days, which will fall on ${formatOrdinalDateLocal(start)} to ${formatOrdinalDateLocal(end)}.`;
}

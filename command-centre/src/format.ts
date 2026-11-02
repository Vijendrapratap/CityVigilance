const TIME_ZONE = "Asia/Kolkata";

const timeFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function formatWhen(iso: string): { time: string; date: string } {
  const date = new Date(iso);
  return {
    time: timeFormat.format(date),
    date: dateFormat.format(date),
  };
}

export function formatWhenLine(iso: string): string {
  const parts = formatWhen(iso);
  return `${parts.time} IST · ${parts.date}`;
}

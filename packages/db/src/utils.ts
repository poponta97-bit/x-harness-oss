const JST_OFFSET_MS = 9 * 60 * 60_000;

export function jstNow(): string {
  return toJstString(new Date());
}

export function toJstString(date: Date): string {
  const jst = new Date(date.getTime() + JST_OFFSET_MS);
  return jst.toISOString().slice(0, -1) + '+09:00';
}

export function isTimeBefore(a: string, b: string): boolean {
  return new Date(a).getTime() <= new Date(b).getTime();
}

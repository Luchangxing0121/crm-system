// 到期预警工具：判断日期是否已过期 / 即将到期
export type DateWarn = 'none' | 'normal' | 'soon' | 'expired';

export function dateWarn(dateStr?: string): DateWarn {
  if (!dateStr) return 'none';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'none';
  const diff = (d.getTime() - today.getTime()) / 86400000;
  if (diff < 0) return 'expired';
  if (diff <= 30) return 'soon';
  return 'normal';
}

export function warnText(status: DateWarn): string {
  if (status === 'expired') return '已到期';
  if (status === 'soon') return '即将到期';
  return '';
}

export function warnBadgeClass(status: DateWarn): string {
  if (status === 'expired') return 'bg-rose-50 text-rose-700 border-rose-200';
  if (status === 'soon') return 'bg-amber-50 text-amber-700 border-amber-200';
  return '';
}

// 为到期预警排序：已到期最前，其次即将到期
export function warnWeight(status: DateWarn): number {
  if (status === 'expired') return 0;
  if (status === 'soon') return 1;
  return 2;
}

export function todayStr(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
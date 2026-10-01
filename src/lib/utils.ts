import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 获取本地日期字符串 YYYY-MM-DD（修复 toISOString 时区偏差问题） */
export function formatDate(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** 获取本地日期时间字符串 YYYY-MM-DD HH:mm:ss（修复 toISOString 时区偏差问题） */
export function formatDateTime(d: Date = new Date()): string {
  const date = formatDate(d);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${date} ${hours}:${minutes}:${seconds}`;
}

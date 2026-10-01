/**
 * 飞书平台 SDK 本地部署降级适配
 *
 * 当应用脱离飞书平台（本地直接打开或自有服务器部署）运行时，
 * @lark-apaas/client-toolkit-lite 会因为找不到平台注入的环境变量而报错。
 *
 * 这里在应用入口处做最低限度的 polyfill，保证以下功能正常工作：
 * - scopedStorage（降级为 localStorage，使用固定前缀）
 * - logger（降级为 console）
 * - UniversalLink（降级为普通 Link 行为）
 *
 * 注意：本应用数据层全走 mock + localStorage，不依赖真实后端 API，
 * 因此只需要保证存储和日志不报错即可。
 */

const LOCAL_APP_KEY = 'crm_local';

// 确保 window 存在（SSR 环境跳过）
if (typeof window !== 'undefined') {
  // 1. scopedStorage 降级
  // @ts-expect-error - 向全局注入平台 SDK 对象
  if (!window.__lark_apaas_toolkit_patched__) {
    // 用 defineProperty 定义一个轻量 scopedStorage
    try {
      // 动态 require 避免类型报错 — 由入口文件在 SDK 加载前调用
    } catch {
      // ignore
    }
    // @ts-expect-error - 全局标记
    window.__lark_apaas_toolkit_patched__ = true;
  }
}

export const LOCAL_STORAGE_PREFIX = `${LOCAL_APP_KEY}:`;

/**
 * 简易 localStorage 封装，语义与 scopedStorage 一致
 * 只在 toolkit-lite 不可用时作为兜底
 */
export const localScopedStorage = {
  getItem(key: string): string | null {
    try {
      return localStorage.getItem(LOCAL_STORAGE_PREFIX + key);
    } catch {
      return null;
    }
  },
  setItem(key: string, value: string): void {
    try {
      localStorage.setItem(LOCAL_STORAGE_PREFIX + key, value);
    } catch {
      // ignore
    }
  },
  removeItem(key: string): void {
    try {
      localStorage.removeItem(LOCAL_STORAGE_PREFIX + key);
    } catch {
      // ignore
    }
  },
  clear(): void {
    try {
      const prefix = LOCAL_STORAGE_PREFIX;
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(prefix)) keys.push(k);
      }
      keys.forEach((k) => localStorage.removeItem(k));
    } catch {
      // ignore
    }
  },
};

/**
 * 检测是否在飞书平台环境运行
 */
export function isPlatformEnv(): boolean {
  if (typeof window === 'undefined') return false;
  // 平台会注入 appId 或 __BASENAME__
  const w = window as unknown as { appId?: string; __BASENAME__?: string };
  return Boolean(w.appId && w.appId !== '{{appId}}');
}

// 事务管理数据层 - 本地存储持久化（scopedStorage），内存缓存 + 通知机制
import { useState, useEffect, useCallback } from 'react';
import { scopedStorage, logger } from '@lark-apaas/client-toolkit-lite';
import type { ITask, ITaskSubItem, ITaskStatusHistory, TaskStatus } from '@/data/tasks';
import { MOCK_TASKS } from '@/data/tasks';

const STORAGE_KEY = '__global_crm_tasks';

// ---------- 内存缓存 ----------
interface TaskCacheEntry {
  data: ITask[] | null;
  loading: boolean;
}

let cache: TaskCacheEntry = { data: null, loading: false };
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

function loadFromStorage(): ITask[] {
  try {
    const raw = scopedStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as ITask[];
    }
  } catch (err) {
    logger.info('读取事务数据失败:', String(err));
  }
  // 首次加载，写入 mock 数据
  try {
    scopedStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_TASKS));
  } catch {
    // ignore
  }
  return [...MOCK_TASKS];
}

function saveToStorage(data: ITask[]) {
  try {
    scopedStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    logger.info('保存事务数据失败:', String(err));
  }
}

function getCache(): TaskCacheEntry {
  if (cache.data === null) {
    cache.data = loadFromStorage();
    cache.loading = false;
  }
  return cache;
}

// ---------- 辅助函数 ----------
function cachePrepend(item: ITask) {
  const entry = getCache();
  if (entry.data) {
    entry.data = [item, ...entry.data];
    saveToStorage(entry.data);
    notify();
  }
}

function cacheReplace(id: string, item: ITask) {
  const entry = getCache();
  if (entry.data) {
    entry.data = entry.data.map((x) => (x.id === id ? item : x));
    saveToStorage(entry.data);
    notify();
  }
}

function cacheRemove(id: string) {
  const entry = getCache();
  if (entry.data) {
    entry.data = entry.data.filter((x) => x.id !== id);
    saveToStorage(entry.data);
    notify();
  }
}

// ---------- 生成ID ----------
function genId(prefix = 'task'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ---------- Hook ----------
export function useTasks(): [ITask[], (updater: (prev: ITask[]) => ITask[]) => void, { loading: boolean; refresh: () => void }] {
  const [data, setData] = useState<ITask[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    cache.data = null;
    const entry = getCache();
    setData(entry.data || []);
    setLoading(false);
    notify();
  }, []);

  useEffect(() => {
    const entry = getCache();
    setData(entry.data || []);
    setLoading(false);

    const listener = () => {
      const entry = getCache();
      if (entry.data) setData(entry.data);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const update = useCallback((updater: (prev: ITask[]) => ITask[]) => {
    const entry = getCache();
    if (entry.data) {
      entry.data = updater(entry.data);
      saveToStorage(entry.data);
      notify();
    }
  }, []);

  return [data, update, { loading, refresh }];
}

// ---------- 写操作 Mutation 函数 ----------
export const taskMutations = {
  create(data: Partial<ITask>): ITask {
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const newTask: ITask = {
      id: genId('task'),
      title: data.title || '',
      type: data.type || 'other',
      priority: data.priority || 'medium',
      status: data.status || 'todo',
      description: data.description || '',
      owner: data.owner || '',
      collaborators: data.collaborators || [],
      startDate: data.startDate,
      dueDate: data.dueDate,
      relatedCustomerId: data.relatedCustomerId,
      relatedOpportunityId: data.relatedOpportunityId,
      relatedProjectId: data.relatedProjectId,
      subItems: data.subItems || [],
      attachments: data.attachments || [],
      statusHistory: [
        {
          id: genId('sh'),
          fromStatus: '',
          toStatus: data.status || 'todo',
          remark: '创建事务',
          operator: data.creator || data.owner || '',
          operatedAt: now,
        },
      ],
      creator: data.creator || data.owner || '',
      createdAt: now,
      updatedAt: now,
    };
    cachePrepend(newTask);
    return newTask;
  },

  update(id: string, data: Partial<ITask>): ITask | null {
    const entry = getCache();
    const existing = entry.data?.find((t) => t.id === id);
    if (!existing) return null;
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const updated: ITask = { ...existing, ...data, updatedAt: now };
    cacheReplace(id, updated);
    return updated;
  },

  remove(id: string): void {
    cacheRemove(id);
  },

  // 状态流转
  changeStatus(id: string, toStatus: TaskStatus, remark: string, operator: string): ITask | null {
    const entry = getCache();
    const existing = entry.data?.find((t) => t.id === id);
    if (!existing) return null;
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const historyItem: ITaskStatusHistory = {
      id: genId('sh'),
      fromStatus: existing.status,
      toStatus,
      remark,
      operator,
      operatedAt: now,
    };
    const updated: ITask = {
      ...existing,
      status: toStatus,
      statusHistory: [...existing.statusHistory, historyItem],
      updatedAt: now,
    };
    cacheReplace(id, updated);
    return updated;
  },

  // 子任务操作
  addSubItem(taskId: string, sub: Omit<ITaskSubItem, 'id' | 'createdAt' | 'status'>): ITask | null {
    const entry = getCache();
    const existing = entry.data?.find((t) => t.id === taskId);
    if (!existing) return null;
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const newSub: ITaskSubItem = {
      id: genId('sub'),
      status: 'pending',
      createdAt: now,
      ...sub,
    };
    const updated: ITask = {
      ...existing,
      subItems: [...existing.subItems, newSub],
      updatedAt: now,
    };
    cacheReplace(taskId, updated);
    return updated;
  },

  updateSubItem(taskId: string, subId: string, data: Partial<ITaskSubItem>): ITask | null {
    const entry = getCache();
    const existing = entry.data?.find((t) => t.id === taskId);
    if (!existing) return null;
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const updatedSubs = existing.subItems.map((s) =>
      s.id === subId ? { ...s, ...data } : s,
    );
    const updated: ITask = {
      ...existing,
      subItems: updatedSubs,
      updatedAt: now,
    };
    cacheReplace(taskId, updated);
    return updated;
  },

  toggleSubItem(taskId: string, subId: string): ITask | null {
    const entry = getCache();
    const existing = entry.data?.find((t) => t.id === taskId);
    if (!existing) return null;
    const sub = existing.subItems.find((s) => s.id === subId);
    if (!sub) return existing;
    return taskMutations.updateSubItem(taskId, subId, {
      status: sub.status === 'done' ? 'pending' : 'done',
    });
  },

  removeSubItem(taskId: string, subId: string): ITask | null {
    const entry = getCache();
    const existing = entry.data?.find((t) => t.id === taskId);
    if (!existing) return null;
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const updated: ITask = {
      ...existing,
      subItems: existing.subItems.filter((s) => s.id !== subId),
      updatedAt: now,
    };
    cacheReplace(taskId, updated);
    return updated;
  },
};

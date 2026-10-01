// CRM 数据层 - 从后端 API 获取数据，内存缓存 + 通知机制
import { useState, useEffect, useCallback } from 'react';
import { logger } from '@lark-apaas/client-toolkit-lite';
import {
  customerApi,
  contactApi,
  opportunityApi,
  projectApi,
  followupApi,
  quotationApi,
  productApi,
  contractApi,
  userApi,
} from '@/services/api';
import type { IOpportunity } from '@/data/opportunities';
import type { IProject } from '@/data/projects';
import type { IContract } from '@/data/contracts';
import type { IFollowUp } from '@/data/followups';
import type { ICustomer } from '@/data/customers';
import type { IProduct } from '@/data/products';
import { MOCK_PRODUCTS } from '@/data/products';
import type { IQuotation } from '@/data/quotations';
import type { IContact } from '@/data/contacts';
import type { ISystemUser } from '@/data/users';

// ---------- 内存缓存 ----------
interface CacheEntry {
  data: unknown[] | null;
  loading: boolean;
  promise: Promise<unknown[]> | null;
}

const cache: Record<string, CacheEntry> = {};
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

function getCache(key: string): CacheEntry {
  if (!cache[key]) {
    cache[key] = { data: null, loading: false, promise: null };
  }
  return cache[key];
}

// ---------- 数据加载器 ----------
async function loadAllCustomers(): Promise<ICustomer[]> {
  const data = await customerApi.all() as unknown as ICustomer[];
  return data || [];
}

async function loadAllContacts(): Promise<IContact[]> {
  const data = await contactApi.list({ pageSize: 1000 }) as unknown as { list: IContact[] };
  return data?.list || [];
}

async function loadAllOpportunities(): Promise<IOpportunity[]> {
  const data = await opportunityApi.list({ pageSize: 1000 }) as unknown as { list: IOpportunity[] };
  return data?.list || [];
}

async function loadAllProjects(): Promise<IProject[]> {
  const data = await projectApi.list({ pageSize: 1000 }) as unknown as { list: IProject[] };
  return data?.list || [];
}

async function loadAllFollowups(): Promise<IFollowUp[]> {
  const data = await followupApi.list({ pageSize: 1000 }) as unknown as { list: IFollowUp[] };
  return data?.list || [];
}

async function loadAllQuotations(): Promise<IQuotation[]> {
  const data = await quotationApi.list({ pageSize: 1000 }) as unknown as { list: IQuotation[] };
  return data?.list || [];
}

async function loadAllProducts(): Promise<IProduct[]> {
  try {
    const data = await productApi.list({ pageSize: 1000 }) as unknown as { list: IProduct[] };
    if (data?.list && data.list.length > 0) return data.list;
  } catch {
    // 后端不可用时兜底到前端 mock 数据
  }
  return MOCK_PRODUCTS;
}

async function loadAllContracts(): Promise<IContract[]> {
  const data = await contractApi.list({ pageSize: 1000 }) as unknown as { list: IContract[] };
  return data?.list || [];
}

async function loadAllUsers(): Promise<ISystemUser[]> {
  const data = await userApi.list({ pageSize: 100 }) as unknown as { list: ISystemUser[] };
  return data?.list || [];
}

const loaders: Record<string, () => Promise<unknown[]>> = {
  customers: loadAllCustomers as () => Promise<unknown[]>,
  contacts: loadAllContacts as () => Promise<unknown[]>,
  opportunities: loadAllOpportunities as () => Promise<unknown[]>,
  projects: loadAllProjects as () => Promise<unknown[]>,
  followups: loadAllFollowups as () => Promise<unknown[]>,
  quotations: loadAllQuotations as () => Promise<unknown[]>,
  products: loadAllProducts as () => Promise<unknown[]>,
  contracts: loadAllContracts as () => Promise<unknown[]>,
  users: loadAllUsers as () => Promise<unknown[]>,
};

// ---------- 缓存操作辅助 ----------
function cachePrepend<T extends { id: string }>(key: string, item: T) {
  const entry = getCache(key);
  if (entry.data) {
    entry.data = [item, ...entry.data as T[]] as unknown[];
    notify();
  }
}

function cacheReplace<T extends { id: string }>(key: string, id: string, item: T) {
  const entry = getCache(key);
  if (entry.data) {
    entry.data = (entry.data as T[]).map((x) => (x.id === id ? item : x)) as unknown[];
    notify();
  }
}

function cacheRemove(key: string, id: string) {
  const entry = getCache(key);
  if (entry.data) {
    entry.data = (entry.data as Array<{ id: string }>).filter((x) => x.id !== id) as unknown[];
    notify();
  }
}

// ---------- Hook ----------
function useApiList<T extends { id: string }>(
  key: string,
): [T[], (updater: (prev: T[]) => T[]) => void, { loading: boolean; refresh: () => Promise<void> }] {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const entry = getCache(key);
    if (entry.data) {
      setData(entry.data as T[]);
      setLoading(false);
      return entry.data as T[];
    }
    if (entry.promise) {
      setLoading(true);
      const result = await entry.promise;
      setData(result as T[]);
      setLoading(false);
      return result as T[];
    }
    const loader = loaders[key];
    if (!loader) {
      setLoading(false);
      return [];
    }
    entry.loading = true;
    const promise = loader();
    entry.promise = promise;
    setLoading(true);
    try {
      const result = await promise;
      entry.data = result;
      entry.loading = false;
      entry.promise = null;
      setData(result as T[]);
      setLoading(false);
      return result as T[];
    } catch (err) {
      logger.info(`加载 ${key} 失败:`, String(err));
      entry.loading = false;
      entry.promise = null;
      setLoading(false);
      return [];
    }
  }, [key]);

  useEffect(() => {
    fetchData();
    const listener = () => {
      const entry = getCache(key);
      if (entry.data) setData(entry.data as T[]);
    };
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, [key, fetchData]);

  const update = useCallback(
    (updater: (prev: T[]) => T[]) => {
      const entry = getCache(key);
      const prev = (entry.data || []) as T[];
      const next = updater(prev);
      entry.data = next as unknown[];
      setData(next);
      notify();
    },
    [key],
  );

  const refresh = useCallback(async () => {
    const entry = getCache(key);
    entry.data = null;
    entry.promise = null;
    notify();
    await fetchData();
  }, [key, fetchData]);

  return [data, update, { loading, refresh }];
}

// ---------- 对外导出 ----------

export function useCustomers() {
  return useApiList<ICustomer>('customers').slice(0, 2) as [ICustomer[], (updater: (prev: ICustomer[]) => ICustomer[]) => void];
}

export function useContacts() {
  return useApiList<IContact>('contacts').slice(0, 2) as [IContact[], (updater: (prev: IContact[]) => IContact[]) => void];
}

export function useOpportunities() {
  return useApiList<IOpportunity>('opportunities').slice(0, 2) as [IOpportunity[], (updater: (prev: IOpportunity[]) => IOpportunity[]) => void];
}

export function useProjects() {
  return useApiList<IProject>('projects').slice(0, 2) as [IProject[], (updater: (prev: IProject[]) => IProject[]) => void];
}

export function useFollowups() {
  return useApiList<IFollowUp>('followups').slice(0, 2) as [IFollowUp[], (updater: (prev: IFollowUp[]) => IFollowUp[]) => void];
}

export function useQuotations() {
  return useApiList<IQuotation>('quotations').slice(0, 2) as [IQuotation[], (updater: (prev: IQuotation[]) => IQuotation[]) => void];
}

export function useProducts() {
  return useApiList<IProduct>('products').slice(0, 2) as [IProduct[], (updater: (prev: IProduct[]) => IProduct[]) => void];
}

export function useContracts() {
  return useApiList<IContract>('contracts').slice(0, 2) as [IContract[], (updater: (prev: IContract[]) => IContract[]) => void];
}

export function useUsers() {
  return useApiList<ISystemUser>('users').slice(0, 2) as [ISystemUser[], (updater: (prev: ISystemUser[]) => ISystemUser[]) => void];
}

// ---------- 刷新缓存（API 写操作后调用） ----------
export function invalidateCache(key?: string) {
  if (key) {
    const entry = cache[key];
    if (entry) {
      entry.data = null;
      entry.promise = null;
    }
  } else {
    Object.keys(cache).forEach((k) => {
      cache[k].data = null;
      cache[k].promise = null;
    });
  }
  notify();
}

// ---------- 写操作 Mutation 函数（统一调 API + 更新缓存） ----------

// 客户
export const customerMutations = {
  async create(data: Partial<ICustomer>): Promise<ICustomer> {
    const result = await customerApi.create(data) as unknown as ICustomer;
    cachePrepend<ICustomer>('customers', result);
    return result;
  },
  async update(id: string, data: Partial<ICustomer>): Promise<ICustomer> {
    const result = await customerApi.update(id, data) as unknown as ICustomer;
    cacheReplace<ICustomer>('customers', id, result);
    return result;
  },
  async remove(id: string): Promise<void> {
    await customerApi.remove(id);
    cacheRemove('customers', id);
  },
  async addTag(id: string, tag: string): Promise<void> {
    await customerApi.addTag(id, tag);
    invalidateCache('customers');
  },
  async removeTag(id: string, tag: string): Promise<void> {
    await customerApi.removeTag(id, tag);
    invalidateCache('customers');
  },
};

// 联系人
export const contactMutations = {
  async create(data: Partial<IContact>): Promise<IContact> {
    const result = await contactApi.create(data) as unknown as IContact;
    cachePrepend<IContact>('contacts', result);
    return result;
  },
  async update(id: string, data: Partial<IContact>): Promise<IContact> {
    const result = await contactApi.update(id, data) as unknown as IContact;
    cacheReplace<IContact>('contacts', id, result);
    return result;
  },
  async remove(id: string): Promise<void> {
    await contactApi.remove(id);
    cacheRemove('contacts', id);
  },
};

// 商机
export const opportunityMutations = {
  async create(data: Partial<IOpportunity>): Promise<IOpportunity> {
    const result = await opportunityApi.create(data) as unknown as IOpportunity;
    cachePrepend<IOpportunity>('opportunities', result);
    return result;
  },
  async update(id: string, data: Partial<IOpportunity>): Promise<IOpportunity> {
    const result = await opportunityApi.update(id, data) as unknown as IOpportunity;
    cacheReplace<IOpportunity>('opportunities', id, result);
    return result;
  },
  async remove(id: string): Promise<void> {
    await opportunityApi.remove(id);
    cacheRemove('opportunities', id);
  },
  async advanceStage(id: string, remark?: string): Promise<IOpportunity> {
    const result = await opportunityApi.advanceStage(id, remark) as unknown as IOpportunity;
    cacheReplace<IOpportunity>('opportunities', id, result);
    return result;
  },
  async loseDeal(id: string, reason: string): Promise<IOpportunity> {
    const result = await opportunityApi.loseDeal(id, reason) as unknown as IOpportunity;
    cacheReplace<IOpportunity>('opportunities', id, result);
    return result;
  },
};

// 项目
export const projectMutations = {
  async create(data: Partial<IProject>): Promise<IProject> {
    const result = await projectApi.create(data) as unknown as IProject;
    cachePrepend<IProject>('projects', result);
    return result;
  },
  async update(id: string, data: Partial<IProject>): Promise<IProject> {
    const result = await projectApi.update(id, data) as unknown as IProject;
    cacheReplace<IProject>('projects', id, result);
    return result;
  },
  async remove(id: string): Promise<void> {
    await projectApi.remove(id);
    cacheRemove('projects', id);
  },
  async advanceStage(id: string, remark?: string): Promise<IProject> {
    const result = await projectApi.advanceStage(id, remark) as unknown as IProject;
    cacheReplace<IProject>('projects', id, result);
    return result;
  },
  async registerPayment(id: string, amount: number, date: string, remark?: string): Promise<IProject> {
    const result = await projectApi.registerPayment(id, amount, date, remark) as unknown as IProject;
    cacheReplace<IProject>('projects', id, result);
    return result;
  },
};

// 跟进记录
export const followupMutations = {
  async create(data: Partial<IFollowUp>): Promise<IFollowUp> {
    const result = await followupApi.create(data) as unknown as IFollowUp;
    cachePrepend<IFollowUp>('followups', result);
    return result;
  },
  async update(id: string, data: Partial<IFollowUp>): Promise<IFollowUp> {
    const result = await followupApi.update(id, data) as unknown as IFollowUp;
    cacheReplace<IFollowUp>('followups', id, result);
    return result;
  },
  async remove(id: string): Promise<void> {
    await followupApi.remove(id);
    cacheRemove('followups', id);
  },
};

// 报价
export const quotationMutations = {
  async create(data: Partial<IQuotation> & { items?: unknown[] }): Promise<IQuotation> {
    const result = await quotationApi.create(data) as unknown as IQuotation;
    cachePrepend<IQuotation>('quotations', result);
    return result;
  },
  async update(id: string, data: Partial<IQuotation> & { items?: unknown[] }): Promise<IQuotation> {
    const result = await quotationApi.update(id, data) as unknown as IQuotation;
    cacheReplace<IQuotation>('quotations', id, result);
    return result;
  },
  async remove(id: string): Promise<void> {
    await quotationApi.remove(id);
    cacheRemove('quotations', id);
  },
  async updateStatus(id: string, status: string): Promise<IQuotation> {
    const result = await quotationApi.updateStatus(id, status) as unknown as IQuotation;
    cacheReplace<IQuotation>('quotations', id, result);
    return result;
  },
  async convertToProject(id: string, data: Record<string, unknown>): Promise<{ projectId: string; project: IProject }> {
    const result = await quotationApi.convertToProject(id, data) as unknown as { projectId: string; project: IProject };
    // 报价状态变已转项目
    invalidateCache('quotations');
    invalidateCache('projects');
    return result;
  },
};

// 商品
export const productMutations = {
  async create(data: Partial<IProduct>): Promise<IProduct> {
    const result = await productApi.create(data) as unknown as IProduct;
    cachePrepend<IProduct>('products', result);
    return result;
  },
  async update(id: string, data: Partial<IProduct>): Promise<IProduct> {
    const result = await productApi.update(id, data) as unknown as IProduct;
    cacheReplace<IProduct>('products', id, result);
    return result;
  },
  async remove(id: string): Promise<void> {
    await productApi.remove(id);
    cacheRemove('products', id);
  },
};

// 合同
export const contractMutations = {
  async create(data: Partial<IContract>): Promise<IContract> {
    const result = await contractApi.create(data) as unknown as IContract;
    cachePrepend<IContract>('contracts', result);
    return result;
  },
  async update(id: string, data: Partial<IContract>): Promise<IContract> {
    const result = await contractApi.update(id, data) as unknown as IContract;
    cacheReplace<IContract>('contracts', id, result);
    return result;
  },
  async remove(id: string): Promise<void> {
    await contractApi.remove(id);
    cacheRemove('contracts', id);
  },
  async registerPayment(contractId: string, paymentId: string, actualDate: string, amount?: number, remark?: string): Promise<unknown> {
    const result = await contractApi.registerPayment(contractId, paymentId, actualDate, amount, remark);
    invalidateCache('contracts');
    return result;
  },
};

// 用户
export const userMutations = {
  async create(data: Partial<ISystemUser> & { password: string }): Promise<ISystemUser> {
    const result = await userApi.create(data) as unknown as ISystemUser;
    cachePrepend<ISystemUser>('users', result);
    return result;
  },
  async update(id: string, data: Partial<ISystemUser>): Promise<ISystemUser> {
    const result = await userApi.update(id, data) as unknown as ISystemUser;
    cacheReplace<ISystemUser>('users', id, result);
    return result;
  },
  async remove(id: string): Promise<void> {
    await userApi.remove(id);
    cacheRemove('users', id);
  },
  async toggleStatus(id: string): Promise<void> {
    await userApi.toggleStatus(id);
    invalidateCache('users');
  },
  async changePassword(oldPwd: string, newPwd: string): Promise<void> {
    await userApi.changePassword(oldPwd, newPwd);
  },
};

// ---------- 兼容旧接口 ----------
// 商机池过滤
export function isInOppPool(opp: IOpportunity): boolean {
  if (opp.status === 'closed') {
    const last = (opp as any).stageHistory?.[(opp as any).stageHistory?.length - 1];
    if (last?.remark?.includes('立项') || last?.remark?.includes('转入项目池')) {
      return false;
    }
  }
  return true;
}

// 立项操作
export interface ProjectInitiateInput {
  projectName: string;
  projectNo: string;
  owner: string;
  startDate: string;
  expectedDeliveryDate: string;
  budget: number;
  description: string;
  procurementMethod: string;
}

export async function initiateProject(
  opportunityId: string,
  input: ProjectInitiateInput,
): Promise<{ project: IProject; opportunity: IOpportunity } | null> {
  try {
    const result = await opportunityApi.initiateProject(opportunityId, {
      projectName: input.projectName,
      projectNo: input.projectNo,
      owner: input.owner,
      startDate: input.startDate,
      endDate: input.expectedDeliveryDate,
      amount: input.budget,
      description: input.description,
      procurementMethod: input.procurementMethod,
    });
    invalidateCache('opportunities');
    invalidateCache('projects');
    return result as unknown as { project: IProject; opportunity: IOpportunity };
  } catch (err) {
    logger.info('立项失败:', String(err));
    return null;
  }
}

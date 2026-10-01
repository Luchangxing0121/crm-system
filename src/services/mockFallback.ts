// EXPORTS: mockFallback
// Mock 数据回退层：当后端不可达（沙箱预览 / 离线开发 / Network Error）时，
// 用 src/data 下的 mock 数据返回一致的接口形态，保证页面可预览。
// 注意：仅在请求抛 Network Error 时触发，不影响正常后端环境。

import { MOCK_CUSTOMERS, type ICustomer } from '@/data/customers';
import { MOCK_CONTACTS, type IContact } from '@/data/contacts';
import { MOCK_OPPORTUNITIES, type IOpportunity } from '@/data/opportunities';
import { MOCK_FOLLOWUPS, type IFollowUp } from '@/data/followups';
import { MOCK_CONTRACTS, type IContract } from '@/data/contracts';
import { MOCK_PROJECTS, type IProject } from '@/data/projects';
import { MOCK_QUOTATIONS, type IQuotation } from '@/data/quotations';
import { MOCK_PRODUCTS, PRODUCT_CATEGORIES, type IProduct } from '@/data/products';
import { MOCK_USERS, MOCK_CURRENT_USER, type ISystemUser } from '@/data/users';
import { scopedStorage } from '@lark-apaas/client-toolkit-lite';
import { keysToCamel } from './caseConvert';
import {
  MOCK_PERFORMANCE_DATA,
  MOCK_INDUSTRY_STATS,
  MOCK_FUNNEL_DATA,
  MOCK_SALES_RANKING,
} from '@/data/reports';

// 判断是否为网络层错误
export function isNetworkError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const err = error as { response?: unknown; code?: string; message?: string };
  if (err.response) return false;
  if (err.code === 'ERR_NETWORK') return true;
  if (err.message?.includes('Network Error')) return true;
  return false;
}

// 统一分页结构
function paginate<T>(list: T[], page = 1, pageSize = 10) {
  const total = list.length;
  const start = (page - 1) * pageSize;
  return {
    list: list.slice(start, start + pageSize),
    total,
    page,
    pageSize,
  };
}

// 关键词匹配
function matchKeyword(item: Record<string, unknown>, keyword: string, fields: string[]): boolean {
  if (!keyword) return true;
  const kw = keyword.toLowerCase();
  return fields.some((f) => {
    const v = item[f as keyof typeof item];
    return typeof v === 'string' && v.toLowerCase().includes(kw);
  });
}

// 按字段精确过滤
function filterByField<T extends Record<string, unknown>>(
  list: T[],
  params: Record<string, unknown> | undefined,
  fieldMap: Record<string, string>,
): T[] {
  if (!params) return list;
  return list.filter((item) =>
    Object.entries(fieldMap).every(([paramKey, itemKey]) => {
      const v = params[paramKey];
      if (v === undefined || v === '' || v === 'all') return true;
      return item[itemKey as keyof T] === v;
    }),
  );
}

// 生成本地时间字符串（与 mock 数据格式一致：YYYY-MM-DD HH:mm）
function nowLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// 通用 scopedStorage 持久化工厂
function createStore<T>(storageKey: string, initialData: T[]) {
  const KEY = storageKey;
  function get(): T[] {
    try {
      const raw = scopedStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed as T[];
      }
    } catch {
      // ignore
    }
    const initial = [...initialData];
    try {
      scopedStorage.setItem(KEY, JSON.stringify(initial));
    } catch {
      // ignore
    }
    return initial;
  }
  function save(list: T[]): void {
    try {
      scopedStorage.setItem(KEY, JSON.stringify(list));
    } catch {
      // ignore
    }
  }
  function reset(): void {
    try {
      scopedStorage.removeItem(KEY);
    } catch {
      // ignore
    }
  }
  return { get, save, reset };
}

// ---------- 各模块持久化 store ----------
const customersStore = createStore<ICustomer>('__crm_mock_customers__', MOCK_CUSTOMERS as unknown as ICustomer[]);
const contactsStore = createStore<IContact>('__crm_mock_contacts__', MOCK_CONTACTS as unknown as IContact[]);
const opportunitiesStore = createStore<IOpportunity>('__crm_mock_opportunities__', MOCK_OPPORTUNITIES as unknown as IOpportunity[]);
const followupsStore = createStore<IFollowUp>('__crm_mock_followups__', MOCK_FOLLOWUPS as unknown as IFollowUp[]);
const contractsStore = createStore<IContract>('__crm_mock_contracts__', MOCK_CONTRACTS as unknown as IContract[]);
const projectsStore = createStore<IProject>('__crm_mock_projects__', MOCK_PROJECTS as unknown as IProject[]);
const quotationsStore = createStore<IQuotation>('__crm_mock_quotations__', MOCK_QUOTATIONS as unknown as IQuotation[]);
const productsStore = createStore<IProduct>('__crm_mock_products__', MOCK_PRODUCTS as unknown as IProduct[]);
const usersStore = createStore<ISystemUser>('__crm_mock_users_v2__', MOCK_USERS as unknown as ISystemUser[]);

interface IAttachmentRecord {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploader: string;
  uploadedAt: string;
  category: string;
  relType: string;
  relId: string;
}

const attachmentsStore = createStore<IAttachmentRecord>('__crm_mock_attachments__', []);

// 重置所有数据（恢复初始数据）
export function resetAllMockData(): void {
  customersStore.reset();
  contactsStore.reset();
  opportunitiesStore.reset();
  followupsStore.reset();
  contractsStore.reset();
  projectsStore.reset();
  quotationsStore.reset();
  productsStore.reset();
  usersStore.reset();
  attachmentsStore.reset();
}

type MockHandler = (params: Record<string, unknown>, pathParams: Record<string, string>) => unknown;

const handlers: Record<string, MockHandler> = {
  // ---------- 认证 ----------
  'POST /api/auth/login': (params) => {
    const username = String(params?.username ?? '');
    const user = usersStore.get().find((u) => u.username === username);
    if (!user) {
      throw new Error('用户名或密码错误');
    }
    try { scopedStorage.setItem('__crm_login_username__', user.username); } catch { /* ignore */ }
    return {
      token: `mock-token-${user.id}`,
      user,
    };
  },
  'POST /api/auth/logout': () => {
    try { scopedStorage.removeItem('__crm_login_username__'); } catch { /* ignore */ }
    return {};
  },
  'GET /api/auth/me': () => {
    try {
      const loginUser = scopedStorage.getItem('__crm_login_username__');
      if (loginUser) {
        const found = usersStore.get().find((u) => u.username === loginUser);
        if (found) return found as unknown as Record<string, unknown>;
      }
    } catch { /* ignore */ }
    return MOCK_CURRENT_USER as unknown as Record<string, unknown>;
  },

  // ---------- 客户 ----------
  'GET /api/customers/all': () => customersStore.get(),
  'GET /api/customers': (params) => {
    const page = Number(params?.page ?? params?.page_num ?? 1);
    const pageSize = Number(params?.pageSize ?? params?.page_size ?? 10);
    const keyword = String(params?.keyword ?? params?.name ?? '');
    let list = customersStore.get() as unknown as ICustomer[];
    if (keyword) {
      list = list.filter((c) => matchKeyword(c as unknown as Record<string, unknown>, keyword, ['name', 'industry']));
    }
    list = filterByField(list as unknown as Record<string, unknown>[], params, {
      industry: 'industry',
      level: 'level',
      status: 'status',
      owner: 'owner',
    }) as unknown as ICustomer[];
    return paginate(list, page, pageSize);
  },
  'GET /api/customers/:id': (_params, pathParams) => {
    const id = String(pathParams?.id ?? '');
    return customersStore.get().find((c) => c.id === id) ?? customersStore.get()[0] ?? null;
  },
  'POST /api/customers': (params) => {
    const list = customersStore.get();
    const newItem: ICustomer = {
      id: `cust-${Date.now()}`,
      name: String(params?.name ?? ''),
      industry: String(params?.industry ?? '其他'),
      level: (params?.level as ICustomer['level']) ?? 'C',
      status: (params?.status as ICustomer['status']) ?? 'potential',
      source: String(params?.source ?? ''),
      phone: String(params?.phone ?? ''),
      email: String(params?.email ?? ''),
      address: String(params?.address ?? ''),
      website: String(params?.website ?? ''),
      owner: String(params?.owner ?? MOCK_CURRENT_USER.id),
      description: String(params?.description ?? ''),
      createdAt: nowLocal(),
      tags: Array.isArray(params?.tags) ? (params.tags as string[]) : [],
      ...(params ?? {}),
    } as unknown as ICustomer;
    list.unshift(newItem);
    customersStore.save(list);
    return newItem;
  },
  'PUT /api/customers/:id': (params, pathParams) => {
    const list = customersStore.get();
    const idx = list.findIndex((c) => c.id === pathParams.id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...(params ?? {}) } as ICustomer;
      customersStore.save(list);
      return list[idx];
    }
    return params ?? {};
  },
  'DELETE /api/customers/:id': (_params, pathParams) => {
    const list = customersStore.get();
    const filtered = list.filter((c) => c.id !== pathParams.id);
    customersStore.save(filtered);
    return { ok: true };
  },
  'POST /api/customers/:id/toggle-status': (_params, pathParams) => {
    const list = customersStore.get();
    const idx = list.findIndex((c) => c.id === pathParams.id);
    if (idx >= 0) {
      list[idx] = {
        ...list[idx],
        status: list[idx].status === 'active' ? 'inactive' : 'active',
      } as ICustomer;
      customersStore.save(list);
      return list[idx];
    }
    return { ok: false };
  },
  'POST /api/customers/:id/tags': (params, pathParams) => {
    const list = customersStore.get();
    const idx = list.findIndex((c) => c.id === pathParams.id);
    if (idx >= 0) {
      const tag = String(params?.tag ?? '');
      const currentTags = (list[idx] as unknown as { tags: string[] }).tags || [];
      if (tag && !currentTags.includes(tag)) {
        (list[idx] as unknown as { tags: string[] }).tags = [...currentTags, tag];
        customersStore.save(list);
      }
      return list[idx];
    }
    return params ?? {};
  },
  'DELETE /api/customers/:id/tags/:tag': (_params, pathParams) => {
    const list = customersStore.get();
    const idx = list.findIndex((c) => c.id === pathParams.id);
    if (idx >= 0) {
      const currentTags = (list[idx] as unknown as { tags: string[] }).tags || [];
      (list[idx] as unknown as { tags: string[] }).tags = currentTags.filter((t) => t !== pathParams.tag);
      customersStore.save(list);
      return list[idx];
    }
    return { ok: true };
  },

  // ---------- 联系人 ----------
  'GET /api/contacts': (params) => {
    const page = Number(params?.page ?? params?.page_num ?? 1);
    const pageSize = Number(params?.pageSize ?? params?.page_size ?? 10);
    const keyword = String(params?.keyword ?? params?.name ?? '');
    let list = contactsStore.get() as unknown as IContact[];
    if (keyword) {
      list = list.filter((c) => matchKeyword(c as unknown as Record<string, unknown>, keyword, ['name', 'position', 'email']));
    }
    list = filterByField(list as unknown as Record<string, unknown>[], params, {
      customerId: 'customerId',
    }) as unknown as IContact[];
    return paginate(list, page, pageSize);
  },
  'GET /api/contacts/:id': (_params, pathParams) => {
    const id = String(pathParams?.id ?? '');
    return contactsStore.get().find((c) => c.id === id) ?? contactsStore.get()[0] ?? null;
  },
  'POST /api/contacts': (params) => {
    const list = contactsStore.get();
    const newItem: IContact = {
      id: `contact-${Date.now()}`,
      customerId: String(params?.customerId ?? ''),
      name: String(params?.name ?? ''),
      position: String(params?.position ?? ''),
      phone: String(params?.phone ?? ''),
      mobile: String(params?.mobile ?? ''),
      email: String(params?.email ?? ''),
      qq: String(params?.qq ?? ''),
      wechat: String(params?.wechat ?? ''),
      gender: (params?.gender as IContact['gender']) ?? 'male',
      isPrimary: Boolean(params?.isPrimary ?? false),
      remark: String(params?.remark ?? ''),
      createdAt: nowLocal(),
      ...(params ?? {}),
    } as unknown as IContact;
    list.unshift(newItem);
    contactsStore.save(list);
    return newItem;
  },
  'PUT /api/contacts/:id': (params, pathParams) => {
    const list = contactsStore.get();
    const idx = list.findIndex((c) => c.id === pathParams.id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...(params ?? {}) } as IContact;
      contactsStore.save(list);
      return list[idx];
    }
    return params ?? {};
  },
  'DELETE /api/contacts/:id': (_params, pathParams) => {
    const list = contactsStore.get();
    const filtered = list.filter((c) => c.id !== pathParams.id);
    contactsStore.save(filtered);
    return { ok: true };
  },

  // ---------- 商机 ----------
  'GET /api/opportunities': (params) => {
    const page = Number(params?.page ?? params?.page_num ?? 1);
    const pageSize = Number(params?.pageSize ?? params?.page_size ?? 10);
    const keyword = String(params?.keyword ?? params?.name ?? '');
    let list = opportunitiesStore.get() as unknown as IOpportunity[];
    if (keyword) {
      list = list.filter((o) => matchKeyword(o as unknown as Record<string, unknown>, keyword, ['name']));
    }
    list = filterByField(list as unknown as Record<string, unknown>[], params, {
      stage: 'stage',
      status: 'status',
      owner: 'owner',
      customerId: 'customerId',
    }) as unknown as IOpportunity[];
    // 按创建时间倒序
    const sorted = [...list].sort((a, b) => (b.createdAt as unknown as string).localeCompare(a.createdAt as unknown as string));
    return paginate(sorted, page, pageSize);
  },
  'GET /api/opportunities/kanban': () => opportunitiesStore.get(),
  'GET /api/opportunities/:id': (_params, pathParams) => {
    const id = String(pathParams?.id ?? '');
    return opportunitiesStore.get().find((o) => o.id === id) ?? opportunitiesStore.get()[0] ?? null;
  },
  'GET /api/opportunities/:id/stage-history': (_params, pathParams) => {
    const id = String(pathParams?.id ?? '');
    const opp = opportunitiesStore.get().find((o) => o.id === id);
    return (opp as unknown as { stageHistory?: unknown[] })?.stageHistory ?? [];
  },
  'POST /api/opportunities': (params) => {
    const list = opportunitiesStore.get();
    const newItem: IOpportunity = {
      id: `opp-${Date.now()}`,
      customerId: String(params?.customerId ?? ''),
      name: String(params?.name ?? ''),
      amount: Number(params?.amount ?? 0),
      stage: (params?.stage as IOpportunity['stage']) ?? 'lead',
      status: (params?.status as IOpportunity['status']) ?? 'active',
      priority: (params?.priority as IOpportunity['priority']) ?? 'medium',
      winRate: Number(params?.winRate ?? 10),
      expectedStartDate: String(params?.expectedStartDate ?? ''),
      owner: String(params?.owner ?? MOCK_CURRENT_USER.id),
      description: String(params?.description ?? ''),
      source: String(params?.source ?? ''),
      createdAt: nowLocal(),
      stageHistory: [{ stage: (params?.stage as string) ?? 'lead', date: nowLocal(), remark: '创建商机' }],
      attachments: [],
      ...(params ?? {}),
    } as unknown as IOpportunity;
    list.unshift(newItem);
    opportunitiesStore.save(list);
    return newItem;
  },
  'PUT /api/opportunities/:id': (params, pathParams) => {
    const list = opportunitiesStore.get();
    const idx = list.findIndex((o) => o.id === pathParams.id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...(params ?? {}) } as IOpportunity;
      opportunitiesStore.save(list);
      return list[idx];
    }
    return params ?? {};
  },
  'DELETE /api/opportunities/:id': (_params, pathParams) => {
    const list = opportunitiesStore.get();
    const filtered = list.filter((o) => o.id !== pathParams.id);
    opportunitiesStore.save(filtered);
    return { ok: true };
  },
  'POST /api/opportunities/:id/advance': (params, pathParams) => {
    const list = opportunitiesStore.get();
    const idx = list.findIndex((o) => o.id === pathParams.id);
    if (idx >= 0) {
      const stages = ['lead', 'contact', 'requirement', 'proposal', 'negotiation', 'won'];
      const currentIdx = stages.indexOf(list[idx].stage);
      const nextStage = currentIdx < stages.length - 1 ? stages[currentIdx + 1] : stages[currentIdx];
      const remark = String(params?.remark ?? '阶段推进');
      const newHistory = [
        ...(list[idx].stageHistory || []),
        { stage: nextStage, date: nowLocal(), remark },
      ];
      list[idx] = {
        ...list[idx],
        stage: nextStage as IOpportunity['stage'],
        stageHistory: newHistory,
        status: nextStage === 'won' ? 'closed' : list[idx].status,
      } as IOpportunity;
      opportunitiesStore.save(list);
      return list[idx];
    }
    return { ok: false };
  },
  'POST /api/opportunities/:id/lose': (params, pathParams) => {
    const list = opportunitiesStore.get();
    const idx = list.findIndex((o) => o.id === pathParams.id);
    if (idx >= 0) {
      const reason = String(params?.reason ?? '');
      const remark = String(params?.remark ?? '输单');
      const newHistory = [
        ...(list[idx].stageHistory || []),
        { stage: 'lost', date: nowLocal(), remark: reason ? `输单原因：${reason}` : remark },
      ];
      list[idx] = {
        ...list[idx],
        stage: 'lost',
        status: 'closed',
        stageHistory: newHistory,
      } as IOpportunity;
      opportunitiesStore.save(list);
      return list[idx];
    }
    return { ok: false };
  },
  'POST /api/opportunities/:id/initiate': (params, pathParams) => {
    const oppList = opportunitiesStore.get();
    const oppIdx = oppList.findIndex((o) => o.id === pathParams.id);
    if (oppIdx < 0) return { ok: false };

    // 更新商机状态为已立项（赢单 + 已关闭）
    const newHistory = [
      ...(oppList[oppIdx].stageHistory || []),
      { stage: 'won', date: nowLocal(), remark: '立项转入项目池' },
    ];
    oppList[oppIdx] = {
      ...oppList[oppIdx],
      stage: 'won',
      status: 'closed',
      stageHistory: newHistory,
    } as IOpportunity;
    opportunitiesStore.save(oppList);

    // 创建项目
    const projList = projectsStore.get();
    const newProject: IProject = {
      id: `proj-${Date.now()}`,
      projectNo: String(params?.projectNo || `PRJ-${Date.now()}`),
      name: String(params?.projectName || oppList[oppIdx].name),
      customerId: oppList[oppIdx].customerId,
      opportunityId: oppList[oppIdx].id,
      amount: Number(params?.amount ?? oppList[oppIdx].amount),
      stage: 'initiated',
      status: 'active',
      priority: (params?.priority as IProject['priority']) ?? 'medium',
      owner: String(params?.owner ?? oppList[oppIdx].owner),
      teamMembers: [{ userId: oppList[oppIdx].owner, role: '项目经理' }],
      startDate: String(params?.startDate ?? nowLocal().slice(0, 10)),
      expectedDeliveryDate: String(params?.endDate ?? ''),
      description: String(params?.description ?? oppList[oppIdx].description),
      procurementMethod: String(params?.procurementMethod ?? ''),
      createdAt: nowLocal(),
      stageHistory: [{ stage: 'initiated', date: nowLocal(), remark: '从商机立项' }],
      attachments: [],
      milestones: [],
      ...(params ?? {}),
    } as unknown as IProject;
    projList.unshift(newProject);
    projectsStore.save(projList);

    return { project: newProject, opportunity: oppList[oppIdx] };
  },
  'POST /api/opportunities/:id/pause': (_params, pathParams) => {
    const list = opportunitiesStore.get();
    const idx = list.findIndex((o) => o.id === pathParams.id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], status: 'paused' } as IOpportunity;
      opportunitiesStore.save(list);
      return list[idx];
    }
    return { ok: false };
  },
  'POST /api/opportunities/:id/resume': (_params, pathParams) => {
    const list = opportunitiesStore.get();
    const idx = list.findIndex((o) => o.id === pathParams.id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], status: 'active' } as IOpportunity;
      opportunitiesStore.save(list);
      return list[idx];
    }
    return { ok: false };
  },

  // ---------- 项目 ----------
  'GET /api/projects': (params) => {
    const page = Number(params?.page ?? params?.page_num ?? 1);
    const pageSize = Number(params?.pageSize ?? params?.page_size ?? 10);
    let list = projectsStore.get() as unknown as IProject[];
    list = filterByField(list as unknown as Record<string, unknown>[], params, {
      stage: 'stage',
      status: 'status',
      customerId: 'customerId',
    }) as unknown as IProject[];
    const sorted = [...list].sort((a, b) => (b.createdAt as unknown as string).localeCompare(a.createdAt as unknown as string));
    return paginate(sorted, page, pageSize);
  },
  'GET /api/projects/:id': (_params, pathParams) => {
    const id = String(pathParams?.id ?? '');
    return projectsStore.get().find((p) => p.id === id) ?? projectsStore.get()[0] ?? null;
  },
  'GET /api/projects/:id/stage-history': (_params, pathParams) => {
    const id = String(pathParams?.id ?? '');
    const proj = projectsStore.get().find((p) => p.id === id);
    return (proj as unknown as { stageHistory?: unknown[] })?.stageHistory ?? [];
  },
  'POST /api/projects': (params) => {
    const list = projectsStore.get();
    const newItem: IProject = {
      id: `proj-${Date.now()}`,
      projectNo: String(params?.projectNo || `PRJ-${Date.now()}`),
      name: String(params?.name ?? ''),
      customerId: String(params?.customerId ?? ''),
      opportunityId: String(params?.opportunityId ?? ''),
      amount: Number(params?.amount ?? 0),
      stage: (params?.stage as IProject['stage']) ?? 'initiated',
      status: (params?.status as IProject['status']) ?? 'active',
      priority: (params?.priority as IProject['priority']) ?? 'medium',
      owner: String(params?.owner ?? MOCK_CURRENT_USER.id),
      teamMembers: Array.isArray(params?.teamMembers) ? (params.teamMembers as unknown[]) : [],
      startDate: String(params?.startDate ?? ''),
      expectedDeliveryDate: String(params?.expectedDeliveryDate ?? ''),
      description: String(params?.description ?? ''),
      procurementMethod: String(params?.procurementMethod ?? ''),
      createdAt: nowLocal(),
      stageHistory: [{ stage: (params?.stage as string) ?? 'initiated', date: nowLocal(), remark: '创建项目' }],
      attachments: [],
      milestones: [],
      ...(params ?? {}),
    } as unknown as IProject;
    list.unshift(newItem);
    projectsStore.save(list);
    return newItem;
  },
  'PUT /api/projects/:id': (params, pathParams) => {
    const list = projectsStore.get();
    const idx = list.findIndex((p) => p.id === pathParams.id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...(params ?? {}) } as IProject;
      projectsStore.save(list);
      return list[idx];
    }
    return params ?? {};
  },
  'DELETE /api/projects/:id': (_params, pathParams) => {
    const list = projectsStore.get();
    const filtered = list.filter((p) => p.id !== pathParams.id);
    projectsStore.save(filtered);
    return { ok: true };
  },
  'POST /api/projects/:id/advance': (params, pathParams) => {
    const list = projectsStore.get();
    const idx = list.findIndex((p) => p.id === pathParams.id);
    if (idx >= 0) {
      const stages = ['initiated', 'procurement', 'contract', 'execution', 'acceptance', 'closed'];
      const currentIdx = stages.indexOf(list[idx].stage);
      const nextStage = currentIdx < stages.length - 1 ? stages[currentIdx + 1] : stages[currentIdx];
      const remark = String(params?.remark ?? '阶段推进');
      const newHistory = [
        ...((list[idx] as unknown as { stageHistory?: unknown[] }).stageHistory || []),
        { stage: nextStage, date: nowLocal(), remark },
      ];
      list[idx] = {
        ...list[idx],
        stage: nextStage as IProject['stage'],
        stageHistory: newHistory,
        status: nextStage === 'closed' ? 'closed' : list[idx].status,
      } as IProject;
      projectsStore.save(list);
      return list[idx];
    }
    return { ok: false };
  },

  // ---------- 跟进 ----------
  'GET /api/followups': (params) => {
    const page = Number(params?.page ?? params?.page_num ?? 1);
    const pageSize = Number(params?.pageSize ?? params?.page_size ?? 10);
    let list = followupsStore.get() as unknown as IFollowUp[];
    list = filterByField(list as unknown as Record<string, unknown>[], params, {
      type: 'type',
      customerId: 'customerId',
      opportunityId: 'opportunityId',
      projectId: 'projectId',
      contactId: 'contactId',
    }) as unknown as IFollowUp[];
    const sorted = [...list].sort((a, b) => (b.createdAt as unknown as string).localeCompare(a.createdAt as unknown as string));
    return paginate(sorted, page, pageSize);
  },
  'POST /api/followups': (params) => {
    const list = followupsStore.get();
    const newItem: IFollowUp = {
      id: `fu-${Date.now()}`,
      customerId: String(params?.customerId ?? ''),
      contactId: String(params?.contactId ?? '') || undefined,
      opportunityId: String(params?.opportunityId ?? '') || undefined,
      projectId: String(params?.projectId ?? '') || undefined,
      type: (params?.type as IFollowUp['type']) ?? 'call',
      content: String(params?.content ?? ''),
      result: String(params?.result ?? ''),
      nextFollowUpDate: String(params?.nextFollowUpDate ?? '') || undefined,
      creator: String(params?.creator ?? MOCK_CURRENT_USER.id),
      createdAt: nowLocal(),
      ...(params ?? {}),
    } as unknown as IFollowUp;
    list.unshift(newItem);
    followupsStore.save(list);
    return newItem;
  },
  'PUT /api/followups/:id': (params, pathParams) => {
    const list = followupsStore.get();
    const idx = list.findIndex((f) => f.id === pathParams.id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...(params ?? {}) } as IFollowUp;
      followupsStore.save(list);
      return list[idx];
    }
    return params ?? {};
  },
  'DELETE /api/followups/:id': (_params, pathParams) => {
    const list = followupsStore.get();
    const filtered = list.filter((f) => f.id !== pathParams.id);
    followupsStore.save(filtered);
    return { ok: true };
  },

  // ---------- 报价 ----------
  'GET /api/quotations': (params) => {
    const page = Number(params?.page ?? params?.page_num ?? 1);
    const pageSize = Number(params?.pageSize ?? params?.page_size ?? 10);
    const keyword = String(params?.keyword ?? '');
    let list = quotationsStore.get() as unknown as IQuotation[];
    if (keyword) {
      list = list.filter((q) => matchKeyword(q as unknown as Record<string, unknown>, keyword, ['quotationNo', 'name']));
    }
    list = filterByField(list as unknown as Record<string, unknown>[], params, {
      status: 'status',
      customerId: 'customerId',
    }) as unknown as IQuotation[];
    const sorted = [...list].sort((a, b) => (b.createdAt as unknown as string).localeCompare(a.createdAt as unknown as string));
    return paginate(sorted, page, pageSize);
  },
  'GET /api/quotations/:id': (_params, pathParams) => {
    const id = String(pathParams?.id ?? '');
    return quotationsStore.get().find((q) => q.id === id) ?? quotationsStore.get()[0] ?? null;
  },
  'POST /api/quotations': (params) => {
    const list = quotationsStore.get();
    const items = Array.isArray(params?.items) ? (params.items as unknown[]) : [];
    let subtotal = 0;
    for (const it of items) {
      const item = it as { subtotal?: number; unitPrice?: number; quantity?: number; discount?: number };
      const discount = typeof item.discount === 'number' ? item.discount / 100 : 1;
      const sub = item.subtotal ?? (item.unitPrice ?? 0) * (item.quantity ?? 0) * discount;
      subtotal += typeof sub === 'number' ? Math.round(sub * 100) / 100 : 0;
    }
    const taxRate: number = Number(params?.taxRate ?? 0.13);
    const taxAmount: number = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newItem: any = {
      id: `quo-${Date.now()}`,
      quotationNo: String(params?.quotationNo || `QO-${Date.now()}`),
      name: String(params?.name ?? ''),
      customerId: String(params?.customerId ?? ''),
      opportunityId: String(params?.opportunityId ?? '') || undefined,
      projectId: String(params?.projectId ?? '') || undefined,
      contactId: String(params?.contactId ?? '') || undefined,
      status: (params?.status as IQuotation['status']) ?? 'draft',
      quotationDate: String(params?.quotationDate ?? nowLocal().slice(0, 10)),
      validUntil: String(params?.validUntil ?? ''),
      owner: String(params?.owner ?? MOCK_CURRENT_USER.id),
      remark: String(params?.remark ?? ''),
      items: items as IQuotation['items'],
      subtotal,
      taxRate,
      taxAmount,
      total: subtotal,
      createdAt: nowLocal(),
      ...(params ?? {}),
    } as unknown as IQuotation;
    list.unshift(newItem);
    quotationsStore.save(list);
    return newItem;
  },
  'PUT /api/quotations/:id': (params, pathParams) => {
    const list = quotationsStore.get();
    const idx = list.findIndex((q) => q.id === pathParams.id);
    if (idx >= 0) {
      const updated = { ...list[idx], ...(params ?? {}) } as IQuotation;
      // 重新计算金额（如果 items 有更新）
      if (params?.items && Array.isArray(params.items)) {
        const itemsArr = params.items as unknown[];
        let subtotal = 0;
        for (const it of itemsArr) {
          const item = it as { subtotal?: number; unitPrice?: number; quantity?: number; discount?: number };
          const discount = typeof item.discount === 'number' ? item.discount / 100 : 1;
          const sub = item.subtotal ?? (item.unitPrice ?? 0) * (item.quantity ?? 0) * discount;
          subtotal += typeof sub === 'number' ? Math.round(sub * 100) / 100 : 0;
        }
        const taxRate: number = Number(params.taxRate ?? (list[idx] as unknown as { taxRate?: number }).taxRate ?? 0.13);
        const taxAmount: number = 0;
        const u = updated as unknown as Record<string, unknown>;
        u.subtotal = subtotal;
        u.taxRate = taxRate;
        u.taxAmount = taxAmount;
        u.total = subtotal;
      }
      list[idx] = updated;
      quotationsStore.save(list);
      return list[idx];
    }
    return params ?? {};
  },
  'DELETE /api/quotations/:id': (_params, pathParams) => {
    const list = quotationsStore.get();
    const filtered = list.filter((q) => q.id !== pathParams.id);
    quotationsStore.save(filtered);
    return { ok: true };
  },

  // ---------- 商品 ----------
  'GET /api/products': (params) => {
    const page = Number(params?.page ?? params?.page_num ?? 1);
    const pageSize = Number(params?.pageSize ?? params?.page_size ?? 10);
    const keyword = String(params?.keyword ?? params?.name ?? '');
    let list = productsStore.get() as unknown as IProduct[];
    if (keyword) {
      list = list.filter((p) => matchKeyword(p as unknown as Record<string, unknown>, keyword, ['name', 'brand', 'sku']));
    }
    list = filterByField(list as unknown as Record<string, unknown>[], params, {
      category: 'category',
    }) as unknown as IProduct[];
    return paginate(list, page, pageSize);
  },
  'GET /api/products/categories': () => PRODUCT_CATEGORIES,
  'GET /api/products/:id': (_params, pathParams) => {
    const id = String(pathParams?.id ?? '');
    return productsStore.get().find((p) => p.id === id) ?? productsStore.get()[0] ?? null;
  },
  'POST /api/products': (params) => {
    const list = productsStore.get();
    const newItem: IProduct = {
      id: `prod-${Date.now()}`,
      name: String(params?.name ?? ''),
      sku: String(params?.sku ?? ''),
      brand: String(params?.brand ?? ''),
      category: String(params?.category ?? ''),
      unit: String(params?.unit ?? '个'),
      rrp: Number(params?.rrp ?? 0),
      channelPrice: Number(params?.channelPrice ?? 0),
      taxRate: Number(params?.taxRate ?? 0.13),
      description: String(params?.description ?? ''),
      status: 'active',
      createdAt: nowLocal(),
      ...(params ?? {}),
    } as unknown as IProduct;
    list.unshift(newItem);
    productsStore.save(list);
    return newItem;
  },
  'PUT /api/products/:id': (params, pathParams) => {
    const list = productsStore.get();
    const idx = list.findIndex((p) => p.id === pathParams.id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...(params ?? {}) } as IProduct;
      productsStore.save(list);
      return list[idx];
    }
    return params ?? {};
  },
  'DELETE /api/products/:id': (_params, pathParams) => {
    const list = productsStore.get();
    const filtered = list.filter((p) => p.id !== pathParams.id);
    productsStore.save(filtered);
    return { ok: true };
  },

  // ---------- 合同 ----------
  'GET /api/contracts': (params) => {
    const page = Number(params?.page ?? params?.page_num ?? 1);
    const pageSize = Number(params?.pageSize ?? params?.page_size ?? 10);
    const keyword = String(params?.keyword ?? '');
    let list = contractsStore.get() as unknown as IContract[];
    if (keyword) {
      list = list.filter((c) =>
        matchKeyword(c as unknown as Record<string, unknown>, keyword, ['contractNo', 'name']),
      );
    }
    list = filterByField(list as unknown as Record<string, unknown>[], params, {
      status: 'status',
      customerId: 'customerId',
    }) as unknown as IContract[];
    const sorted = [...list].sort((a, b) => (b.createdAt as unknown as string).localeCompare(a.createdAt as unknown as string));
    return paginate(sorted, page, pageSize);
  },
  'GET /api/contracts/:id': (_params, pathParams) => {
    const id = String(pathParams?.id ?? '');
    return contractsStore.get().find((c) => c.id === id) ?? contractsStore.get()[0] ?? null;
  },
  'GET /api/contracts/:id/payments': (_params, pathParams) => {
    const id = String(pathParams?.id ?? '');
    const c = contractsStore.get().find((x) => x.id === id);
    return (c as unknown as { paymentPlan?: unknown[] })?.paymentPlan ?? [];
  },
  'POST /api/contracts/:contractId/payments/:paymentId/register': (params, pathParams) => {
    const list = contractsStore.get();
    const idx = list.findIndex((c) => c.id === pathParams.contractId);
    if (idx >= 0) {
      const contract = list[idx] as unknown as { paymentPlan: Array<Record<string, unknown>> };
      if (contract.paymentPlan && Array.isArray(contract.paymentPlan)) {
        const pIdx = contract.paymentPlan.findIndex((p) => String(p.id) === String(pathParams.paymentId));
        if (pIdx >= 0) {
          contract.paymentPlan[pIdx] = {
            ...contract.paymentPlan[pIdx],
            status: 'paid',
            actualDate: String(params?.actualDate ?? nowLocal().slice(0, 10)),
            actualAmount: Number(params?.actualAmount ?? contract.paymentPlan[pIdx].amount),
          };
          list[idx] = { ...list[idx], ...(contract as unknown as Partial<IContract>) } as IContract;
          contractsStore.save(list);
        }
      }
      return { ok: true };
    }
    return { ok: false };
  },
  'POST /api/contracts': (params) => {
    const list = contractsStore.get();
    const newItem: IContract = {
      id: `con-${Date.now()}`,
      contractNo: String(params?.contractNo || `HT-${Date.now()}`),
      customerId: String(params?.customerId ?? ''),
      opportunityId: String(params?.opportunityId ?? ''),
      projectId: String(params?.projectId ?? ''),
      amount: Number(params?.amount ?? 0),
      signDate: String(params?.signDate ?? nowLocal().slice(0, 10)),
      effectiveDate: String(params?.effectiveDate ?? nowLocal().slice(0, 10)),
      status: (params?.status as IContract['status']) ?? 'pending',
      paymentPlan: Array.isArray(params?.paymentPlan) ? (params.paymentPlan as unknown[]) : [],
      owner: String(params?.owner ?? MOCK_CURRENT_USER.id),
      remark: String(params?.remark ?? ''),
      createdAt: nowLocal(),
      ...(params ?? {}),
    } as unknown as IContract;
    list.unshift(newItem);
    contractsStore.save(list);
    return newItem;
  },
  'PUT /api/contracts/:id': (params, pathParams) => {
    const list = contractsStore.get();
    const idx = list.findIndex((c) => c.id === pathParams.id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...(params ?? {}) } as IContract;
      contractsStore.save(list);
      return list[idx];
    }
    return params ?? {};
  },
  'DELETE /api/contracts/:id': (_params, pathParams) => {
    const list = contractsStore.get();
    const filtered = list.filter((c) => c.id !== pathParams.id);
    contractsStore.save(filtered);
    return { ok: true };
  },

  // ---------- 附件 ----------
  'GET /api/attachments': (params) => {
    const relType = String(params?.relType ?? '');
    const relId = String(params?.relId ?? '');
    const all = attachmentsStore.get();
    return all.filter((a) => (!relType || a.relType === relType) && (!relId || a.relId === relId));
  },
  'POST /api/attachments/upload': (params) => {
    // file 字段来自 adapter 层提取的 File 元数据 {name, size, type}
    const fileInfo = (params?.file ?? {}) as { name?: string; size?: number; type?: string };
    const fileName = String(params?.name || fileInfo.name || 'file');
    const fileSize = Number(params?.size ?? fileInfo.size ?? 0);
    const rawType = String(params?.type || fileInfo.type || '');
    // 从文件名推导附件类型分类（image/pdf/doc/xls/ppt/zip/other）
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    let catType = 'other';
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext)) catType = 'image';
    else if (ext === 'pdf') catType = 'pdf';
    else if (['doc', 'docx', 'txt', 'md'].includes(ext)) catType = 'doc';
    else if (['xls', 'xlsx', 'csv'].includes(ext)) catType = 'xls';
    else if (['ppt', 'pptx'].includes(ext)) catType = 'ppt';
    else if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) catType = 'zip';
    const newAtt: IAttachmentRecord = {
      id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: fileName,
      size: fileSize,
      type: catType,
      url: '',
      uploader: MOCK_CURRENT_USER.id,
      uploadedAt: nowLocal(),
      category: String(params?.category ?? ''),
      relType: String(params?.relType ?? ''),
      relId: String(params?.relId ?? ''),
    };
    const list = attachmentsStore.get();
    list.unshift(newAtt);
    attachmentsStore.save(list);
    return newAtt;
  },
  'DELETE /api/attachments/:id': (_params, pathParams) => {
    const list = attachmentsStore.get();
    const filtered = list.filter((a) => a.id !== pathParams.id);
    attachmentsStore.save(filtered);
    return { ok: true };
  },

  // ---------- 统计 ----------
  'GET /api/stats/dashboard': () => {
    const customers = customersStore.get();
    const opportunities = opportunitiesStore.get();
    const followups = followupsStore.get();
    const totalCustomers = customers.length;
    const totalAmount = opportunities.reduce((s, o) => s + (o.amount ?? 0), 0);
    const wonCount = opportunities.filter((o) => o.stage === 'won').length;
    const conversionRate = opportunities.length > 0 ? Math.round((wonCount / opportunities.length) * 100) : 0;
    const activeOpps = opportunities.filter((o) => o.status === 'active' && o.stage !== 'won' && o.stage !== 'lost');
    // 按行业统计
    const industryMap = new Map<string, number>();
    customers.forEach((c) => {
      const ind = (c as unknown as { industry: string }).industry || '其他';
      industryMap.set(ind, (industryMap.get(ind) ?? 0) + 1);
    });
    const industryStats = Array.from(industryMap.entries()).map(([name, value]) => ({ name, value }));
    // 漏斗数据
    const stages = [
      { key: 'lead', label: '初步接触' },
      { key: 'contact', label: '需求确认' },
      { key: 'requirement', label: '方案报价' },
      { key: 'proposal', label: '商务谈判' },
      { key: 'won', label: '赢单' },
    ];
    const funnelData = stages.map((s) => ({
      stage: s.label,
      count: opportunities.filter((o) => o.stage === s.key).length,
      amount: opportunities.filter((o) => o.stage === s.key).reduce((s2, o) => s2 + (o.amount ?? 0), 0),
    }));
    return {
      totalCustomers,
      totalOpportunities: opportunities.length,
      totalAmount,
      conversionRate,
      monthlyRevenue: totalAmount * 0.18,
      pendingFollowUps: followups.slice(0, 5),
      recentOpportunities: opportunities.slice(0, 6),
      industryStats: industryStats.length > 0 ? industryStats : MOCK_INDUSTRY_STATS,
      funnelData: funnelData.some((f) => f.count > 0) ? funnelData : MOCK_FUNNEL_DATA,
      performanceTrend: MOCK_PERFORMANCE_DATA,
    };
  },
  'GET /api/stats/reports/customers': () => {
    const customers = customersStore.get();
    const industryMap = new Map<string, number>();
    customers.forEach((c) => {
      const ind = (c as unknown as { industry: string }).industry || '其他';
      industryMap.set(ind, (industryMap.get(ind) ?? 0) + 1);
    });
    const industryStats = Array.from(industryMap.entries()).map(([name, value]) => ({ name, value }));
    const levelStats = [
      { name: 'A 级', value: customers.filter((c) => (c as unknown as { level: string }).level === 'A').length },
      { name: 'B 级', value: customers.filter((c) => (c as unknown as { level: string }).level === 'B').length },
      { name: 'C 级', value: customers.filter((c) => (c as unknown as { level: string }).level === 'C').length },
    ];
    return {
      industryStats: industryStats.length > 0 ? industryStats : MOCK_INDUSTRY_STATS,
      levelStats,
    };
  },
  'GET /api/stats/reports/sales': () => ({
    monthlyPerformance: MOCK_PERFORMANCE_DATA,
    salesRanking: MOCK_SALES_RANKING,
  }),
  'GET /api/stats/reports/funnel': () => {
    const opportunities = opportunitiesStore.get();
    const stages = [
      { key: 'lead', label: '初步接触' },
      { key: 'contact', label: '需求确认' },
      { key: 'requirement', label: '方案报价' },
      { key: 'proposal', label: '商务谈判' },
      { key: 'won', label: '赢单' },
    ];
    const funnelData = stages.map((s) => ({
      stage: s.label,
      count: opportunities.filter((o) => o.stage === s.key).length,
      amount: opportunities.filter((o) => o.stage === s.key).reduce((s2, o) => s2 + (o.amount ?? 0), 0),
    }));
    return {
      funnelData: funnelData.some((f) => f.count > 0) ? funnelData : MOCK_FUNNEL_DATA,
      avgWinCycle: 23,
    };
  },
  'GET /api/stats/reports/receivables': () => {
    const contracts = contractsStore.get();
    const totalReceivable = contracts.reduce((s, c) => s + (c.amount ?? 0), 0);
    return {
      totalReceivable,
      overdueAmount: 0,
    };
  },

  // ---------- 用户 ----------
  'GET /api/auth/users': (params) => {
    const page = Number(params?.page ?? params?.page_num ?? 1);
    const pageSize = Number(params?.pageSize ?? params?.page_size ?? 10);
    let list = usersStore.get() as unknown as ISystemUser[];
    list = filterByField(list as unknown as Record<string, unknown>[], params, {
      role: 'role',
      status: 'status',
    }) as unknown as ISystemUser[];
    return paginate(list, page, pageSize);
  },
  'POST /api/auth/users': (params) => {
    const list = usersStore.get();
    const newUser: ISystemUser = {
      id: `user-${Date.now()}`,
      username: String(params?.username ?? ''),
      name: String(params?.name ?? ''),
      role: (params?.role as ISystemUser['role']) ?? 'sales',
      status: 'active',
      email: String(params?.email ?? ''),
      phone: String(params?.phone ?? ''),
      department: String(params?.department ?? '销售部'),
      createdAt: nowLocal().slice(0, 10),
      ...(params ?? {}),
    } as ISystemUser;
    list.unshift(newUser);
    usersStore.save(list);
    return newUser;
  },
  'PUT /api/auth/users/:id': (params, pathParams) => {
    const list = usersStore.get();
    const idx = list.findIndex((u) => u.id === pathParams.id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...(params ?? {}) } as ISystemUser;
      usersStore.save(list);
      return list[idx];
    }
    return params ?? {};
  },
  'DELETE /api/auth/users/:id': (_params, pathParams) => {
    const list = usersStore.get();
    const filtered = list.filter((u) => u.id !== pathParams.id);
    usersStore.save(filtered);
    return {};
  },
  'POST /api/auth/change-password': () => ({}),
  'POST /api/auth/users/:id/toggle-status': (_params, pathParams) => {
    const list = usersStore.get();
    const idx = list.findIndex((u) => u.id === pathParams.id);
    if (idx >= 0) {
      list[idx] = {
        ...list[idx],
        status: list[idx].status === 'active' ? 'disabled' : 'active',
      };
      usersStore.save(list);
    }
    return { ok: true };
  },
};

// URL 模板匹配
function matchRoute(method: string, url: string): { handler: MockHandler; pathParams: Record<string, string> } | null {
  const pathname = url.split('?')[0];
  const key = `${method} ${pathname}`;
  if (handlers[key]) {
    return { handler: handlers[key], pathParams: {} };
  }
  const templates = Object.keys(handlers).filter((k) => k.includes(':'));
  for (const tpl of templates) {
    const [m, tplPath] = tpl.split(' ');
    if (m !== method) continue;
    const tplParts = tplPath.split('/');
    const urlParts = pathname.split('/');
    if (tplParts.length !== urlParts.length) continue;
    const pathParams: Record<string, string> = {};
    let matched = true;
    for (let i = 0; i < tplParts.length; i++) {
      if (tplParts[i].startsWith(':')) {
        pathParams[tplParts[i].slice(1)] = urlParts[i];
      } else if (tplParts[i] !== urlParts[i]) {
        matched = false;
        break;
      }
    }
    if (matched) {
      return { handler: handlers[tpl], pathParams };
    }
  }
  return null;
}

// 对外入口
export function mockFallback(
  method: string,
  url: string,
  params?: Record<string, unknown>,
  data?: unknown,
): unknown {
  const match = matchRoute(method.toUpperCase(), url);
  if (!match) return undefined;
  // 请求经过 axios 拦截器 keysToSnake 转成蛇形，mock 内部用驼峰字段名
  const isGet = method.toUpperCase() === 'GET';
  const rawInput = (isGet ? params : data) as Record<string, unknown> | undefined;
  const input = keysToCamel(rawInput ?? {}) as Record<string, unknown>;
  return match.handler(input, match.pathParams);
}

// 导出所有 mock 数据
export function exportAllMockData(): Record<string, unknown> {
  return {
    customers: customersStore.get(),
    contacts: contactsStore.get(),
    opportunities: opportunitiesStore.get(),
    projects: projectsStore.get(),
    followups: followupsStore.get(),
    quotations: quotationsStore.get(),
    products: productsStore.get(),
    contracts: contractsStore.get(),
    users: usersStore.get(),
    attachments: attachmentsStore.get(),
    exportedAt: new Date().toISOString(),
    version: '1.0',
  };
}

// 导入 mock 数据（全量覆盖）
export function importMockData(data: Record<string, unknown>): void {
  if (Array.isArray(data.customers)) customersStore.save(data.customers as ICustomer[]);
  if (Array.isArray(data.contacts)) contactsStore.save(data.contacts as IContact[]);
  if (Array.isArray(data.opportunities)) opportunitiesStore.save(data.opportunities as IOpportunity[]);
  if (Array.isArray(data.projects)) projectsStore.save(data.projects as IProject[]);
  if (Array.isArray(data.followups)) followupsStore.save(data.followups as IFollowUp[]);
  if (Array.isArray(data.quotations)) quotationsStore.save(data.quotations as IQuotation[]);
  if (Array.isArray(data.products)) productsStore.save(data.products as IProduct[]);
  if (Array.isArray(data.contracts)) contractsStore.save(data.contracts as IContract[]);
  if (Array.isArray(data.users)) usersStore.save(data.users as ISystemUser[]);
  if (Array.isArray(data.attachments)) attachmentsStore.save(data.attachments as IAttachmentRecord[]);
  // 触发一次 storage 事件通知各 store hook 更新
  window.dispatchEvent(new Event('storage'));
}

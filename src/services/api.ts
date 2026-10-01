// EXPORTS: setAuthToken, getAuthToken, authApi, customerApi, contactApi, opportunityApi, projectApi, followupApi, quotationApi, productApi, contractApi, attachmentApi, statsApi, userApi, ApiResponse, PaginatedResponse
import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
import { scopedStorage } from '@lark-apaas/client-toolkit-lite';
import { keysToCamel, keysToSnake } from './caseConvert';
import { mockFallback } from './mockFallback';

export const USE_MOCK = true;

const TOKEN_KEY = 'crm_auth_token';
const ATTACH_KEY = '__crm_mock_attachments__';

let token = '';

// 登录 token 存于 sessionStorage：关闭/重新打开系统（新会话）需重新登录，
// 但同一页面标签页内刷新保持登录态。
function tokenStore() {
  return typeof window !== 'undefined' ? window.sessionStorage : null;
}

export function setAuthToken(t: string) {
  token = t;
  try {
    const s = tokenStore();
    if (s) {
      if (t) s.setItem(TOKEN_KEY, t);
      else s.removeItem(TOKEN_KEY);
    }
  } catch {
    // ignore
  }
}

export function getAuthToken(): string {
  if (!token) {
    try {
      const s = tokenStore();
      token = s ? (s.getItem(TOKEN_KEY) || '') : '';
    } catch {
      // ignore
    }
  }
  return token;
}

// 兼容未知 url 解析
function safeParseJSON(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

// 统一响应
export interface ApiResponse<T> {
  code: number;
  data: T;
  message: string;
}

export interface PaginatedResponse<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

let axiosInstance: AxiosInstance | null = null;

function getAxios(): AxiosInstance {
  if (axiosInstance) return axiosInstance;

  if (USE_MOCK) {
    // mock 模式：用自定义 adapter 直接返回本地 mock 数据，不发真实请求
    axiosInstance = axios.create({
      baseURL: '',
      timeout: 30000,
      adapter: (config) =>
        new Promise<AxiosResponse>((resolve) => {
          const method = (config.method ?? 'get').toUpperCase();
          const url = config.url ?? '';
          const params = config.params as Record<string, unknown> | undefined;
          // FormData 特殊处理：提取 file 字段的 name/size/type 传给 mock
          let bodyData: unknown = typeof config.data === 'string' ? safeParseJSON(config.data) : config.data;
          if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
            const fd = config.data as FormData;
            const fdObj: Record<string, unknown> = {};
            fd.forEach((value, key) => {
              if (value instanceof File) {
                fdObj[key] = {
                  name: value.name,
                  size: value.size,
                  type: value.type,
                  lastModified: value.lastModified,
                };
              } else {
                fdObj[key] = value;
              }
            });
            bodyData = fdObj;
          }
          const data = mockFallback(method, url, params, bodyData);
          setTimeout(() => {
            resolve({
              data: { code: 0, data: keysToCamel(data as Record<string, unknown>) },
              status: 200,
              statusText: 'OK',
              headers: {},
              config,
              request: {},
            });
          }, 60);
        }),
    });
    return axiosInstance;
  }

  // 非 mock 模式：真实请求
  const baseURL = (() => {
    if (typeof window === 'undefined') return '';
    const port = window.location.port;
    const host = window.location.hostname;
    const isStandardPort = !port || port === '80' || port === '443';
    if (isStandardPort) return '';
    return 'http://localhost:3001';
  })();

  axiosInstance = axios.create({
    baseURL,
    withCredentials: true,
    timeout: 30000,
  });

  axiosInstance.interceptors.request.use((config) => {
    const t = getAuthToken();
    if (t && config.headers) {
      config.headers.set('Authorization', `Bearer ${t}`);
    }
    if (config.data && typeof config.data === 'object' && !(config.data instanceof FormData)) {
      config.data = keysToSnake(config.data);
    }
    return config;
  });

  axiosInstance.interceptors.response.use(
    (response) => {
      const data = response.data;
      if (data && data.code !== undefined && data.code !== 0) {
        return Promise.reject(new Error(data.message || '请求失败'));
      }
      if (data && data.data !== undefined) {
        data.data = keysToCamel(data.data);
      }
      return response;
    },
    (error) => {
      if (USE_MOCK) {
        return Promise.reject(error);
      }
      if (error.response?.status === 401) {
        token = '';
        try { tokenStore()?.removeItem(TOKEN_KEY); } catch { /* ignore */ }
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.assign('/login');
        }
      }
      return Promise.reject(error);
    },
  );

  return axiosInstance;
}

async function apiGet<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const res = await getAxios().get<T>(url, { params });
  return unwrap(res);
}

async function apiPost<T>(url: string, body?: unknown): Promise<T> {
  const res = await getAxios().post<T>(url, body);
  return unwrap(res);
}

async function apiPut<T>(url: string, body?: unknown): Promise<T> {
  const res = await getAxios().put<T>(url, body);
  return unwrap(res);
}

async function apiPatch<T>(url: string, body?: unknown): Promise<T> {
  const res = await getAxios().patch<T>(url, body);
  return unwrap(res);
}

async function apiDelete<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const res = await getAxios().delete<T>(url, { params });
  return unwrap(res);
}

function unwrap<T>(res: AxiosResponse): T {
  const data = res.data as { data?: T };
  return data && data.data !== undefined ? data.data : (res.data as T);
}

// 附件：从本地附件 store 读取记录的 url（mock 场景）
function findAttachmentUrl(id: string): string | null {
  try {
    const raw = scopedStorage.getItem(ATTACH_KEY);
    if (raw) {
      const list = JSON.parse(raw) as Array<{ id: string; url?: string }>;
      const att = list.find((a) => a.id === id);
      if (att && att.url) return att.url;
    }
  } catch {
    // ignore
  }
  return null;
}

export const authApi = {
  login: (username: string, password: string) =>
    apiPost<{ token: string; user: Record<string, unknown> }>('/api/auth/login', { username, password }),
  logout: () => apiPost<void>('/api/auth/logout'),
  me: () => apiGet<Record<string, unknown>>('/api/auth/me'),
  changePassword: (oldPwd: string, newPwd: string) =>
    apiPost<void>('/api/auth/change-password', { oldPassword: oldPwd, newPassword: newPwd }),
};

export const customerApi = {
  list: (params?: Record<string, unknown>) => apiGet<PaginatedResponse<unknown>>('/api/customers', params),
  all: () => apiGet<unknown[]>('/api/customers/all'),
  detail: (id: string) => apiGet<unknown>(`/api/customers/${id}`),
  create: (data: unknown) => apiPost<unknown>('/api/customers', data),
  update: (id: string, data: unknown) => apiPut<unknown>(`/api/customers/${id}`, data),
  remove: (id: string) => apiDelete<unknown>(`/api/customers/${id}`),
  toggleStatus: (id: string) => apiPost<unknown>(`/api/customers/${id}/toggle-status`),
  addTag: (id: string, tag: string) => apiPost<unknown>(`/api/customers/${id}/tags`, { tag }),
  removeTag: (id: string, tag: string) => apiDelete<unknown>(`/api/customers/${id}/tags/${encodeURIComponent(tag)}`),
};

export const contactApi = {
  list: (params?: Record<string, unknown>) => apiGet<PaginatedResponse<unknown>>('/api/contacts', params),
  detail: (id: string) => apiGet<unknown>(`/api/contacts/${id}`),
  create: (data: unknown) => apiPost<unknown>('/api/contacts', data),
  update: (id: string, data: unknown) => apiPut<unknown>(`/api/contacts/${id}`, data),
  remove: (id: string) => apiDelete<unknown>(`/api/contacts/${id}`),
};

export const opportunityApi = {
  list: (params?: Record<string, unknown>) => apiGet<PaginatedResponse<unknown>>('/api/opportunities', params),
  detail: (id: string) => apiGet<unknown>(`/api/opportunities/${id}`),
  kanban: (params?: Record<string, unknown>) => apiGet<unknown>('/api/opportunities/kanban', params),
  stageHistory: (id: string) => apiGet<unknown[]>(`/api/opportunities/${id}/stage-history`),
  create: (data: unknown) => apiPost<unknown>('/api/opportunities', data),
  update: (id: string, data: unknown) => apiPut<unknown>(`/api/opportunities/${id}`, data),
  remove: (id: string) => apiDelete<unknown>(`/api/opportunities/${id}`),
  advanceStage: (id: string, remark?: string) => apiPost<unknown>(`/api/opportunities/${id}/advance`, { remark }),
  loseDeal: (id: string, reason?: string) => apiPost<unknown>(`/api/opportunities/${id}/lose`, { reason }),
  pause: (id: string) => apiPost<unknown>(`/api/opportunities/${id}/pause`),
  resume: (id: string) => apiPost<unknown>(`/api/opportunities/${id}/resume`),
  initiateProject: (id: string, data?: unknown) => apiPost<unknown>(`/api/opportunities/${id}/initiate`, data),
};

export const projectApi = {
  list: (params?: Record<string, unknown>) => apiGet<PaginatedResponse<unknown>>('/api/projects', params),
  detail: (id: string) => apiGet<unknown>(`/api/projects/${id}`),
  stageHistory: (id: string) => apiGet<unknown[]>(`/api/projects/${id}/stage-history`),
  create: (data: unknown) => apiPost<unknown>('/api/projects', data),
  update: (id: string, data: unknown) => apiPut<unknown>(`/api/projects/${id}`, data),
  remove: (id: string) => apiDelete<unknown>(`/api/projects/${id}`),
  advanceStage: (id: string, remark?: string) => apiPost<unknown>(`/api/projects/${id}/advance`, { remark }),
  registerPayment: (id: string, amount?: number, actualDate?: string, remark?: string) =>
    apiPost<unknown>(`/api/projects/${id}/register-payment`, { amount, actualDate, remark }),
};

export const followupApi = {
  list: (params?: Record<string, unknown>) => apiGet<PaginatedResponse<unknown>>('/api/followups', params),
  create: (data: unknown) => apiPost<unknown>('/api/followups', data),
  update: (id: string, data: unknown) => apiPut<unknown>(`/api/followups/${id}`, data),
  remove: (id: string) => apiDelete<unknown>(`/api/followups/${id}`),
};

export const quotationApi = {
  list: (params?: Record<string, unknown>) => apiGet<PaginatedResponse<unknown>>('/api/quotations', params),
  detail: (id: string) => apiGet<unknown>(`/api/quotations/${id}`),
  create: (data: unknown) => apiPost<unknown>('/api/quotations', data),
  update: (id: string, data: unknown) => apiPut<unknown>(`/api/quotations/${id}`, data),
  remove: (id: string) => apiDelete<unknown>(`/api/quotations/${id}`),
  updateStatus: (id: string, status: string) => apiPost<unknown>(`/api/quotations/${id}/status`, { status }),
  convertToProject: (id: string, data?: unknown) => apiPost<unknown>(`/api/quotations/${id}/convert`, data),
};

export const productApi = {
  list: (params?: Record<string, unknown>) => apiGet<PaginatedResponse<unknown>>('/api/products', params),
  detail: (id: string) => apiGet<unknown>(`/api/products/${id}`),
  categories: () => apiGet<string[]>('/api/products/categories'),
  create: (data: unknown) => apiPost<unknown>('/api/products', data),
  update: (id: string, data: unknown) => apiPut<unknown>(`/api/products/${id}`, data),
  remove: (id: string) => apiDelete<unknown>(`/api/products/${id}`),
};

export const contractApi = {
  list: (params?: Record<string, unknown>) => apiGet<PaginatedResponse<unknown>>('/api/contracts', params),
  detail: (id: string) => apiGet<unknown>(`/api/contracts/${id}`),
  payments: (id: string) => apiGet<unknown[]>(`/api/contracts/${id}/payments`),
  create: (data: unknown) => apiPost<unknown>('/api/contracts', data),
  update: (id: string, data: unknown) => apiPut<unknown>(`/api/contracts/${id}`, data),
  remove: (id: string) => apiDelete<unknown>(`/api/contracts/${id}`),
  registerPayment: (contractId: string, paymentId: string, actualDate?: string, amount?: number, remark?: string) =>
    apiPost<unknown>(`/api/contracts/${contractId}/payments/${paymentId}/register`, {
      actualDate,
      amount,
      remark,
    }),
};

export const attachmentApi = {
  list: (relType: string, relId: string) =>
    apiGet<unknown[]>('/api/attachments', { relType, relId }),
  upload: (relType: string, relId: string, file: File, onProgress?: (p: number) => void) => {
    const fd = new FormData();
    fd.append('relType', relType);
    fd.append('relId', relId);
    fd.append('file', file);
    return apiPost<unknown>('/api/attachments/upload', fd);
  },
  remove: (id: string) => apiDelete<unknown>(`/api/attachments/${id}`),
  download: async (id: string, _name?: string): Promise<void> => {
    const url = findAttachmentUrl(id);
    if (url) {
      const a = document.createElement('a');
      a.href = url;
      a.download = _name || 'download';
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  },
  getPreviewUrl: (id: string): string | null => findAttachmentUrl(id),
};

export const statsApi = {
  dashboard: (params?: Record<string, unknown>) => apiGet<unknown>('/api/stats/dashboard', params),
  sales: (params?: Record<string, unknown>) => apiGet<unknown>('/api/stats/reports/sales', params),
  funnel: (params?: Record<string, unknown>) => apiGet<unknown>('/api/stats/reports/funnel', params),
  customers: (params?: Record<string, unknown>) => apiGet<unknown>('/api/stats/reports/customers', params),
  receivables: (params?: Record<string, unknown>) => apiGet<unknown>('/api/stats/reports/receivables', params),
};

export const userApi = {
  list: (params?: Record<string, unknown>) => apiGet<PaginatedResponse<unknown>>('/api/auth/users', params),
  create: (data: unknown) => apiPost<unknown>('/api/auth/users', data),
  update: (id: string, data: unknown) => apiPut<unknown>(`/api/auth/users/${id}`, data),
  remove: (id: string) => apiDelete<unknown>(`/api/auth/users/${id}`),
  toggleStatus: (id: string) => apiPost<unknown>(`/api/auth/users/${id}/toggle-status`),
  changePassword: (oldPwd: string, newPwd: string) =>
    apiPost<void>('/api/auth/change-password', { oldPassword: oldPwd, newPassword: newPwd }),
};
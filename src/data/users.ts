// EXPORTS: ISystemUser, MOCK_USERS, MOCK_CURRENT_USER

export interface ISystemUser {
  id: string;
  username: string;
  name: string;
  avatar?: string;
  role: 'admin' | 'manager' | 'sales';
  status: 'active' | 'disabled';
  email: string;
  phone: string;
  department: string;
  createdAt: string;
}

export const MOCK_USERS: ISystemUser[] = [
  {
    id: 'admin',
    username: 'admin',
    name: '管理员',
    role: 'admin',
    status: 'active',
    email: 'admin@company.com',
    phone: '13800138000',
    department: '销售部',
    createdAt: '2024-01-01',
  },
  {
    id: 'hongji',
    username: 'hongji',
    name: '洪吉',
    role: 'manager',
    status: 'active',
    email: 'hongji@company.com',
    phone: '13800138009',
    department: '销售部',
    createdAt: '2024-06-01',
  },
];

export const MOCK_CURRENT_USER: ISystemUser = MOCK_USERS[0];
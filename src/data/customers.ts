// EXPORTS: ICustomer, IAttachment, MOCK_CUSTOMERS
export interface IAttachment {
  id: string
  name: string
  size: number
  type: string
  category?: string
  uploader: string
  uploadedAt: string
  url?: string
}

export interface ICustomer {
  id: string;
  name: string;
  industry: string;
  level: 'A' | 'B' | 'C';
  status: 'active' | 'inactive' | 'potential';
  source: string;
  phone: string;
  email: string;
  address: string;
  website: string;
  owner: string;
  description: string;
  createdAt: string;
  tags: string[];
  attachments: IAttachment[];
}

export const MOCK_CUSTOMERS: ICustomer[] = [
  {
    id: 'cust-1',
    name: '通辽隆圣峰',
    industry: '燃气',
    level: 'B',
    status: 'active',
    source: '线下拓展',
    phone: '',
    email: '',
    address: '',
    website: '',
    owner: 'user001',
    description: '地区：通辽；更新时间：2026-09-07 11:35',
    createdAt: '2026-09-07 11:35',
    tags: [],
    attachments: [],
  },
  {
    id: 'cust-4',
    name: '高邮中国电信',
    industry: '中国电信',
    level: 'B',
    status: 'active',
    source: '线下拓展',
    phone: '',
    email: '',
    address: '',
    website: '',
    owner: 'user001',
    description: '地区：高邮车逻镇；更新时间：2026-09-07 11:46',
    createdAt: '2026-09-07 11:46',
    tags: [],
    attachments: [],
  },
  {
    id: 'cust-6',
    name: '大连德泰',
    industry: '燃气',
    level: 'B',
    status: 'active',
    source: '线下拓展',
    phone: '',
    email: '',
    address: '',
    website: '',
    owner: 'user001',
    description: '地区：大连；更新时间：2026-09-07 18:23',
    createdAt: '2026-09-07 18:23',
    tags: [],
    attachments: [],
  },
  {
    id: 'cust-7',
    name: '叁零肆零科技有限公司',
    industry: '燃气',
    level: 'B',
    status: 'active',
    source: '线下拓展',
    phone: '',
    email: '',
    address: '',
    website: '',
    owner: 'user001',
    description: '地区：重庆；重庆云阳项目；更新时间：2026-09-07 18:34',
    createdAt: '2026-09-07 18:34',
    tags: [],
    attachments: [],
  },
  {
    id: 'cust-8',
    name: '扬州电信（生态科技新城）',
    industry: '电信',
    level: 'B',
    status: 'active',
    source: '线下拓展',
    phone: '',
    email: '',
    address: '',
    website: '',
    owner: 'user001',
    description: '地区：生态科技新城；更新时间：2026-09-07 18:43',
    createdAt: '2026-09-07 18:43',
    tags: [],
    attachments: [],
  },
  {
    id: 'cust-9',
    name: '高邮电信',
    industry: '电信',
    level: 'B',
    status: 'active',
    source: '线下拓展',
    phone: '',
    email: '',
    address: '',
    website: '',
    owner: 'user001',
    description: '地区：高邮；更新时间：2026-09-12 10:47',
    createdAt: '2026-09-07 18:49',
    tags: [],
    attachments: [],
  },
  {
    id: 'cust-10',
    name: '中油易度智慧(成都)科技有限公司',
    industry: '燃气',
    level: 'B',
    status: 'active',
    source: '线下拓展',
    phone: '',
    email: '',
    address: '',
    website: '',
    owner: 'user001',
    description: '地区：成都；更新时间：2026-09-07 19:44',
    createdAt: '2026-09-07 19:44',
    tags: [],
    attachments: [],
  },
  {
    id: 'cust-11',
    name: '江西省遂川天然气有限公司',
    industry: '燃气',
    level: 'B',
    status: 'active',
    source: '线下拓展',
    phone: '',
    email: '',
    address: '',
    website: '',
    owner: 'user001',
    description: '地区：江西省遂川；更新时间：2026-09-08 10:30',
    createdAt: '2026-09-08 10:30',
    tags: [],
    attachments: [],
  },
  {
    id: 'cust-12',
    name: '扬州电信',
    industry: '电信',
    level: 'B',
    status: 'active',
    source: '线下拓展',
    phone: '',
    email: '',
    address: '',
    website: '',
    owner: 'user001',
    description: '地区：扬州；更新时间：2026-09-08 10:41',
    createdAt: '2026-09-08 10:41',
    tags: [],
    attachments: [],
  },
  {
    id: 'cust-13',
    name: '中国电信江都分公司',
    industry: '电信',
    level: 'B',
    status: 'active',
    source: '线下拓展',
    phone: '',
    email: '',
    address: '',
    website: '',
    owner: 'user001',
    description: '地区：江都；更新时间：2026-09-08 10:52',
    createdAt: '2026-09-08 10:52',
    tags: [],
    attachments: [],
  },
];
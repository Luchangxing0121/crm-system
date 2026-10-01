// EXPORTS: IProject, IAttachment, MOCK_PROJECTS, IProjectStageHistoryItem, IProjectTeamMember, IMilestoneItem, PROJECT_STAGE_LABELS, PROJECT_STAGE_ORDER, PRIORITY_LABELS, PROCUREMENT_METHODS
export interface IAttachment {
  id: string
  name: string
  size: number
  type: string
  category: string
  uploader: string
  uploadedAt: string
  url?: string
}

export interface IProjectStageHistoryItem { stage: string; date: string; remark: string }
export interface IProjectTeamMember { userId: string; role: string }
export interface IMilestoneItem { id: string; name: string; plannedDate: string; actualDate?: string; status: 'pending' | 'in-progress' | 'completed' | 'delayed' }

export interface IProject {
  id: string
  projectNo: string
  name: string
  customerId: string
  opportunityId: string
  amount: number
  stage: 'initiated' | 'procurement' | 'contract' | 'execution' | 'acceptance' | 'closed'
  status: 'active' | 'paused' | 'closed'
  priority: 'high' | 'medium' | 'low'
  owner: string
  teamMembers: IProjectTeamMember[]
  startDate: string
  expectedDeliveryDate: string
  procurementMethod: string
  contractId?: string
  description: string
  milestones: IMilestoneItem[]
  createdAt: string
  stageHistory: IProjectStageHistoryItem[]
  attachments: IAttachment[]
}

export const PROJECT_STAGE_LABELS: Record<string, string> = { initiated: '已立项', procurement: '采购挂网', contract: '合同签订', execution: '项目执行', acceptance: '验收完成', closed: '已结项' }
export const PROJECT_STAGE_ORDER = ['initiated', 'procurement', 'contract', 'execution', 'acceptance', 'closed']
export const PRIORITY_LABELS: Record<string, string> = { high: '高', medium: '中', low: '低' }
export const PROCUREMENT_METHODS = ['公开招标', '邀请招标', '竞争性谈判', '单一来源', '询价', '直接采购']

export const MOCK_PROJECTS: IProject[] = [
  {
    id: 'proj-4',
    projectNo: 'proj-4',
    name: '高邮市车逻镇综合治理增设无人机巡查技术服务项目',
    customerId: 'cust-4',
    opportunityId: '',
    amount: 408000,
    stage: 'execution',
    status: 'active',
    priority: 'high',
    owner: '卢长新',
    teamMembers: [],
    startDate: '',
    expectedDeliveryDate: '',
    procurementMethod: '',
    description: '来源：高邮电信\n合同金额：346800\n进度：70%\n对接人：查晓峰，电话：18952773777\n1、业主与电信的合同还在走流程，还没下来；\n2、与支局已经对接了，准备做设备部署的选址；具体位置是在高邮市车逻镇人民政府；需要到现场实地勘查；',
    milestones: [],
    createdAt: '2026-09-07 11:51',
    stageHistory: [{ stage: 'execution', date: '2026-09-07 11:51', remark: '初始阶段' }],
    attachments: [{ id: 'att-proj-4-1', name: '高邮城南新区无人机报价-2026.07.23.xlsx', size: 16384, type: 'xls', category: '其他', uploader: 'user001', uploadedAt: '2026-09-07 11:51' }, { id: 'att-proj-4-2', name: '9e7e462fc291476289aa83a28af3ea0a.mp4', size: 1978368, type: 'video', category: '其他', uploader: 'user001', uploadedAt: '2026-09-07 11:51' }, { id: 'att-proj-4-3', name: 'b7df183a329fb89ba79a0c9a674e5d0d.jpg', size: 349184, type: 'image', category: '其他', uploader: 'user001', uploadedAt: '2026-09-07 11:51' }, { id: 'att-proj-4-4', name: '581126bc3ed0c5a7cc5381f8fb3b62c7.jpg', size: 364544, type: 'image', category: '其他', uploader: 'user001', uploadedAt: '2026-09-07 11:51' }, { id: 'att-proj-4-5', name: '0b3f47e930db85af0e690c25a400c316.jpg', size: 313344, type: 'image', category: '其他', uploader: 'user001', uploadedAt: '2026-09-07 11:51' }, { id: 'att-proj-4-6', name: 'a69a64375163be6073ff527d4a66198f.jpg', size: 401408, type: 'image', category: '其他', uploader: 'user001', uploadedAt: '2026-09-07 11:51' }],
  },
  {
    id: 'proj-6',
    projectNo: 'proj-6',
    name: '重庆云阳无人机巡检',
    customerId: 'cust-7',
    opportunityId: '',
    amount: 2621300,
    stage: 'procurement',
    status: 'active',
    priority: 'medium',
    owner: '',
    teamMembers: [],
    startDate: '',
    expectedDeliveryDate: '',
    procurementMethod: '',
    description: '进度：10%\n对接人：金铎，电话：17610356000\n项目目前已报过清单价格，另外私有化平台价格及服务器配置也按要求完成发到对接群了。',
    milestones: [],
    createdAt: '2026-09-07 18:36',
    stageHistory: [{ stage: 'procurement', date: '2026-09-07 18:36', remark: '初始阶段' }],
    attachments: [{ id: 'att-proj-6-1', name: '巡检平台(纯本地化版+SaaS)清单V8.26-02.pdf', size: 1954816, type: 'pdf', category: '其他', uploader: 'user001', uploadedAt: '2026-09-07 18:36' }, { id: 'att-proj-6-2', name: '巡检平台(纯本地化版+SaaS)清单V8.26-02.xlsx', size: 3447808, type: 'xls', category: '其他', uploader: 'user001', uploadedAt: '2026-09-07 18:36' }, { id: 'att-proj-6-3', name: '重庆管道巡检4td到手飞报价（港翼带成本）V8.19.xlsx', size: 4640768, type: 'xls', category: '其他', uploader: 'user001', uploadedAt: '2026-09-07 18:36' }, { id: 'att-proj-6-4', name: '重庆管道巡检4td到手飞报价（港翼）V8.19-001.xlsx', size: 1320960, type: 'xls', category: '其他', uploader: 'user001', uploadedAt: '2026-09-07 18:36' }],
  },
  {
    id: 'proj-10',
    projectNo: 'proj-10',
    name: '高邮农业农村局无人机项目',
    customerId: 'cust-9',
    opportunityId: '',
    amount: 2780000,
    stage: 'procurement',
    status: 'active',
    priority: 'medium',
    owner: '卢长新',
    teamMembers: [],
    startDate: '2026-09-12',
    expectedDeliveryDate: '2026-09-12',
    procurementMethod: '',
    description: '进度：30%\n对接人：吕桂峰，高邮分公司\n高邮市农业农村领域低空数字化建设项目的，并于2026年10月14日09时00分（北京时间）前递交投标响应文件。\n1.项目编号：JSZC-321084-JSZC-G2026-0032\n2.项目名称：高邮市农业农村领域低空数字化建设项目\n3.预算金额：299.999999万元\n4.本项目设置最高限价：278万元',
    milestones: [],
    createdAt: '2026-09-12 10:59',
    stageHistory: [{ stage: 'procurement', date: '2026-09-12 10:59', remark: '初始阶段' }],
    attachments: [],
  },
]
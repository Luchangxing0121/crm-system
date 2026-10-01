// EXPORTS: ITask, ITaskSubItem, ITaskStatusHistory, TASK_STATUS_LABELS, TASK_STATUS_ORDER, TASK_PRIORITY_LABELS, TASK_TYPE_OPTIONS, MOCK_TASKS
import type { IAttachment } from './customers'

export type TaskStatus = 'todo' | 'in_progress' | 'completed' | 'cancelled'
export type TaskPriority = 'high' | 'medium' | 'low'
export type TaskType = 'report' | 'demo' | 'roadshow' | 'bid_support' | 'reception' | 'meeting' | 'other'

export interface ITaskSubItem {
  id: string
  title: string
  assignee: string // userId
  dueDate?: string
  status: 'pending' | 'done'
  createdAt: string
}

export interface ITaskStatusHistory {
  id: string
  fromStatus: TaskStatus | ''
  toStatus: TaskStatus
  remark: string
  operator: string // userId
  operatedAt: string
}

export interface ITask {
  id: string
  title: string
  type: TaskType
  priority: TaskPriority
  status: TaskStatus
  description: string
  owner: string // userId, 负责人
  collaborators: string[] // userId[], 协作人
  startDate?: string
  dueDate?: string
  // 关联对象
  relatedCustomerId?: string
  relatedOpportunityId?: string
  relatedProjectId?: string
  // 子任务
  subItems: ITaskSubItem[]
  // 附件
  attachments: IAttachment[]
  // 状态流转历史
  statusHistory: ITaskStatusHistory[]
  // 跟进记录 id 列表（通过 followups.opportunityId 关联，这里也用同一个 followup 类型，用 taskId 关联）
  creator: string
  createdAt: string
  updatedAt: string
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: '待开始',
  in_progress: '进行中',
  completed: '已完成',
  cancelled: '已取消',
}

export const TASK_STATUS_ORDER: TaskStatus[] = ['todo', 'in_progress', 'completed', 'cancelled']

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  high: '高',
  medium: '中',
  low: '低',
}

export const TASK_TYPE_OPTIONS: { value: TaskType; label: string }[] = [
  { value: 'report', label: '汇报材料' },
  { value: 'demo', label: '演示Demo' },
  { value: 'roadshow', label: '路演材料' },
  { value: 'bid_support', label: '投标支持' },
  { value: 'reception', label: '客户接待' },
  { value: 'meeting', label: '内部会议' },
  { value: 'other', label: '其他' },
]

export const MOCK_TASKS: ITask[] = [
  {
    id: 'task-1',
    title: 'Q3季度汇报材料',
    type: 'report',
    priority: 'high',
    status: 'in_progress',
    description: '准备Q3季度销售业绩汇报材料，包含业绩数据、客户增长、重点项目进展、下季度计划等内容。',
    owner: 'user001',
    collaborators: ['user002', 'user003'],
    startDate: '2026-09-15',
    dueDate: '2026-09-25',
    subItems: [
      { id: 'sub-1', title: '收集各部门数据', assignee: 'user002', dueDate: '2026-09-18', status: 'done', createdAt: '2026-09-15 10:00' },
      { id: 'sub-2', title: '制作业绩图表', assignee: 'user003', dueDate: '2026-09-20', status: 'done', createdAt: '2026-09-15 10:00' },
      { id: 'sub-3', title: '撰写PPT正文', assignee: 'user001', dueDate: '2026-09-22', status: 'pending', createdAt: '2026-09-15 10:00' },
      { id: 'sub-4', title: '内审与修改', assignee: 'user002', dueDate: '2026-09-24', status: 'pending', createdAt: '2026-09-15 10:00' },
    ],
    attachments: [],
    statusHistory: [
      { id: 'sh-1', fromStatus: '', toStatus: 'todo', remark: '创建事务', operator: 'user001', operatedAt: '2026-09-14 09:00' },
      { id: 'sh-2', fromStatus: 'todo', toStatus: 'in_progress', remark: '开始推进', operator: 'user001', operatedAt: '2026-09-15 10:00' },
    ],
    creator: 'user001',
    createdAt: '2026-09-14 09:00',
    updatedAt: '2026-09-16 14:30',
  },
  {
    id: 'task-2',
    title: '新产品路演Demo制作',
    type: 'demo',
    priority: 'medium',
    status: 'todo',
    description: '为新产品发布会制作路演演示Demo，需包含产品功能演示、核心亮点展示、客户案例等。',
    owner: 'user002',
    collaborators: ['user001', 'user004'],
    startDate: '2026-09-20',
    dueDate: '2026-10-10',
    subItems: [
      { id: 'sub-5', title: '确定Demo脚本', assignee: 'user002', dueDate: '2026-09-22', status: 'pending', createdAt: '2026-09-16 11:00' },
      { id: 'sub-6', title: '制作演示界面', assignee: 'user004', dueDate: '2026-09-28', status: 'pending', createdAt: '2026-09-16 11:00' },
    ],
    attachments: [],
    statusHistory: [
      { id: 'sh-3', fromStatus: '', toStatus: 'todo', remark: '创建事务', operator: 'user002', operatedAt: '2026-09-16 11:00' },
    ],
    creator: 'user002',
    createdAt: '2026-09-16 11:00',
    updatedAt: '2026-09-16 11:00',
  },
  {
    id: 'task-3',
    title: '客户答谢会筹备',
    type: 'reception',
    priority: 'high',
    status: 'in_progress',
    description: '年度客户答谢会筹备工作，包括场地预订、嘉宾邀请、物料准备、流程安排等。',
    owner: 'user005',
    collaborators: ['user001', 'user003', 'user006'],
    startDate: '2026-09-10',
    dueDate: '2026-09-28',
    subItems: [
      { id: 'sub-7', title: '场地预订', assignee: 'user005', status: 'done', createdAt: '2026-09-10 09:00' },
      { id: 'sub-8', title: '嘉宾名单确认', assignee: 'user001', status: 'done', createdAt: '2026-09-10 09:00' },
      { id: 'sub-9', title: '物料设计制作', assignee: 'user006', dueDate: '2026-09-22', status: 'pending', createdAt: '2026-09-10 09:00' },
      { id: 'sub-10', title: '流程彩排', assignee: 'user003', dueDate: '2026-09-26', status: 'pending', createdAt: '2026-09-10 09:00' },
    ],
    attachments: [],
    statusHistory: [
      { id: 'sh-4', fromStatus: '', toStatus: 'todo', remark: '创建事务', operator: 'user005', operatedAt: '2026-09-09 15:00' },
      { id: 'sh-5', fromStatus: 'todo', toStatus: 'in_progress', remark: '启动筹备', operator: 'user005', operatedAt: '2026-09-10 09:00' },
    ],
    creator: 'user005',
    createdAt: '2026-09-09 15:00',
    updatedAt: '2026-09-17 10:00',
  },
  {
    id: 'task-4',
    title: '内部销售培训材料整理',
    type: 'meeting',
    priority: 'low',
    status: 'completed',
    description: '整理新员工销售培训材料，包括产品知识、销售技巧、客户沟通等内容。',
    owner: 'user003',
    collaborators: ['user002'],
    startDate: '2026-09-01',
    dueDate: '2026-09-10',
    subItems: [
      { id: 'sub-11', title: '产品知识模块', assignee: 'user003', status: 'done', createdAt: '2026-09-01 10:00' },
      { id: 'sub-12', title: '销售技巧模块', assignee: 'user002', status: 'done', createdAt: '2026-09-01 10:00' },
    ],
    attachments: [],
    statusHistory: [
      { id: 'sh-6', fromStatus: '', toStatus: 'todo', remark: '创建事务', operator: 'user003', operatedAt: '2026-08-30 14:00' },
      { id: 'sh-7', fromStatus: 'todo', toStatus: 'in_progress', remark: '开始整理', operator: 'user003', operatedAt: '2026-09-01 10:00' },
      { id: 'sh-8', fromStatus: 'in_progress', toStatus: 'completed', remark: '材料已全部完成并上传', operator: 'user003', operatedAt: '2026-09-09 17:00' },
    ],
    creator: 'user003',
    createdAt: '2026-08-30 14:00',
    updatedAt: '2026-09-09 17:00',
  },
]

// EXPORTS: IOpportunity, IAttachment, MOCK_OPPORTUNITIES, OPPORTUNITY_STAGE_LABELS, OPPORTUNITY_STAGE_ORDER, PRIORITY_LABELS, SOURCE_OPTIONS
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

export interface IOpportunity {
  id: string
  customerId: string
  name: string
  amount: number
  stage: 'lead' | 'contact' | 'requirement' | 'proposal' | 'negotiation' | 'won' | 'lost'
  status: 'active' | 'paused' | 'closed'
  priority: 'high' | 'medium' | 'low'
  winRate: number
  expectedStartDate: string
  owner: string
  description: string
  source: string
  createdAt: string
  stageHistory: { stage: string; date: string; remark: string }[]
  attachments: IAttachment[]
}

export const OPPORTUNITY_STAGE_LABELS: Record<string, string> = {
  lead: '线索', contact: '初步接触', requirement: '需求确认', proposal: '方案报价', negotiation: '商务谈判', won: '赢单', lost: '输单',
}

export const OPPORTUNITY_STAGE_ORDER = ['lead', 'contact', 'requirement', 'proposal', 'negotiation']

export const TERMINAL_STAGES = ['won', 'lost']

export const PRIORITY_LABELS: Record<string, string> = { high: '高', medium: '中', low: '低' }

export const SOURCE_OPTIONS = ['官网咨询', '老客户转介绍', '招投标', '线下活动', '电话销售', '合作伙伴', '其他']

export const MOCK_OPPORTUNITIES: IOpportunity[] = [
  {
    id: 'info-4',
    customerId: 'cust-1',
    name: '通辽项目',
    amount: 0,
    stage: 'contact',
    status: 'active',
    priority: 'medium',
    winRate: 25,
    expectedStartDate: '',
    owner: '卢长新',
    description: '对接人：王海洋，电话：17747377737\n一、长输管道无人机巡检需求\n巡检频次：每天对管道巡检 1~2 次\n巡检距离：以阀室为单元组织巡检，相邻阀室间距约 30km，要求单架无人机单程航程可覆盖 30km\n通信保障：管道沿线多位于沙漠、耕地等偏远区域，公网信号差，需重点解决巡检作业中的网络通信问题\n环境适应性：\n北方冬季低温环境下的电池续航衰减问题\n抗风雪、降雨等恶劣天气及自然灾害的作业能力\n二、科研合作意向\n客户方对我方针对国内长输管道巡检的科研项目/课题有明确合作意愿，愿作为参与平台加入课题\n资金配套：请我方先提供项目方案，明确配套资金需求及分配方式，双方再共同研究确定\n双方负责人此前已有联系沟通的基础\n三、下一步行动\n我方编制长输管道无人机巡检科研项目方案（含技术路线、资金预算与分配），发送客户审阅\n客户审阅无异议后，安排双方负责人直接对接洽谈\n更新时间：2026-09-07 18:20',
    source: '顾总',
    createdAt: '2026-09-07 11:41',
    stageHistory: [{ stage: 'contact', date: '2026-09-07 11:41', remark: '初始阶段' }],
    attachments: [],
  },
  {
    id: 'info-6',
    customerId: 'cust-6',
    name: '大连德泰项目',
    amount: 0,
    stage: 'proposal',
    status: 'active',
    priority: 'medium',
    winRate: 65,
    expectedStartDate: '',
    owner: '卢长新',
    description: '对接人：李野，大连德泰，电话：15802406097\n目前大连有33公里高压燃气管线巡检需求；\n1、需要对完整的33公里高压燃气管线做完整解决方案；\n2、项目预算情况（落地模式：以采购服务模式）；\n更新时间：2026-09-15 11:57',
    source: '',
    createdAt: '2026-09-07 18:25',
    stageHistory: [{ stage: 'proposal', date: '2026-09-07 18:25', remark: '初始阶段' }],
    attachments: [],
  },
  {
    id: 'info-7',
    customerId: 'cust-8',
    name: '泰安镇无人机低空政务项目',
    amount: 0,
    stage: 'lead',
    status: 'active',
    priority: 'medium',
    winRate: 10,
    expectedStartDate: '',
    owner: '卢长新',
    description: '对接人：孟猛（负责人），江都支局，电话：19962500206\n1、这个项目，之前有对接交流过，当地派出所所长（痕副镇长），对于我司系统功能上是明确表态过的，之前在连云港的项目演示中，所长是看到过系统平台功能演示的；\n2、本次的解决方案，对于低空政务巡检方向中加入了派出所（公安）的一些场景及水务生态相关的场景。\n更新时间：2026-09-10 09:34',
    source: '',
    createdAt: '2026-09-07 18:47',
    stageHistory: [{ stage: 'lead', date: '2026-09-07 18:47', remark: '初始阶段' }],
    attachments: [],
  },
  {
    id: 'info-8',
    customerId: 'cust-9',
    name: '高邮生态环保局无人机取水项目',
    amount: 55000,
    stage: 'lead',
    status: 'active',
    priority: 'medium',
    winRate: 10,
    expectedStartDate: '',
    owner: '卢长新',
    description: '对接人：杨智，高邮分公司，电话：18052556652\n1、高邮生态环保局无人机取水项目，替代人工划船取水。\n2、11月至次年3月约7—8次，4月至5月共2次，6月至10月约66次，全年合计预计作业约75架次，每次覆盖全部5个点位。\n3、目前已完成“高邮湖无人机取水样服务方案”后续跟进\n更新时间：2026-09-07 19:14',
    source: '',
    createdAt: '2026-09-07 18:52',
    stageHistory: [{ stage: 'lead', date: '2026-09-07 18:52', remark: '初始阶段' }],
    attachments: [],
  },
  {
    id: 'info-12',
    customerId: 'cust-10',
    name: '中油易度智慧(成都)管网智能巡护项目',
    amount: 0,
    stage: 'lead',
    status: 'active',
    priority: 'medium',
    winRate: 10,
    expectedStartDate: '',
    owner: '卢长新',
    description: '对接人：张玉超，电话：17322073305\n1、制作中油易度智慧(成都)科技有限公司-管网智能巡护解决方案PPT\n2、本周二，上午9点，配合中油易度，进行线上汇报\n更新时间：2026-09-09 09:19',
    source: '',
    createdAt: '2026-09-07 19:46',
    stageHistory: [{ stage: 'lead', date: '2026-09-07 19:46', remark: '初始阶段' }],
    attachments: [],
  },
  {
    id: 'info-13',
    customerId: 'cust-11',
    name: '江西遂川天然气无人机巡检试点项目',
    amount: 0,
    stage: 'lead',
    status: 'active',
    priority: 'medium',
    winRate: 10,
    expectedStartDate: '',
    owner: '',
    description: '对接人：罗渊（总经理），电话：136 9952 5598\n目前中压有60公里，低压100公里。\n更新时间：2026-09-15 11:58',
    source: '',
    createdAt: '2026-09-08 10:34',
    stageHistory: [{ stage: 'lead', date: '2026-09-08 10:34', remark: '初始阶段' }],
    attachments: [],
  },
  {
    id: 'info-14',
    customerId: 'cust-12',
    name: '扬州邮政物流园区无人机巡检项目',
    amount: 0,
    stage: 'lead',
    status: 'active',
    priority: 'medium',
    winRate: 10,
    expectedStartDate: '',
    owner: '卢长新',
    description: '对接人：徐扬\n扬州邮政领导有想法准备上扬州邮政物流园区；\n过去交流过一次，下面的人意愿不是很高，主要还是要看领导的想法；\n出了一份清单，后续再跟进\n更新时间：2026-09-10 09:25',
    source: '',
    createdAt: '2026-09-08 10:42',
    stageHistory: [{ stage: 'lead', date: '2026-09-08 10:42', remark: '初始阶段' }],
    attachments: [],
  },
  {
    id: 'info-15',
    customerId: 'cust-13',
    name: '浦头镇无人机政务巡检项目',
    amount: 600000,
    stage: 'lead',
    status: 'paused',
    priority: 'medium',
    winRate: 10,
    expectedStartDate: '',
    owner: '卢长新',
    description: '对接人：滕达，电话：18361303567\n浦头镇原有电信业务，因业务需求，需变更（拆除），电信想用无人机政务巡检项目，去变更项目；\n目前做了一个预算，2台设备，3年服务，60万\n更新时间：2026-09-14 10:27',
    source: '',
    createdAt: '2026-09-08 10:55',
    stageHistory: [{ stage: 'lead', date: '2026-09-08 10:55', remark: '初始阶段' }],
    attachments: [],
  },
  {
    id: 'info-25',
    customerId: '',
    name: '扬州景区巡检项目',
    amount: 0,
    stage: 'lead',
    status: 'active',
    priority: 'medium',
    winRate: 10,
    expectedStartDate: '',
    owner: '卢长新',
    description: '更新时间：2026-09-15 15:59',
    source: '',
    createdAt: '2026-09-09 09:20',
    stageHistory: [{ stage: 'lead', date: '2026-09-09 09:20', remark: '初始阶段' }],
    attachments: [],
  },
]
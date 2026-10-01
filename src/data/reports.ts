// EXPORTS: MOCK_PERFORMANCE_DATA, MOCK_INDUSTRY_STATS, MOCK_FUNNEL_DATA, MOCK_SALES_RANKING

export interface IMonthlyPerformance {
  month: string;
  target: number;
  actual: number;
}

export interface IIndustryStat {
  industry: string;
  count: number;
}

export interface IFunnelStage {
  stage: string;
  stageKey: string;
  count: number;
  amount: number;
  conversionRate: number;
}

export interface ISalesRanking {
  userId: string;
  name: string;
  amount: number;
  dealCount: number;
}

// 近6个月业绩趋势（基于导入商机金额的趋势模拟）
export const MOCK_PERFORMANCE_DATA: IMonthlyPerformance[] = [
  { month: '2026-04', target: 5000000, actual: 4200000 },
  { month: '2026-05', target: 5500000, actual: 5800000 },
  { month: '2026-06', target: 6000000, actual: 5600000 },
  { month: '2026-07', target: 6500000, actual: 7100000 },
  { month: '2026-08', target: 7000000, actual: 6800000 },
  { month: '2026-09', target: 7500000, actual: 8200000 },
];

// 行业分布统计（基于实际客户数据）
export const MOCK_INDUSTRY_STATS: IIndustryStat[] = [
  { industry: '燃气', count: 5 },
  { industry: '电信', count: 5 },
];

// 销售漏斗数据（基于实际商机数据估算）
export const MOCK_FUNNEL_DATA: IFunnelStage[] = [
  { stage: '线索', stageKey: 'lead', count: 2, amount: 520000, conversionRate: 100 },
  { stage: '初步接触', stageKey: 'contact', count: 2, amount: 480000, conversionRate: 100 },
  { stage: '需求确认', stageKey: 'requirement', count: 2, amount: 860000, conversionRate: 100 },
  { stage: '方案报价', stageKey: 'proposal', count: 2, amount: 1200000, conversionRate: 100 },
  { stage: '商务谈判', stageKey: 'negotiation', count: 1, amount: 2621300, conversionRate: 50 },
];

// 销售人员业绩排名（基于实际商机负责人）
export const MOCK_SALES_RANKING: ISalesRanking[] = [
  { userId: 'user001', name: '王海洋', amount: 2621300, dealCount: 1 },
  { userId: 'user002', name: '查晓峰', amount: 1200000, dealCount: 2 },
  { userId: 'user003', name: '李野', amount: 860000, dealCount: 2 },
  { userId: 'user004', name: '金铎', amount: 500000, dealCount: 2 },
  { userId: 'user005', name: '孟猛', amount: 480000, dealCount: 1 },
  { userId: 'user006', name: '罗渊', amount: 320000, dealCount: 1 },
];

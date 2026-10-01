import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Users,
  Briefcase,
  FolderKanban,
  Percent,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  CalendarClock,
  Phone,
  MapPin,
  Mail,
} from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { CHART_COLORS } from '@/lib/chart-colors';
import { OPPORTUNITY_STAGE_LABELS } from '@/data/opportunities';
import { PROJECT_STAGE_LABELS, PROJECT_STAGE_ORDER } from '@/data/projects';
import { QUOTATION_STATUS } from '@/data/quotations';
import {
  useCustomers,
  useOpportunities,
  useProjects,
  useFollowups,
  useQuotations,
  isInOppPool,
} from '@/hooks/use-crm-store';
import {
  MOCK_PERFORMANCE_DATA,
  MOCK_INDUSTRY_STATS,
  MOCK_FUNNEL_DATA,
} from '@/data/reports';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

const kpiCards = [
  {
    title: '客户总数',
    value: '120',
    change: '+12.5%',
    changeUp: true,
    icon: Users,
    description: '较上月',
  },
  {
    title: '商机池',
    value: '0',
    change: '跟进中',
    changeUp: true,
    icon: Briefcase,
    description: '活跃商机',
  },
  {
    title: '项目池',
    value: '0',
    change: '进行中',
    changeUp: true,
    icon: FolderKanban,
    description: '项目总数',
  },
  {
    title: '转化率',
    value: '0%',
    change: '商机转项目',
    changeUp: true,
    icon: Percent,
    description: '整体转化',
  },
  {
    title: '报价总额',
    value: '0',
    change: '本年累计',
    changeUp: true,
    icon: Receipt,
    description: '全部报价',
  },
];

function KpiCard({ item }: { item: typeof kpiCards[number] }) {
  const Icon = item.icon;
  return (
    <Card className="border border-border/40">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <p className="text-sm text-muted-foreground">{item.title}</p>
            <p className="text-2xl font-bold tracking-tight">{item.value}</p>
            <div className="flex items-center gap-1 text-xs">
              {item.changeUp ? (
                <ArrowUpRight className="size-3 text-success" />
              ) : (
                <ArrowDownRight className="size-3 text-destructive" />
              )}
              <span className={item.changeUp ? 'text-success' : 'text-destructive'}>
                {item.change}
              </span>
              <span className="text-muted-foreground">{item.description}</span>
            </div>
          </div>
          <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="size-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [customers] = useCustomers();
  const [opps] = useOpportunities();
  const [projects] = useProjects();
  const [followups] = useFollowups();
  const [quotations] = useQuotations();

  // KPI 统计
  const activeOpps = opps.filter((o) => isInOppPool(o));
  const oppCount = activeOpps.length;
  const projectCount = projects.length;
  const activeProjectCount = projects.filter((p) => p.status === 'active').length;
  const totalDeal = oppCount + projectCount;
  const conversionRate = totalDeal > 0 ? Math.round((projectCount / totalDeal) * 100) : 0;
  const quotationTotal = quotations.reduce((sum, q) => sum + q.total, 0);
  const acceptedQuotationTotal = quotations
    .filter((q) => q.status === 'accepted')
    .reduce((sum, q) => sum + q.total, 0);

  const dashboardKpis = useMemo(
    () => [
      { ...kpiCards[0], value: String(customers.length) },
      { ...kpiCards[1], value: String(oppCount), change: `${opps.length} 个总数` },
      {
        ...kpiCards[2],
        value: String(projectCount),
        change: `${activeProjectCount} 个进行中`,
      },
      { ...kpiCards[3], value: `${conversionRate}%`, change: '商机转项目' },
      {
        ...kpiCards[4],
        value: `¥${(quotationTotal / 10000).toFixed(1)}万`,
        change: `已确认 ¥${(acceptedQuotationTotal / 10000).toFixed(1)}万`,
      },
    ],
    [customers.length, oppCount, opps.length, projectCount, activeProjectCount, conversionRate, quotationTotal, acceptedQuotationTotal],
  );

  // 项目阶段分布
  const projectStageOption: EChartsOption = useMemo(() => {
    const countMap: Record<string, number> = {};
    projects.forEach((p) => {
      countMap[p.stage] = (countMap[p.stage] || 0) + 1;
    });
    const data = PROJECT_STAGE_ORDER.map((stage, i) => ({
      name: PROJECT_STAGE_LABELS[stage] || stage,
      value: countMap[stage] || 0,
      itemStyle: { color: CHART_COLORS[i % CHART_COLORS.length] },
    })).filter((d) => d.value > 0);

    return { tooltip: { trigger: 'item', formatter: '{b}: {c} 个 ({d}%)' }, legend: { type: 'scroll', bottom: 0 }, series: [{ type: 'pie', radius: ['55%', '75%'], center: ['50%', '45%'], avoidLabelOverlap: false, label: { show: false }, emphasis: { label: { show: false } }, data }] };
  }, [projects]);

  // 客户行业分布
  const industryOption: EChartsOption = useMemo(() => {
    const industryMap = new Map<string, number>();
    customers.forEach((c) => {
      const ind = c.industry || '其他';
      industryMap.set(ind, (industryMap.get(ind) || 0) + 1);
    });
    const data = Array.from(industryMap.entries()).map(([name, value], i) => ({
      name,
      value,
      itemStyle: { color: CHART_COLORS[i % CHART_COLORS.length] },
    }));
    return {
      tooltip: {
        trigger: 'item',
        formatter: (params) => {
          const p = params as { name: string; value: number };
          return `${p.name}<br/>客户数: ${p.value} 家`;
        },
      },
      legend: { type: 'scroll', bottom: 0 },
      series: [
        {
          type: 'pie',
          radius: ['55%', '75%'],
          center: ['50%', '45%'],
          avoidLabelOverlap: false,
          label: { show: false },
          emphasis: { label: { show: false } },
          data,
        },
      ],
    };
  }, [customers]);

  // 商机漏斗
  const funnelOption: EChartsOption = useMemo(() => {
    const activeOppsList = opps.filter((o) => isInOppPool(o));
    const stageOrder: Array<{ key: string; label: string }> = [
      { key: 'lead', label: '初步接触' },
      { key: 'contact', label: '需求确认' },
      { key: 'requirement', label: '方案报价' },
      { key: 'proposal', label: '商务谈判' },
      { key: 'negotiation', label: '合同签约' },
    ];
    const data = stageOrder.map((s, i) => {
      const stageOpps = activeOppsList.filter((o) => o.stage === s.key);
      const amount = stageOpps.reduce((sum, o) => sum + (o.amount || 0), 0);
      return {
        name: s.label,
        value: stageOpps.length,
        amount,
        itemStyle: { color: CHART_COLORS[i % CHART_COLORS.length] },
      };
    }).filter((d) => d.value > 0);
    const maxValue = Math.max(...data.map((d) => d.value), 1);
    return {
      tooltip: {
        trigger: 'item',
        formatter: (params) => {
          const p = params as { name: string; value: number; data: { amount: number } };
          return `${p.name}<br/>商机数: ${p.value} 个<br/>金额: ¥${(
            (p.data.amount || 0) / 10000
          ).toFixed(1)}万`;
        },
      },
      legend: { type: 'scroll', bottom: 0 },
      series: [
        {
          type: 'funnel',
          left: '10%',
          top: 20,
          bottom: 60,
          width: '80%',
          min: 0,
          max: maxValue,
          minSize: '0%',
          maxSize: '100%',
          sort: 'descending',
          gap: 2,
          label: { show: true, position: 'inside' },
          labelLine: { length: 10, lineStyle: { width: 1, type: 'solid' } },
          itemStyle: { borderColor: '#fff', borderWidth: 1 },
          emphasis: { label: { fontSize: 16 } },
          data,
        },
      ],
    };
  }, [opps]);

  // 业绩趋势
  const trendOption: EChartsOption = useMemo(
    () => ({
      tooltip: { trigger: 'axis' },
      legend: { type: 'scroll', bottom: 0, data: ['目标业绩', '实际业绩'] },
      grid: { left: '3%', right: '4%', bottom: '20%', containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: true,
        data: MOCK_PERFORMANCE_DATA.map((d) => d.month.slice(2)),
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: (value: number) => `${value / 10000}万`,
        },
      },
      series: [
        {
          name: '目标业绩',
          type: 'line',
          data: MOCK_PERFORMANCE_DATA.map((d) => d.target),
          smooth: true,
          lineStyle: { color: CHART_COLORS[1], type: 'dashed' },
          itemStyle: { color: CHART_COLORS[1] },
        },
        {
          name: '实际业绩',
          type: 'line',
          data: MOCK_PERFORMANCE_DATA.map((d) => d.actual),
          smooth: true,
          lineStyle: { color: CHART_COLORS[0] },
          itemStyle: { color: CHART_COLORS[0] },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(21, 69, 163, 0.3)' },
                { offset: 1, color: 'rgba(21, 69, 163, 0.02)' },
              ],
            },
          },
        },
      ],
    }),
    [],
  );

  const activeOpportunities = useMemo(
    () => activeOpps.slice(0, 5),
    [activeOpps],
  );

  const activeProjects = useMemo(
    () => projects.filter((p) => p.status === 'active').slice(0, 5),
    [projects],
  );

  const upcomingFollowups = useMemo(
    () =>
      followups.filter((f) => f.nextFollowUpDate)
        .slice(0, 5)
        .map((f) => {
          const customer = customers.find((c) => c.id === f.customerId);
          return { ...f, customerName: customer?.name || '未知客户' };
        }),
    [followups, customers],
  );

  const typeLabels: Record<string, string> = {
    visit: '拜访',
    call: '电话',
    email: '邮件',
    meeting: '会议',
  };

  const typeIcons: Record<string, typeof Phone> = {
    visit: MapPin,
    call: Phone,
    email: Mail,
    meeting: CalendarClock,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">数据看板</h1>
        <p className="text-sm text-muted-foreground mt-1">销售概览与关键指标</p>
      </div>

      {/* KPI 卡片 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {dashboardKpis.map((card) => (
          <KpiCard key={card.title} item={card} />
        ))}
      </div>

      {/* 图表区：业绩趋势 + 项目阶段分布 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">业绩趋势</CardTitle>
          </CardHeader>
          <CardContent>
            <ReactECharts option={trendOption} theme="ud" className="h-[300px] w-full" />
          </CardContent>
        </Card>

        <Card className="border border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">项目阶段分布</CardTitle>
          </CardHeader>
          <CardContent>
            <ReactECharts option={projectStageOption} theme="ud" className="h-[300px] w-full" />
          </CardContent>
        </Card>
      </div>

      {/* 商机漏斗 + 行业分布 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">商机漏斗</CardTitle>
          </CardHeader>
          <CardContent>
            <ReactECharts option={funnelOption} theme="ud" className="h-[320px] w-full" />
          </CardContent>
        </Card>

        <Card className="border border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">客户行业分布</CardTitle>
          </CardHeader>
          <CardContent>
            <ReactECharts option={industryOption} theme="ud" className="h-[320px] w-full" />
          </CardContent>
        </Card>
      </div>

      {/* 待办跟进 */}
      <Card className="border border-border/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">待办跟进提醒</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {upcomingFollowups.map((f) => {
            const TypeIcon = typeIcons[f.type] || Phone;
            return (
              <div
                key={f.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => navigate(`/customers/${f.customerId}`)}
              >
                <div className="size-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                  <TypeIcon className="size-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate">{f.customerName}</span>
                    <Badge variant="outline" className="shrink-0 text-xs">
                      {typeLabels[f.type]}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    {f.content}
                  </p>
                  <p className="text-xs text-primary mt-1 flex items-center gap-1">
                    <CalendarClock className="size-3" />
                    下次跟进: {f.nextFollowUpDate}
                  </p>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* 商机 / 项目 列表 */}
      <Card className="border border-border/40">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">进行中商机 / 项目</CardTitle>
          </div>
        </CardHeader>
        <Tabs defaultValue="opportunities" className="w-full">
          <div className="px-6">
            <TabsList className="w-full max-w-xs">
              <TabsTrigger value="opportunities" className="flex-1">进行中商机</TabsTrigger>
              <TabsTrigger value="projects" className="flex-1">进行中项目</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="opportunities" className="mt-3">
            <div className="w-full overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-t border-border/50">
                    <th className="text-left font-medium text-muted-foreground px-5 py-3 whitespace-nowrap">
                      商机名称
                    </th>
                    <th className="text-left font-medium text-muted-foreground px-5 py-3 whitespace-nowrap">
                      客户
                    </th>
                    <th className="text-left font-medium text-muted-foreground px-5 py-3 whitespace-nowrap">
                      阶段
                    </th>
                    <th className="text-right font-medium text-muted-foreground px-5 py-3 whitespace-nowrap">
                      金额
                    </th>
                    <th className="text-left font-medium text-muted-foreground px-5 py-3 whitespace-nowrap">
                      优先级
                    </th>
                    <th className="text-left font-medium text-muted-foreground px-5 py-3 whitespace-nowrap">
                      预计立项
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {activeOpportunities.map((opp) => {
                    const customer = customers.find((c) => c.id === opp.customerId);
                    return (
                      <tr
                        key={opp.id}
                        className="border-b border-border/30 last:border-0 hover:bg-muted/30 cursor-pointer"
                        onClick={() => navigate(`/opportunities/${opp.id}`)}
                      >
                        <td className="px-5 py-3 font-medium">
                          <span className="block truncate max-w-[200px]">{opp.name}</span>
                        </td>
                        <td className="px-5 py-3">
                          <span className="block truncate max-w-[160px] text-muted-foreground">
                            {customer?.name}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <Badge variant="secondary" className="text-xs">
                            {OPPORTUNITY_STAGE_LABELS[opp.stage]}
                          </Badge>
                        </td>
                        <td className="px-5 py-3 text-right font-medium tabular-nums">
                          ¥{opp.amount.toLocaleString()}
                        </td>
                        <td className="px-5 py-3">
                          <Badge
                            variant={opp.priority === 'high' ? 'destructive' : opp.priority === 'medium' ? 'default' : 'outline'}
                            className="text-xs"
                          >
                            {opp.priority === 'high' ? '高' : opp.priority === 'medium' ? '中' : '低'}
                          </Badge>
                        </td>
                        <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">
                          {opp.expectedStartDate}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </TabsContent>
          <TabsContent value="projects" className="mt-3">
            <div className="w-full overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-t border-border/50">
                    <th className="text-left font-medium text-muted-foreground px-5 py-3 whitespace-nowrap">
                      项目名称
                    </th>
                    <th className="text-left font-medium text-muted-foreground px-5 py-3 whitespace-nowrap">
                      客户
                    </th>
                    <th className="text-left font-medium text-muted-foreground px-5 py-3 whitespace-nowrap">
                      阶段
                    </th>
                    <th className="text-right font-medium text-muted-foreground px-5 py-3 whitespace-nowrap">
                      金额
                    </th>
                    <th className="text-left font-medium text-muted-foreground px-5 py-3 whitespace-nowrap">
                      优先级
                    </th>
                    <th className="text-left font-medium text-muted-foreground px-5 py-3 whitespace-nowrap">
                      预计交付
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {activeProjects.map((proj) => {
                    const customer = customers.find((c) => c.id === proj.customerId);
                    return (
                      <tr
                        key={proj.id}
                        className="border-b border-border/30 last:border-0 hover:bg-muted/30 cursor-pointer"
                        onClick={() => navigate(`/projects/${proj.id}`)}
                      >
                        <td className="px-5 py-3 font-medium">
                          <span className="block truncate max-w-[200px]">{proj.name}</span>
                        </td>
                        <td className="px-5 py-3">
                          <span className="block truncate max-w-[160px] text-muted-foreground">
                            {customer?.name}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <Badge variant="secondary" className="text-xs">
                            {PROJECT_STAGE_LABELS[proj.stage]}
                          </Badge>
                        </td>
                        <td className="px-5 py-3 text-right font-medium tabular-nums">
                          ¥{proj.amount.toLocaleString()}
                        </td>
                        <td className="px-5 py-3">
                          <Badge
                            variant={proj.priority === 'high' ? 'destructive' : proj.priority === 'medium' ? 'default' : 'outline'}
                            className="text-xs"
                          >
                            {proj.priority === 'high' ? '高' : proj.priority === 'medium' ? '中' : '低'}
                          </Badge>
                        </td>
                        <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">
                          {proj.expectedDeliveryDate}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}

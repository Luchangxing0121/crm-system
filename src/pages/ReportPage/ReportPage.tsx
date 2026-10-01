import { useState } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { CHART_COLORS } from '@/lib/chart-colors';
import {
  MOCK_PERFORMANCE_DATA,
  MOCK_INDUSTRY_STATS,
  MOCK_FUNNEL_DATA,
  MOCK_SALES_RANKING,
} from '@/data/reports';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';
import { BarChart3, PieChart, TrendingUp, Users } from 'lucide-react';

export default function ReportPage() {
  const [tab, setTab] = useState('customer');

  const industryOption: EChartsOption = {
    tooltip: { trigger: 'item' },
    legend: { type: 'scroll', bottom: 0 },
    color: CHART_COLORS,
    series: [
      {
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: false,
        label: { show: false },
        emphasis: { label: { show: false } },
        data: MOCK_INDUSTRY_STATS.map((item) => ({
          name: item.industry,
          value: item.count,
        })),
      },
    ],
  };

  const levelOption: EChartsOption = {
    tooltip: { trigger: 'axis' },
    legend: { bottom: 0 },
    grid: { left: '3%', right: '4%', bottom: '20%', containLabel: true },
    xAxis: {
      type: 'category',
      data: ['A级客户', 'B级客户', 'C级客户'],
    },
    yAxis: { type: 'value' },
    series: [
      {
        type: 'bar',
        name: '客户数量',
        data: [18, 32, 45],
        barWidth: '40%',
        itemStyle: { color: CHART_COLORS[0], borderRadius: [4, 4, 0, 0] },
      },
    ],
  };

  const monthlyOption: EChartsOption = {
    tooltip: { trigger: 'axis' },
    legend: { bottom: 0 },
    grid: { left: '3%', right: '4%', bottom: '20%', containLabel: true },
    xAxis: {
      type: 'category',
      data: MOCK_PERFORMANCE_DATA.map((item) => item.month),
    },
    yAxis: { type: 'value' },
    series: [
      {
        type: 'line',
        name: '目标（万元）',
        data: MOCK_PERFORMANCE_DATA.map((item) => item.target / 10000),
        smooth: true,
        itemStyle: { color: CHART_COLORS[2] },
      },
      {
        type: 'line',
        name: '实际（万元）',
        data: MOCK_PERFORMANCE_DATA.map((item) => item.actual / 10000),
        smooth: true,
        itemStyle: { color: CHART_COLORS[0] },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: CHART_COLORS[0] + '33' },
              { offset: 1, color: CHART_COLORS[0] + '05' },
            ],
          },
        },
      },
    ],
  };

  const funnelData = MOCK_FUNNEL_DATA.map((item) => ({
    name: item.stage,
    value: item.count,
  }));

  const funnelOption: EChartsOption = {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0 },
    color: CHART_COLORS,
    series: [
      {
        type: 'funnel',
        left: '10%',
        top: 20,
        bottom: '15%',
        width: '80%',
        min: 0,
        max: funnelData[0]?.value || 100,
        minSize: '0%',
        maxSize: '100%',
        sort: 'descending',
        gap: 2,
        label: { show: true, position: 'inside' },
        data: funnelData,
      },
    ],
  };

  const rankingOption: EChartsOption = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '3%', containLabel: true },
    xAxis: { type: 'value' },
    yAxis: {
      type: 'category',
      data: [...MOCK_SALES_RANKING].reverse().map((item) => item.name),
    },
    series: [
      {
        type: 'bar',
        name: '业绩（万元）',
        data: [...MOCK_SALES_RANKING].reverse().map((item) => item.amount / 10000),
        barWidth: '50%',
        itemStyle: {
          color: CHART_COLORS[1],
          borderRadius: [0, 4, 4, 0],
        },
        label: {
          show: true,
          position: 'right',
          formatter: (params: any) => `${params.value}万`,
        },
      },
    ],
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">统计报表</h1>
        <p className="text-sm text-muted-foreground mt-1">多维度数据分析与可视化展示</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="customer" className="flex items-center gap-1.5">
            <Users className="size-4" />
            客户分析
          </TabsTrigger>
          <TabsTrigger value="sales" className="flex items-center gap-1.5">
            <BarChart3 className="size-4" />
            销售业绩
          </TabsTrigger>
          <TabsTrigger value="funnel" className="flex items-center gap-1.5">
            <PieChart className="size-4" />
            转化漏斗
          </TabsTrigger>
        </TabsList>

        <TabsContent value="customer" className="mt-4 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border border-border/40">
              <CardHeader>
                <h3 className="font-semibold flex items-center gap-2">
                  <PieChart className="size-4 text-primary" />
                  客户行业分布
                </h3>
              </CardHeader>
              <CardContent>
                <ReactECharts option={industryOption} theme="ud" className="h-[320px]" />
              </CardContent>
            </Card>
            <Card className="border border-border/40">
              <CardHeader>
                <h3 className="font-semibold flex items-center gap-2">
                  <BarChart3 className="size-4 text-primary" />
                  客户分级统计
                </h3>
              </CardHeader>
              <CardContent>
                <ReactECharts option={levelOption} theme="ud" className="h-[320px]" />
              </CardContent>
            </Card>
          </div>

          <Card className="border border-border/40">
            <CardHeader>
              <h3 className="font-semibold">客户区域分布</h3>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { region: '华东地区', count: 42, percent: '35%' },
                  { region: '华南地区', count: 28, percent: '23%' },
                  { region: '华北地区', count: 25, percent: '21%' },
                  { region: '其他地区', count: 25, percent: '21%' },
                ].map((item) => (
                  <div
                    key={item.region}
                    className="p-4 rounded-lg border border-border/40 bg-card/50"
                  >
                    <div className="text-sm text-muted-foreground">{item.region}</div>
                    <div className="text-2xl font-bold mt-2 tabular-nums">{item.count}</div>
                    <div className="text-xs text-primary mt-1">{item.percent}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sales" className="mt-4 space-y-6">
          <Card className="border border-border/40">
            <CardHeader>
              <h3 className="font-semibold flex items-center gap-2">
                <TrendingUp className="size-4 text-primary" />
                月度业绩趋势
              </h3>
            </CardHeader>
            <CardContent>
              <ReactECharts option={monthlyOption} theme="ud" className="h-[360px]" />
            </CardContent>
          </Card>

          <Card className="border border-border/40">
            <CardHeader>
              <h3 className="font-semibold flex items-center gap-2">
                <Users className="size-4 text-primary" />
                销售人员业绩排名
              </h3>
            </CardHeader>
            <CardContent>
              <ReactECharts option={rankingOption} theme="ud" className="h-[360px]" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="funnel" className="mt-4 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border border-border/40">
              <CardHeader>
                <h3 className="font-semibold flex items-center gap-2">
                  <PieChart className="size-4 text-primary" />
                  商机转化漏斗
                </h3>
              </CardHeader>
              <CardContent>
                <ReactECharts option={funnelOption} theme="ud" className="h-[400px]" />
              </CardContent>
            </Card>
            <Card className="border border-border/40">
              <CardHeader>
                <h3 className="font-semibold">各阶段转化率</h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {MOCK_FUNNEL_DATA.map((item, idx) => {
                    const prev =
                      idx === 0
                        ? item.count
                        : MOCK_FUNNEL_DATA[idx - 1].count;
                    const rate = idx === 0 ? 100 : Math.round((item.count / prev) * 100);
                    return (
                      <div
                        key={item.stage}
                        className="flex items-center gap-4 p-3 rounded-lg border border-border/40"
                      >
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-medium text-sm">{item.stage}</span>
                            <Badge variant="outline" className="text-xs">
                              {item.count} 个商机
                            </Badge>
                          </div>
                          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${rate}%` }}
                            />
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-lg font-bold text-primary tabular-nums">
                            {rate}%
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {idx === 0 ? '初始' : '转化率'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

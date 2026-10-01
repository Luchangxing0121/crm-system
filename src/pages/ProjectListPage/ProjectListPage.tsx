import { useState, useMemo, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Search,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  DollarSign,
  FolderKanban,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  Users,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  type IProject,
  PROJECT_STAGE_LABELS,
  PROJECT_STAGE_ORDER,
  PRIORITY_LABELS,
} from '@/data/projects'
import { MOCK_USERS } from '@/data/users'
import { MOCK_CONTRACTS } from '@/data/contracts'
import { useProjects, useCustomers } from '@/hooks/use-crm-store'

const stageColorMap: Record<string, string> = {
  initiated: 'bg-sky-500 text-sky-50',
  procurement: 'bg-blue-500 text-blue-50',
  contract: 'bg-indigo-500 text-indigo-50',
  execution: 'bg-amber-500 text-amber-50',
  acceptance: 'bg-emerald-500 text-emerald-50',
  closed: 'bg-slate-500 text-slate-50',
}

const priorityColorMap: Record<string, string> = {
  high: 'bg-rose-100 text-rose-700 border-rose-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  low: 'bg-slate-100 text-slate-600 border-slate-200',
}

export default function ProjectListPage() {
  const navigate = useNavigate()
  const [view, setView] = useState<'kanban' | 'list'>('kanban')
  const [keyword, setKeyword] = useState('')
  const [stageFilter, setStageFilter] = useState('all')
  const [ownerFilter, setOwnerFilter] = useState('all')
  const [customerFilter, setCustomerFilter] = useState('all')
  const [page, setPage] = useState(1)
  const pageSize = 8
  const [projects] = useProjects()
  const [customersAll] = useCustomers()

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      if (keyword) {
        const kw = keyword.toLowerCase()
        const customerName = customersAll.find((c) => c.id === p.customerId)?.name || ''
        if (
          !p.name.toLowerCase().includes(kw) &&
          !customerName.toLowerCase().includes(kw) &&
          !p.projectNo.toLowerCase().includes(kw)
        )
          return false
      }
      if (stageFilter !== 'all' && p.stage !== stageFilter) return false
      if (ownerFilter !== 'all' && p.owner !== ownerFilter) return false
      if (customerFilter !== 'all' && p.customerId !== customerFilter) return false
      return true
    })
  }, [projects, keyword, stageFilter, ownerFilter, customerFilter])

  const getCustomerName = (cid: string) =>
    customersAll.find((c) => c.id === cid)?.name || '-'
  const getOwnerName = (oid: string) => MOCK_USERS.find((u) => u.id === oid)?.name || '-'

  const totalAmount = filtered.reduce((sum, p) => sum + p.amount, 0)
  const inProgressCount = filtered.filter(
    (p) => p.stage === 'execution' || p.stage === 'procurement',
  ).length
  const pendingContractCount = filtered.filter((p) => p.stage === 'initiated').length

  const totalPaid = useMemo(() => {
    return filtered.reduce((sum, p) => {
      if (!p.contractId) return sum
      const contract = MOCK_CONTRACTS.find((c) => c.id === p.contractId)
      if (!contract) return sum
      return (
        sum +
        contract.paymentPlan.filter((pp) => pp.status === 'paid').reduce(
          (s, pp) => s + pp.amount,
          0,
        )
      )
    }, 0)
  }, [filtered])

  const kanbanData = useMemo(() => {
    const map: Record<string, IProject[]> = {}
    PROJECT_STAGE_ORDER.forEach((s) => {
      map[s] = filtered.filter((p) => p.stage === s)
    })
    return map
  }, [filtered])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const pagedList = filtered.slice((page - 1) * pageSize, page * pageSize)

  const getContractNo = (p: IProject) => {
    if (!p.contractId) return '-'
    return MOCK_CONTRACTS.find((c) => c.id === p.contractId)?.contractNo || '-'
  }

  const getPaidAmount = (p: IProject) => {
    if (!p.contractId) return 0
    const c = MOCK_CONTRACTS.find((cc) => cc.id === p.contractId)
    if (!c) return 0
    return c.paymentPlan.filter((pp) => pp.status === 'paid').reduce((s, pp) => s + pp.amount, 0)
  }

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border border-border/40">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1.5">
                <p className="text-sm text-muted-foreground">项目总数</p>
                <p className="text-2xl font-bold tracking-tight">{filtered.length}</p>
                <div className="flex items-center gap-1 text-xs">
                  <ArrowUpRight className="size-3 text-success" />
                  <span className="text-success">+15%</span>
                  <span className="text-muted-foreground">较上月</span>
                </div>
              </div>
              <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FolderKanban className="size-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/40">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1.5">
                <p className="text-sm text-muted-foreground">进行中</p>
                <p className="text-2xl font-bold tracking-tight">{inProgressCount}</p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <TrendingUp className="size-3" />
                  <span>在执行项目</span>
                </div>
              </div>
              <div className="size-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Clock className="size-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/40">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1.5">
                <p className="text-sm text-muted-foreground">合同总额</p>
                <p className="text-2xl font-bold tracking-tight">
                  ¥{(totalAmount / 10000).toFixed(1)}万
                </p>
                <div className="flex items-center gap-1 text-xs">
                  <ArrowUpRight className="size-3 text-success" />
                  <span className="text-success">+22%</span>
                  <span className="text-muted-foreground">较上月</span>
                </div>
              </div>
              <div className="size-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <DollarSign className="size-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/40">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1.5">
                <p className="text-sm text-muted-foreground">已回款</p>
                <p className="text-2xl font-bold tracking-tight">
                  ¥{(totalPaid / 10000).toFixed(1)}万
                </p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <CheckCircle2 className="size-3" />
                  <span>
                    回款率 {totalAmount > 0 ? ((totalPaid / totalAmount) * 100).toFixed(1) : 0}%
                  </span>
                </div>
              </div>
              <div className="size-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                <DollarSign className="size-5 text-indigo-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 工具栏 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">项目池</h1>
          <p className="text-sm text-muted-foreground mt-1">
            共 {filtered.length} 个项目，合同总额 ¥{totalAmount.toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-border/60">
            <Button
              variant={view === 'kanban' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 rounded-r-none"
              onClick={() => setView('kanban')}
            >
              看板视图
            </Button>
            <Button
              variant={view === 'list' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 rounded-l-none"
              onClick={() => setView('list')}
            >
              列表视图
            </Button>
          </div>
        </div>
      </div>

      {/* 筛选栏 */}
      <Card className="border border-border/40">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="搜索项目名称 / 编号 / 客户"
                className="bg-background pl-9"
              />
            </div>
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="全部阶段" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部阶段</SelectItem>
                {PROJECT_STAGE_ORDER.map((s) => (
                  <SelectItem key={s} value={s}>
                    {PROJECT_STAGE_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={customerFilter} onValueChange={setCustomerFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="全部客户" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部客户</SelectItem>
                {customersAll.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={ownerFilter} onValueChange={setOwnerFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="全部负责人" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部负责人</SelectItem>
                {MOCK_USERS.filter((u) => u.status === 'active').map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 看板视图 */}
      {view === 'kanban' && (
        <div className="w-full overflow-x-auto">
          <div className="flex gap-4 min-w-max pb-4">
            {PROJECT_STAGE_ORDER.map((stageKey) => {
              const stageProjects = kanbanData[stageKey] || []
              const stageAmount = stageProjects.reduce((s, p) => s + p.amount, 0)
              return (
                <div
                  key={stageKey}
                  className="w-[300px] shrink-0 flex flex-col bg-muted/30 rounded-lg"
                >
                  <div className="px-3 py-3 flex items-center justify-between border-b border-border/30">
                    <div className="flex items-center gap-2">
                      <div
                        className={`size-2 rounded-full ${stageColorMap[stageKey].split(' ')[0]}`}
                      />
                      <span className="text-sm font-medium">
                        {PROJECT_STAGE_LABELS[stageKey]}
                      </span>
                      <Badge variant="secondary" className="text-xs h-5 px-1.5">
                        {stageProjects.length}
                      </Badge>
                    </div>
                  </div>
                  <div className="p-2 space-y-2 flex-1">
                    {stageProjects.map((p) => {
                      const paid = getPaidAmount(p)
                      const progress = p.amount > 0 ? (paid / p.amount) * 100 : 0
                      return (
                        <Card
                          key={p.id}
                          className="cursor-pointer hover:shadow-md transition-shadow border-border/40"
                          onClick={() => navigate(`/projects/${p.id}`)}
                        >
                          <CardContent className="p-3 space-y-2.5">
                            <div className="flex items-start justify-between gap-2 min-w-0">
                              <span className="font-medium text-sm truncate flex-1">
                                {p.name}
                              </span>
                              <Badge
                                variant="outline"
                                className={`shrink-0 text-[10px] h-5 px-1.5 ${priorityColorMap[p.priority]}`}
                              >
                                {PRIORITY_LABELS[p.priority]}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {p.projectNo}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {getCustomerName(p.customerId)}
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-primary">
                                ¥{p.amount.toLocaleString()}
                              </span>
                              <span className="text-muted-foreground">
                                回款 {progress.toFixed(0)}%
                              </span>
                            </div>
                            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Users className="size-3" />
                                {getOwnerName(p.owner)}
                              </span>
                              <span>{p.startDate}</span>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                    {stageProjects.length === 0 && (
                      <div className="text-center text-xs text-muted-foreground py-8">
                        暂无项目
                      </div>
                    )}
                  </div>
                  <div className="px-3 py-2 border-t border-border/30 text-xs text-muted-foreground text-right">
                    金额 ¥{(stageAmount / 10000).toFixed(1)}万
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 列表视图 */}
      {view === 'list' && (
        <Card className="border border-border/40">
          <CardContent className="p-0">
            <div className="w-full overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/40 bg-muted/30">
                    <th className="text-left font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">
                      项目编号
                    </th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">
                      项目名称
                    </th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">
                      客户名称
                    </th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">
                      阶段
                    </th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">
                      负责人
                    </th>
                    <th className="text-right font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">
                      合同金额
                    </th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">
                      回款进度
                    </th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">
                      立项时间
                    </th>
                    <th className="text-right font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pagedList.map((p) => {
                    const paid = getPaidAmount(p)
                    const progress = p.amount > 0 ? (paid / p.amount) * 100 : 0
                    return (
                      <tr
                        key={p.id}
                        className="border-b border-border/30 hover:bg-muted/20 transition-colors"
                      >
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          {p.projectNo}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => navigate(`/projects/${p.id}`)}
                            className="font-medium text-foreground hover:text-primary text-left"
                          >
                            {p.name}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {getCustomerName(p.customerId)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={`text-xs ${stageColorMap[p.stage]} border-0`}
                          >
                            {PROJECT_STAGE_LABELS[p.stage]}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {getOwnerName(p.owner)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium tabular-nums">
                          ¥{p.amount.toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 min-w-[120px]">
                            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground tabular-nums w-10 text-right">
                              {progress.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {p.startDate}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs"
                              onClick={() => navigate(`/projects/${p.id}`)}
                            >
                              详情
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs"
                              onClick={() => navigate(`/projects/${p.id}`)}
                            >
                              编辑
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {pagedList.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                        暂无项目数据
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {filtered.length > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border/40">
                <span className="text-xs text-muted-foreground">
                  共 {filtered.length} 条，第 {page} / {totalPages} 页
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 w-7 p-0"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <Button
                      key={p}
                      size="sm"
                      variant={p === page ? 'default' : 'outline'}
                      className="h-7 w-7 p-0"
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </Button>
                  ))}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 w-7 p-0"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

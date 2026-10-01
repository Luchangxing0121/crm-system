import { useState, useMemo, useEffect } from 'react'
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card'
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Clock,
  DollarSign,
  Briefcase,
  ArrowUpRight,
  Layers,
  Pause,
} from 'lucide-react'
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import FileUploader from '@/components/FileUpload/FileUploader';
import type { UploadedFile } from '@/components/FileUpload/FileUploader';
import { attachmentApi } from '@/services/api';
import { useNavigate } from 'react-router-dom'
import {
  type IOpportunity,
  OPPORTUNITY_STAGE_LABELS,
  OPPORTUNITY_STAGE_ORDER,
  TERMINAL_STAGES,
  PRIORITY_LABELS,
  SOURCE_OPTIONS,
} from '@/data/opportunities'
import { MOCK_USERS } from '@/data/users'
import { useOpportunities, isInOppPool, opportunityMutations, initiateProject, useCustomers } from '@/hooks/use-crm-store';

const stageColorMap: Record<string, string> = {
  lead: 'bg-slate-500 text-slate-50',
  contact: 'bg-sky-500 text-sky-50',
  requirement: 'bg-blue-500 text-blue-50',
  proposal: 'bg-amber-500 text-amber-50',
  negotiation: 'bg-purple-500 text-purple-50',
  lost: 'bg-rose-500 text-rose-50',
}

const priorityColorMap: Record<string, string> = {
  high: 'bg-rose-100 text-rose-700 border-rose-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  low: 'bg-slate-100 text-slate-600 border-slate-200',
}

export default function OpportunityListPage() {
  const navigate = useNavigate()
  const [view, setView] = useState<'kanban' | 'list'>('kanban')
  const [keyword, setKeyword] = useState('')
  const [stageFilter, setStageFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [ownerFilter, setOwnerFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [opportunities] = useOpportunities()
  const [customersAll] = useCustomers();
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [advancingId, setAdvancingId] = useState<string | null>(null);

  // 商机池 = 排除已立项关闭（转入项目池）的商机
  const [page, setPage] = useState(1)
  const pageSize = 8

  // 新增商机 Dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingOpp, setEditingOpp] = useState<IOpportunity | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [attachments, setAttachments] = useState<UploadedFile[]>([]);
  const [newOpp, setNewOpp] = useState({
    name: '',
    customerId: '',
    amount: '',
    stage: 'lead' as IOpportunity['stage'],
    priority: 'medium' as IOpportunity['priority'],
    status: 'active' as IOpportunity['status'],
    expectedStartDate: '',
    owner: 'user001',
    source: '官网咨询',
    description: '',
    attachments: [],
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!newOpp.name.trim()) errs.name = '请输入商机名称'
    if (!newOpp.customerId) errs.customerId = '请选择客户'
    if (!newOpp.amount || parseFloat(newOpp.amount) <= 0) errs.amount = '请输入有效金额'
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleCreate = async () => {
    if (!validate()) return
    setCreating(true);
    try {
      const now = formatDate()
      const opp = await opportunityMutations.create({
        name: newOpp.name,
        customerId: newOpp.customerId,
        amount: parseFloat(newOpp.amount),
        stage: newOpp.stage,
        status: newOpp.status,
        priority: newOpp.priority,
        expectedStartDate: newOpp.expectedStartDate || now,
        owner: newOpp.owner,
        description: newOpp.description,
        source: newOpp.source,
      })
      // 附件逐个上传到附件库，关联到新商机（详情页附件区可见）
      for (const f of attachments) {
        if (!f.file) continue
        try {
          await attachmentApi.upload('opportunity', opp.id, f.file)
        } catch (err) {
          toast.error(`附件「${f.name}」上传失败`)
        }
      }
      setDialogOpen(false)
      setNewOpp({
        name: '',
        customerId: '',
        amount: '',
        stage: 'lead',
        priority: 'medium',
        status: 'active',
        expectedStartDate: '',
        owner: 'user001',
        source: '官网咨询',
        description: '',
        attachments: [],
      })
      setAttachments([])
      setFormErrors({})
      toast.success(`商机「${opp.name}」已创建`)
    } catch (err) {
      toast.error('创建失败，请重试');
    } finally {
      setCreating(false);
    }
  }

  const filtered = useMemo(() => {
    return opportunities.filter((o) => {
      // 已立项关闭的商机不展示在商机池（转入项目池）
      if (!isInOppPool(o)) return false
      if (keyword) {
        const kw = keyword.toLowerCase()
        const customerName = customersAll.find((c) => c.id === o.customerId)?.name || ''
        if (!o.name.toLowerCase().includes(kw) && !customerName.toLowerCase().includes(kw))
          return false
      }
      if (stageFilter !== 'all' && o.stage !== stageFilter) return false
      if (statusFilter !== 'all') {
        if (statusFilter === 'active' && o.status !== 'active') return false
        if (statusFilter === 'lost' && !(o.stage === 'lost')) return false
        if (statusFilter === 'closed' && o.status !== 'closed') return false
      }
      if (ownerFilter !== 'all' && o.owner !== ownerFilter) return false
      if (priorityFilter !== 'all' && o.priority !== priorityFilter) return false
      return true
    })
  }, [opportunities, keyword, stageFilter, statusFilter, ownerFilter, priorityFilter])

  const getCustomerName = (cid: string) =>
    customersAll.find((c) => c.id === cid)?.name || '-'
  const getOwnerName = (oid: string) => MOCK_USERS.find((u) => u.id === oid)?.name || '-'

  const totalAmount = filtered.reduce((sum, o) => sum + o.amount, 0)
  const activeCount = filtered.filter((o) => o.status === 'active').length
  const proposalCount = filtered.filter((o) => o.stage === 'proposal').length

  const kanbanData = useMemo(() => {
    const map: Record<string, IOpportunity[]> = {}
    OPPORTUNITY_STAGE_ORDER.forEach((s) => {
      map[s] = filtered.filter((o) => o.stage === s)
    })
    return map
  }, [filtered])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const pagedList = filtered.slice((page - 1) * pageSize, page * pageSize)

  const handleAdvanceStage = async (oppId: string) => {
    setAdvancingId(oppId);
    try {
      await opportunityMutations.advanceStage(oppId, '阶段推进');
      toast.success('阶段已推进');
    } catch (err) {
      toast.error('推进失败，请重试');
    } finally {
      setAdvancingId(null);
    }
  }

  const handleQuickProject = async (oppId: string) => {
    const opp = opportunities.find((o) => o.id === oppId)
    if (!opp) return
    // 快速立项：调用立项API
    const result = await initiateProject(oppId, {
      projectName: `${opp.name}项目`,
      projectNo: `P${Date.now()}`,
      owner: opp.owner,
      startDate: formatDate(),
      expectedDeliveryDate: opp.expectedStartDate || formatDate(),
      budget: opp.amount,
      description: opp.description || '',
      procurementMethod: '直接采购',
    });
    if (result) {
      toast.success(`商机「${opp.name}」已立项，转入项目池`)
      navigate('/projects')
    } else {
      toast.error('立项失败，请重试');
    }
  }

  const handleDelete = async (oppId: string) => {
    setDeleting(true);
    try {
      await opportunityMutations.remove(oppId);
      setDeleteId(null)
      toast.success('商机已删除')
    } catch (err) {
      toast.error('删除失败，请重试');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border border-border/40">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1.5">
                <p className="text-sm text-muted-foreground">商机总数</p>
                <p className="text-2xl font-bold tracking-tight">{filtered.length}</p>
                <div className="flex items-center gap-1 text-xs">
                  <ArrowUpRight className="size-3 text-success" />
                  <span className="text-success">+12%</span>
                  <span className="text-muted-foreground">较上月</span>
                </div>
              </div>
              <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Briefcase className="size-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/40">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1.5">
                <p className="text-sm text-muted-foreground">跟进中</p>
                <p className="text-2xl font-bold tracking-tight">{activeCount}</p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="size-3" />
                  <span>活跃商机</span>
                </div>
              </div>
              <div className="size-10 rounded-lg bg-sky-100 flex items-center justify-center">
                <TrendingUp className="size-5 text-sky-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/40">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1.5">
                <p className="text-sm text-muted-foreground">待报价</p>
                <p className="text-2xl font-bold tracking-tight">{proposalCount}</p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Layers className="size-3" />
                  <span>方案阶段</span>
                </div>
              </div>
              <div className="size-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <DollarSign className="size-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/40">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1.5">
                <p className="text-sm text-muted-foreground">预计金额</p>
                <p className="text-2xl font-bold tracking-tight">
                  ¥{(totalAmount / 10000).toFixed(1)}万
                </p>
                <div className="flex items-center gap-1 text-xs">
                  <ArrowUpRight className="size-3 text-success" />
                  <span className="text-success">+8.5%</span>
                  <span className="text-muted-foreground">较上月</span>
                </div>
              </div>
              <div className="size-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <DollarSign className="size-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 工具栏 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">商机池</h1>
          <p className="text-sm text-muted-foreground mt-1">
            共 {filtered.length} 个商机，总金额 ¥{totalAmount.toLocaleString()}
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
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4 mr-1.5" />
                新增商机
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col p-0">
              <div className="px-6 pt-6">
                <DialogHeader>
                  <DialogTitle>新增商机</DialogTitle>
                </DialogHeader>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">
                    商机名称 <span className="text-destructive">*</span>
                  </label>
                  <Input
                    value={newOpp.name}
                    onChange={(e) => setNewOpp({ ...newOpp, name: e.target.value })}
                    placeholder="请输入商机名称"
                  />
                  {formErrors.name && (
                    <p className="text-xs text-destructive">{formErrors.name}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">
                    关联客户 <span className="text-destructive">*</span>
                  </label>
                  <Select
                    value={newOpp.customerId}
                    onValueChange={(v) => setNewOpp({ ...newOpp, customerId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="请选择客户" />
                    </SelectTrigger>
                    <SelectContent>
                      {customersAll.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formErrors.customerId && (
                    <p className="text-xs text-destructive">{formErrors.customerId}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">
                      预计金额（元）<span className="text-destructive">*</span>
                    </label>
                    <Input
                      type="number"
                      value={newOpp.amount}
                      onChange={(e) => setNewOpp({ ...newOpp, amount: e.target.value })}
                      placeholder="0"
                    />
                    {formErrors.amount && (
                      <p className="text-xs text-destructive">{formErrors.amount}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">预计立项时间</label>
                    <Input
                      type="date"
                      value={newOpp.expectedStartDate}
                      onChange={(e) =>
                        setNewOpp({ ...newOpp, expectedStartDate: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">当前阶段</label>
                    <Select
                      value={newOpp.stage}
                      onValueChange={(v) =>
                        setNewOpp({ ...newOpp, stage: v as IOpportunity['stage'] })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {OPPORTUNITY_STAGE_ORDER.map((s) => (
                          <SelectItem key={s} value={s}>
                            {OPPORTUNITY_STAGE_LABELS[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">优先级</label>
                    <Select
                      value={newOpp.priority}
                      onValueChange={(v) =>
                        setNewOpp({ ...newOpp, priority: v as IOpportunity['priority'] })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">高</SelectItem>
                        <SelectItem value="medium">中</SelectItem>
                        <SelectItem value="low">低</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">商机来源</label>
                    <Select
                      value={newOpp.source}
                      onValueChange={(v) => setNewOpp({ ...newOpp, source: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SOURCE_OPTIONS.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">负责人</label>
                    <Select
                      value={newOpp.owner}
                      onValueChange={(v) => setNewOpp({ ...newOpp, owner: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MOCK_USERS.filter((u) => u.status === 'active').map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">需求描述</label>
                  <textarea
                    value={newOpp.description}
                    onChange={(e) => setNewOpp({ ...newOpp, description: e.target.value })}
                    placeholder="请输入商机描述"
                    className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">附件</label>
                  <FileUploader files={attachments} onChange={setAttachments} />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-border/40 shrink-0">
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    取消
                  </Button>
                  <Button onClick={handleCreate} disabled={creating}>{creating ? '创建中...' : '创建商机'}</Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>
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
                onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
                placeholder="搜索商机名称 / 客户"
                className="bg-background pl-9"
              />
            </div>
            <Select value={stageFilter} onValueChange={(v) => { setStageFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="全部阶段" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部阶段</SelectItem>
                {OPPORTUNITY_STAGE_ORDER.map((s) => (
                  <SelectItem key={s} value={s}>
                    {OPPORTUNITY_STAGE_LABELS[s]}
                  </SelectItem>
                ))}
                {TERMINAL_STAGES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {OPPORTUNITY_STAGE_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="全部状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="active">跟进中</SelectItem>
                <SelectItem value="lost">已输单</SelectItem>
                <SelectItem value="closed">已关闭</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={(v) => { setPriorityFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="全部优先级" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部优先级</SelectItem>
                <SelectItem value="high">高</SelectItem>
                <SelectItem value="medium">中</SelectItem>
                <SelectItem value="low">低</SelectItem>
              </SelectContent>
            </Select>
            <Select value={ownerFilter} onValueChange={(v) => { setOwnerFilter(v); setPage(1); }}>
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
            {OPPORTUNITY_STAGE_ORDER.map((stageKey) => {
              const stageOpps = kanbanData[stageKey] || []
              const stageAmount = stageOpps.reduce((s, o) => s + o.amount, 0)
              return (
                <div
                  key={stageKey}
                  className="w-[280px] shrink-0 flex flex-col bg-muted/30 rounded-lg"
                >
                  <div className="px-3 py-3 flex items-center justify-between border-b border-border/30">
                    <div className="flex items-center gap-2">
                      <div
                        className={`size-2 rounded-full ${stageColorMap[stageKey].split(' ')[0]}`}
                      />
                      <span className="text-sm font-medium">
                        {OPPORTUNITY_STAGE_LABELS[stageKey]}
                      </span>
                      <Badge variant="secondary" className="text-xs h-5 px-1.5">
                        {stageOpps.length}
                      </Badge>
                    </div>
                  </div>
                  <div className="p-2 space-y-2 flex-1">
                    {stageOpps.map((opp) => {
                        const isPaused = opp.status === 'paused'
                        const isClosed = opp.status === 'closed'
                        const isLost = opp.stage === 'lost'
                        const isWon = opp.stage === 'won'
                        return (
                          <Card
                            key={opp.id}
                            className={`cursor-pointer hover:shadow-md transition-shadow border-border/40 ${isPaused ? 'border-warning/60 bg-warning/5' : ''}`}
                            onClick={() => navigate(`/opportunities/${opp.id}`)}
                          >
                            <CardContent className="p-3 space-y-2.5">
                              <div className="flex items-start justify-between gap-2 min-w-0">
                                <span className="font-medium text-sm truncate flex-1">
                                  {opp.name}
                                </span>
                                <Badge
                                  variant="outline"
                                  className={`shrink-0 text-[10px] h-5 px-1.5 ${priorityColorMap[opp.priority]}`}
                                >
                                  {PRIORITY_LABELS[opp.priority]}
                                </Badge>
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {getCustomerName(opp.customerId)}
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-primary">
                                  ¥{opp.amount.toLocaleString()}
                                </span>
                                <span className="text-muted-foreground">
                                  赢率 {opp.winRate}%
                                </span>
                              </div>
                              {(isPaused || isClosed || isLost || isWon) && (
                                <div className="flex items-center gap-1.5">
                                  {isPaused && (
                                    <Badge variant="outline" className="text-[10px] h-5 border-warning text-warning bg-warning/10">
                                      <Pause className="size-3 mr-1" />
                                      已暂停
                                    </Badge>
                                  )}
                                  {isClosed && (
                                    <Badge variant="secondary" className="text-[10px] h-5">已关闭</Badge>
                                  )}
                                  {isWon && (
                                    <Badge variant="default" className="text-[10px] h-5 bg-success hover:bg-success text-success-foreground">已赢单</Badge>
                                  )}
                                  {isLost && (
                                    <Badge variant="destructive" className="text-[10px] h-5">已输单</Badge>
                                  )}
                                </div>
                              )}
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>{getOwnerName(opp.owner)}</span>
                                <span>{opp.expectedStartDate}</span>
                              </div>
                              <div className="flex gap-1.5 pt-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs flex-1"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    navigate(`/opportunities/${opp.id}`)
                                  }}
                                >
                                  详情
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className={`h-7 text-xs flex-1 ${isPaused || isClosed || isLost || isWon ? 'opacity-50 cursor-not-allowed' : ''}`}
                                  disabled={isPaused || isClosed || isLost || isWon}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (!isPaused && !isClosed && !isLost && !isWon) {
                                      handleAdvanceStage(opp.id)
                                    }
                                  }}
                                >
                                  推进
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    {stageOpps.length === 0 && (
                      <div className="text-center text-xs text-muted-foreground py-8">
                        暂无商机
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
                      商机名称
                    </th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">
                      关联客户
                    </th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">
                      阶段
                    </th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">
                      状态
                    </th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">
                      优先级
                    </th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">
                      负责人
                    </th>
                    <th className="text-right font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">
                      预计金额
                    </th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">
                      预计立项时间
                    </th>
                    <th className="text-right font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pagedList.map((opp) => (
                    <tr
                      key={opp.id}
                      className={`border-b border-border/30 hover:bg-muted/20 transition-colors ${opp.status === 'paused' ? 'opacity-60' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <button
                          onClick={() => navigate(`/opportunities/${opp.id}`)}
                          className="font-medium text-foreground hover:text-primary text-left inline-flex items-center gap-1.5"
                        >
                          {opp.name}
                          {opp.status === 'paused' && (
                            <span className="inline-flex items-center text-[10px] text-muted-foreground">
                              <Pause className="size-3" />
                            </span>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {getCustomerName(opp.customerId)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={`text-xs ${stageColorMap[opp.stage]} border-0`}
                        >
                          {OPPORTUNITY_STAGE_LABELS[opp.stage]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {opp.stage === 'lost' ? (
                          <Badge variant="destructive" className="text-xs">输单</Badge>
                        ) : opp.status === 'closed' ? (
                          <Badge variant="secondary" className="text-xs">已关闭</Badge>
                        ) : opp.status === 'paused' ? (
                          <Badge variant="outline" className="text-xs">已暂停</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/20">
                            跟进中
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={`text-xs ${priorityColorMap[opp.priority]}`}
                        >
                          {PRIORITY_LABELS[opp.priority]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {getOwnerName(opp.owner)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums">
                        ¥{opp.amount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {opp.expectedStartDate}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={() => navigate(`/opportunities/${opp.id}`)}
                          >
                            详情
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            onClick={() => handleQuickProject(opp.id)}
                          >
                            立项
                          </Button>
                          <AlertDialog open={deleteId === opp.id} onOpenChange={(open) => !open && setDeleteId(null)}>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs text-destructive hover:text-destructive"
                              >
                                删除
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>确认删除商机</AlertDialogTitle>
                                <AlertDialogDescription>
                                  确定要删除商机「{opp.name}」吗？删除后将无法恢复。
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>取消</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                                  onClick={() => handleDelete(opp.id)}
                                >
                                  确认删除
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {pagedList.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                        暂无商机数据
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

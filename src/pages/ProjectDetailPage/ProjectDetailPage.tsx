import { useState, useMemo, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft,
  DollarSign,
  Calendar,
  User,
  Building,
  TrendingUp,
  CheckCircle2,
  Plus,
  Edit,
  Paperclip,
  FolderKanban,
  FileText,
  MessageSquare,
  Phone,
  Mail,
  Users,
  Handshake,
  Clock,
  Briefcase,
  GripHorizontal,
  CheckSquare,
  CreditCard,
  Calculator,
  Link as LinkIcon,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDate, formatDateTime } from '@/lib/utils'
import AttachmentList from '@/components/FileUpload/AttachmentList';
import FileUploader, { type UploadedFile } from '@/components/FileUpload/FileUploader';
import {
  type IProject,
  type IMilestoneItem,
  PROJECT_STAGE_LABELS,
  PROJECT_STAGE_ORDER,
  PRIORITY_LABELS,
  PROCUREMENT_METHODS,
} from '@/data/projects'
import { MOCK_USERS, MOCK_CURRENT_USER } from '@/data/users'
import { MOCK_CONTRACTS } from '@/data/contracts'
import { MOCK_FOLLOWUPS, type IFollowUp } from '@/data/followups'
import { QUOTATION_STATUS } from '@/data/quotations'
import { useProjects, useFollowups, useQuotations, useCustomers, useOpportunities, projectMutations, followupMutations } from '@/hooks/use-crm-store'
import { attachmentApi } from '@/services/api'
import type { IAttachment } from '@/data/projects'
import { Textarea } from '@/components/ui/textarea'

const stageColorMap: Record<string, string> = {
  initiated: 'bg-sky-500',
  procurement: 'bg-blue-500',
  contract: 'bg-indigo-500',
  execution: 'bg-amber-500',
  acceptance: 'bg-emerald-500',
  closed: 'bg-slate-500',
}

const priorityColorMap: Record<string, string> = {
  high: 'bg-rose-100 text-rose-700 border-rose-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  low: 'bg-slate-100 text-slate-600 border-slate-200',
}

const typeMap: Record<string, { label: string; icon: typeof Phone; color: string }> = {
  visit: { label: '拜访', icon: Handshake, color: 'bg-blue-500 text-blue-50' },
  call: { label: '电话', icon: Phone, color: 'bg-emerald-500 text-emerald-50' },
  email: { label: '邮件', icon: Mail, color: 'bg-amber-500 text-amber-50' },
  wechat: { label: '微信', icon: MessageSquare, color: 'bg-green-500 text-green-50' },
  meeting: { label: '会议', icon: Users, color: 'bg-purple-500 text-purple-50' },
  other: { label: '其他', icon: MessageSquare, color: 'bg-slate-500 text-slate-50' },
}

const milestoneStatusMap: Record<string, { label: string; color: string }> = {
  pending: { label: '待开始', color: 'bg-slate-100 text-slate-600' },
  'in-progress': { label: '进行中', color: 'bg-amber-100 text-amber-700' },
  completed: { label: '已完成', color: 'bg-emerald-100 text-emerald-700' },
  delayed: { label: '已延期', color: 'bg-rose-100 text-rose-700' },
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [projectsAll] = useProjects()
  const [followupsAll] = useFollowups()
  const [customersAll] = useCustomers()
  const [oppsAll] = useOpportunities()
  const [advancing, setAdvancing] = useState(false)
  const [followupSaving, setFollowupSaving] = useState(false)
  const [editSaving, setEditSaving] = useState(false)
  const [quotations] = useQuotations()
  const project = useMemo(() => projectsAll.find((p) => p.id === id), [projectsAll, id])
  const [activeTab, setActiveTab] = useState<
    'basic' | 'contract' | 'payment' | 'progress' | 'followups' | 'quotations' | 'attachments'
  >('basic')
  const [advanceOpen, setAdvanceOpen] = useState(false)
  const [advanceRemark, setAdvanceRemark] = useState('')
  const [followupOpen, setFollowupOpen] = useState(false)
  const [editingFollowup, setEditingFollowup] = useState<IFollowUp | null>(null)
  const [followupForm, setFollowupForm] = useState({
    type: 'call' as IFollowUp['type'],
    customType: '',
    content: '',
    result: '',
    nextFollowUpDate: '',
  })
  const [followupFiles, setFollowupFiles] = useState<UploadedFile[]>([])
  const [deleteFollowupId, setDeleteFollowupId] = useState<string | null>(null)
  const [expandedFollowup, setExpandedFollowup] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    projectNo: '',
    customerId: '',
    amount: '',
    stage: 'initiated' as IProject['stage'],
    status: 'active' as IProject['status'],
    priority: 'medium' as IProject['priority'],
    startDate: '',
    expectedDeliveryDate: '',
    owner: '',
    procurementMethod: '',
    description: '',
  })
  const [editAttachments, setEditAttachments] = useState<UploadedFile[]>([])
  const [projAttachments, setProjAttachments] = useState<IAttachment[]>([])
  const [attachmentsLoading, setAttachmentsLoading] = useState(false)

  // 加载附件列表
  const loadAttachments = async () => {
    if (!id) return
    setAttachmentsLoading(true)
    try {
      const data = await attachmentApi.list('project', id) as unknown as IAttachment[]
      setProjAttachments(data || [])
    } catch {
      setProjAttachments([])
    } finally {
      setAttachmentsLoading(false)
    }
  }

  useEffect(() => {
    if (id && activeTab === 'attachments') {
      loadAttachments()
    }
  }, [id, activeTab])

  if (!project) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="size-4 mr-2" />
          返回
        </Button>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            项目不存在
          </CardContent>
        </Card>
      </div>
    )
  }

  const customer = customersAll.find((c) => c.id === project.customerId)
  const owner = MOCK_USERS.find((u) => u.id === project.owner)
  const contract = MOCK_CONTRACTS.find((c) => c.id === project.contractId)
  const sourceOpportunity = oppsAll.find((o) => o.id === project.opportunityId)
  const currentStageIndex = PROJECT_STAGE_ORDER.indexOf(project.stage)
  const isLastStage = currentStageIndex >= PROJECT_STAGE_ORDER.length - 1

  const totalPaid = contract
    ? contract.paymentPlan.filter((p) => p.status === 'paid').reduce((s, p) => s + p.amount, 0)
    : 0
  const paymentProgress = contract && contract.amount > 0 ? (totalPaid / contract.amount) * 100 : 0

  const completedMilestones = project?.milestones?.filter((m) => m.status === 'completed').length || 0
  const totalMilestones = project?.milestones?.length || 0
  const milestoneProgress = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0

  const handleAdvance = () => {
    setAdvanceRemark('')
    setAdvanceOpen(true)
  }

  const confirmAdvance = async () => {
    if (!project || isLastStage) return
    setAdvancing(true);
    try {
      await projectMutations.advanceStage(project.id, advanceRemark.trim() || '阶段推进');
      const nextStage = PROJECT_STAGE_ORDER[currentStageIndex + 1] as IProject['stage']
      toast.success(`已推进至「${PROJECT_STAGE_LABELS[nextStage]}」`)
      setAdvanceOpen(false)
    } catch (err) {
      toast.error('阶段推进失败，请重试');
    } finally {
      setAdvancing(false);
    }
  }

  const handleAddFollowup = async () => {
    if (!followupForm.content.trim()) {
      toast.error('请填写跟进内容')
      return
    }
    if (!project) return
    const finalType =
      followupForm.type === 'other'
        ? followupForm.customType.trim() || '其他'
        : followupForm.type
    setFollowupSaving(true);
    try {
      // 先上传附件
      const uploadedAtts: IAttachment[] = [];
      for (const f of followupFiles) {
        if (f.file) {
          try {
            const res = await attachmentApi.upload('followup', 'pending', f.file) as Record<string, unknown>;
            uploadedAtts.push({
              id: String(res.id || `att-${Date.now()}`),
              name: String(res.name || f.name),
              size: Number(res.size || f.size || 0),
              type: String(res.type || f.type || 'other'),
              category: String(res.category || 'other'),
              uploader: String(res.uploader || MOCK_CURRENT_USER.id),
              uploadedAt: String(res.uploadedAt || new Date().toISOString()),
              url: typeof res.url === 'string' ? res.url : undefined,
            });
          } catch {
            // 上传失败不阻断
          }
        } else if (f.url) {
          uploadedAtts.push({
            id: f.id,
            name: f.name,
            size: f.size,
            type: f.type,
            category: 'other',
            uploader: MOCK_CURRENT_USER.id,
            uploadedAt: new Date().toISOString(),
            url: f.url,
          });
        }
      }
      await followupMutations.create({
        customerId: project.customerId,
        opportunityId: project.opportunityId || undefined,
        projectId: project.id,
        type: finalType,
        content: followupForm.content,
        result: followupForm.result,
        nextFollowUpDate: followupForm.nextFollowUpDate || undefined,
        attachments: uploadedAtts,
      });
      toast.success('跟进记录已添加')
      setFollowupOpen(false)
      setFollowupForm({ type: 'call', customType: '', content: '', result: '', nextFollowUpDate: '' })
      setFollowupFiles([])
    } catch (err) {
      toast.error('保存失败，请重试');
    } finally {
      setFollowupSaving(false);
    }
  }

  const openEditFollowup = (f: IFollowUp) => {
    setEditingFollowup(f)
    setFollowupForm({
      type: (typeMap[f.type] ? f.type : 'other') as IFollowUp['type'],
      customType: typeMap[f.type] ? '' : f.type,
      content: f.content,
      result: f.result || '',
      nextFollowUpDate: f.nextFollowUpDate || '',
    })
    // 把已有附件转成 UploadedFile 格式供编辑
    const existingFiles: UploadedFile[] = (f.attachments || []).map((a) => ({
      id: a.id,
      name: a.name,
      size: a.size || 0,
      type: a.type || 'other',
      url: a.url,
      file: undefined,
      status: 'done' as const,
      progress: 100,
    }))
    setFollowupFiles(existingFiles)
    setFollowupOpen(true)
  }

  const handleUpdateFollowup = async () => {
    if (!followupForm.content.trim() || !editingFollowup) {
      toast.error('请填写跟进内容')
      return
    }
    const finalType =
      followupForm.type === 'other'
        ? followupForm.customType.trim() || '其他'
        : followupForm.type
    setFollowupSaving(true);
    try {
      // 新上传的附件走上传接口，已有附件保留
      const uploadedAtts: IAttachment[] = [];
      for (const f of followupFiles) {
        if (f.file) {
          try {
            const res = await attachmentApi.upload('followup', editingFollowup.id, f.file) as Record<string, unknown>;
            uploadedAtts.push({
              id: String(res.id || `att-${Date.now()}`),
              name: String(res.name || f.name),
              size: Number(res.size || f.size || 0),
              type: String(res.type || f.type || 'other'),
              category: String(res.category || 'other'),
              uploader: String(res.uploader || MOCK_CURRENT_USER.id),
              uploadedAt: String(res.uploadedAt || new Date().toISOString()),
              url: typeof res.url === 'string' ? res.url : undefined,
            });
          } catch {
            // 上传失败不阻断
          }
        } else if (f.url) {
          uploadedAtts.push({
            id: f.id,
            name: f.name,
            size: f.size,
            type: f.type,
            category: 'other',
            uploader: MOCK_CURRENT_USER.id,
            uploadedAt: new Date().toISOString(),
            url: f.url,
          });
        }
      }
      await followupMutations.update(editingFollowup.id, {
        type: finalType,
        content: followupForm.content,
        result: followupForm.result,
        nextFollowUpDate: followupForm.nextFollowUpDate || undefined,
        attachments: uploadedAtts,
      });
      toast.success('跟进记录已更新')
      setFollowupOpen(false)
      setEditingFollowup(null)
      setFollowupForm({ type: 'call', customType: '', content: '', result: '', nextFollowUpDate: '' })
      setFollowupFiles([])
    } catch (err) {
      toast.error('更新失败，请重试');
    } finally {
      setFollowupSaving(false);
    }
  }

  const handleDeleteFollowup = async () => {
    if (!deleteFollowupId) return
    try {
      await followupMutations.remove(deleteFollowupId)
      toast.success('跟进记录已删除')
      setDeleteFollowupId(null)
    } catch {
      toast.error('删除失败，请重试')
    }
  }

  const openEditDialog = () => {
    if (!project) return
    setEditForm({
      name: project.name,
      projectNo: project.projectNo,
      customerId: project.customerId,
      amount: String(project.amount),
      stage: project.stage,
      status: project.status,
      priority: project.priority,
      startDate: project.startDate,
      expectedDeliveryDate: project.expectedDeliveryDate,
      owner: project.owner,
      procurementMethod: project.procurementMethod,
      description: project.description,
    })
    setEditAttachments(
      project.attachments.map((a) => ({
        id: a.id,
        name: a.name,
        size: a.size,
        type: a.type,
        url: a.url,
      })),
    )
    setEditOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editForm.name.trim()) {
      toast.error('请填写项目名称')
      return
    }
    const amountNum = parseFloat(editForm.amount)
    if (isNaN(amountNum) || amountNum < 0) {
      toast.error('请填写有效金额')
      return
    }
    if (!project) return
    setEditSaving(true);
    try {
      await projectMutations.update(project.id, {
        name: editForm.name.trim(),
        projectNo: editForm.projectNo,
        customerId: editForm.customerId,
        amount: amountNum,
        stage: editForm.stage,
        status: editForm.status,
        priority: editForm.priority,
        startDate: editForm.startDate,
        expectedDeliveryDate: editForm.expectedDeliveryDate,
        owner: editForm.owner,
        procurementMethod: editForm.procurementMethod,
        description: editForm.description,
      });
      toast.success('项目信息已更新')
      setEditOpen(false)
    } catch (err) {
      toast.error('保存失败，请重试');
    } finally {
      setEditSaving(false);
    }
  }

  const handleAddContract = () => {
    toast.info('新增合同功能演示')
  }

  const handleAddPayment = () => {
    toast.info('登记回款功能演示')
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
        <ArrowLeft className="size-4 mr-1.5" />
        返回项目池
      </Button>

      {/* 顶部标题卡 */}
      <Card className="border border-border/40">
        <CardContent className="p-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
                <Badge variant="outline" className="text-xs font-mono">
                  {project.projectNo}
                </Badge>
                <Badge
                  variant="outline"
                  className={`text-xs ${stageColorMap[project.stage]} text-white border-0`}
                >
                  {PROJECT_STAGE_LABELS[project.stage]}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1.5">
                  <Building className="size-4" />
                  {customer?.name || '-'}
                </span>
                <span className="flex items-center gap-1.5">
                  <User className="size-4" />
                  {owner?.name || '-'}
                </span>
                <span className="flex items-center gap-1.5">
                  <DollarSign className="size-4" />
                  ¥{project.amount.toLocaleString()}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="size-4" />
                  {project.startDate} 立项
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={openEditDialog}>
                <Edit className="size-3.5 mr-1" />
                编辑
              </Button>
              <Button variant="outline" size="sm" onClick={() => setFollowupOpen(true)}>
                <Plus className="size-3.5 mr-1" />
                记录跟进
              </Button>
              {!isLastStage && (
                <Button size="sm" onClick={handleAdvance}>
                  <TrendingUp className="size-3.5 mr-1" />
                  阶段推进
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 阶段进度 */}
      <Card className="border border-border/40">
        <CardHeader>
          <CardTitle className="text-base">项目进度</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <div className="absolute top-5 left-6 right-6 h-0.5 bg-border -z-10" />
            <div className="flex justify-between">
              {PROJECT_STAGE_ORDER.map((s, idx) => {
                const done = idx < currentStageIndex
                const current = idx === currentStageIndex
                return (
                  <div
                    key={s}
                    className="flex flex-col items-center text-center px-2 flex-1"
                  >
                    <div
                      className={`size-10 rounded-full flex items-center justify-center text-xs font-medium z-10 ${
                        done
                          ? 'bg-emerald-500 text-white'
                          : current
                            ? 'bg-primary text-white ring-4 ring-primary/20'
                            : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {done ? <CheckCircle2 className="size-5" /> : idx + 1}
                    </div>
                    <div className="mt-2 text-xs font-medium">
                      {PROJECT_STAGE_LABELS[s]}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tab 导航 */}
      <div className="flex items-center gap-1 border-b border-border/40 -mx-1">
        {[
          { key: 'basic', label: '基本信息', icon: FolderKanban },
          { key: 'contract', label: '合同信息', icon: FileText },
          { key: 'payment', label: '回款计划', icon: CreditCard },
          { key: 'progress', label: '实施进度', icon: CheckSquare },
          { key: 'followups', label: '跟进记录', icon: MessageSquare },
          { key: 'quotations', label: '报价管理', icon: Calculator },
          { key: 'attachments', label: '附件', icon: Paperclip },
        ].map((tab) => {
          const Icon = tab.icon
          const active = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                active
                  ? 'text-primary border-primary'
                  : 'text-muted-foreground border-transparent hover:text-foreground'
              }`}
            >
              <Icon className="size-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* 基本信息 Tab */}
      {activeTab === 'basic' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="border border-border/40 lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">项目基本信息</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-y-4 gap-x-8">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">项目编号</span>
                <span className="font-medium font-mono">{project.projectNo}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">项目名称</span>
                <span className="font-medium">{project.name}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">关联客户</span>
                <span className="font-medium">{customer?.name || '-'}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">来源商机</span>
                {sourceOpportunity ? (
                  <button
                    onClick={() => navigate(`/opportunities/${project.opportunityId}`)}
                    className="text-primary hover:underline text-sm"
                  >
                    {sourceOpportunity.name}
                  </button>
                ) : (
                  <span className="font-medium">-</span>
                )}
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">合同金额</span>
                <span className="font-semibold text-primary">
                  ¥{project.amount.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">优先级</span>
                <Badge
                  variant="outline"
                  className={`text-xs ${priorityColorMap[project.priority]}`}
                >
                  {PRIORITY_LABELS[project.priority]}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">项目负责人</span>
                <span className="font-medium">{owner?.name || '-'}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">采购方式</span>
                <span className="font-medium">{project.procurementMethod}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">立项时间</span>
                <span className="font-medium">{project.startDate}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">预计交付</span>
                <span className="font-medium">{project.expectedDeliveryDate}</span>
              </div>
              <div className="col-span-2 pt-2 border-t border-border/40">
                <p className="text-sm text-muted-foreground mb-1.5">项目描述</p>
                <p className="text-sm leading-relaxed">{project.description}</p>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border border-border/40">
              <CardHeader>
                <CardTitle className="text-base">项目成员</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {project.teamMembers.map((m, idx) => {
                  const user = MOCK_USERS.find((u) => u.id === m.userId)
                  return (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium">
                        {user?.name.slice(0, 1) || m.userId.slice(-1)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{user?.name || m.userId}</div>
                        <div className="text-xs text-muted-foreground">{m.role}</div>
                      </div>
                    </div>
                  )
                })}
                <Button variant="outline" size="sm" className="w-full">
                  <Plus className="size-3.5 mr-1" />
                  添加成员
                </Button>
              </CardContent>
            </Card>

            <Card className="border border-border/40">
              <CardHeader>
                <CardTitle className="text-base">关键指标</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="text-muted-foreground">回款进度</span>
                    <span className="font-medium">{paymentProgress.toFixed(1)}%</span>
                  </div>
                  <Progress value={paymentProgress} className="h-2" />
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="text-muted-foreground">里程碑进度</span>
                    <span className="font-medium">
                      {completedMilestones}/{totalMilestones}
                    </span>
                  </div>
                  <Progress value={milestoneProgress} className="h-2" />
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">已回款金额</span>
                    <span className="font-semibold text-emerald-600">
                      ¥{totalPaid.toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* 合同信息 Tab */}
      {activeTab === 'contract' && contract && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">关联合同</h2>
            <Button size="sm" onClick={handleAddContract}>
              <Plus className="size-3.5 mr-1" />
              新增合同
            </Button>
          </div>
          {contract ? (
            <Card className="border border-border/40">
              <CardContent className="p-5">
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <FileText className="size-5 text-primary" />
                      <span className="font-semibold text-lg">{contract.contractNo}</span>
                      <Badge variant="outline" className="text-xs">
                        {contract.status === 'pending'
                          ? '待生效'
                          : contract.status === 'active'
                            ? '执行中'
                            : contract.status === 'completed'
                              ? '已完成'
                              : '已作废'}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      签约日期：{contract.signDate}
                    </div>
                  </div>
                  <div className="text-right">
                <div className="text-2xl font-bold text-primary">
                      ¥{contract?.amount?.toLocaleString() || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">合同金额</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5 pt-5 border-t border-border/40">
                  <div className="text-sm">
                    <p className="text-muted-foreground mb-1">生效日期</p>
                    <p className="font-medium">{contract.effectiveDate}</p>
                  </div>
                  <div className="text-sm">
                    <p className="text-muted-foreground mb-1">付款期数</p>
                    <p className="font-medium">{contract.paymentPlan.length} 期</p>
                  </div>
                  <div className="text-sm">
                    <p className="text-muted-foreground mb-1">合同负责人</p>
                    <p className="font-medium">
                      {MOCK_USERS.find((u) => u.id === contract.owner)?.name || '-'}
                    </p>
                  </div>
                  <div className="text-sm">
                    <p className="text-muted-foreground mb-1">回款进度</p>
                    <p className="font-medium text-emerald-600">
                      {paymentProgress.toFixed(1)}%
                    </p>
                  </div>
                </div>
                {contract.remark && (
                  <div className="mt-4 pt-4 border-t border-border/40">
                    <p className="text-sm text-muted-foreground mb-1">备注</p>
                    <p className="text-sm">{contract.remark}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="border border-border/40">
              <CardContent className="py-12 text-center text-muted-foreground">
                暂无关联合同，点击右上角新增合同
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* 回款计划 Tab */}
      {activeTab === 'payment' && contract && (
        <Card className="border border-border/40">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">回款计划</CardTitle>
            <Button size="sm" onClick={handleAddPayment}>
              <Plus className="size-3.5 mr-1" />
              登记回款
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="w-full overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/40 bg-muted/30">
                    <th className="text-left font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">
                      期数
                    </th>
                    <th className="text-right font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">
                      金额
                    </th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">
                      计划回款日期
                    </th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">
                      实际回款日期
                    </th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">
                      状态
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {contract.paymentPlan.map((p) => (
                    <tr key={p.id} className="border-b border-border/30">
                      <td className="px-4 py-3 font-medium">第 {p.period} 期</td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums">
                        ¥{p.amount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{p.plannedDate}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.actualDate || '-'}</td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            p.status === 'paid'
                              ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                              : p.status === 'overdue'
                                ? 'bg-rose-100 text-rose-700 border-rose-200'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {p.status === 'paid'
                            ? '已回款'
                            : p.status === 'overdue'
                              ? '已逾期'
                              : '待回款'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-t border-border/40">
              <span className="text-sm text-muted-foreground">
                合同总金额：¥{contract.amount.toLocaleString()}
              </span>
              <span className="text-sm">
                已回款：
                <span className="font-semibold text-emerald-600">
                  ¥{totalPaid.toLocaleString()}
                </span>
                <span className="text-muted-foreground ml-2">
                  ({paymentProgress.toFixed(1)}%)
                </span>
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'payment' && !contract && (
        <Card className="border border-border/40">
          <CardContent className="py-12 text-center text-muted-foreground">
            暂无合同信息
          </CardContent>
        </Card>
      )}

      {/* 实施进度 Tab */}
      {activeTab === 'progress' && (
        <Card className="border border-border/40">
          <CardHeader>
            <CardTitle className="text-base">里程碑进度</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {project.milestones.map((m: IMilestoneItem, idx: number) => {
                const statusInfo = milestoneStatusMap[m.status]
                const isLast = idx === project.milestones.length - 1
                return (
                  <div key={m.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className={`size-8 rounded-full flex items-center justify-center text-xs font-medium z-10 ${
                          m.status === 'completed'
                            ? 'bg-emerald-500 text-white'
                            : m.status === 'in-progress'
                              ? 'bg-amber-500 text-white ring-4 ring-amber-100'
                              : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {m.status === 'completed' ? (
                          <CheckCircle2 className="size-4" />
                        ) : (
                          idx + 1
                        )}
                      </div>
                      {!isLast && <div className="w-px flex-1 bg-border mt-1" />}
                    </div>
                    <div className="flex-1 pb-5">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{m.name}</span>
                          <Badge variant="outline" className={`text-xs ${statusInfo.color}`}>
                            {statusInfo.label}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Calendar className="size-3" />
                            计划：{m.plannedDate}
                          </span>
                          {m.actualDate && (
                            <span className="flex items-center gap-1 text-emerald-600">
                              <CheckCircle2 className="size-3" />
                              实际：{m.actualDate}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 跟进记录 Tab */}
      {activeTab === 'followups' && (
        <Card className="border border-border/40">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">跟进记录</CardTitle>
            <Button size="sm" onClick={() => setFollowupOpen(true)}>
              <Plus className="size-3.5 mr-1" />
              新增跟进
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {project.stageHistory.map((h, idx) => (
                <div key={'h' + idx} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="size-2 rounded-full bg-primary mt-1.5" />
                    {idx < project.stageHistory.length - 1 && (
                      <div className="w-px flex-1 bg-border mt-1" />
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20">
                        阶段推进
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {h.date} · {PROJECT_STAGE_LABELS[h.stage] || h.stage}
                      </span>
                    </div>
                    <p className="text-sm">{h.remark}</p>
                  </div>
                </div>
              ))}
              {followupsAll.filter(
                (f) => f.projectId === project.id,
              ).map((f) => {
                const TypeIcon = typeMap[f.type]?.icon || MessageSquare
                const creator = MOCK_USERS.find((u) => u.id === f.creator)
                return (
                  <div key={f.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className={`size-8 rounded-full flex items-center justify-center ${typeMap[f.type]?.color ?? 'bg-slate-500 text-slate-50'}`}
                      >
                        <TypeIcon className="size-4" />
                      </div>
                    </div>
                     <div className="flex-1 pb-4">
                       <div className="flex items-center justify-between gap-2 mb-1">
                         <div className="flex items-center gap-2 min-w-0">
                           <span className="text-sm font-medium">
                              {typeMap[f.type]?.label ?? f.type}跟进
                           </span>
                           <span className="text-xs text-muted-foreground">
                             {f.createdAt} · {creator?.name || f.creator}
                           </span>
                         </div>
                         <div className="flex items-center gap-1 shrink-0">
                           <Button
                             variant="ghost"
                             size="icon"
                             className="h-7 w-7"
                             onClick={() => openEditFollowup(f)}
                           >
                             <Edit className="size-3.5" />
                           </Button>
                           <AlertDialog
                             open={deleteFollowupId === f.id}
                             onOpenChange={(open) => {
                               if (!open) setDeleteFollowupId(null)
                             }}
                           >
                             <AlertDialogTrigger asChild>
                               <Button
                                 variant="ghost"
                                 size="icon"
                                 className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                 onClick={(e) => {
                                   e.stopPropagation()
                                   setDeleteFollowupId(f.id)
                                 }}
                               >
                                 <Trash2 className="size-3.5" />
                               </Button>
                             </AlertDialogTrigger>
                             <AlertDialogContent>
                               <AlertDialogTitle>确认删除</AlertDialogTitle>
                               <AlertDialogDescription>
                                 确定要删除这条跟进记录吗？删除后无法恢复。
                               </AlertDialogDescription>
                               <AlertDialogFooter>
                                 <AlertDialogCancel>取消</AlertDialogCancel>
                                 <AlertDialogAction
                                   className="bg-destructive hover:bg-destructive/90"
                                   onClick={handleDeleteFollowup}
                                 >
                                   确认删除
                                 </AlertDialogAction>
                               </AlertDialogFooter>
                             </AlertDialogContent>
                           </AlertDialog>
                         </div>
                       </div>
                       <p className="text-sm text-foreground mb-1">{f.content}</p>
                       {f.result && (
                         <p className="text-xs text-muted-foreground">结果：{f.result}</p>
                       )}
                       {f.attachments && f.attachments.length > 0 && (
                         <button
                           onClick={() => setExpandedFollowup(
                             expandedFollowup === f.id ? null : f.id,
                           )}
                           className="flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                         >
                           <Paperclip className="size-3" />
                           <span>{f.attachments.length} 个附件</span>
                         </button>
                       )}
                       {expandedFollowup === f.id && f.attachments && f.attachments.length > 0 && (
                         <div className="mt-2 border border-border/40 rounded-md p-2 bg-muted/20">
                           <AttachmentList
                             attachments={f.attachments}
                             showCategory={false}
                             showUploader={false}
                             compact
                           />
                         </div>
                       )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 报价管理 Tab */}
      {activeTab === 'quotations' && (
        <Card className="border border-border/40">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">关联报价单</CardTitle>
            <Button size="sm" onClick={() => navigate(`/quotations/new?projectId=${id}`)}>
              <Plus className="size-3.5 mr-1" />
              新增报价
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {(() => {
              const relatedQuotations = quotations.filter((q) => q.projectId === id)
              if (relatedQuotations.length === 0) {
                return (
                  <div className="text-center py-12 text-muted-foreground">
                    <Calculator className="size-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">暂无关联报价单</p>
                    <p className="text-xs mt-1">点击右上角「新增报价」创建第一个报价</p>
                  </div>
                )
              }
              return (
                <div className="w-full overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="whitespace-nowrap">报价单号</TableHead>
                        <TableHead className="whitespace-nowrap">报价名称</TableHead>
                        <TableHead className="whitespace-nowrap">状态</TableHead>
                        <TableHead className="whitespace-nowrap">报价日期</TableHead>
                        <TableHead className="whitespace-nowrap">有效期至</TableHead>
                        <TableHead className="whitespace-nowrap text-right">报价金额</TableHead>
                        <TableHead className="whitespace-nowrap text-right">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {relatedQuotations.map((q) => {
                        const statusInfo = QUOTATION_STATUS[q.status]
                        return (
                          <TableRow key={q.id}>
                            <TableCell className="font-medium">
                              <button
                                onClick={() => navigate(`/quotations/${q.id}`)}
                                className="text-primary hover:underline font-mono text-sm"
                              >
                                {q.quotationNo}
                              </button>
                            </TableCell>
                            <TableCell>
                              <span className="block truncate max-w-[220px]">{q.name}</span>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={`text-xs ${statusInfo?.color || ''}`}
                              >
                                {statusInfo?.label || q.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-sm">{q.quotationDate}</TableCell>
                            <TableCell className="whitespace-nowrap text-sm">{q.validUntil}</TableCell>
                            <TableCell className="text-right whitespace-nowrap tabular-nums font-semibold">
                              ¥{q.total.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right whitespace-nowrap">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/quotations/${q.id}`)}
                              >
                                查看详情
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )
            })()}
          </CardContent>
        </Card>
      )}

      {/* 附件 Tab */}
      {activeTab === 'attachments' && (
        <Card className="border border-border/40">
          <CardHeader>
            <CardTitle className="text-base">附件列表</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">上传附件</p>
              <FileUploader
                files={[]}
                onChange={async (newFiles) => {
                  if (!id || newFiles.length === 0) return
                  for (const f of newFiles) {
                    if (!f.file) continue
                    try {
                      const result = await attachmentApi.upload('project', id, f.file) as unknown as IAttachment
                      setProjAttachments((prev) => [result, ...prev])
                    } catch (err) {
                      toast.error(`上传「${f.name}」失败`)
                    }
                  }
                }}
                maxCount={10}
                maxSize={100 * 1024 * 1024}
                label=""
                hint="支持图片、文档、表格、PPT、压缩包等格式，单文件最大 100MB"
              />
            </div>
            {attachmentsLoading ? (
              <div className="text-center py-8 text-muted-foreground text-sm">加载中...</div>
            ) : (
              <AttachmentList
                attachments={projAttachments}
                onDelete={(attId) => setProjAttachments((prev) => prev.filter((a) => a.id !== attId))}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* 底部操作区 */}
      <Card className="border border-border/40">
        <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={openEditDialog}>
              <Edit className="size-3.5 mr-1" />
              编辑
            </Button>
            <Button variant="outline" size="sm" onClick={() => setFollowupOpen(true)}>
              <Plus className="size-3.5 mr-1" />
              记录跟进
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {!isLastStage && (
              <Button size="sm" onClick={handleAdvance}>
                <TrendingUp className="size-3.5 mr-1" />
                阶段推进
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleAddPayment}>
              <CreditCard className="size-3.5 mr-1" />
              登记回款
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 编辑项目 Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0">
          <div className="px-6 pt-6">
            <DialogHeader>
              <DialogTitle>编辑项目</DialogTitle>
            </DialogHeader>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">项目名称 <span className="text-destructive">*</span></label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="请输入项目名称"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">项目编号</label>
                <Input value={editForm.projectNo} readOnly className="bg-muted/50" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">关联客户</label>
                <Select value={editForm.customerId} onValueChange={(v) => setEditForm({ ...editForm, customerId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="请选择客户" />
                  </SelectTrigger>
                  <SelectContent>
                    {customersAll.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">项目负责人</label>
                <Select value={editForm.owner} onValueChange={(v) => setEditForm({ ...editForm, owner: v })}>
                  <SelectTrigger><SelectValue placeholder="请选择负责人" /></SelectTrigger>
                  <SelectContent>
                    {MOCK_USERS.filter((u) => u.status === 'active').map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">合同金额（元） <span className="text-destructive">*</span></label>
                <Input
                  type="number"
                  value={editForm.amount}
                  onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">采购方式</label>
                <Select value={editForm.procurementMethod} onValueChange={(v) => setEditForm({ ...editForm, procurementMethod: v })}>
                  <SelectTrigger><SelectValue placeholder="请选择采购方式" /></SelectTrigger>
                  <SelectContent>
                    {PROCUREMENT_METHODS.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">项目阶段</label>
                <Select value={editForm.stage} onValueChange={(v) => setEditForm({ ...editForm, stage: v as IProject['stage'] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROJECT_STAGE_ORDER.map((s) => (
                      <SelectItem key={s} value={s}>{PROJECT_STAGE_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">状态</label>
                <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v as IProject['status'] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">进行中</SelectItem>
                    <SelectItem value="paused">已暂停</SelectItem>
                    <SelectItem value="closed">已关闭</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">优先级</label>
                <Select value={editForm.priority} onValueChange={(v) => setEditForm({ ...editForm, priority: v as IProject['priority'] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">高</SelectItem>
                    <SelectItem value="medium">中</SelectItem>
                    <SelectItem value="low">低</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">立项日期</label>
                <Input
                  type="date"
                  value={editForm.startDate}
                  onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">预计交付时间</label>
              <Input
                type="date"
                value={editForm.expectedDeliveryDate}
                onChange={(e) => setEditForm({ ...editForm, expectedDeliveryDate: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">项目描述</label>
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="请输入项目详细描述"
                rows={4}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">附件</label>
              <FileUploader
                files={[]}
                onChange={async (newFiles) => {
                  if (!id || newFiles.length === 0) return
                  for (const f of newFiles) {
                    if (!f.file) continue
                    try {
                      const result = await attachmentApi.upload('project', id, f.file) as unknown as IAttachment
                      setProjAttachments((prev) => [result, ...prev])
                    } catch (err) {
                      toast.error(`上传「${f.name}」失败`)
                    }
                  }
                }}
                maxCount={20}
                maxSize={100 * 1024 * 1024}
                hint="支持图片、文档(PDF/Word)、表格(Excel)、PPT、压缩包等格式，单文件最大 100MB，上传后立即保存到项目附件区"
              />
            </div>
          </div>
          <div className="px-6 py-4 border-t border-border/40 shrink-0">
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)}>取消</Button>
              <Button onClick={handleSaveEdit}>保存修改</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* 推进阶段 Dialog */}
      <Dialog open={advanceOpen} onOpenChange={setAdvanceOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>推进项目阶段</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              将从「{PROJECT_STAGE_LABELS[project.stage]}」推进到「
              {PROJECT_STAGE_LABELS[PROJECT_STAGE_ORDER[currentStageIndex + 1]]}」
            </p>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">推进备注</label>
              <Textarea
                value={advanceRemark}
                onChange={(e) => setAdvanceRemark(e.target.value)}
                placeholder="请输入推进备注（选填）"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdvanceOpen(false)}>
              取消
            </Button>
            <Button onClick={confirmAdvance}>确认推进</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 新增跟进 Dialog */}
      <Dialog open={followupOpen} onOpenChange={setFollowupOpen}>
        <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col p-0">
          <div className="px-6 pt-6">
            <DialogHeader>
              <DialogTitle>{editingFollowup ? '编辑跟进记录' : '新增项目跟进记录'}</DialogTitle>
            </DialogHeader>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">跟进类型</label>
              <Select
                value={followupForm.type}
                onValueChange={(v) =>
                  setFollowupForm({ ...followupForm, type: v as IFollowUp['type'] })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="visit">拜访</SelectItem>
                  <SelectItem value="call">电话</SelectItem>
                  <SelectItem value="email">邮件</SelectItem>
                  <SelectItem value="wechat">微信</SelectItem>
                  <SelectItem value="meeting">会议</SelectItem>
                  <SelectItem value="other">其他</SelectItem>
                </SelectContent>
              </Select>
              {followupForm.type === 'other' && (
                <Input
                  className="mt-2"
                  value={followupForm.customType}
                  onChange={(e) =>
                    setFollowupForm({ ...followupForm, customType: e.target.value })
                  }
                  placeholder="请输入跟进类型"
                />
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">跟进内容</label>
              <Textarea
                value={followupForm.content}
                onChange={(e) => setFollowupForm({ ...followupForm, content: e.target.value })}
                placeholder="请输入跟进内容"
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">跟进结果</label>
              <Textarea
                value={followupForm.result}
                onChange={(e) => setFollowupForm({ ...followupForm, result: e.target.value })}
                placeholder="请输入跟进结果（选填）"
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">下次跟进时间</label>
              <Input
                type="date"
                value={followupForm.nextFollowUpDate}
                onChange={(e) =>
                  setFollowupForm({ ...followupForm, nextFollowUpDate: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">附件</label>
              <FileUploader
                files={followupFiles}
                onChange={setFollowupFiles}
                maxCount={10}
                hint="支持图片、文档、表格等格式，单文件最大 50MB"
              />
            </div>
          </div>
          <div className="px-6 py-4 border-t border-border/40 shrink-0">
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setFollowupOpen(false)
                setEditingFollowup(null)
                setFollowupForm({ type: 'call', customType: '', content: '', result: '', nextFollowUpDate: '' })
                setFollowupFiles([])
              }}>
                取消
              </Button>
              <Button onClick={editingFollowup ? handleUpdateFollowup : handleAddFollowup}>
                {followupSaving ? '保存中...' : (editingFollowup ? '保存修改' : '保存')}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

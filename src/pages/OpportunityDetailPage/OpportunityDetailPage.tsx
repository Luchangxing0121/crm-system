import { useState, useMemo, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
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
  Clock,
  CheckCircle2,
  Plus,
  Edit,
  Trash2,
  Briefcase,
  Trophy,
  XCircle,
  FileText,
  MessageSquare,
  MessageCircle,
  Phone,
  Mail,
  Users,
  Handshake,
  Paperclip,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDate, formatDateTime } from '@/lib/utils';
import AttachmentList from '@/components/FileUpload/AttachmentList';
import FileUploader, { type UploadedFile } from '@/components/FileUpload/FileUploader';
import {
  type IOpportunity,
  OPPORTUNITY_STAGE_LABELS,
  OPPORTUNITY_STAGE_ORDER,
  TERMINAL_STAGES,
  PRIORITY_LABELS,
} from '@/data/opportunities'
import { MOCK_USERS, MOCK_CURRENT_USER } from '@/data/users'
import { MOCK_FOLLOWUPS, type IFollowUp } from '@/data/followups'
import { PROCUREMENT_METHODS } from '@/data/projects'
import { useOpportunities, useFollowups, useProjects, useCustomers, useContacts, initiateProject, opportunityMutations, followupMutations } from '@/hooks/use-crm-store'
import { attachmentApi } from '@/services/api'
import type { IAttachment } from '@/data/opportunities'
import { Textarea } from '@/components/ui/textarea'

const stageColorMap: Record<string, string> = {
  lead: 'bg-slate-500',
  contact: 'bg-sky-500',
  requirement: 'bg-blue-500',
  proposal: 'bg-amber-500',
  negotiation: 'bg-purple-500',
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
  meeting: { label: '会议', icon: Users, color: 'bg-purple-500 text-purple-50' },
  wechat: { label: '微信', icon: MessageCircle, color: 'bg-green-500 text-green-50' },
  other: { label: '其他', icon: MessageSquare, color: 'bg-slate-500 text-slate-50' },
}

export default function OpportunityDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [oppsAll] = useOpportunities()
  const [followupsAll] = useFollowups()
  const [customersAll] = useCustomers()
  const [contactsAll] = useContacts()
  const [, setProjectsAll] = useProjects()
  const [advancing, setAdvancing] = useState(false)
  const [followupSaving, setFollowupSaving] = useState(false)
  const [followupDeleting, setFollowupDeleting] = useState(false)
  const [editSaving, setEditSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [losing, setLosing] = useState(false)
  const [projecting, setProjecting] = useState(false)
  const opp = useMemo(() => oppsAll.find((o) => o.id === id), [oppsAll, id])

  const [activeTab, setActiveTab] = useState<'followups' | 'contacts' | 'attachments'>('followups')
  const [advanceOpen, setAdvanceOpen] = useState(false)
  const [advanceRemark, setAdvanceRemark] = useState('')
  const [followupOpen, setFollowupOpen] = useState(false)
  const [editingFollowup, setEditingFollowup] = useState<IFollowUp | null>(null)
  const [deleteFollowupId, setDeleteFollowupId] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [followupForm, setFollowupForm] = useState({
    type: 'call' as IFollowUp['type'],
    customType: '',
    content: '',
    result: '',
    nextFollowUpDate: '',
  })
  const [followupFiles, setFollowupFiles] = useState<UploadedFile[]>([])
  const [oppAttachments, setOppAttachments] = useState<IAttachment[]>([])
  const [attachmentsLoading, setAttachmentsLoading] = useState(false)
  const [expandedFollowup, setExpandedFollowup] = useState<string | null>(null)
  const relatedFollowups = useMemo(
    () =>
      followupsAll.filter(
        (f) => f.opportunityId === id || (opp && f.customerId === opp.customerId),
      ),
    [followupsAll, id, opp],
  )

  // 加载附件列表
  const loadAttachments = async () => {
    if (!id) return
    setAttachmentsLoading(true)
    try {
      const data = await attachmentApi.list('opportunity', id) as unknown as IAttachment[]
      setOppAttachments(data || [])
    } catch {
      setOppAttachments([])
    } finally {
      setAttachmentsLoading(false)
    }
  }

  useEffect(() => {
    if (id && activeTab === 'attachments') {
      loadAttachments()
    }
  }, [id, activeTab])

  const [projectOpen, setProjectOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [loseOpen, setLoseOpen] = useState(false)
  const [loseReason, setLoseReason] = useState('')
  const [editForm, setEditForm] = useState({
    name: '',
    customerId: '',
    amount: '',
    stage: 'lead' as IOpportunity['stage'],
    status: 'active' as IOpportunity['status'],
    priority: 'medium' as IOpportunity['priority'],
    winRate: 0,
    expectedStartDate: '',
    owner: '',
    source: '',
    description: '',
  })
  const today = formatDate()
  const [projectForm, setProjectForm] = useState({
    name: '',
    projectNo: '',
    startDate: today,
    owner: '',
    amount: '',
    procurementMethod: '公开招标',
    expectedDeliveryDate: '',
    description: '',
  })

  if (!opp) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="size-4 mr-2" />
          返回
        </Button>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            商机不存在
          </CardContent>
        </Card>
      </div>
    )
  }

  const customer = customersAll.find((c) => c.id === opp.customerId)
  const owner = MOCK_USERS.find((u) => u.id === opp.owner)
  const customerContacts = contactsAll.filter((c) => c.customerId === opp.customerId)
  const primaryContact = customerContacts.find((c) => c.isPrimary) || customerContacts[0]
  const currentStageIndex = OPPORTUNITY_STAGE_ORDER.indexOf(opp.stage)
  const oppStage = opp.stage as 'lead' | 'contact' | 'requirement' | 'proposal' | 'negotiation' | 'won' | 'lost'
  const isTerminal = TERMINAL_STAGES.includes(oppStage)
  const isWon = oppStage === 'won'
  const isLost = oppStage === 'lost'
  const isLastStage = currentStageIndex >= OPPORTUNITY_STAGE_ORDER.length - 1 && !isTerminal

  const openProjectDialog = () => {
    const nextNo = 'PRJ-2026-' + String(Math.floor(Math.random() * 9000) + 1000).padStart(4, '0')
    setProjectForm({
      name: opp.name,
      projectNo: nextNo,
      startDate: today,
      owner: opp.owner,
      amount: String(opp.amount),
      procurementMethod: '公开招标',
      expectedDeliveryDate: '',
      description: opp.description,
    })
    setProjectOpen(true)
  }

  const handleConfirmProject = async () => {
    if (!projectForm.name.trim()) {
      toast.error('请填写项目名称')
      return
    }
    if (!projectForm.amount || parseFloat(projectForm.amount) <= 0) {
      toast.error('请填写有效金额')
      return
    }
    if (!opp) return

    setProjecting(true);
    try {
      // 立项：创建项目 + 商机标记关闭
      const result = await initiateProject(opp.id, {
        projectName: projectForm.name.trim(),
        projectNo: projectForm.projectNo,
        budget: parseFloat(projectForm.amount),
        owner: opp.owner,
        startDate: projectForm.startDate,
        expectedDeliveryDate: projectForm.expectedDeliveryDate,
        procurementMethod: projectForm.procurementMethod,
        description: projectForm.description,
      })

      if (!result) {
        toast.error('立项失败，请重试');
        return;
      }

      toast.success(
        `商机「${opp.name}」已成功立项，项目编号 ${projectForm.projectNo}，已转入项目池`,
      )
      setProjectOpen(false)
      setTimeout(() => navigate('/projects'), 600)
    } finally {
      setProjecting(false);
    }
  }

  const handleAdvance = () => {
    const nextStage = OPPORTUNITY_STAGE_ORDER[currentStageIndex + 1]
    if (!nextStage) return
    setAdvanceRemark('')
    setAdvanceOpen(true)
  }

  const confirmAdvance = async () => {
    const nextStage = OPPORTUNITY_STAGE_ORDER[currentStageIndex + 1]
    if (!nextStage || !opp) return
    setAdvancing(true);
    try {
      await opportunityMutations.advanceStage(opp.id, advanceRemark.trim() || '阶段推进');
      toast.success(`已推进至「${OPPORTUNITY_STAGE_LABELS[nextStage]}」`)
      setAdvanceOpen(false)
    } catch (err) {
      toast.error('阶段推进失败，请重试');
    } finally {
      setAdvancing(false);
    }
  }

  const handleSaveFollowup = async () => {
    if (!followupForm.content.trim()) {
      toast.error('请填写跟进内容')
      return
    }
    if (!opp) return
    const finalType =
      followupForm.type === 'other'
        ? followupForm.customType.trim() || '其他'
        : followupForm.type
    setFollowupSaving(true);
    try {
      if (editingFollowup) {
        // 编辑模式
        await followupMutations.update(editingFollowup.id, {
          type: finalType,
          content: followupForm.content,
          result: followupForm.result,
          nextFollowUpDate: followupForm.nextFollowUpDate || undefined,
        });
        toast.success('跟进记录已更新')
      } else {
        // 新增模式 — 先上传附件，再创建跟进
        const uploadedAtts: IAttachment[] = [];
        for (const f of followupFiles) {
          if (f.file) {
            try {
              const res = await attachmentApi.upload('followup', 'pending', f.file);
              const r = res as Record<string, unknown> || {};
              uploadedAtts.push({
                id: String(r.id || `att-${Date.now()}`),
                name: String(r.name || f.name),
                size: Number(r.size || f.size || 0),
                type: String(r.type || f.type || 'other'),
                uploader: String(r.uploader || MOCK_CURRENT_USER.id),
                uploadedAt: String(r.uploadedAt || new Date().toISOString()),
                url: typeof r.url === 'string' ? r.url : undefined,
              });
            } catch {
              // 上传失败不阻断创建
            }
          } else if (f.url) {
            // 已有 URL 的文件直接用
            uploadedAtts.push({
              id: f.id,
              name: f.name,
              size: f.size,
              type: f.type,
              uploader: MOCK_CURRENT_USER.id,
              uploadedAt: new Date().toISOString(),
              url: f.url,
            });
          }
        }
        await followupMutations.create({
          customerId: opp.customerId,
          opportunityId: opp.id,
          type: finalType,
          content: followupForm.content,
          result: followupForm.result,
          nextFollowUpDate: followupForm.nextFollowUpDate || undefined,
          attachments: uploadedAtts,
        });
        toast.success('跟进记录已添加')
      }
      setFollowupOpen(false)
      setEditingFollowup(null)
      setFollowupForm({ type: 'call', customType: '', content: '', result: '', nextFollowUpDate: '' })
      setFollowupFiles([])
      setActiveTab('followups')
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
    setFollowupFiles(
      f.attachments?.map((a) => ({
        id: a.id,
        name: a.name,
        size: a.size,
        type: a.type,
        url: a.url,
      })) || [],
    )
    setFollowupOpen(true)
  }

  const handleDeleteFollowup = async () => {
    if (!deleteFollowupId) return
    setFollowupDeleting(true);
    try {
      await followupMutations.remove(deleteFollowupId);
      toast.success('跟进记录已删除')
      setDeleteFollowupId(null)
      setDeleteOpen(false)
    } catch (err) {
      toast.error('删除失败，请重试');
    } finally {
      setFollowupDeleting(false);
    }
  }

  const openDeleteFollowup = (id: string) => {
    setDeleteFollowupId(id)
    setDeleteOpen(true)
  }

  const openEditDialog = () => {
    if (!opp) return
    setEditForm({
      name: opp.name,
      customerId: opp.customerId,
      amount: String(opp.amount),
      stage: opp.stage,
      status: opp.status,
      priority: opp.priority,
      winRate: opp.winRate,
      expectedStartDate: opp.expectedStartDate,
      owner: opp.owner,
      source: opp.source,
      description: opp.description,
    })
    setEditOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editForm.name.trim()) {
      toast.error('请填写商机名称')
      return
    }
    const amountNum = parseFloat(editForm.amount)
    if (isNaN(amountNum) || amountNum < 0) {
      toast.error('请填写有效金额')
      return
    }
    if (!opp) return
    setEditSaving(true);
    try {
      await opportunityMutations.update(opp.id, {
        name: editForm.name.trim(),
        customerId: editForm.customerId,
        amount: amountNum,
        stage: editForm.stage,
        status: editForm.status,
        priority: editForm.priority,
        winRate: Math.max(0, Math.min(100, editForm.winRate)),
        expectedStartDate: editForm.expectedStartDate,
        owner: editForm.owner,
        source: editForm.source,
        description: editForm.description,
      });
      toast.success('商机信息已更新')
      setEditOpen(false)
    } catch (err) {
      toast.error('保存失败，请重试');
    } finally {
      setEditSaving(false);
    }
  }

  const handleDelete = async () => {
    if (!opp) return
    setDeleting(true);
    try {
      await opportunityMutations.remove(opp.id);
      toast.success('商机已删除')
      navigate('/opportunities')
    } catch (err) {
      toast.error('删除失败，请重试');
    } finally {
      setDeleting(false);
    }
  }

  const handleLose = async () => {
    if (!loseReason.trim()) {
      toast.error('请填写输单原因')
      return
    }
    if (!opp) return
    setLosing(true);
    try {
      await opportunityMutations.loseDeal(opp.id, loseReason.trim());
      toast.success('已标记为输单')
      setLoseOpen(false)
      setLoseReason('')
    } catch (err) {
      toast.error('操作失败，请重试');
    } finally {
      setLosing(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* 返回栏 */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="size-4 mr-1.5" />
          返回商机池
        </Button>
      </div>

      {/* 顶部标题卡 */}
      <Card className="border border-border/40">
        <CardContent className="p-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-foreground">{opp.name}</h1>
                <Badge
                  variant="outline"
                  className={`text-xs ${priorityColorMap[opp.priority]}`}
                >
                  {PRIORITY_LABELS[opp.priority]}优先级
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {OPPORTUNITY_STAGE_LABELS[opp.stage]}
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
                  ¥{opp.amount.toLocaleString()}
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
                跟进记录
              </Button>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={openProjectDialog}
              >
                <Briefcase className="size-3.5 mr-1" />
                立项 → 项目池
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 阶段进度 */}
      <Card className="border border-border/40">
        <CardHeader>
          <CardTitle className="text-base">阶段进度</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 推进阶段（5个） */}
          <div className="relative">
            <div className="absolute top-5 left-6 right-6 h-0.5 bg-border -z-10" />
            <div className="flex justify-between">
              {OPPORTUNITY_STAGE_ORDER.map((s, idx) => {
                const done = !isTerminal && (idx < currentStageIndex || (isWon && idx <= currentStageIndex))
                const current = !isTerminal && idx === currentStageIndex
                return (
                  <div key={s} className="flex flex-col items-center text-center px-2 flex-1">
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
                      {OPPORTUNITY_STAGE_LABELS[s]}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 终态分支：赢单 / 输单 */}
          <div className="relative pt-2">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-4 bg-border" />
            <div className="grid grid-cols-2 gap-4 pt-2">
              {/* 赢单分支 */}
              <div
                className={`rounded-lg border p-4 flex items-center gap-3 transition-colors ${
                  isWon
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-card border-border/40'
                }`}
              >
                <div
                  className={`size-10 rounded-full flex items-center justify-center shrink-0 ${
                    isWon ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <Trophy className="size-5" />
                </div>
                <div className="min-w-0">
                  <div className={`text-sm font-semibold ${isWon ? 'text-emerald-700' : 'text-foreground'}`}>
                    赢单 · 立项
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {isWon ? '商机已赢单，已转入项目池' : '签约成交，进入项目执行'}
                  </div>
                </div>
              </div>

              {/* 输单分支 */}
              <div
                className={`rounded-lg border p-4 flex items-center gap-3 transition-colors ${
                  isLost
                    ? 'bg-rose-50 border-rose-200'
                    : 'bg-card border-border/40'
                }`}
              >
                <div
                  className={`size-10 rounded-full flex items-center justify-center shrink-0 ${
                    isLost ? 'bg-rose-500 text-white' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <XCircle className="size-5" />
                </div>
                <div className="min-w-0">
                  <div className={`text-sm font-semibold ${isLost ? 'text-rose-700' : 'text-foreground'}`}>
                    输单 · 关闭
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {isLost ? '商机已关闭，记录输单原因' : '竞争失利或客户放弃'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              赢单率 <span className="font-semibold text-foreground">{opp.winRate}%</span>
            </span>
            {isTerminal && (
              <Badge className={isWon ? 'bg-emerald-100 text-emerald-700 border-0' : 'bg-rose-100 text-rose-700 border-0'}>
                {isWon ? '已赢单 · 项目进行中' : '已输单 · 商机关闭'}
              </Badge>
            )}
            {!isTerminal && isLastStage && (
              <Badge className="bg-amber-100 text-amber-700 border-0">
                商务谈判中，可赢单或输单
              </Badge>
            )}
            {!isTerminal && !isLastStage && (
              <Button size="sm" onClick={handleAdvance}>
                <TrendingUp className="size-3.5 mr-1" />
                推进到下一阶段
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 基本信息 */}
        <Card className="border border-border/40 lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">基本信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="flex items-center justify-between text-sm">
               <span className="text-muted-foreground">关联客户</span>
               <span className="font-medium">{customer?.name || '-'}</span>
             </div>
             <div className="flex items-center justify-between text-sm">
               <span className="text-muted-foreground">对接人</span>
               <span className="font-medium">
                 {primaryContact
                   ? `${primaryContact.name}${primaryContact.position ? `（${primaryContact.position}）` : ''}`
                   : '-'}
               </span>
             </div>
             <div className="flex items-center justify-between text-sm">
               <span className="text-muted-foreground">联系电话</span>
               <span className="font-medium tabular-nums">{primaryContact?.mobile || primaryContact?.phone || '-'}</span>
             </div>
             <div className="flex items-center justify-between text-sm">
               <span className="text-muted-foreground">来源</span>
               <span className="font-medium">{opp.source}</span>
             </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">优先级</span>
              <Badge variant="outline" className={`text-xs ${priorityColorMap[opp.priority]}`}>
                {PRIORITY_LABELS[opp.priority]}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">阶段</span>
              <div className="flex items-center gap-1.5">
                <div className={`size-2 rounded-full ${stageColorMap[opp.stage]}`} />
                <span className="font-medium">{OPPORTUNITY_STAGE_LABELS[opp.stage]}</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">状态</span>
              <span className="font-medium">
                {opp.status === 'active' ? '跟进中' : opp.status === 'paused' ? '暂停' : '已关闭'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">负责人</span>
              <span className="font-medium">{owner?.name || '-'}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">预计立项时间</span>
              <span className="font-medium">{opp.expectedStartDate}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">预计金额</span>
              <span className="font-semibold text-primary">
                ¥{opp.amount.toLocaleString()}
              </span>
            </div>
            <div className="pt-2 border-t border-border/40">
              <p className="text-sm text-muted-foreground mb-1.5">需求描述</p>
              <p className="text-sm leading-relaxed">{opp.description}</p>
            </div>
          </CardContent>
        </Card>

        {/* 右侧：跟进记录 / 阶段历史 */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border border-border/40">
            <CardHeader className="pb-0">
              <div className="flex items-center gap-1 border-b border-border/40 -mx-6 px-6">
                <button
                  onClick={() => setActiveTab('followups')}
                  className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                    activeTab === 'followups'
                      ? 'text-primary border-primary'
                      : 'text-muted-foreground border-transparent hover:text-foreground'
                  }`}
                >
                  跟进记录
                </button>
                <button
                  onClick={() => setActiveTab('contacts')}
                  className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                    activeTab === 'contacts'
                      ? 'text-primary border-primary'
                      : 'text-muted-foreground border-transparent hover:text-foreground'
                  }`}
                >
                  阶段历史
                </button>
                <button
                  onClick={() => setActiveTab('attachments')}
                  className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                    activeTab === 'attachments'
                      ? 'text-primary border-primary'
                      : 'text-muted-foreground border-transparent hover:text-foreground'
                  }`}
                >
                  附件
                </button>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {activeTab === 'followups' && (
                <div>
                  <div className="text-xs text-muted-foreground mb-3">
                    共 {relatedFollowups.length} 条跟进记录
                  </div>
                  <div className="max-h-[500px] overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                  {relatedFollowups.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      暂无跟进记录
                    </div>
                  ) : null}
                  {relatedFollowups.map((f) => {
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
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">
                              {typeMap[f.type]?.label ?? f.type}跟进
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {f.createdAt} · {creator?.name || f.creator}
                            </span>
                            <div className="ml-auto flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-6 text-muted-foreground hover:text-foreground"
                                onClick={() => openEditFollowup(f)}
                                aria-label="编辑跟进"
                              >
                                <Edit className="size-3.5" />
                              </Button>
                              <AlertDialog open={deleteFollowupId === f.id} onOpenChange={(open) => setDeleteFollowupId(open ? f.id : null)}>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-6 text-muted-foreground hover:text-destructive"
                                    aria-label="删除跟进"
                                  >
                                    <Trash2 className="size-3.5" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>确认删除跟进记录</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      确定要删除这条「{typeMap[f.type]?.label ?? f.type}跟进」记录吗？删除后将无法恢复。
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>取消</AlertDialogCancel>
                                    <AlertDialogAction
                                      className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
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
                            <p className="text-xs text-muted-foreground">
                              结果：{f.result}
                            </p>
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
                </div>
              )}
              {activeTab === 'contacts' && (
                <div className="space-y-3">
                  {opp.stageHistory.map((h, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border/40 bg-muted/20"
                    >
                      <div
                        className={`size-8 rounded-full flex items-center justify-center text-white text-xs font-medium ${stageColorMap[h.stage] || 'bg-slate-500'}`}
                      >
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">
                          {OPPORTUNITY_STAGE_LABELS[h.stage] || h.stage}
                        </div>
                        <div className="text-xs text-muted-foreground">{h.remark}</div>
                      </div>
                      <div className="text-xs text-muted-foreground whitespace-nowrap">
                        {h.date}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {activeTab === 'attachments' && (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-2">上传附件</p>
                    <FileUploader
                      files={[]}
                      onChange={async (newFiles) => {
                        if (!id || newFiles.length === 0) return
                        // 逐个上传到后端
                        for (const f of newFiles) {
                          if (!f.file) continue
                          try {
                            const result = await attachmentApi.upload('opportunity', id, f.file, (p) => {
                              // 更新进度（此处简单处理，完成后再统一加列表）
                            }) as unknown as IAttachment
                            setOppAttachments((prev) => [result, ...prev])
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
                      attachments={oppAttachments}
                      onDelete={(attId) => setOppAttachments((prev) => prev.filter((a) => a.id !== attId))}
                    />
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 底部操作区 */}
          <Card className="border border-border/40">
            <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Trash2 className="size-3.5 mr-1 text-destructive" />
                      <span className="text-destructive">删除</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>确认删除商机</AlertDialogTitle>
                      <AlertDialogDescription>
                        确定要删除商机「{opp.name}」吗？删除后将无法恢复，相关的跟进记录和附件也会一并移除。
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>取消</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                        onClick={handleDelete}
                      >
                        确认删除
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Button variant="outline" size="sm" onClick={openEditDialog}>
                  <Edit className="size-3.5 mr-1" />
                  编辑
                </Button>
              </div>
              <Button variant="outline" size="sm" onClick={() => setLoseOpen(true)} style={{ color: '#ed2f06' }}>
                输单
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setFollowupOpen(true)}>
                  <Plus className="size-3.5 mr-1" />
                  跟进记录
                </Button>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={openProjectDialog}
                >
                  <Briefcase className="size-3.5 mr-1" />
                  立项 → 项目池
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 编辑商机 Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0">
          <div className="px-6 pt-6">
            <DialogHeader>
              <DialogTitle>编辑商机</DialogTitle>
            </DialogHeader>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">商机名称 <span className="text-destructive">*</span></label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="请输入商机名称"
              />
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
                <label className="text-sm font-medium">商机来源</label>
                <Input
                  value={editForm.source}
                  onChange={(e) => setEditForm({ ...editForm, source: e.target.value })}
                  placeholder="如：官网咨询、老客户转介绍"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">预计金额（元） <span className="text-destructive">*</span></label>
                <Input
                  type="number"
                  value={editForm.amount}
                  onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">赢单率（%）</label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={editForm.winRate}
                  onChange={(e) => setEditForm({ ...editForm, winRate: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">商机阶段</label>
                <Select value={editForm.stage} onValueChange={(v) => setEditForm({ ...editForm, stage: v as IOpportunity['stage'] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {OPPORTUNITY_STAGE_ORDER.map((s) => (
                      <SelectItem key={s} value={s}>{OPPORTUNITY_STAGE_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">状态</label>
                <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v as IOpportunity['status'] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">跟进中</SelectItem>
                    <SelectItem value="paused">已暂停</SelectItem>
                    <SelectItem value="closed">已关闭</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">优先级</label>
                <Select value={editForm.priority} onValueChange={(v) => setEditForm({ ...editForm, priority: v as IOpportunity['priority'] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">高</SelectItem>
                    <SelectItem value="medium">中</SelectItem>
                    <SelectItem value="low">低</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">预计立项时间</label>
                <Input
                  type="date"
                  value={editForm.expectedStartDate}
                  onChange={(e) => setEditForm({ ...editForm, expectedStartDate: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">负责人</label>
              <Select value={editForm.owner} onValueChange={(v) => setEditForm({ ...editForm, owner: v })}>
                <SelectTrigger><SelectValue placeholder="请选择负责人" /></SelectTrigger>
                <SelectContent>
                  {MOCK_USERS.filter((u) => u.status === 'active').map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">详细描述</label>
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="请输入商机详细描述、对接人信息等"
                rows={4}
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
            <DialogTitle>推进阶段</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              将从「{OPPORTUNITY_STAGE_LABELS[opp.stage]}」推进到「
              {OPPORTUNITY_STAGE_LABELS[OPPORTUNITY_STAGE_ORDER[currentStageIndex + 1]]}」
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
          <DialogHeader className="px-6 pt-6 pb-3">
            <DialogTitle>{editingFollowup ? '编辑跟进记录' : '新增跟进记录'}</DialogTitle>
          </DialogHeader>
          <div className="px-6 overflow-y-auto flex-1 py-2 space-y-4">
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
                maxSize={100 * 1024 * 1024}
                hint="支持图片、文档、表格、PPT、压缩包等格式，单文件最大 100MB"
              />
            </div>
          </div>
          <DialogFooter className="px-6 py-4 border-t border-border/40">
            <Button variant="outline" onClick={() => {
              setFollowupOpen(false)
              setEditingFollowup(null)
    setFollowupForm({ type: 'call', customType: '', content: '', result: '', nextFollowUpDate: '' })
              setFollowupFiles([])
            }}>
              取消
            </Button>
            <Button onClick={handleSaveFollowup}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 立项 Dialog */}
      <Dialog open={projectOpen} onOpenChange={setProjectOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col p-0">
          <div className="px-6 pt-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Briefcase className="size-5 text-emerald-600" />
                立项确认
              </DialogTitle>
            </DialogHeader>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700">
              商机「{opp.name}」将正式立项，立项成功后从商机池移除，自动转入项目池管理。
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">项目名称</label>
                <Input
                  value={projectForm.name}
                  onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">项目编号</label>
                <Input value={projectForm.projectNo} readOnly className="bg-muted/50" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">关联客户</label>
              <Input value={customer?.name || '-'} readOnly className="bg-muted/50" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">立项时间</label>
                <Input
                  type="date"
                  value={projectForm.startDate}
                  onChange={(e) =>
                    setProjectForm({ ...projectForm, startDate: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">项目负责人</label>
                <Select
                  value={projectForm.owner}
                  onValueChange={(v) => setProjectForm({ ...projectForm, owner: v })}
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">合同金额（元）</label>
                <Input
                  type="number"
                  value={projectForm.amount}
                  onChange={(e) => setProjectForm({ ...projectForm, amount: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">采购方式</label>
                <Select
                  value={projectForm.procurementMethod}
                  onValueChange={(v) =>
                    setProjectForm({ ...projectForm, procurementMethod: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROCUREMENT_METHODS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">预计交付时间</label>
              <Input
                type="date"
                value={projectForm.expectedDeliveryDate}
                onChange={(e) =>
                  setProjectForm({ ...projectForm, expectedDeliveryDate: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">项目描述</label>
              <Textarea
                value={projectForm.description}
                onChange={(e) =>
                  setProjectForm({ ...projectForm, description: e.target.value })
                }
                rows={3}
              />
            </div>
          </div>
          <div className="px-6 py-4 border-t border-border/40 shrink-0">
            <DialogFooter>
              <Button variant="outline" onClick={() => setProjectOpen(false)}>
                取消
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleConfirmProject}
              >
                确认立项
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
      {/* 输单原因 Dialog */}
      <Dialog open={loseOpen} onOpenChange={setLoseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>标记输单</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">输单原因 <span className="text-destructive">*</span></label>
              <Textarea
                value={loseReason}
                onChange={(e) => setLoseReason(e.target.value)}
                placeholder="请简要说明输单原因，如价格过高、竞争对手胜出、客户需求变更等"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setLoseOpen(false)
                setLoseReason('')
              }}
            >
              取消
            </Button>
            <Button variant="destructive" onClick={handleLose}>
              确认输单
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

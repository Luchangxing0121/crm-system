import { useState, useMemo, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardHeader, CardContent, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  ArrowLeft,
  Edit,
  FileText,
  Send,
  CheckCircle2,
  XCircle,
  Download,
  FolderKanban,
  Briefcase,
  Plus,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner'
import {
  QUOTATION_STATUS,
  type IQuotation,
} from '@/data/quotations'
import { MOCK_USERS, MOCK_CURRENT_USER } from '@/data/users'
import AttachmentList from '@/components/FileUpload/AttachmentList'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { useQuotations, quotationMutations, useCustomers, useContacts, useOpportunities, useProjects } from '@/hooks/use-crm-store'
import { quotationApi } from '@/services/api'

function numberToChinese(num: number): string {
  const digits = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖']
  const units = ['', '拾', '佰', '仟']
  const bigUnits = ['', '万', '亿']

  if (num === 0) return '零元整'
  if (num >= 1000000000000) return '金额过大'

  const intPart = Math.floor(num)
  const decPart = Math.round((num - intPart) * 100)

  let result = ''

  const intStr = intPart.toString()
  const groups: string[] = []
  for (let i = intStr.length; i > 0; i -= 4) {
    groups.unshift(intStr.slice(Math.max(0, i - 4), i))
  }

  groups.forEach((group, gi) => {
    let groupStr = ''
    let zeroFlag = false
    for (let i = 0; i < group.length; i++) {
      const digit = parseInt(group[i])
      const unitIndex = group.length - 1 - i
      if (digit === 0) {
        zeroFlag = true
      } else {
        if (zeroFlag && groupStr) groupStr += '零'
        groupStr += digits[digit] + units[unitIndex]
        zeroFlag = false
      }
    }
    if (groupStr) {
      result += groupStr + bigUnits[groups.length - 1 - gi]
    } else if (result && gi < groups.length - 1) {
      result += '零'
    }
  })

  result += '元'

  if (decPart === 0) {
    result += '整'
  } else {
    const jiao = Math.floor(decPart / 10)
    const fen = decPart % 10
    if (jiao > 0) result += digits[jiao] + '角'
    if (fen > 0) result += digits[fen] + '分'
  }

  return result
}

export default function QuotationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [quotations] = useQuotations()
  const [customersAll] = useCustomers()
  const [contactsAll] = useContacts()
  const [oppsAll] = useOpportunities()
  const [projectsAll] = useProjects()
  const [statusLoading, setStatusLoading] = useState(false)
  const [converting, setConverting] = useState(false)
  const [detailLoading, setDetailLoading] = useState(true)
  const [detail, setDetail] = useState<IQuotation | null>(null)

  // 先从缓存取，取不到主动调详情接口（含完整items明细）
  useEffect(() => {
    if (!id) {
      setDetailLoading(false)
      return
    }
    const cached = quotations.find((q) => q.id === id)
    if (cached && cached.items && cached.items.length >= 0) {
      setDetail(cached)
      setDetailLoading(false)
      return
    }
    let cancelled = false
    setDetailLoading(true)
    quotationApi.detail(id)
      .then((res) => {
        if (cancelled) return
        const q = res as unknown as IQuotation
        setDetail(q)
      })
      .catch(() => {
        if (!cancelled) setDetail(null)
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id, quotations])

  const quotation = detail

  const customer = useMemo(
    () => customersAll.find((c) => c.id === quotation?.customerId),
    [customersAll, quotation],
  )
  const contact = useMemo(
    () => contactsAll.find((c) => c.id === quotation?.contactId),
    [contactsAll, quotation],
  )
  const opportunity = useMemo(
    () => oppsAll.find((o) => o.id === quotation?.opportunityId),
    [oppsAll, quotation],
  )
  const project = useMemo(
    () => projectsAll.find((p) => p.id === quotation?.projectId),
    [projectsAll, quotation],
  )
  const owner = useMemo(
    () => MOCK_USERS.find((u) => u.id === quotation?.owner),
    [quotation],
  )

  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [activeTab, setActiveTab] = useState('basic')

  if (detailLoading) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="size-4 mr-2" />
          返回
        </Button>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <div className="inline-block size-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin mb-3" />
            <div>加载中...</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!quotation) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="size-4 mr-2" />
          返回
        </Button>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            报价不存在
          </CardContent>
        </Card>
      </div>
    )
  }

  const statusInfo = QUOTATION_STATUS[quotation.status]

  const handleSend = async () => {
    setStatusLoading(true);
    try {
      await quotationMutations.updateStatus(id, 'sent');
      toast.success('报价已发送给客户')
    } catch (err) {
      toast.error('操作失败，请重试');
    } finally {
      setStatusLoading(false);
    }
  }

  const handleAccept = async () => {
    setStatusLoading(true);
    try {
      await quotationMutations.updateStatus(id, 'accepted');
      toast.success('报价已确认接受，可转为项目或订单')
    } catch (err) {
      toast.error('操作失败，请重试');
    } finally {
      setStatusLoading(false);
    }
  }

  const handleReject = async () => {
    setStatusLoading(true);
    try {
      await quotationMutations.updateStatus(id, 'rejected');
      setRejectOpen(false)
      setRejectReason('')
      toast.success('报价已标记为拒绝')
    } catch (err) {
      toast.error('操作失败，请重试');
    } finally {
      setStatusLoading(false);
    }
  }

  const handleVoid = async () => {
    setStatusLoading(true);
    try {
      await quotationMutations.updateStatus(id, 'void');
      toast.success('报价已作废')
    } catch (err) {
      toast.error('操作失败，请重试');
    } finally {
      setStatusLoading(false);
    }
  }

  const handleConvertToProject = async () => {
    setConverting(true);
    try {
      const result = await quotationMutations.convertToProject(id, {
        projectName: quotation.name,
        projectNo: `PROJ-${Date.now().toString().slice(-6)}`,
        owner: quotation.owner || 'user001',
        description: quotation.remark || '',
      });
      toast.success('已转为项目，跳转到项目池...')
      setTimeout(() => navigate('/projects'), 600)
    } catch (err) {
      toast.error('转项目失败，请重试');
    } finally {
      setConverting(false);
    }
  }

  const handleExportPdf = async () => {
    toast.loading('正在生成 PDF...', { id: 'export-pdf' });
    try {
      await new Promise((r) => setTimeout(r, 500));
      const statusLabel = QUOTATION_STATUS[quotation.status]?.label || quotation.status;
      const itemsHtml = quotation.items
        .map(
          (item, idx) => `
            <tr>
              <td>${idx + 1}</td>
              <td>${item.productName}<br><span style="color:#888;font-size:12px">${item.brand} / ${item.sku}</span></td>
              <td style="text-align:center">${item.unit}</td>
              <td style="text-align:right">${item.quantity}</td>
              <td style="text-align:right">¥${item.unitPrice.toLocaleString()}</td>
              <td style="text-align:right">${item.discount}%</td>
              <td style="text-align:right;font-weight:600">¥${item.subtotal.toLocaleString()}</td>
            </tr>
          `,
        )
        .join('');
      const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>${quotation.name} - 报价单</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif; color: #1a1a1a; padding: 40px; font-size: 14px; line-height: 1.6; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 24px; border-bottom: 2px solid #0033A0; margin-bottom: 24px; }
  .company { font-size: 20px; font-weight: bold; color: #0033A0; }
  .doc-title { font-size: 28px; font-weight: bold; text-align: right; }
  .doc-no { text-align: right; color: #666; margin-top: 6px; font-size: 13px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 24px; margin-bottom: 24px; padding: 16px 20px; background: #f8fafc; border-radius: 6px; }
  .info-item { display: flex; font-size: 13px; }
  .info-label { color: #666; min-width: 80px; }
  .info-value { font-weight: 500; flex: 1; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  th { background: #f1f5f9; font-weight: 600; text-align: left; padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
  td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
  .total-row { font-size: 16px; font-weight: bold; color: #0033A0; }
  .total-label { text-align: right; padding-right: 12px; }
  .remark { padding: 16px 20px; background: #f8fafc; border-radius: 6px; margin-bottom: 24px; font-size: 13px; }
  .remark-label { font-weight: 600; margin-bottom: 6px; }
  .footer { margin-top: 40px; display: flex; justify-content: space-between; font-size: 12px; color: #666; border-top: 1px solid #e2e8f0; padding-top: 16px; }
  .stamp-box { width: 120px; height: 120px; border: 2px dashed #ccc; display: flex; align-items: center; justify-content: center; color: #999; font-size: 12px; margin-left: auto; margin-top: 16px; }
  .sign-area { display: flex; justify-content: space-between; margin-top: 40px; }
  .sign-col { text-align: center; }
  .sign-line { width: 180px; border-bottom: 1px solid #333; margin: 40px auto 6px; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="company">${customer?.name || '客户名称'}</div>
      <div style="color:#666;margin-top:4px;font-size:13px">报价单 · Quotation</div>
    </div>
    <div>
      <div class="doc-title">报 价 单</div>
      <div class="doc-no">编号：${quotation.quotationNo}</div>
      <div class="doc-no">状态：${statusLabel}</div>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-item"><span class="info-label">客户名称：</span><span class="info-value">${customer?.name || '-'}</span></div>
    <div class="info-item"><span class="info-label">报价日期：</span><span class="info-value">${quotation.quotationDate}</span></div>
    <div class="info-item"><span class="info-label">联系人：</span><span class="info-value">${contact?.name || '-'}</span></div>
    <div class="info-item"><span class="info-label">有效期至：</span><span class="info-value">${quotation.validUntil}</span></div>
    <div class="info-item"><span class="info-label">联系电话：</span><span class="info-value">${contact?.mobile || customer?.phone || '-'}</span></div>
    <div class="info-item"><span class="info-label">报价人：</span><span class="info-value">${owner?.name || '-'}</span></div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:50px">序号</th>
        <th>产品名称</th>
        <th style="width:60px;text-align:center">单位</th>
        <th style="width:80px;text-align:right">数量</th>
        <th style="width:100px;text-align:right">单价</th>
        <th style="width:70px;text-align:right">折扣</th>
        <th style="width:110px;text-align:right">小计</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>

  <div style="text-align:right;margin-bottom:16px">
    <div style="font-size:18px;font-weight:bold;color:#0033A0">
      报价总金额（含税）：¥${quotation.total.toLocaleString()}
    </div>
    <div style="font-size:13px;color:#666;margin-top:4px;font-style:italic">
      大写：${numberToChinese(quotation.total)}
    </div>
  </div>

  ${quotation.remark ? `<div class="remark"><div class="remark-label">备注</div><div>${quotation.remark}</div></div>` : ''}

  <div class="sign-area">
    <div class="sign-col">
      <div class="sign-line"></div>
      <div>客户签字/盖章</div>
    </div>
    <div class="sign-col">
      <div class="sign-line"></div>
      <div>报价方签字/盖章</div>
    </div>
  </div>

  <div class="footer">
    <div>本报价单自出具之日起 ${quotation.validUntil ? `至 ${quotation.validUntil} 有效` : '30 日内有效'}</div>
    <div>第 1 页 / 共 1 页</div>
  </div>
</body>
</html>`;
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
          }, 300);
        };
        toast.success('PDF 预览已打开，可选择「另存为 PDF」', { id: 'export-pdf' });
      } else {
        toast.error('弹窗被拦截，请允许弹窗后重试', { id: 'export-pdf' });
      }
    } catch (err) {
      toast.error('导出失败，请重试', { id: 'export-pdf' });
    }
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
        <ArrowLeft className="size-4 mr-1.5" />
        返回报价列表
      </Button>

      {/* 顶部标题卡 */}
      <Card className="border border-border/40">
        <CardContent className="p-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="size-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  QT
                </div>
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-2xl font-bold text-foreground">
                      {quotation.name}
                    </h1>
                    <Badge variant="outline" className={`text-xs ${statusInfo?.color}`}>
                      {statusInfo?.label}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 font-mono">
                    {quotation.quotationNo}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {quotation.status === 'draft' && (
                <Button variant="outline" size="sm" onClick={handleSend}>
                  <Send className="size-3.5 mr-1" />
                  发送报价
                </Button>
              )}
              {quotation.status === 'sent' && (
                <>
                  <Button variant="outline" size="sm" onClick={handleAccept}>
                    <CheckCircle2 className="size-3.5 mr-1" />
                    标记接受
                  </Button>
                  <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-destructive">
                        <XCircle className="size-3.5 mr-1" />
                        标记拒绝
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>标记报价为拒绝</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-3 py-2">
                        <label className="text-sm font-medium">拒绝原因</label>
                        <Textarea
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder="请输入拒绝原因"
                          rows={4}
                        />
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setRejectOpen(false)}>
                          取消
                        </Button>
                        <Button variant="destructive" onClick={handleReject}>
                          确认拒绝
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </>
              )}
              {quotation.status === 'accepted' && (
                <Button variant="outline" size="sm" onClick={handleConvertToProject}>
                  <FolderKanban className="size-3.5 mr-1" />
                  转为项目
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handleExportPdf}>
                <Download className="size-3.5 mr-1" />
                导出PDF
              </Button>
              <Button size="sm" onClick={() => navigate(`/quotations/edit/${quotation.id}`)}>
                <Edit className="size-3.5 mr-1" />
                编辑
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-destructive">
                    <Trash2 className="size-3.5 mr-1" />
                    删除
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogTitle>确认删除报价？</AlertDialogTitle>
                  <AlertDialogDescription>
                    确定要删除报价「{quotation.name}」（{quotation.quotationNo}）吗？删除后无法恢复。
                  </AlertDialogDescription>
                  <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive hover:bg-destructive/90"
                      onClick={async () => {
                        try {
                          await quotationMutations.remove(quotation.id);
                          toast.success('报价已删除');
                          navigate('/quotations', { replace: true });
                        } catch (err) {
                          toast.error('删除失败，请重试');
                        }
                      }}
                    >
                      确认删除
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {/* 金额总览 */}
          <div className="mt-6 pt-6 border-t border-border/40 text-right">
            <p className="text-sm text-muted-foreground mb-1">报价总金额（含税）</p>
            <p className="text-3xl font-bold text-primary tabular-nums">
              ¥{quotation.total.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1 font-serif italic">
              {numberToChinese(quotation.total)}
            </p>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start bg-transparent border-b border-border/40 rounded-none p-0 h-auto">
          <TabsTrigger
            value="basic"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none h-9 px-4"
          >
            基本信息
          </TabsTrigger>
          <TabsTrigger
            value="items"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none h-9 px-4"
          >
            产品明细
          </TabsTrigger>
          <TabsTrigger
            value="attachments"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none h-9 px-4"
          >
            附件
          </TabsTrigger>
          <TabsTrigger
            value="followups"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none h-9 px-4"
          >
            跟进记录
          </TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="mt-6 space-y-6">
          <Card className="border border-border/40">
            <CardHeader>
              <CardTitle className="text-base">基本信息</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">报价单号</span>
                <span className="font-medium font-mono">{quotation.quotationNo}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">报价名称</span>
                <span className="font-medium">{quotation.name}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">关联客户</span>
                <button
                  className="text-primary hover:underline font-medium"
                  onClick={() => navigate(`/customers/${quotation.customerId}`)}
                >
                  {customer?.name || '-'}
                </button>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">联系人</span>
                <span className="font-medium">{contact?.name || '-'}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">关联商机</span>
                {opportunity ? (
                  <button
                    className="text-primary hover:underline font-medium flex items-center gap-1"
                    onClick={() => navigate(`/opportunities/${opportunity.id}`)}
                  >
                    <Briefcase className="size-3" />
                    {opportunity.name}
                  </button>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">关联项目</span>
                {project ? (
                  <button
                    className="text-primary hover:underline font-medium flex items-center gap-1"
                    onClick={() => navigate(`/projects/${project.id}`)}
                  >
                    <FolderKanban className="size-3" />
                    {project.name}
                  </button>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">报价日期</span>
                <span className="font-medium">{quotation.quotationDate}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">有效期至</span>
                <span className="font-medium">{quotation.validUntil}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">报价人</span>
                <span className="font-medium">{owner?.name || '-'}</span>
              </div>
              <div className="md:col-span-2 pt-2 border-t border-border/40">
                <p className="text-sm text-muted-foreground mb-1.5">备注</p>
                <p className="text-sm leading-relaxed">{quotation.remark || '-'}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="items" className="mt-6 space-y-6">
          <Card className="border border-border/40">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">产品明细</CardTitle>
              <Badge variant="outline" className="text-xs">
                共 {quotation.items.length} 项
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              <div className="w-full overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/40 bg-muted/30">
                      <th className="text-left font-medium text-muted-foreground px-4 py-3 whitespace-nowrap w-16">
                        序号
                      </th>
                      <th className="text-left font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">
                        产品名称
                      </th>
                      <th className="text-left font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">
                        品牌
                      </th>
                      <th className="text-left font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">
                        规格/物料号
                      </th>
                      <th className="text-center font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">
                        单位
                      </th>
                      <th className="text-right font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">
                        数量
                      </th>
                      <th className="text-right font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">
                        单价
                      </th>
                      <th className="text-right font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">
                        折扣
                      </th>
                      <th className="text-right font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">
                        小计
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotation.items.map((item, idx) => (
                      <tr key={item.id} className="border-b border-border/30">
                        <td className="px-4 py-3 text-center text-muted-foreground">
                          {idx + 1}
                        </td>
                        <td className="px-4 py-3 font-medium">{item.productName}</td>
                        <td className="px-4 py-3 text-muted-foreground">{item.brand}</td>
                        <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                          {item.sku}
                        </td>
                        <td className="px-4 py-3 text-center">{item.unit}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{item.quantity}</td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          ¥{item.unitPrice.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">{item.discount}%</td>
                        <td className="px-4 py-3 text-right tabular-nums font-semibold">
                          ¥{item.subtotal.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border/60 bg-primary/5">
                      <td colSpan={8} className="px-4 py-3 text-right font-bold text-foreground">
                        合计（含税）
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-primary tabular-nums text-lg">
                        ¥{quotation.total.toLocaleString()}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={9} className="px-4 py-2 text-right text-xs text-muted-foreground font-serif italic">
                        大写金额：{numberToChinese(quotation.total)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attachments" className="mt-6 space-y-6">
          <Card className="border border-border/40">
            <CardHeader>
              <CardTitle className="text-base">附件列表</CardTitle>
            </CardHeader>
            <CardContent>
              <AttachmentList attachments={quotation.attachments} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="followups" className="mt-6 space-y-6">
          <Card className="border border-border/40">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">跟进记录</CardTitle>
              <Button size="sm" variant="outline">
                <Plus className="size-3.5 mr-1" />
                新增跟进
              </Button>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground text-sm">
                暂无跟进记录
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

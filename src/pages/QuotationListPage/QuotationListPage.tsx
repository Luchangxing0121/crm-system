import { useState, useMemo } from 'react'
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
  Search,
  Plus,
  Receipt,
  CheckCircle2,
  Clock,
  Send,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { QUOTATION_STATUS } from '@/data/quotations'
import { MOCK_USERS } from '@/data/users'
import { useQuotations, quotationMutations, useCustomers } from '@/hooks/use-crm-store'

export default function QuotationListPage() {
  const navigate = useNavigate()
  const [quotations] = useQuotations()
  const [customersAll] = useCustomers()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const pageSize = 8

  const filtered = useMemo(() => {
    return quotations.filter((q) => {
      if (keyword) {
        const kw = keyword.toLowerCase()
        const customer = customersAll.find((c) => c.id === q.customerId)?.name || ''
        if (
          !q.quotationNo.toLowerCase().includes(kw) &&
          !q.name.toLowerCase().includes(kw) &&
          !customer.toLowerCase().includes(kw)
        )
          return false
      }
      if (statusFilter !== 'all' && q.status !== statusFilter) return false
      return true
    })
  }, [quotations, keyword, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const pagedList = filtered.slice((page - 1) * pageSize, page * pageSize)

  const totalAmount = filtered.reduce((sum, q) => sum + q.total, 0)
  const sentCount = filtered.filter((q) => q.status === 'sent').length
  const acceptedCount = filtered.filter((q) => q.status === 'accepted').length

  const handleDelete = async (id: string) => {
    const q = quotations.find((x) => x.id === id)
    setDeletingId(id)
    try {
      await quotationMutations.remove(id)
      toast.success(`报价「${q?.quotationNo}」已删除`)
    } catch (err) {
      toast.error('删除失败，请重试')
    } finally {
      setDeletingId(null)
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
                <p className="text-sm text-muted-foreground">报价总数</p>
                <p className="text-2xl font-bold tracking-tight">{filtered.length}</p>
              </div>
              <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Receipt className="size-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/40">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1.5">
                <p className="text-sm text-muted-foreground">进行中</p>
                <p className="text-2xl font-bold tracking-tight text-blue-600">{sentCount}</p>
              </div>
              <div className="size-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Send className="size-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/40">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1.5">
                <p className="text-sm text-muted-foreground">已成交</p>
                <p className="text-2xl font-bold tracking-tight text-emerald-600">
                  {acceptedCount}
                </p>
              </div>
              <div className="size-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="size-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/40">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1.5">
                <p className="text-sm text-muted-foreground">报价总金额</p>
                <p className="text-2xl font-bold tracking-tight">
                  ¥{(totalAmount / 10000).toFixed(1)}万
                </p>
              </div>
              <div className="size-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Clock className="size-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 工具栏 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">报价管理</h1>
          <p className="text-sm text-muted-foreground mt-1">
            共 {filtered.length} 份报价，总金额 ¥{totalAmount.toLocaleString()}
          </p>
        </div>
        <Button onClick={() => navigate('/quotations/new')}>
          <Plus className="size-4 mr-1.5" />
          新增报价
        </Button>
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
                onChange={(e) => {
                  setKeyword(e.target.value)
                  setPage(1)
                }}
                placeholder="搜索报价单号 / 名称 / 客户"
                className="bg-background pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="全部状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="draft">草稿</SelectItem>
                <SelectItem value="sent">已发送</SelectItem>
                <SelectItem value="accepted">已接受</SelectItem>
                <SelectItem value="rejected">已拒绝</SelectItem>
                <SelectItem value="expired">已过期</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 报价列表 */}
      <Card className="border border-border/40">
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-muted/30">
                  <th className="text-left font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">
                    报价单号
                  </th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">
                    报价名称
                  </th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">
                    关联客户
                  </th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">
                    状态
                  </th>
                  <th className="text-right font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">
                    报价金额
                  </th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">
                    有效期至
                  </th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">
                    创建人
                  </th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">
                    创建时间
                  </th>
                  <th className="text-right font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {pagedList.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                      暂无报价数据
                    </td>
                  </tr>
                ) : (
                  pagedList.map((q) => {
                    const customer = customersAll.find((c) => c.id === q.customerId)
                    const owner = MOCK_USERS.find((u) => u.id === q.owner)
                    const statusInfo = QUOTATION_STATUS[q.status]
                    return (
                      <tr key={q.id} className="border-b border-border/30 hover:bg-muted/20">
                        <td className="px-4 py-3 font-mono text-xs">
                          <button
                            onClick={() => navigate(`/quotations/${q.id}`)}
                            className="text-primary hover:underline"
                          >
                            {q.quotationNo}
                          </button>
                        </td>
                        <td className="px-4 py-3 font-medium">{q.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {customer?.name || '-'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={`text-xs ${statusInfo?.color}`}
                          >
                            {statusInfo?.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-semibold text-primary">
                          ¥{q.total.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {q.validUntil}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {owner?.name || '-'}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {q.createdAt.split(' ')[0]}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => navigate(`/quotations/${q.id}`)}
                            >
                              查看
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-destructive"
                              onClick={() => handleDelete(q.id)}
                            >
                              删除
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border/40">
              <span className="text-xs text-muted-foreground">
                共 {filtered.length} 条，第 {page}/{totalPages} 页
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

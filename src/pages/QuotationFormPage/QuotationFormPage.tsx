import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { Card, CardHeader, CardContent, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
  RadioGroup,
  RadioGroupItem,
} from '@/components/ui/radio-group'
import {
  Search,
  Plus,
  Trash2,
  ArrowLeft,
  Save,
  ChevronLeft,
  ChevronRight,
  Package,
  Calculator,
  Download,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'
import {
  TAX_RATES,
  type IQuotation,
  type IQuotationItem,
} from '@/data/quotations'
import { PRODUCT_CATEGORIES as DEFAULT_CATEGORIES } from '@/data/products'
import { MOCK_CURRENT_USER } from '@/data/users'
import { useAuth } from '@/contexts/AuthContext'
import FileUploader from '@/components/FileUpload/FileUploader'
import type { UploadedFile } from '@/components/FileUpload/FileUploader'
import { useQuotations, quotationMutations, useProducts, useCustomers, useContacts, useOpportunities, useProjects } from '@/hooks/use-crm-store'
import { quotationApi } from '@/services/api'
import { scopedStorage } from '@lark-apaas/client-toolkit-lite';

function generateQuotationNo(): string {
  const year = new Date().getFullYear()
  const no = String(Math.floor(Math.random() * 9000) + 1000).padStart(4, '0')
  return `QT-${year}-${no}`
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return formatDate(new Date(d))
}

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

export default function QuotationFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const isEdit = !!id && !location.pathname.endsWith('/new')
  const { user } = useAuth()

  const [quotations] = useQuotations()
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(isEdit)
  const [loadedQuotation, setLoadedQuotation] = useState<IQuotation | null>(null)

  // 编辑模式：先查缓存，缓存没有就调详情接口拿完整数据（含items明细）
  useEffect(() => {
    if (!isEdit || !id) {
      setLoading(false)
      return
    }
    const cached = quotations.find((q) => q.id === id)
    if (cached && cached.items && Array.isArray(cached.items)) {
      setLoadedQuotation(cached)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    quotationApi.detail(id)
      .then((res) => {
        if (cancelled) return
        const q = res as unknown as IQuotation
        setLoadedQuotation(q)
      })
      .catch(() => {
        if (!cancelled) {
          toast.error('加载报价单失败，请返回重试')
          navigate('/quotations')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [isEdit, id, quotations, navigate])

  const existing = loadedQuotation

  const today = formatDate()

  const [quotationNo, setQuotationNo] = useState(generateQuotationNo())
  const [name, setName] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [linkType, setLinkType] = useState<'none' | 'opportunity' | 'project'>('none')
  const [opportunityId, setOpportunityId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [contactId, setContactId] = useState('')
  const [quotationDate, setQuotationDate] = useState(today)
  const [validUntil, setValidUntil] = useState(addDays(today, 30))
  const [owner, setOwner] = useState(user?.id ?? MOCK_CURRENT_USER.id)
  const [taxRate, setTaxRate] = useState(0.13)
  const [remark, setRemark] = useState('')
  const [items, setItems] = useState<IQuotationItem[]>([])

  // 编辑模式下，数据加载完成后回填表单
  useEffect(() => {
    if (!isEdit || !existing) return
    setQuotationNo(existing.quotationNo || generateQuotationNo())
    setName(existing.name || '')
    setCustomerId(existing.customerId || '')
    if (existing.opportunityId) setLinkType('opportunity')
    else if (existing.projectId) setLinkType('project')
    else setLinkType('none')
    setOpportunityId(existing.opportunityId || '')
    setProjectId(existing.projectId || '')
    setContactId(existing.contactId || '')
    setQuotationDate(existing.quotationDate || today)
    setValidUntil(existing.validUntil || addDays(today, 30))
    setOwner(existing.owner || user?.id || MOCK_CURRENT_USER.id)
    setTaxRate(existing.taxRate ?? 0.13)
    setRemark(existing.remark || '')
    setItems(existing.items && existing.items.length > 0 ? existing.items : [])
  }, [isEdit, existing, today])
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})

  // 产品选择弹窗
  const [productDialogOpen, setProductDialogOpen] = useState(false)
  const [costDialogOpen, setCostDialogOpen] = useState(false)
  const [productKeyword, setProductKeyword] = useState('')
  const [productCategory, setProductCategory] = useState('all')
  const [products] = useProducts()
  const [customersAll] = useCustomers()
  const [liveContacts] = useContacts()
  const [liveOpportunities] = useOpportunities()
  const [liveProjects] = useProjects()
  const [productCategories, setProductCategories] = useState<string[]>(DEFAULT_CATEGORIES)

  useEffect(() => {
    try {
      const saved = scopedStorage.getItem('product_categories')
      if (saved) {
        const parsed = JSON.parse(saved) as string[]
        if (Array.isArray(parsed) && parsed.length > 0) {
          setProductCategories(parsed)
        }
      }
    } catch {
      // ignore
    }
  }, [])
  const [visibleCount, setVisibleCount] = useState(10)
  const productScrollRef = useRef<HTMLDivElement>(null)

  const customerContacts = useMemo(
    () => liveContacts.filter((c) => c.customerId === customerId),
    [liveContacts, customerId],
  )

  const customerOpportunities = useMemo(
    () => liveOpportunities.filter((o) => o.customerId === customerId),
    [liveOpportunities, customerId],
  )

  const customerProjects = useMemo(
    () => liveProjects.filter((p) => p.customerId === customerId),
    [liveProjects, customerId],
  )

  const ownerUser = useMemo(
    () => (user ? { id: user.id, name: user.name } : { id: MOCK_CURRENT_USER.id, name: MOCK_CURRENT_USER.name }),
    [user],
  )

  // 新增报价时：报价人始终与当前登录用户保持一致
  useEffect(() => {
    if (!isEdit && user?.id) {
      setOwner(user.id)
    }
  }, [user?.id, isEdit])

  // 金额计算
  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.subtotal, 0),
    [items],
  )
  const total = useMemo(() => subtotal, [subtotal])

  // 产品筛选
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (productKeyword) {
        const kw = productKeyword.toLowerCase()
        if (
          !p.name.toLowerCase().includes(kw) &&
          !p.sku.toLowerCase().includes(kw) &&
          !p.brand.toLowerCase().includes(kw)
        )
          return false
      }
      if (productCategory !== 'all' && p.category !== productCategory) return false
      return true
    })
  }, [products, productKeyword, productCategory])

  // 筛选变化时重置可见数量
  useEffect(() => {
    setVisibleCount(10)
    // 滚动回到顶部
    if (productScrollRef.current) {
      productScrollRef.current.scrollTop = 0
    }
  }, [productKeyword, productCategory])

  // 滚动加载更多
  const handleProductScroll = useCallback(() => {
    const el = productScrollRef.current
    if (!el) return
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) {
      setVisibleCount((prev) => Math.min(prev + 10, filteredProducts.length))
    }
  }, [filteredProducts.length])

  const visibleProducts = useMemo(
    () => filteredProducts.slice(0, visibleCount),
    [filteredProducts, visibleCount],
  )

  if (loading) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="size-4 mr-1.5" />
          返回
        </Button>
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <div className="inline-block size-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin mb-3" />
            <div>加载报价数据中...</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    if (!name.trim()) errs.name = '请输入报价名称'
    if (!customerId) errs.customerId = '请选择关联客户'
    if (!quotationDate) errs.quotationDate = '请选择报价日期'
    if (!validUntil) errs.validUntil = '请选择有效期'
    if (items.length === 0) errs.items = '请至少添加一项产品'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const addProduct = (productId: string) => {
    const product = products.find((p) => p.id === productId)
    if (!product) return
    const existing = items.find((i) => i.productId === productId)
    if (existing) {
      setItems(
        items.map((i) =>
          i.productId === productId
            ? { ...i, quantity: i.quantity + 1, subtotal: (i.quantity + 1) * i.unitPrice * (i.discount / 100) }
            : i,
        ),
      )
    } else {
      const newItem: IQuotationItem = {
        id: `qi-${Date.now()}`,
        productId: product.id,
        productName: product.name,
        brand: product.brand,
        sku: product.sku,
        unit: product.unit,
        quantity: 1,
        unitPrice: product.retailPrice,
        channelPrice: product.channelPrice,
        discount: 100,
        subtotal: product.retailPrice,
      }
      setItems([...items, newItem])
    }
    toast.success(`已添加「${product.name}」`)
  }

  const updateItem = (itemId: string, field: keyof IQuotationItem, value: number) => {
    setItems(
      items.map((i) => {
        if (i.id !== itemId) return i
        const updated = { ...i, [field]: value }
        updated.subtotal = +(updated.unitPrice * updated.quantity * (updated.discount / 100)).toFixed(2)
        return updated
      }),
    )
  }

  const removeItem = (itemId: string) => {
    setItems(items.filter((i) => i.id !== itemId))
  }

  const buildPayload = (status: IQuotation['status']) => {
    return {
      quotationNo,
      name: name.trim(),
      customerId,
      opportunityId: linkType === 'opportunity' ? opportunityId : undefined,
      projectId: linkType === 'project' ? projectId : undefined,
      contactId: contactId || undefined,
      status,
      quotationDate,
      validUntil,
      owner,
      taxRate,
      items: [...items],
      subtotal,
      taxAmount: 0,
      total,
      remark: remark.trim(),
    }
  }

  const handleSaveDraft = async () => {
    if (!validate()) return
    setSaving(true);
    try {
      if (isEdit) {
        await quotationMutations.update(id, buildPayload('draft'));
        toast.success('报价草稿已更新')
      } else {
        await quotationMutations.create(buildPayload('draft'));
        toast.success('报价草稿已保存')
      }
      setTimeout(() => navigate('/quotations'), 500)
    } catch (err) {
      toast.error('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  }

  const handleSaveAndSend = async () => {
    if (!validate()) return
    setSaving(true);
    try {
      if (isEdit) {
        await quotationMutations.update(id, buildPayload('sent'));
        toast.success('报价已更新并发送给客户')
      } else {
        await quotationMutations.create(buildPayload('sent'));
        toast.success('报价已保存并发送给客户')
      }
      setTimeout(() => navigate('/quotations'), 800)
    } catch (err) {
      toast.error('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
        <ArrowLeft className="size-4 mr-1.5" />
        返回报价列表
      </Button>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {isEdit ? '编辑报价' : '新增报价'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-mono">{quotationNo}</p>
        </div>
        <div className="flex items-center gap-2">
        </div>
      </div>

      {/* 基本信息区 */}
      <Card className="border border-border/40">
        <CardHeader>
          <CardTitle className="text-base">基本信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>
                报价单号 <span className="text-muted-foreground">(自动生成)</span>
              </Label>
              <Input value={quotationNo} readOnly className="bg-muted/30 font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label>
                报价名称 <span className="text-destructive">*</span>
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="请输入报价名称"
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>
                关联客户 <span className="text-destructive">*</span>
              </Label>
              <Select value={customerId} onValueChange={(v) => {
                setCustomerId(v)
                setContactId('')
                setOpportunityId('')
                setProjectId('')
              }}>
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
              {errors.customerId && (
                <p className="text-xs text-destructive">{errors.customerId}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>联系人</Label>
              <Select
                value={contactId}
                onValueChange={setContactId}
                disabled={!customerId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={customerId ? '请选择联系人' : '请先选择客户'} />
                </SelectTrigger>
                <SelectContent>
                  {customerContacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}（{c.position}）
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="pt-2 border-t border-border/40">
            <Label className="mb-2 block">关联类型</Label>
            <RadioGroup
              value={linkType}
              onValueChange={(v: 'none' | 'opportunity' | 'project') => {
                setLinkType(v)
                if (v === 'none') {
                  setOpportunityId('')
                  setProjectId('')
                } else if (v === 'opportunity') {
                  setProjectId('')
                } else {
                  setOpportunityId('')
                }
              }}
              className="flex flex-wrap gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="none" id="link-none" />
                <Label htmlFor="link-none" className="cursor-pointer font-normal">
                  不关联
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="opportunity" id="link-opp" disabled={!customerId} />
                <Label htmlFor="link-opp" className="cursor-pointer font-normal">
                  关联商机
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="project" id="link-proj" disabled={!customerId} />
                <Label htmlFor="link-proj" className="cursor-pointer font-normal">
                  关联项目
                </Label>
              </div>
            </RadioGroup>
          </div>

          {linkType === 'opportunity' && customerId && (
            <div className="space-y-1.5">
              <Label>关联商机</Label>
              <Select value={opportunityId} onValueChange={setOpportunityId}>
                <SelectTrigger>
                  <SelectValue placeholder="请选择商机" />
                </SelectTrigger>
                <SelectContent>
                  {customerOpportunities.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {linkType === 'project' && customerId && (
            <div className="space-y-1.5">
              <Label>关联项目</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="请选择项目" />
                </SelectTrigger>
                <SelectContent>
                  {customerProjects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="space-y-1.5">
              <Label>报价日期</Label>
              <Input
                type="date"
                value={quotationDate}
                onChange={(e) => setQuotationDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>有效期至</Label>
              <Input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>报价人</Label>
              <Input value={ownerUser.name} readOnly className="bg-muted/30" />
            </div>
          </div>

          <div className="space-y-1.5 pt-2">
            <Label>备注</Label>
            <Textarea
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="请输入报价备注"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* 报价明细区 */}
      <Card className="border border-border/40">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">报价明细</CardTitle>
          <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="size-3.5 mr-1" />
                添加产品
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col p-0">
              <div className="px-6 pt-6">
                <DialogHeader>
                  <DialogTitle>选择产品</DialogTitle>
                </DialogHeader>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="search"
                      value={productKeyword}
                      onChange={(e) => setProductKeyword(e.target.value)}
                      placeholder="搜索产品名称/物料号/品牌"
                      className="bg-background pl-9"
                    />
                  </div>
                  <Select value={productCategory} onValueChange={(v) => setProductCategory(v)}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="全部分类" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部分类</SelectItem>
                      {productCategories.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div
                  ref={productScrollRef}
                  onScroll={handleProductScroll}
                  className="border border-border/40 rounded-lg overflow-y-auto max-h-[360px]"
                >
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-muted/30">
                      <tr className="border-b border-border/40">
                        <th className="text-left font-medium text-muted-foreground px-3 py-2">产品名称</th>
                        <th className="text-left font-medium text-muted-foreground px-3 py-2">品牌</th>
                        <th className="text-right font-medium text-muted-foreground px-3 py-2">RRP最低限价</th>
                        <th className="text-right font-medium text-muted-foreground px-3 py-2">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleProducts.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                            暂无产品
                          </td>
                        </tr>
                      ) : (
                        visibleProducts.map((p) => (
                          <tr key={p.id} className="border-b border-border/30 hover:bg-muted/20">
                            <td className="px-3 py-2 font-medium">{p.name}</td>
                            <td className="px-3 py-2 text-muted-foreground">{p.brand}</td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              ¥{p.retailPrice.toLocaleString()}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => addProduct(p.id)}
                              >
                                添加
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {visibleCount < filteredProducts.length && (
                  <div className="text-xs text-center text-muted-foreground py-2">
                    下滑加载更多（已显示 {visibleCount} / 共 {filteredProducts.length} 条）
                  </div>
                )}
                {visibleCount >= filteredProducts.length && filteredProducts.length > 0 && (
                  <div className="text-xs text-center text-muted-foreground py-2">
                    已加载全部 {filteredProducts.length} 条
                  </div>
                )}
              </div>
              <div className="px-6 py-4 border-t border-border/40 shrink-0">
                <DialogFooter>
                  <Button variant="outline" onClick={() => setProductDialogOpen(false)}>
                    关闭
                  </Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="p-0">
          {errors.items && (
            <div className="px-4 pt-3 text-xs text-destructive">{errors.items}</div>
          )}
          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-muted/30">
                  <th className="text-left font-medium text-muted-foreground px-3 py-2 w-12">序号</th>
                  <th className="text-left font-medium text-muted-foreground px-3 py-2">产品名称</th>
                  <th className="text-left font-medium text-muted-foreground px-3 py-2">品牌</th>
                  <th className="text-left font-medium text-muted-foreground px-3 py-2">规格/物料号</th>
                  <th className="text-center font-medium text-muted-foreground px-3 py-2 w-16">单位</th>
                  <th className="text-right font-medium text-muted-foreground px-3 py-2 w-24">数量</th>
                  <th className="text-right font-medium text-muted-foreground px-3 py-2 w-32">单价</th>
                  <th className="text-right font-medium text-muted-foreground px-3 py-2 w-24">折扣%</th>
                  <th className="text-right font-medium text-muted-foreground px-3 py-2 w-28">小计</th>
                  <th className="text-center font-medium text-muted-foreground px-3 py-2 w-12">操作</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-muted-foreground">
                      <Package className="size-8 mx-auto mb-2 opacity-30" />
                      暂无产品，点击右上角「添加产品」开始
                    </td>
                  </tr>
                ) : (
                  items.map((item, idx) => (
                    <tr key={item.id} className="border-b border-border/30">
                      <td className="px-3 py-2 text-center text-muted-foreground">{idx + 1}</td>
                      <td className="px-3 py-2 font-medium">{item.productName}</td>
                      <td className="px-3 py-2 text-muted-foreground">{item.brand}</td>
                      <td className="px-3 py-2 text-muted-foreground font-mono text-xs">{item.sku}</td>
                      <td className="px-3 py-2 text-center">{item.unit}</td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                          className="h-8 text-right"
                          min={0}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="h-8 text-right tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          min={0}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          value={item.discount}
                          onChange={(e) => updateItem(item.id, 'discount', parseFloat(e.target.value) || 0)}
                          className="h-8 text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          min={0}
                          max={100}
                        />
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums font-semibold">
                        ¥{item.subtotal.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
        <CardFooter className="flex-col items-end border-t border-border/40 gap-2 py-4">
          <div className="flex items-center justify-between w-full max-w-md pt-2">
            <span className="font-bold">报价合计（含税）</span>
            <div className="text-right">
              <div className="text-xl font-bold text-primary tabular-nums">
                ¥{total.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground font-serif italic">
                {numberToChinese(total)}
              </div>
            </div>
          </div>
        </CardFooter>
      </Card>

      {/* 底部操作 */}
      <div className="flex items-center justify-between gap-2 sticky bottom-0 bg-background py-4 border-t border-border/40 z-10">
        <Dialog open={costDialogOpen} onOpenChange={setCostDialogOpen}>
          <Button
            variant="outline"
            onClick={() => setCostDialogOpen(true)}
            disabled={items.length === 0}
          >
            <Calculator className="size-3.5 mr-1" />
            成本核算
          </Button>
          <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>采购成本清单</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto">
              <div className="w-full overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/30 border-b border-border/40">
                      <th className="text-left font-medium text-muted-foreground px-3 py-2 whitespace-nowrap">序号</th>
                      <th className="text-left font-medium text-muted-foreground px-3 py-2 whitespace-nowrap">产品名称</th>
                      <th className="text-left font-medium text-muted-foreground px-3 py-2 whitespace-nowrap">品牌</th>
                      <th className="text-center font-medium text-muted-foreground px-3 py-2 whitespace-nowrap">单位</th>
                      <th className="text-right font-medium text-muted-foreground px-3 py-2 whitespace-nowrap">数量</th>
                      <th className="text-right font-medium text-muted-foreground px-3 py-2 whitespace-nowrap">RRP单价</th>
                      <th className="text-right font-medium text-muted-foreground px-3 py-2 whitespace-nowrap">渠道价</th>
                      <th className="text-right font-medium text-muted-foreground px-3 py-2 whitespace-nowrap">折扣率</th>
                      <th className="text-right font-medium text-muted-foreground px-3 py-2 whitespace-nowrap">成本小计</th>
                      <th className="text-right font-medium text-muted-foreground px-3 py-2 whitespace-nowrap">报价小计</th>
                      <th className="text-right font-medium text-muted-foreground px-3 py-2 whitespace-nowrap">毛利</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="px-3 py-8 text-center text-muted-foreground">暂无产品</td>
                      </tr>
                    ) : (
                      items.map((item, idx) => {
                        const costSubtotal = +(item.channelPrice * item.quantity).toFixed(2)
                        const quoteSubtotal = +item.subtotal.toFixed(2)
                        const profit = +(quoteSubtotal - costSubtotal).toFixed(2)
                        const profitRate = costSubtotal > 0 ? ((profit / costSubtotal) * 100).toFixed(1) : '0.0'
                        // 折扣率 = 渠道价 / RRP单价，表示成本占零售价的比例
                        const costRatio = item.unitPrice > 0 ? ((item.channelPrice / item.unitPrice) * 100).toFixed(1) : '0.0'
                        return (
                          <tr key={item.id} className="border-b border-border/30">
                            <td className="px-3 py-2 text-center text-muted-foreground">{idx + 1}</td>
                            <td className="px-3 py-2 font-medium">{item.productName}</td>
                            <td className="px-3 py-2 text-muted-foreground">{item.brand}</td>
                            <td className="px-3 py-2 text-center">{item.unit}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{item.quantity}</td>
                            <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">¥{item.unitPrice.toLocaleString()}</td>
                            <td className="px-3 py-2 text-right tabular-nums">¥{item.channelPrice.toLocaleString()}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{costRatio}%</td>
                            <td className="px-3 py-2 text-right tabular-nums">¥{costSubtotal.toLocaleString()}</td>
                            <td className="px-3 py-2 text-right tabular-nums font-medium">¥{quoteSubtotal.toLocaleString()}</td>
                            <td className={`px-3 py-2 text-right tabular-nums font-semibold ${profit >= 0 ? 'text-[hsl(142_60%_28%)]' : 'text-destructive'}`}>
                              ¥{profit.toLocaleString()}
                              <span className="text-xs ml-1 opacity-70">({profitRate}%)</span>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="border-t border-border/40 pt-4 mt-2">
              <div className="flex items-center justify-end gap-8">
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">采购成本合计</div>
                  <div className="text-base font-semibold tabular-nums">
                    ¥{items.reduce((s, i) => s + i.channelPrice * i.quantity, 0).toLocaleString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">报价合计</div>
                  <div className="text-base font-semibold text-primary tabular-nums">¥{total.toLocaleString()}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">预计毛利</div>
                  <div className="text-lg font-bold text-[hsl(142_60%_28%)] tabular-nums">
                    ¥{(total - items.reduce((s, i) => s + i.channelPrice * i.quantity, 0)).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const rows = [
                    ['序号', '产品名称', '品牌', '单位', '数量', 'RRP单价', '渠道价', '折扣率', '成本小计', '报价小计', '毛利'],
                    ...items.map((item, idx) => [
                      String(idx + 1),
                      item.productName,
                      item.brand,
                      item.unit,
                      String(item.quantity),
                      String(item.unitPrice),
                      String(item.channelPrice),
                      `${item.discount}%`,
                      String(+(item.channelPrice * item.quantity).toFixed(2)),
                      String(+item.subtotal.toFixed(2)),
                      String(+(item.subtotal - item.channelPrice * item.quantity).toFixed(2)),
                    ]),
                  ]
                  const csv = rows.map((r) => r.join(',')).join('\n')
                  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `采购成本清单-${quotationNo}.csv`
                  a.click()
                  URL.revokeObjectURL(url)
                  toast.success('已导出成本清单')
                }}
              >
                <Download className="size-3.5 mr-1" />
                导出CSV
              </Button>
              <Button variant="outline" onClick={() => setCostDialogOpen(false)}>
                关闭
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate(-1)}>
            取消
          </Button>
          <Button variant="outline" onClick={handleSaveDraft}>
            <Save className="size-3.5 mr-1" />
            保存草稿
          </Button>
          <Button onClick={handleSaveAndSend}>
            <Save className="size-3.5 mr-1" />
            保存
          </Button>
        </div>
      </div>
    </div>
  )
}

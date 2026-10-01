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
  Search,
  Plus,
  Package,
  Tag,
  ChevronLeft,
  ChevronRight,
  Edit,
  Trash2,
  Eye,
  Upload,
  X,
  Settings,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils';
import { useNavigate } from 'react-router-dom'
import { scopedStorage } from '@lark-apaas/client-toolkit-lite';
import { IProduct, PRODUCT_CATEGORIES as DEFAULT_CATEGORIES, PRODUCT_UNITS, TAX_RATES } from '@/data/products'
import { useProducts, productMutations } from '@/hooks/use-crm-store'
import { Textarea } from '@/components/ui/textarea'

const categoryColorMap: Record<string, string> = {
  'Matrice 行业机': 'bg-blue-50 text-blue-700 border-blue-200',
  '机场': 'bg-cyan-50 text-cyan-700 border-cyan-200',
  '禅思负载': 'bg-violet-50 text-violet-700 border-violet-200',
  '软件/服务': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Mavic 行业机': 'bg-sky-50 text-sky-700 border-sky-200',
  '配件/耗材': 'bg-amber-50 text-amber-700 border-amber-200',
  '电池/充电': 'bg-lime-50 text-lime-700 border-lime-200',
  '遥控器/地面站': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'RTK/定位': 'bg-teal-50 text-teal-700 border-teal-200',
  '妙算/算力': 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
  'DJI Care/服务': 'bg-rose-50 text-rose-700 border-rose-200',
  '无人机保险': 'bg-orange-50 text-orange-700 border-orange-200',
  '系统平台': 'bg-slate-100 text-slate-700 border-slate-200',
}

const CATEGORIES_STORAGE_KEY = 'product_categories';

const emptyForm: Omit<IProduct, 'id' | 'createdAt'> = {
  name: '',
  brand: '',
  category: DEFAULT_CATEGORIES[0],
  sku: '',
  channelPrice: 0,
  retailPrice: 0,
  unit: '个',
  taxRate: 13,
  stock: 0,
  description: '',
}

export default function ProductListPage() {
  const navigate = useNavigate()
  const [products] = useProducts()
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [keyword, setKeyword] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [page, setPage] = useState(1)
  const pageSize = 20

  // 分类管理
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES)
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')

  // 加载本地存储的分类
  useEffect(() => {
    try {
      const saved = scopedStorage.getItem(CATEGORIES_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as string[]
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCategories(parsed)
        }
      }
    } catch {
      // ignore
    }
  }, [])

  const persistCategories = (list: string[]) => {
    setCategories(list)
    try {
      scopedStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(list))
    } catch {
      // ignore
    }
  }

  const handleAddCategory = () => {
    const name = newCategoryName.trim()
    if (!name) {
      toast.error('请输入分类名称')
      return
    }
    if (categories.includes(name)) {
      toast.error('该分类已存在')
      return
    }
    persistCategories([...categories, name])
    setNewCategoryName('')
    toast.success(`已新增分类「${name}」`)
  }

  const handleRemoveCategory = (name: string) => {
    const inUse = products.some((p) => p.category === name)
    if (inUse) {
      toast.error(`分类「${name}」下还有产品，无法删除`)
      return
    }
    if (categories.length <= 1) {
      toast.error('至少保留一个分类')
      return
    }
    const newList = categories.filter((c) => c !== name)
    persistCategories(newList)
    if (categoryFilter === name) setCategoryFilter('all')
    toast.success(`已删除分类「${name}」`)
  }

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (keyword) {
        const kw = keyword.toLowerCase()
        if (
          !p.name.toLowerCase().includes(kw) &&
          !p.sku.toLowerCase().includes(kw) &&
          !p.brand.toLowerCase().includes(kw)
        )
          return false
      }
      if (categoryFilter !== 'all' && p.category !== categoryFilter) return false
      return true
    })
  }, [products, keyword, categoryFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const pagedList = filtered.slice((page - 1) * pageSize, page * pageSize)

  const categoryCount = new Set(filtered.map((p) => p.category)).size

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.name.trim()) errs.name = '请输入产品名称'
    if (!form.sku.trim()) errs.sku = '请输入物料号'
    if (form.channelPrice < 0) errs.channelPrice = '渠道价不能为负数'
    if (form.retailPrice < 0) errs.retailPrice = '建议零售价不能为负数'
    if (form.stock < 0) errs.stock = '库存不能为负数'
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  const openCreate = () => {
    setEditingId(null)
    setForm({ ...emptyForm, category: categories[0] || emptyForm.category })
    setFormErrors({})
    setDialogOpen(true)
  }

  const openEdit = (product: IProduct) => {
    setEditingId(product.id)
    setForm({
      name: product.name,
      brand: product.brand,
      category: product.category,
      sku: product.sku,
      channelPrice: product.channelPrice,
      retailPrice: product.retailPrice,
      unit: product.unit,
      taxRate: product.taxRate,
      stock: product.stock,
      description: product.description,
    })
    setFormErrors({})
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      if (editingId) {
        await productMutations.update(editingId, form)
        toast.success(`产品「${form.name}」已更新`)
      } else {
        await productMutations.create(form)
        toast.success(`产品「${form.name}」已创建`)
      }
      setDialogOpen(false)
    } catch (err) {
      toast.error('保存失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    const p = products.find((x) => x.id === id)
    setDeletingId(id)
    try {
      await productMutations.remove(id)
      toast.success(`产品「${p?.name}」已删除`)
    } catch (err) {
      toast.error('删除失败，请重试')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="border border-border/40">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1.5">
                <p className="text-sm text-muted-foreground">产品总数</p>
                <p className="text-2xl font-bold tracking-tight">{filtered.length}</p>
              </div>
              <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Package className="size-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/40">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1.5">
                <p className="text-sm text-muted-foreground">分类数量</p>
                <p className="text-2xl font-bold tracking-tight">{categoryCount}</p>
              </div>
              <div className="size-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Tag className="size-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 工具栏 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">产品库</h1>
          <p className="text-sm text-muted-foreground mt-1">
            共 {filtered.length} 个产品
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate}>
                <Plus className="size-4 mr-1.5" />
                新增产品
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0">
              <div className="px-6 pt-6">
                <DialogHeader>
                  <DialogTitle>{editingId ? '编辑产品' : '新增产品'}</DialogTitle>
                </DialogHeader>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">
                    产品名称 <span className="text-destructive">*</span>
                  </label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="请输入产品名称"
                  />
                  {formErrors.name && (
                    <p className="text-xs text-destructive">{formErrors.name}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">品牌</label>
                    <Input
                      value={form.brand}
                      onChange={(e) => setForm({ ...form, brand: e.target.value })}
                      placeholder="如：大疆"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">分类</label>
                    <Select
                      value={form.category}
                      onValueChange={(v) => setForm({ ...form, category: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">物料号</label>
                    <Input
                      value={form.sku}
                      onChange={(e) => setForm({ ...form, sku: e.target.value })}
                      placeholder="产品编码"
                    />
                    {formErrors.sku && (
                      <p className="text-xs text-destructive">{formErrors.sku}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">渠道价（元）</label>
                    <Input
                      type="number"
                      value={form.channelPrice || ''}
                      onChange={(e) =>
                        setForm({ ...form, channelPrice: parseFloat(e.target.value) || 0 })
                      }
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">建议零售价 RRP（元）</label>
                    <Input
                      type="number"
                      value={form.retailPrice || ''}
                      onChange={(e) =>
                        setForm({ ...form, retailPrice: parseFloat(e.target.value) || 0 })
                      }
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1.5">
                     <label className="text-sm font-medium">单位</label>
                     <Select
                       value={form.unit}
                       onValueChange={(v) => setForm({ ...form, unit: v })}
                     >
                       <SelectTrigger>
                         <SelectValue />
                       </SelectTrigger>
                       <SelectContent>
                         {PRODUCT_UNITS.map((u) => (
                           <SelectItem key={u} value={u}>
                             {u}
                           </SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                   </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">税率</label>
                      <Select
                        value={String(form.taxRate)}
                        onValueChange={(v) => setForm({ ...form, taxRate: parseFloat(v) || 0 })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TAX_RATES.map((rate) => (
                            <SelectItem key={rate} value={String(rate)}>
                              {rate}%
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">备注</label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="请输入产品描述或备注"
                    rows={3}
                  />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-border/40 shrink-0">
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    取消
                  </Button>
                  <Button onClick={handleSave} disabled={saving}>{saving ? '保存中...' : '保存'}</Button>
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
                onChange={(e) => {
                  setKeyword(e.target.value)
                  setPage(1)
                }}
                placeholder="搜索产品名称 / 物料号 / 品牌"
                className="bg-background pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1) }}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="全部分类" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部分类</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCategoryDialogOpen(true)}
              className="gap-1.5"
            >
              <Settings className="size-3.5" />
              管理分类
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 分类管理 Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>管理产品分类</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2">
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="输入新分类名称"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddCategory()
                  }
                }}
              />
              <Button onClick={handleAddCategory} className="shrink-0">
                <Plus className="size-4 mr-1" />
                新增
              </Button>
            </div>
            <div className="border-t border-border/40 pt-4">
              <p className="text-xs text-muted-foreground mb-3">
                共 {categories.length} 个分类
              </p>
              <div className="space-y-2 max-h-[320px] overflow-y-auto">
                {categories.map((c) => {
                  const count = products.filter((p) => p.category === c).length
                  return (
                    <div
                      key={c}
                      className="flex items-center justify-between px-3 py-2 rounded-md border border-border/40 bg-background"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Tag className="size-3.5 text-primary shrink-0" />
                        <span className="text-sm font-medium truncate">{c}</span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {count} 个产品
                        </span>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                            disabled={count > 0}
                            title={count > 0 ? '分类下有产品，无法删除' : '删除分类'}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogTitle>确认删除分类？</AlertDialogTitle>
                          <AlertDialogDescription>
                            删除分类「{c}」后无法恢复。
                          </AlertDialogDescription>
                          <AlertDialogFooter>
                            <AlertDialogCancel>取消</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRemoveCategory(c)}
                              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                            >
                              删除
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">完成</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 产品列表 */}
      <Card className="border border-border/40">
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-muted/30">
                  <th className="text-left font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">
                    产品名称
                  </th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">
                    品牌
                  </th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">
                    分类
                  </th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">
                    物料号
                  </th>
                  <th className="text-right font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">
                    渠道价
                  </th>
                  <th className="text-right font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">
                    建议零售价
                  </th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">
                    单位
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
                      暂无产品数据
                    </td>
                  </tr>
                ) : (
                  pagedList.map((p) => (
                    <tr key={p.id} className="border-b border-border/30 hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium">
                        <button
                          onClick={() => navigate(`/products/${p.id}`)}
                          className="text-primary hover:underline text-left"
                        >
                          {p.name}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{p.brand || '-'}</td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={`text-xs ${categoryColorMap[p.category] || ''}`}
                        >
                          {p.category}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {p.sku}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        ¥{p.channelPrice.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                        ¥{p.retailPrice.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{p.unit}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => navigate(`/products/${p.id}`)}
                            title="查看"
                          >
                            <Eye className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => openEdit(p)}
                            title="编辑"
                          >
                            <Edit className="size-3.5" />
                          </Button>
                          <AlertDialog open={deleteConfirmId === p.id} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive"
                                onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(p.id); }}
                                title="删除"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogTitle>确认删除产品？</AlertDialogTitle>
                              <AlertDialogDescription>
                                确定要删除产品「{p.name}」吗？删除后无法恢复。
                              </AlertDialogDescription>
                              <AlertDialogFooter>
                                <AlertDialogCancel>取消</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive hover:bg-destructive/90"
                                  onClick={() => handleDelete(p.id)}
                                >
                                  {deletingId === p.id ? '删除中...' : '确认删除'}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  ))
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

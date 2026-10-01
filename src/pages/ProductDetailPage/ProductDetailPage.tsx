import { useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Package, Edit, FileText, TrendingUp } from 'lucide-react'
import { PRODUCT_CATEGORIES } from '@/data/products'
import { useProducts, useQuotations, useCustomers } from '@/hooks/use-crm-store'

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

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [products] = useProducts()
  const [quotations] = useQuotations()
  const [customersAll] = useCustomers()
  const product = useMemo(() => products.find((p) => p.id === id), [products, id])

  const relatedQuotations = useMemo(
    () => quotations.filter((q) => q.items.some((item) => item.productId === id)),
    [quotations, id],
  )

  if (!product) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="size-4 mr-2" />
          返回
        </Button>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            产品不存在
          </CardContent>
        </Card>
      </div>
    )
  }

  const stockValue = product.channelPrice * product.stock
  const profitMargin =
    product.channelPrice > 0
      ? ((product.retailPrice - product.channelPrice) / product.retailPrice) * 100
      : 0

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
        <ArrowLeft className="size-4 mr-1.5" />
        返回产品库
      </Button>

      {/* 顶部标题卡 */}
      <Card className="border border-border/40">
        <CardContent className="p-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="size-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Package className="size-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">{product.name}</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge
                      variant="outline"
                      className={`text-xs ${categoryColorMap[product.category] || ''}`}
                    >
                      {product.category}
                    </Badge>
                    <span className="text-xs text-muted-foreground font-mono">
                      {product.sku}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Edit className="size-3.5 mr-1" />
                编辑
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 基本信息 */}
        <Card className="border border-border/40 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">产品信息</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-y-4 gap-x-8">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">产品名称</span>
              <span className="font-medium">{product.name}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">品牌</span>
              <span className="font-medium">{product.brand || '-'}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">分类</span>
              <Badge
                variant="outline"
                className={`text-xs ${categoryColorMap[product.category] || ''}`}
              >
                {product.category}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">物料号</span>
              <span className="font-medium font-mono">{product.sku}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">渠道价</span>
              <span className="font-semibold text-primary">
                ¥{product.channelPrice.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">建议零售价</span>
              <span className="font-medium">
                ¥{product.retailPrice.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">库存数量</span>
              <span className="font-medium">
                {product.stock.toLocaleString()} {product.unit}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">库存总值</span>
              <span className="font-medium">¥{stockValue.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">毛利率</span>
              <span
                className={`font-medium ${profitMargin > 30 ? 'text-emerald-600' : 'text-amber-600'}`}
              >
                {profitMargin.toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">创建时间</span>
              <span className="font-medium">{product.createdAt}</span>
            </div>
            <div className="col-span-2 pt-2 border-t border-border/40">
              <p className="text-sm text-muted-foreground mb-1.5">产品描述</p>
              <p className="text-sm leading-relaxed">{product.description}</p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border border-border/40">
            <CardHeader>
              <CardTitle className="text-base">价格分析</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="text-muted-foreground">渠道价</span>
                  <span className="font-medium">¥{product.channelPrice.toLocaleString()}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{
                      width: `${(product.channelPrice / Math.max(product.retailPrice, 1)) * 100}%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="text-muted-foreground">建议零售价</span>
                  <span className="font-medium">¥{product.retailPrice.toLocaleString()}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full w-full" />
                </div>
              </div>
              <div className="pt-2 border-t border-border/40">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <TrendingUp className="size-4" />
                    毛利空间
                  </span>
                  <span className="font-semibold text-emerald-600">
                    ¥{(product.retailPrice - product.channelPrice).toLocaleString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 关联报价 */}
      <Card className="border border-border/40">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="size-4 text-primary" />
            相关报价记录
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {relatedQuotations.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              暂无相关报价记录
            </div>
          ) : (
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
                      客户
                    </th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">
                      数量
                    </th>
                    <th className="text-right font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">
                      小计
                    </th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">
                      状态
                    </th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">
                      报价日期
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {relatedQuotations.map((q) => {
                    const item = q.items.find((i) => i.productId === id)
                    const customer = customersAll.find((c) => c.id === q.customerId)
                    return (
                      <tr
                        key={q.id}
                        className="border-b border-border/30 hover:bg-muted/20"
                      >
                        <td className="px-4 py-3 font-mono text-xs text-primary cursor-pointer hover:underline"
                            onClick={() => navigate(`/quotations/${q.id}`)}>
                          {q.quotationNo}
                        </td>
                        <td className="px-4 py-3 font-medium">{q.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {customer?.name || '-'}
                        </td>
                        <td className="px-4 py-3 tabular-nums">
                          {item?.quantity || 0} {product.unit}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-medium">
                          ¥{(item?.subtotal || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-xs">
                            {q.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{q.quotationDate}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

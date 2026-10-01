import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  FileText,
  ArrowLeft,
  Building2,
  Calendar,
  User,
  DollarSign,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import { type IContract, type IPaymentPlanItem } from '@/data/contracts';
import { MOCK_USERS } from '@/data/users';
import { useContracts, contractMutations, useCustomers, useOpportunities } from '@/hooks/use-crm-store';

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  pending: { label: '待生效', variant: 'secondary' },
  active: { label: '执行中', variant: 'default' },
  completed: { label: '已完成', variant: 'outline' },
  void: { label: '已作废', variant: 'destructive' },
};

const paymentStatusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; icon: typeof Clock }> = {
  pending: { label: '待回款', variant: 'secondary', icon: Clock },
  paid: { label: '已回款', variant: 'default', icon: CheckCircle2 },
  overdue: { label: '已逾期', variant: 'destructive', icon: AlertTriangle },
};

export default function ContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [contractsAll] = useContracts();
  const [customersAll] = useCustomers();
  const [oppsAll] = useOpportunities();
  const [paymentLoading, setPaymentLoading] = useState(false);
  const contract = useMemo(() => contractsAll.find((c) => c.id === id), [contractsAll, id]);

  const customer = useMemo(
    () => (contract ? customersAll.find((c) => c.id === contract.customerId) ?? null : null),
    [contract],
  );

  const opportunity = useMemo(
    () =>
      contract?.opportunityId
        ? oppsAll.find((o) => o.id === contract.opportunityId) ?? null
        : null,
    [contract],
  );

  const owner = useMemo(
    () => (contract ? MOCK_USERS.find((u) => u.id === contract.owner) ?? null : null),
    [contract],
  );

  const paidAmount = useMemo(
    () =>
      contract
        ? contract.paymentPlan.reduce(
            (s, p) => s + (p.status === 'paid' ? p.amount : 0),
            0,
          )
        : 0,
    [contract],
  );

  const paymentRate = contract ? Math.round((paidAmount / contract.amount) * 100) : 0;

  // 回款Dialog
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [payingItem, setPayingItem] = useState<IPaymentPlanItem | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState('');
  const [payRemark, setPayRemark] = useState('');

  const openPaymentDialog = (item: IPaymentPlanItem) => {
    setPayingItem(item);
    setPayAmount(String(item.amount));
    setPayDate(formatDate());
    setPayRemark('');
    setPaymentDialogOpen(true);
  };

  const handleConfirmPayment = async () => {
    if (!payingItem || !contract) return;

    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) {
      toast.error('请输入有效的回款金额');
      return;
    }
    if (!payDate) {
      toast.error('请选择回款日期');
      return;
    }

    setPaymentLoading(true);
    try {
      await contractMutations.registerPayment(contract.id, payingItem.id, payDate, amount, payRemark);
      toast.success(`第 ${payingItem.period} 期回款已确认，金额 ¥${amount.toLocaleString()}`);
      setPaymentDialogOpen(false);
    } catch (err) {
      toast.error('登记失败，请重试');
    } finally {
      setPaymentLoading(false);
    }
  };

  if (!contract) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground">合同不存在</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/contracts')}>
          返回列表
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/contracts')}>
          <ArrowLeft className="size-4 mr-1.5" />
          返回合同列表
        </Button>
      </div>

      {/* 顶部信息卡 */}
      <Card className="border border-border/40">
        <CardContent className="p-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-start gap-4">
              <div className="size-16 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <FileText className="size-8 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-xl font-bold">{contract.contractNo}</h1>
                  <Badge variant={statusLabels[contract.status].variant}>
                    {statusLabels[contract.status].label}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {customer?.name} · 合同金额 ¥{contract.amount.toLocaleString()}
                </p>
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="size-3.5" />
                    签约: {contract.signDate}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="size-3.5" />
                    生效: {contract.effectiveDate}
                  </span>
                  {owner && (
                    <span className="flex items-center gap-1.5">
                      <User className="size-3.5" />
                      负责人: {owner.name}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">编辑合同</Button>
              {contract.status === 'active' && (
                <Button>
                  <DollarSign className="size-4 mr-1.5" />
                  新增回款
                </Button>
              )}
            </div>
          </div>

          {/* 回款进度 */}
          <div className="mt-6 pt-5 border-t border-border/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">回款进度</span>
              <span className="text-sm font-semibold text-primary tabular-nums">
                ¥{paidAmount.toLocaleString()} / ¥{contract.amount.toLocaleString()}（{paymentRate}%）
              </span>
            </div>
            <Progress value={paymentRate} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* 基本信息 + 关联客户 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border border-border/40 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold">基本信息</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              <InfoRow label="合同编号" value={contract.contractNo} />
              <InfoRow label="合同金额" value={`¥${contract.amount.toLocaleString()}`} />
              <InfoRow label="签约日期" value={contract.signDate} />
              <InfoRow label="生效日期" value={contract.effectiveDate} />
              <InfoRow label="合同状态" value={statusLabels[contract.status].label} />
              <InfoRow
                label="关联商机"
                value={opportunity ? opportunity.name : '-'}
                link={opportunity ? `/opportunities/${opportunity.id}` : undefined}
                onClick={
                  opportunity ? () => navigate(`/opportunities/${opportunity.id}`) : undefined
                }
              />
              <InfoRow label="负责人" value={owner?.name || '-'} />
              <InfoRow label="创建时间" value={contract.createdAt} />
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground mb-1">备注</p>
                <p className="text-sm">{contract.remark || '无'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/40">
          <CardHeader>
            <CardTitle className="text-base font-semibold">关联客户</CardTitle>
          </CardHeader>
          <CardContent>
            {customer && (
              <div
                className="p-4 rounded-lg border border-border/40 hover:bg-muted/20 cursor-pointer transition-colors"
                onClick={() => navigate(`/customers/${customer.id}`)}
              >
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Building2 className="size-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{customer.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {customer.industry} · {customer.level}级客户
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 回款计划 */}
      <Card className="border border-border/40">
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            回款计划（{contract.paymentPlan.length} 期）
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/20">
                  <th className="text-left font-medium text-muted-foreground px-5 py-3 whitespace-nowrap">
                    期数
                  </th>
                  <th className="text-right font-medium text-muted-foreground px-5 py-3 whitespace-nowrap">
                    计划回款金额
                  </th>
                  <th className="text-left font-medium text-muted-foreground px-5 py-3 whitespace-nowrap">
                    计划回款日期
                  </th>
                  <th className="text-left font-medium text-muted-foreground px-5 py-3 whitespace-nowrap">
                    实际回款日期
                  </th>
                  <th className="text-left font-medium text-muted-foreground px-5 py-3 whitespace-nowrap">
                    状态
                  </th>
                  <th className="text-right font-medium text-muted-foreground px-5 py-3 whitespace-nowrap">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {contract.paymentPlan.map((item) => {
                  const statusInfo = paymentStatusMap[item.status];
                  const StatusIcon = statusInfo.icon;
                  return (
                    <tr
                      key={item.id}
                      className="border-b border-border/30 last:border-0 hover:bg-muted/20"
                    >
                      <td className="px-5 py-3 font-medium">第 {item.period} 期</td>
                      <td className="px-5 py-3 text-right font-semibold tabular-nums">
                        ¥{item.amount.toLocaleString()}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">
                        {item.plannedDate}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">
                        {item.actualDate || '-'}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                            item.status === 'paid'
                              ? 'text-success'
                              : item.status === 'overdue'
                              ? 'text-destructive'
                              : 'text-muted-foreground'
                          }`}
                        >
                          <StatusIcon className="size-3.5" />
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        {item.status === 'pending' || item.status === 'overdue' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => openPaymentDialog(item)}
                          >
                            <DollarSign className="size-3 mr-1" />
                            标记回款
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">已完成</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 回款确认Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              确认回款 - 第 {payingItem?.period} 期
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-muted/40 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">计划回款金额</span>
                <span className="font-semibold tabular-nums">
                  ¥{payingItem?.amount.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">计划回款日期</span>
                <span>{payingItem?.plannedDate}</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                实际回款金额 <span className="text-destructive">*</span>
              </label>
              <Input
                type="number"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                placeholder="请输入回款金额"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                实际回款日期 <span className="text-destructive">*</span>
              </label>
              <Input
                type="date"
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">备注</label>
              <textarea
                value={payRemark}
                onChange={(e) => setPayRemark(e.target.value)}
                placeholder="请输入备注信息（选填）"
                rows={3}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">取消</Button>
            </DialogClose>
            <Button onClick={handleConfirmPayment}>确认回款</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoRow({
  label,
  value,
  link,
  onClick,
}: {
  label: string;
  value: string;
  link?: string;
  onClick?: () => void;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      {onClick ? (
        <p
          className="text-sm mt-1 text-primary cursor-pointer hover:underline"
          onClick={onClick}
        >
          {value}
        </p>
      ) : (
        <p className="text-sm mt-1">{value}</p>
      )}
    </div>
  );
}

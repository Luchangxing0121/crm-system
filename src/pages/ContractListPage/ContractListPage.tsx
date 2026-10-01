import { useState, useMemo } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
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
import { Search, ChevronRight, FileText, DollarSign, Plus, ChevronLeft, ChevronRight as ChevronRightIcon, Trash2 } from 'lucide-react';
import { type IContract } from '@/data/contracts';
import { MOCK_USERS } from '@/data/users';
import { useContracts, contractMutations, useCustomers, useOpportunities } from '@/hooks/use-crm-store';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';

const STATUS_MAP: Record<string, { label: string; variant: string }> = {
  pending: { label: '待生效', variant: 'secondary' },
  active: { label: '执行中', variant: 'default' },
  completed: { label: '已完成', variant: 'default' },
  void: { label: '已作废', variant: 'destructive' },
};

export default function ContractListPage() {
  const navigate = useNavigate();
  const [contracts] = useContracts();
  const [customersAll] = useCustomers();
  const [oppsAll] = useOpportunities();
  const [creating, setCreating] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [customerFilter, setCustomerFilter] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 5;

  // 新增合同Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newContract, setNewContract] = useState({
    contractNo: '',
    customerId: '',
    opportunityId: '',
    amount: '',
    signDate: '',
    effectiveDate: '',
    status: 'pending' as IContract['status'],
    paymentPeriods: '3',
    owner: 'user001',
    remark: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    const c = contracts.find((x) => x.id === id);
    setDeletingId(id);
    try {
      await contractMutations.remove(id);
      toast.success(`合同「${c?.contractNo}」已删除`);
    } catch (err) {
      toast.error('删除失败，请重试');
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = useMemo(() => {
    return contracts.filter((c) => {
      if (keyword) {
        const kw = keyword.toLowerCase();
        const customerName = customersAll.find((cu) => cu.id === c.customerId)?.name || '';
        if (!c.contractNo.toLowerCase().includes(kw) && !customerName.toLowerCase().includes(kw)) {
          return false;
        }
      }
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (customerFilter !== 'all' && c.customerId !== customerFilter) return false;
      return true;
    });
  }, [contracts, keyword, statusFilter, customerFilter]);

  const getCustomerName = (cid: string) =>
    customersAll.find((c) => c.id === cid)?.name || '-';

  const totalAmount = filtered.reduce((sum, c) => sum + c.amount, 0);
  const getPaidAmount = (c: IContract) =>
    c.paymentPlan.filter((p) => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const totalPaid = filtered.reduce((sum, c) => sum + getPaidAmount(c), 0);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pagedList = filtered.slice((page - 1) * pageSize, page * pageSize);

  const validateNewContract = () => {
    const errs: Record<string, string> = {};
    if (!newContract.contractNo.trim()) errs.contractNo = '请输入合同编号';
    if (!newContract.customerId) errs.customerId = '请选择客户';
    if (!newContract.amount || parseFloat(newContract.amount) <= 0) errs.amount = '请输入有效金额';
    if (!newContract.signDate) errs.signDate = '请选择签约日期';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCreateContract = async () => {
    if (!validateNewContract()) return;
    setCreating(true);
    try {
      const amount = parseFloat(newContract.amount);
      const periods = parseInt(newContract.paymentPeriods) || 1;
      const perAmount = Math.round(amount / periods);
      const paymentPlan = Array.from({ length: periods }, (_, i) => {
        const date = new Date(newContract.effectiveDate || newContract.signDate);
        date.setMonth(date.getMonth() + i * 3);
        return {
          period: i + 1,
          amount: i === periods - 1 ? amount - perAmount * (periods - 1) : perAmount,
          plannedDate: formatDate(date),
          status: 'pending' as const,
        };
      });

      const contract = await contractMutations.create({
        contractNo: newContract.contractNo,
        customerId: newContract.customerId,
        opportunityId: newContract.opportunityId || undefined,
        amount,
        signDate: newContract.signDate,
        effectiveDate: newContract.effectiveDate || newContract.signDate,
        status: newContract.status,
        paymentPlan: paymentPlan as unknown as IContract['paymentPlan'],
        owner: newContract.owner,
        remark: newContract.remark,
      });

      setDialogOpen(false);
      setNewContract({
        contractNo: '',
        customerId: '',
        opportunityId: '',
        amount: '',
        signDate: '',
        effectiveDate: '',
        status: 'pending',
        paymentPeriods: '3',
        owner: 'user001',
        remark: '',
      });
      setFormErrors({});
      toast.success(`合同「${contract.contractNo}」已创建`);
    } catch (err) {
      toast.error('创建失败，请重试');
    } finally {
      setCreating(false);
    }
  };

  // 当筛选变化时重置页码
  const onKeywordChange = (v: string) => {
    setKeyword(v);
    setPage(1);
  };
  const onStatusChange = (v: string) => {
    setStatusFilter(v);
    setPage(1);
  };
  const onCustomerChange = (v: string) => {
    setCustomerFilter(v);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">合同订单</h1>
          <p className="text-sm text-muted-foreground mt-1">
            共 {filtered.length} 份合同，总金额 ¥{totalAmount.toLocaleString()}
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4 mr-1.5" />
              新增合同
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col p-0">
            <div className="px-6 pt-6">
              <DialogHeader>
                <DialogTitle>新增合同</DialogTitle>
              </DialogHeader>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">
                    合同编号 <span className="text-destructive">*</span>
                  </label>
                  <Input
                    value={newContract.contractNo}
                    onChange={(e) => setNewContract({ ...newContract, contractNo: e.target.value })}
                    placeholder="如 HT-2024-001"
                  />
                  {formErrors.contractNo && (
                    <p className="text-xs text-destructive">{formErrors.contractNo}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">
                    合同金额（元）<span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="number"
                    value={newContract.amount}
                    onChange={(e) => setNewContract({ ...newContract, amount: e.target.value })}
                    placeholder="0"
                  />
                  {formErrors.amount && (
                    <p className="text-xs text-destructive">{formErrors.amount}</p>
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  关联客户 <span className="text-destructive">*</span>
                </label>
                <Select
                  value={newContract.customerId}
                  onValueChange={(v) => setNewContract({ ...newContract, customerId: v })}
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
              <div className="space-y-1.5">
                <label className="text-sm font-medium">关联商机</label>
                <Select
                  value={newContract.opportunityId}
                  onValueChange={(v) => setNewContract({ ...newContract, opportunityId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="请选择关联商机（选填）" />
                  </SelectTrigger>
                  <SelectContent>
                    {oppsAll.filter((o) =>
                      newContract.customerId
                        ? o.customerId === newContract.customerId
                        : true,
                    ).map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">
                    签约日期 <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="date"
                    value={newContract.signDate}
                    onChange={(e) => setNewContract({ ...newContract, signDate: e.target.value })}
                  />
                  {formErrors.signDate && (
                    <p className="text-xs text-destructive">{formErrors.signDate}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">生效日期</label>
                  <Input
                    type="date"
                    value={newContract.effectiveDate}
                    onChange={(e) =>
                      setNewContract({ ...newContract, effectiveDate: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">合同状态</label>
                  <Select
                    value={newContract.status}
                    onValueChange={(v) =>
                      setNewContract({ ...newContract, status: v as IContract['status'] })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">待生效</SelectItem>
                      <SelectItem value="active">执行中</SelectItem>
                      <SelectItem value="completed">已完成</SelectItem>
                      <SelectItem value="void">已作废</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">回款期数</label>
                  <Select
                    value={newContract.paymentPeriods}
                    onValueChange={(v) => setNewContract({ ...newContract, paymentPeriods: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 期</SelectItem>
                      <SelectItem value="2">2 期</SelectItem>
                      <SelectItem value="3">3 期</SelectItem>
                      <SelectItem value="4">4 期</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">负责人</label>
                <Select
                  value={newContract.owner}
                  onValueChange={(v) => setNewContract({ ...newContract, owner: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MOCK_USERS.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">备注</label>
                <textarea
                  className="w-full min-h-[70px] rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                  placeholder="合同备注信息..."
                  value={newContract.remark}
                  onChange={(e) => setNewContract({ ...newContract, remark: e.target.value })}
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-border/40 shrink-0">
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">取消</Button>
                </DialogClose>
                <Button onClick={handleCreateContract} disabled={creating}>{creating ? '创建中...' : '创建合同'}</Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border border-border/40">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">合同总数</div>
            <div className="text-2xl font-bold mt-2 tabular-nums">{contracts.length}</div>
          </CardContent>
        </Card>
        <Card className="border border-border/40">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">合同总金额</div>
            <div className="text-2xl font-bold mt-2 text-primary tabular-nums">
              ¥{(totalAmount / 10000).toFixed(1)}万
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border/40">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">已回款金额</div>
            <div className="text-2xl font-bold mt-2 text-emerald-600 tabular-nums">
              ¥{(totalPaid / 10000).toFixed(1)}万
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border/40">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">回款率</div>
            <div className="text-2xl font-bold mt-2 tabular-nums">
              {totalAmount > 0 ? ((totalPaid / totalAmount) * 100).toFixed(1) : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 筛选 */}
      <Card className="border border-border/40">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-64 max-w-full">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={keyword}
                onChange={(e) => onKeywordChange(e.target.value)}
                placeholder="搜索合同编号或客户"
                className="bg-background pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={onStatusChange}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="合同状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="pending">待生效</SelectItem>
                <SelectItem value="active">执行中</SelectItem>
                <SelectItem value="completed">已完成</SelectItem>
                <SelectItem value="void">已作废</SelectItem>
              </SelectContent>
            </Select>
            <Select value={customerFilter} onValueChange={onCustomerChange}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="客户" />
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
          </div>
        </CardContent>
      </Card>

      {/* 合同列表 */}
      <Card className="border border-border/40">
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/20">
                  <th className="text-left font-medium text-muted-foreground px-5 py-3 whitespace-nowrap">
                    合同编号
                  </th>
                  <th className="text-left font-medium text-muted-foreground px-5 py-3 whitespace-nowrap">
                    客户
                  </th>
                  <th className="text-left font-medium text-muted-foreground px-5 py-3 whitespace-nowrap">
                    金额
                  </th>
                  <th className="text-left font-medium text-muted-foreground px-5 py-3 whitespace-nowrap">
                    已回款
                  </th>
                  <th className="text-left font-medium text-muted-foreground px-5 py-3 whitespace-nowrap">
                    签约日期
                  </th>
                  <th className="text-left font-medium text-muted-foreground px-5 py-3 whitespace-nowrap">
                    生效日期
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
                {pagedList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center text-muted-foreground">
                      暂无匹配的合同数据
                    </td>
                  </tr>
                ) : (
                  pagedList.map((c) => {
                    const statusInfo = STATUS_MAP[c.status] || STATUS_MAP.pending;
                    const paid = getPaidAmount(c);
                    return (
                      <tr
                        key={c.id}
                        className="border-b border-border/30 last:border-0 hover:bg-muted/30"
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <FileText className="size-4 text-muted-foreground shrink-0" />
                            <span
                              className="font-medium cursor-pointer hover:text-primary hover:underline"
                              onClick={() => navigate(`/contracts/${c.id}`)}
                            >
                              {c.contractNo}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className="text-primary cursor-pointer hover:underline"
                            onClick={() => navigate(`/customers/${c.customerId}`)}
                          >
                            {getCustomerName(c.customerId)}
                          </span>
                        </td>
                        <td className="px-5 py-3 font-semibold tabular-nums">
                          ¥{c.amount.toLocaleString()}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex flex-col gap-1">
                            <span className="tabular-nums text-emerald-600 font-medium">
                              ¥{paid.toLocaleString()}
                            </span>
                            <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full"
                                style={{
                                  width: `${c.amount > 0 ? (paid / c.amount) * 100 : 0}%`,
                                }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">
                          {c.signDate}
                        </td>
                        <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">
                          {c.effectiveDate}
                        </td>
                        <td className="px-5 py-3">
                          <Badge
                            variant={
                              statusInfo.variant as
                                | 'default'
                                | 'outline'
                                | 'secondary'
                                | 'destructive'
                            }
                            className="text-xs"
                          >
                            {statusInfo.label}
                          </Badge>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8"
                              onClick={() => navigate(`/contracts/${c.id}`)}
                            >
                              详情
                              <ChevronRight className="size-3.5 ml-1" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 text-destructive"
                                  title="删除"
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogTitle>确认删除合同？</AlertDialogTitle>
                                <AlertDialogDescription>
                                  确定要删除合同「{c.contractNo}」吗？删除后无法恢复，关联的回款计划也会一起删除。
                                </AlertDialogDescription>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>取消</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive hover:bg-destructive/90"
                                    onClick={() => handleDelete(c.id)}
                                  >
                                    {deletingId === c.id ? '删除中...' : '确认删除'}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-sm text-muted-foreground">
            共 {filtered.length} 条，第 {page}/{totalPages} 页
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="size-4" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Button
                key={p}
                variant={p === page ? 'default' : 'outline'}
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage(p)}
              >
                {p}
              </Button>
            ))}
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              <ChevronRightIcon className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

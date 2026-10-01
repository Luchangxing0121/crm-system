import { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
} from '@/components/ui/dialog';
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
} from '@/components/ui/alert-dialog';
import { Search, Plus, Edit2, Trash2, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { MOCK_USERS } from '@/data/users';
import { useCustomers, customerMutations } from '@/hooks/use-crm-store';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const PAGE_SIZE = 5;

const levelBadgeVariant: Record<string, 'default' | 'secondary' | 'outline'> = {
  A: 'default',
  B: 'secondary',
  C: 'outline',
};

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  active: { label: '活跃', variant: 'default' },
  inactive: { label: '不活跃', variant: 'destructive' },
  potential: { label: '潜在', variant: 'secondary' },
};

export default function CustomerListPage() {
  const navigate = useNavigate();
  const [customers] = useCustomers();
  const [keyword, setKeyword] = useState('');
  const [industry, setIndustry] = useState('all');
  const [level, setLevel] = useState('all');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const industries = useMemo(() => {
    const set = new Set(customers.map((c) => c.industry));
    return Array.from(set);
  }, [customers]);

  const filtered = useMemo(() => {
    return customers.filter((c) => {
      if (keyword && !c.name.toLowerCase().includes(keyword.toLowerCase())) return false;
      if (industry !== 'all' && c.industry !== industry) return false;
      if (level !== 'all' && c.level !== level) return false;
      if (status !== 'all' && c.status !== status) return false;
      return true;
    });
  }, [customers, keyword, industry, level, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageData = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      await customerMutations.remove(id);
      setDeleteId(null);
      toast.success('客户已删除');
    } catch (err) {
      toast.error('删除失败');
    } finally {
      setDeleting(false);
    }
  };

  const getOwnerName = (ownerId: string) => {
    const user = MOCK_USERS.find((u) => u.id === ownerId || u.username === ownerId);
    return user?.name || ownerId;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">客户管理</h1>
          <p className="text-sm text-muted-foreground mt-1">
            管理全部客户信息，共 {filtered.length} 位客户
          </p>
        </div>
        <Button onClick={() => navigate('/customers/new')}>
          <Plus className="size-4 mr-1.5" />
          新增客户
        </Button>
      </div>

      <Card className="border border-border/40">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-64 max-w-full">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={keyword}
                onChange={(e) => {
                  setKeyword(e.target.value);
                  setPage(1);
                }}
                placeholder="搜索客户名称"
                className="bg-background pl-9"
              />
            </div>
            <Select
              value={industry}
              onValueChange={(v) => {
                setIndustry(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="行业" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部行业</SelectItem>
                {industries.map((ind) => (
                  <SelectItem key={ind} value={ind}>
                    {ind}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={level}
              onValueChange={(v) => {
                setLevel(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="分级" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部分级</SelectItem>
                <SelectItem value="A">A级</SelectItem>
                <SelectItem value="B">B级</SelectItem>
                <SelectItem value="C">C级</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="active">活跃</SelectItem>
                <SelectItem value="potential">潜在</SelectItem>
                <SelectItem value="inactive">不活跃</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/20">
                  <th className="text-left font-medium text-muted-foreground px-5 py-3 whitespace-nowrap">
                    客户名称
                  </th>
                  <th className="text-left font-medium text-muted-foreground px-5 py-3 whitespace-nowrap">
                    行业
                  </th>
                  <th className="text-left font-medium text-muted-foreground px-5 py-3 whitespace-nowrap">
                    分级
                  </th>
                  <th className="text-left font-medium text-muted-foreground px-5 py-3 whitespace-nowrap">
                    状态
                  </th>
                  <th className="text-left font-medium text-muted-foreground px-5 py-3 whitespace-nowrap">
                    负责人
                  </th>
                  <th className="text-left font-medium text-muted-foreground px-5 py-3 whitespace-nowrap">
                    联系电话
                  </th>
                  <th className="text-left font-medium text-muted-foreground px-5 py-3 whitespace-nowrap">
                    创建时间
                  </th>
                  <th className="text-right font-medium text-muted-foreground px-5 py-3 whitespace-nowrap">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageData.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center text-muted-foreground">
                      暂无匹配的客户数据
                    </td>
                  </tr>
                ) : (
                  pageData.map((c) => (
                    <tr key={c.id} className="border-b border-border/30 last:border-0 hover:bg-muted/30">
                      <td className="px-5 py-3 font-medium min-w-[180px]">
                        <span
                          className="block truncate max-w-[220px] text-primary cursor-pointer hover:underline"
                          onClick={() => navigate(`/customers/${c.id}`)}
                        >
                          {c.name}
                        </span>
                        {c.tags.length > 0 && (
                          <div className="flex gap-1 mt-1.5 flex-wrap">
                            {c.tags.slice(0, 2).map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs font-normal">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{c.industry}</td>
                      <td className="px-5 py-3">
                        <Badge variant={levelBadgeVariant[c.level]} className="text-xs">
                          {c.level}级
                        </Badge>
                      </td>
                      <td className="px-5 py-3">
                        <Badge
                          variant={statusLabels[c.status].variant}
                          className="text-xs"
                        >
                          {statusLabels[c.status].label}
                        </Badge>
                      </td>
                      <td className="px-5 py-3">{getOwnerName(c.owner)}</td>
                      <td className="px-5 py-3 text-muted-foreground whitespace-nowrap tabular-nums">
                        {c.phone}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">
                        {c.createdAt}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => navigate(`/customers/${c.id}`)}
                          >
                            <Eye className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => navigate(`/customers/edit/${c.id}`)}
                          >
                            <Edit2 className="size-4" />
                          </Button>
                          <AlertDialog open={deleteId === c.id} onOpenChange={(o) => !o && setDeleteId(null)}>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => setDeleteId(c.id)}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>确认删除客户</AlertDialogTitle>
                                <AlertDialogDescription>
                                  删除后客户数据将无法恢复，是否确认删除「{c.name}」？
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => setDeleteId(null)}>
                                  取消
                                </AlertDialogCancel>
                                 <AlertDialogAction
                                   className="bg-destructive hover:bg-destructive/90"
                                   disabled={deleting}
                                   onClick={() => handleDelete(c.id)}
                                 >
                                   {deleting ? '删除中...' : '确认删除'}
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
          <div className="flex items-center justify-between px-5 py-3 border-t border-border/30">
            <span className="text-sm text-muted-foreground">
              共 {filtered.length} 条，第 {currentPage} / {totalPages} 页
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="size-4" />
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Button
                  key={p}
                  variant={p === currentPage ? 'default' : 'outline'}
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setPage(p)}
                >
                  {p}
                </Button>
              ))}
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

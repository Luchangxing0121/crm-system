import { useState, useMemo } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
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
import { Search, Plus, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { type IContact } from '@/data/contacts';
import { useContacts, contactMutations, useCustomers } from '@/hooks/use-crm-store';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils';
import FileUploader from '@/components/FileUpload/FileUploader';
import type { UploadedFile } from '@/components/FileUpload/FileUploader';;

const PAGE_SIZE = 6;

interface ContactFormState {
  name: string;
  customerId: string;
  position: string;
  mobile: string;
  phone: string;
  email: string;
  qq: string;
  wechat: string;
  gender: 'male' | 'female';
  isPrimary: boolean;
  remark: string;
}

const emptyForm: ContactFormState = {
  name: '',
  customerId: '',
  position: '',
  mobile: '',
  phone: '',
  email: '',
  qq: '',
  wechat: '',
  gender: 'male',
  isPrimary: false,
  remark: '',
};

export default function ContactListPage() {
  const navigate = useNavigate();
  const [contacts] = useContacts();
  const [customersAll] = useCustomers();
  const [saving, setSaving] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [customerId, setCustomerId] = useState('all');
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ContactFormState>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof ContactFormState, string>>>({});
  const [attachments, setAttachments] = useState<UploadedFile[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    const c = contacts.find((x) => x.id === id);
    setDeletingId(id);
    try {
      await contactMutations.remove(id);
      toast.success(`联系人「${c?.name}」已删除`);
    } catch (err) {
      toast.error('删除失败，请重试');
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = useMemo(() => {
    return contacts.filter((c) => {
      if (keyword && !c.name.toLowerCase().includes(keyword.toLowerCase())) return false;
      if (customerId !== 'all' && c.customerId !== customerId) return false;
      return true;
    });
  }, [contacts, keyword, customerId]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageData = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const getCustomerName = (cid: string) => {
    return customersAll.find((c) => c.id === cid)?.name || '-';
  };

  const handleOpenDialog = (contact?: IContact) => {
    if (contact) {
      setEditingId(contact.id);
      setForm({
        name: contact.name,
        customerId: contact.customerId,
        position: contact.position,
        mobile: contact.mobile,
        phone: contact.phone,
        email: contact.email,
        qq: contact.qq || '',
        wechat: contact.wechat || '',
        gender: contact.gender,
        isPrimary: contact.isPrimary,
        remark: contact.remark,
      });
    } else {
      setEditingId(null);
      setForm(emptyForm);
    }
    setErrors({});
    setDialogOpen(true);
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof ContactFormState, string>> = {};
    if (!form.name.trim()) newErrors.name = '姓名不能为空';
    if (!form.customerId) newErrors.customerId = '请选择所属客户';
    if (!form.position.trim()) newErrors.position = '职务不能为空';
    if (!form.mobile.trim()) newErrors.mobile = '手机号码不能为空';
    if (!form.email.trim()) {
      newErrors.email = '邮箱不能为空';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = '请输入有效的邮箱地址';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (editingId) {
        await contactMutations.update(editingId, {
          name: form.name,
          customerId: form.customerId,
          position: form.position,
          mobile: form.mobile,
          phone: form.phone,
          email: form.email,
          qq: form.qq || undefined,
          wechat: form.wechat || undefined,
          gender: form.gender,
          isPrimary: form.isPrimary,
          remark: form.remark,
        });
        toast.success('联系人信息已更新');
      } else {
        await contactMutations.create({
          name: form.name,
          customerId: form.customerId,
          position: form.position,
          mobile: form.mobile,
          phone: form.phone,
          email: form.email,
          qq: form.qq || undefined,
          wechat: form.wechat || undefined,
          gender: form.gender,
          isPrimary: form.isPrimary,
          remark: form.remark,
        });
        toast.success('联系人创建成功');
      }
      setDialogOpen(false);
    } catch (err) {
      toast.error('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">联系人管理</h1>
          <p className="text-sm text-muted-foreground mt-1">
            管理所有联系人信息，共 {filtered.length} 位
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="size-4 mr-1.5" />
              新增联系人
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col p-0">
            <div className="px-6 pt-6">
              <DialogHeader>
                <DialogTitle>{editingId ? '编辑联系人' : '新增联系人'}</DialogTitle>
              </DialogHeader>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">
                    姓名 <span className="text-destructive">*</span>
                  </label>
                  <Input
                    placeholder="请输入姓名"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                  {errors.name && (
                    <p className="text-xs text-destructive">{errors.name}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">性别</label>
                  <Select
                    value={form.gender}
                    onValueChange={(v) =>
                      setForm({ ...form, gender: v as 'male' | 'female' })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">男</SelectItem>
                      <SelectItem value="female">女</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  所属客户 <span className="text-destructive">*</span>
                </label>
                <Select
                  value={form.customerId}
                  onValueChange={(v) => setForm({ ...form, customerId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="请选择所属客户" />
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">
                    职务 <span className="text-destructive">*</span>
                  </label>
                  <Input
                    placeholder="请输入职务"
                    value={form.position}
                    onChange={(e) => setForm({ ...form, position: e.target.value })}
                  />
                  {errors.position && (
                    <p className="text-xs text-destructive">{errors.position}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">
                    手机 <span className="text-destructive">*</span>
                  </label>
                  <Input
                    placeholder="请输入手机号码"
                    value={form.mobile}
                    onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                  />
                  {errors.mobile && (
                    <p className="text-xs text-destructive">{errors.mobile}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">座机</label>
                  <Input
                    placeholder="请输入座机号码"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">
                    邮箱 <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="email"
                    placeholder="请输入邮箱"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                  {errors.email && (
                    <p className="text-xs text-destructive">{errors.email}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">微信</label>
                  <Input
                    placeholder="请输入微信号"
                    value={form.wechat}
                    onChange={(e) => setForm({ ...form, wechat: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">QQ</label>
                  <Input
                    placeholder="请输入QQ号"
                    value={form.qq}
                    onChange={(e) => setForm({ ...form, qq: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  className="size-4"
                  checked={form.isPrimary}
                  onChange={(e) => setForm({ ...form, isPrimary: e.target.checked })}
                />
                <span className="text-sm">设为主要联系人</span>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">备注</label>
                <textarea
                  className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                  placeholder="请输入备注"
                  value={form.remark}
                  onChange={(e) => setForm({ ...form, remark: e.target.value })}
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-border/40 shrink-0">
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  取消
                </Button>
                <Button onClick={handleSubmit} disabled={saving}>
                  {saving ? '保存中...' : (editingId ? '保存修改' : '创建')}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
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
                placeholder="搜索联系人姓名"
                className="bg-background pl-9"
              />
            </div>
            <Select
              value={customerId}
              onValueChange={(v) => {
                setCustomerId(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-56">
                <SelectValue placeholder="所属客户" />
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
        </CardHeader>
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/20">
                  <th className="text-left font-medium text-muted-foreground px-5 py-3 whitespace-nowrap">
                    姓名
                  </th>
                  <th className="text-left font-medium text-muted-foreground px-5 py-3 whitespace-nowrap">
                    职务
                  </th>
                  <th className="text-left font-medium text-muted-foreground px-5 py-3 whitespace-nowrap">
                    所属客户
                  </th>
                  <th className="text-left font-medium text-muted-foreground px-5 py-3 whitespace-nowrap">
                    手机
                  </th>
                  <th className="text-left font-medium text-muted-foreground px-5 py-3 whitespace-nowrap">
                    邮箱
                  </th>
                  <th className="text-left font-medium text-muted-foreground px-5 py-3 whitespace-nowrap">
                    主要联系人
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
                      暂无匹配的联系人数据
                    </td>
                  </tr>
                ) : (
                  pageData.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b border-border/30 last:border-0 hover:bg-muted/30"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-primary text-sm font-medium">
                              {c.name.slice(0, 1)}
                            </span>
                          </div>
                          <span
                            className="font-medium cursor-pointer hover:text-primary hover:underline"
                            onClick={() => navigate(`/contacts/${c.id}`)}
                          >
                            {c.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{c.position}</td>
                      <td className="px-5 py-3">
                        <span
                          className="text-primary cursor-pointer hover:underline"
                          onClick={() => navigate(`/customers/${c.customerId}`)}
                        >
                          {getCustomerName(c.customerId)}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground whitespace-nowrap tabular-nums">
                        {c.mobile}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">
                        <span className="block truncate max-w-[180px]">{c.email}</span>
                      </td>
                      <td className="px-5 py-3">
                        {c.isPrimary ? (
                          <Badge variant="default" className="text-xs">
                            是
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">否</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">
                        {c.createdAt}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => navigate(`/contacts/${c.id}`)}
                          >
                            查看
                          </Button>
                           <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => handleOpenDialog(c)}
                          >
                            编辑
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs text-destructive"
                              >
                                <Trash2 className="size-3.5 mr-1" />
                                删除
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogTitle>确认删除联系人？</AlertDialogTitle>
                              <AlertDialogDescription>
                                确定要删除联系人「{c.name}」吗？删除后无法恢复。
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

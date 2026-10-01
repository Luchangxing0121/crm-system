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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Search, Plus, CalendarDays, Phone, Mail, Users, Handshake, Trash2, MessageCircle, MessageSquare } from 'lucide-react';
import { type IFollowUp } from '@/data/followups';
import { MOCK_USERS } from '@/data/users';
import { useFollowups, followupMutations, useCustomers } from '@/hooks/use-crm-store';
import { toast } from 'sonner'
import { formatDateTime } from '@/lib/utils';
import FileUploader from '@/components/FileUpload/FileUploader';
import type { UploadedFile } from '@/components/FileUpload/FileUploader';;

const TYPE_MAP: Record<string, { label: string; icon: typeof Phone; color: string }> = {
  visit: { label: '拜访', icon: Handshake, color: 'bg-blue-500 text-blue-50' },
  call: { label: '电话', icon: Phone, color: 'bg-emerald-500 text-emerald-50' },
  email: { label: '邮件', icon: Mail, color: 'bg-amber-500 text-amber-50' },
  wechat: { label: '微信', icon: MessageCircle, color: 'bg-green-500 text-green-50' },
  meeting: { label: '会议', icon: Users, color: 'bg-purple-500 text-purple-50' },
  other: { label: '其他', icon: MessageSquare, color: 'bg-slate-500 text-slate-50' },
};

interface FollowupFormState {
  customerId: string;
  opportunityId: string;
  type: IFollowUp['type'];
  customType: string;
  content: string;
  result: string;
  nextFollowUpDate: string;
}

const emptyForm: FollowupFormState = {
  customerId: '',
  opportunityId: '',
  type: 'call',
  customType: '',
  content: '',
  result: '',
  nextFollowUpDate: '',
};

export default function FollowupListPage() {
  const [followups] = useFollowups();
  const [customersAll] = useCustomers();
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [customerFilter, setCustomerFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FollowupFormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [attachments, setAttachments] = useState<UploadedFile[]>([]);

  const filtered = useMemo(() => {
    return [...followups].filter((f) => {
      if (keyword && !f.content.toLowerCase().includes(keyword.toLowerCase())) return false;
      if (typeFilter !== 'all' && f.type !== typeFilter) return false;
      if (customerFilter !== 'all' && f.customerId !== customerFilter) return false;
      return true;
    });
  }, [followups, keyword, typeFilter, customerFilter]);

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      await followupMutations.remove(id);
      toast.success('跟进记录已删除');
      setDeleteId(null);
    } catch (err) {
      toast.error('删除失败，请重试');
    } finally {
      setDeleting(false);
    }
  };

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const getCustomerName = (cid: string) =>
    customersAll.find((c) => c.id === cid)?.name || '-';
  const getCreatorName = (uid: string) => MOCK_USERS.find((u) => u.id === uid)?.name || uid;

  // 按日期分组
  const grouped = useMemo(() => {
    const map = new Map<string, IFollowUp[]>();
    filtered.forEach((f) => {
      const date = f.createdAt.split(' ')[0];
      if (!map.has(date)) map.set(date, []);
      map.get(date)!.push(f);
    });
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [filtered]);

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FollowupFormState, string>> = {};
    if (!form.customerId) newErrors.customerId = '请选择客户';
    if (!form.content.trim()) newErrors.content = '请填写跟进内容';
    if (!form.result.trim()) newErrors.result = '请填写跟进结果';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    const finalType =
      form.type === 'other' ? form.customType.trim() || '其他' : form.type;
    setSaving(true);
    try {
      // 附件转为元数据随跟进记录保存（详情页可见）
      const uploadedAtts = attachments
        .filter((f) => f.file)
        .map((f) => ({
          id: f.id,
          name: f.name,
          size: f.size,
          type: f.type,
          uploader: 'user001',
          uploadedAt: formatDateTime(new Date()),
          url: f.url,
        }));
      await followupMutations.create({
        customerId: form.customerId,
        opportunityId: form.opportunityId || undefined,
        type: finalType,
        content: form.content,
        result: form.result,
        nextFollowUpDate: form.nextFollowUpDate || undefined,
        attachments: uploadedAtts,
      });
      setDialogOpen(false);
      setForm(emptyForm);
      setAttachments([]);
      setErrors({});
      toast.success(uploadedAtts.length > 0 ? `跟进记录已创建（含 ${uploadedAtts.length} 个附件）` : '跟进记录已创建');
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
          <h1 className="text-2xl font-bold text-foreground">跟进记录</h1>
          <p className="text-sm text-muted-foreground mt-1">
            记录所有客户跟进情况，共 {filtered.length} 条
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4 mr-1.5" />
              新增跟进
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col p-0">
            <div className="px-6 pt-6">
              <DialogHeader>
                <DialogTitle>新增跟进记录</DialogTitle>
              </DialogHeader>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  客户 <span className="text-destructive">*</span>
                </label>
                <Select
                  value={form.customerId}
                  onValueChange={(v) => setForm({ ...form, customerId: v })}
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
                {errors.customerId && (
                  <p className="text-xs text-destructive">{errors.customerId}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">跟进类型</label>
                <Select
                  value={form.type}
                  onValueChange={(v) =>
                    setForm({ ...form, type: v as IFollowUp['type'] })
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
                {form.type === 'other' && (
                  <input
                    className="w-full mt-2 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={form.customType}
                    onChange={(e) => setForm({ ...form, customType: e.target.value })}
                    placeholder="请输入跟进类型"
                  />
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  跟进内容 <span className="text-destructive">*</span>
                </label>
                <textarea
                  className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="请描述跟进内容..."
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                />
                {errors.content && (
                  <p className="text-xs text-destructive">{errors.content}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  跟进结果 <span className="text-destructive">*</span>
                </label>
                <textarea
                  className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="请填写跟进结果..."
                  value={form.result}
                  onChange={(e) => setForm({ ...form, result: e.target.value })}
                />
                {errors.result && (
                  <p className="text-xs text-destructive">{errors.result}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">下次跟进日期</label>
                <Input
                  type="date"
                  value={form.nextFollowUpDate}
                  onChange={(e) => setForm({ ...form, nextFollowUpDate: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">附件</label>
                <FileUploader files={attachments} onChange={setAttachments} />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-border/40 shrink-0">
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    取消
                  </Button>
                </DialogClose>
                <Button onClick={handleSubmit} disabled={saving}>{saving ? '保存中...' : '保存'}</Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
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
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="搜索跟进内容"
                className="bg-background pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="跟进类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
                <SelectItem value="visit">拜访</SelectItem>
                <SelectItem value="call">电话</SelectItem>
                <SelectItem value="email">邮件</SelectItem>
                <SelectItem value="meeting">会议</SelectItem>
              </SelectContent>
            </Select>
            <Select value={customerFilter} onValueChange={setCustomerFilter}>
              <SelectTrigger className="w-48">
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

      {/* 时间线 */}
      <div className="space-y-6">
        {grouped.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              暂无跟进记录
            </CardContent>
          </Card>
        ) : (
          grouped.map(([date, items]) => (
            <div key={date}>
              <div className="flex items-center gap-2 mb-3">
                <CalendarDays className="size-4 text-primary" />
                <span className="font-medium text-foreground">{date}</span>
                <Badge variant="outline" className="text-xs">
                  {items.length} 条
                </Badge>
              </div>
              <div className="space-y-3">
                {items.map((f) => {
                  const typeInfo = TYPE_MAP[f.type] || { ...TYPE_MAP.call, label: f.type };
                  const Icon = typeInfo.icon;
                  return (
                    <Card
                      key={f.id}
                      className="border border-border/40 hover:shadow-sm transition-all"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div
                            className={`size-10 rounded-lg flex items-center justify-center shrink-0 ${typeInfo.color}`}
                          >
                            <Icon className="size-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="text-xs h-5">
                                {typeInfo.label}
                              </Badge>
                              <span className="text-sm font-medium">
                                {getCustomerName(f.customerId)}
                              </span>
                              <span className="text-xs text-muted-foreground ml-auto">
                                {f.createdAt.split(' ')[1]}
                              </span>
                            </div>
                            <p className="text-sm text-foreground mt-2 leading-relaxed">
                              {f.content}
                            </p>
                            <div className="mt-3 pt-3 border-t border-border/30 flex items-center justify-between flex-wrap gap-2">
                              <div className="text-xs text-muted-foreground">
                                <span className="font-medium text-foreground">结果：</span>
                                {f.result}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span>跟进人：{getCreatorName(f.creator)}</span>
                                {f.nextFollowUpDate && (
                                  <span className="text-amber-600 flex items-center gap-1">
                                    <CalendarDays className="size-3" />
                                    下次跟进：{f.nextFollowUpDate}
                                  </span>
                                )}
                                <AlertDialog open={deleteId === f.id} onOpenChange={(open) => !open && setDeleteId(null)}>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                      onClick={(e) => e.stopPropagation()}
                                      title="删除"
                                    >
                                      <Trash2 className="size-3.5" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>确认删除跟进记录</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        确定要删除这条跟进记录吗？删除后将无法恢复。
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>取消</AlertDialogCancel>
                                      <AlertDialogAction
                                        className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                                        onClick={() => handleDelete(f.id)}
                                      >
                                        确认删除
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

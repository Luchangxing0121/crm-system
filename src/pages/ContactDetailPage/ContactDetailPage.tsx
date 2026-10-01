import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Phone,
  Mail,
  User,
  Calendar,
  ArrowLeft,
  Building2,
  MessageSquare,
  Smartphone,
  Landmark,
  Edit2,
} from 'lucide-react';
import { toast } from 'sonner';
import { type IContact } from '@/data/contacts';
import { useContacts, useCustomers, useFollowups, contactMutations } from '@/hooks/use-crm-store';

const typeLabels: Record<string, string> = {
  visit: '拜访',
  call: '电话',
  email: '邮件',
  meeting: '会议',
};

interface ContactFormState {
  name: string;
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

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [contactsAll] = useContacts();
  const [saving, setSaving] = useState(false);
  const [customersAll] = useCustomers();
  const [followupsAll] = useFollowups();

  const contact = useMemo(() => contactsAll.find((c) => c.id === id), [contactsAll, id]);

  const customer = useMemo(
    () => (contact ? customersAll.find((c) => c.id === contact.customerId) ?? null : null),
    [contact, customersAll],
  );

  const followups = useMemo(
    () =>
      contact
        ? followupsAll.filter((f) => f.contactId === contact.id).sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          )
        : [],
    [contact, followupsAll],
  );

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [form, setForm] = useState<ContactFormState>({
    name: contact?.name || '',
    position: contact?.position || '',
    mobile: contact?.mobile || '',
    phone: contact?.phone || '',
    email: contact?.email || '',
    qq: contact?.qq || '',
    wechat: contact?.wechat || '',
    gender: contact?.gender || 'male',
    isPrimary: contact?.isPrimary || false,
    remark: contact?.remark || '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ContactFormState, string>>>(
    {},
  );

  const openEditDialog = () => {
    if (!contact) return;
    setForm({
      name: contact.name,
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
    setErrors({});
    setEditDialogOpen(true);
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof ContactFormState, string>> = {};
    if (!form.name.trim()) newErrors.name = '姓名不能为空';
    if (!form.position.trim()) newErrors.position = '职务不能为空';
    if (!form.mobile.trim()) newErrors.mobile = '手机号不能为空';
    if (!form.email.trim()) {
      newErrors.email = '邮箱不能为空';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = '请输入有效的邮箱地址';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate() || !contact) return;
    setSaving(true);
    try {
      await contactMutations.update(contact.id, {
        name: form.name,
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
      setEditDialogOpen(false);
    } catch (err) {
      toast.error('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  if (!contact) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground">联系人不存在</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/contacts')}>
          返回列表
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/contacts')}>
          <ArrowLeft className="size-4 mr-1.5" />
          返回联系人列表
        </Button>
      </div>

      <Card className="border border-border/40">
        <CardContent className="p-6">
          <div className="flex items-start gap-5 flex-wrap">
            <div className="size-20 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-primary text-2xl font-bold">
                {contact.name.slice(0, 1)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-bold">{contact.name}</h1>
                {contact.isPrimary && (
                  <Badge variant="default">主要联系人</Badge>
                )}
                <Badge variant="outline">{contact.position}</Badge>
              </div>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                <span
                  className="flex items-center gap-1.5 cursor-pointer hover:text-primary"
                  onClick={() => navigate(`/customers/${contact.customerId}`)}
                >
                  <Building2 className="size-3.5" />
                  {customer?.name}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="size-3.5" />
                  添加于 {contact.createdAt}
                </span>
              </div>
              {contact.remark && (
                <p className="text-sm text-muted-foreground mt-3">{contact.remark}</p>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={openEditDialog}>
                <Edit2 className="size-4 mr-1.5" />
                编辑联系人
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border border-border/40">
          <CardHeader>
            <CardTitle className="text-base font-semibold">联系方式</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <InfoRow icon={Smartphone} label="手机" value={contact.mobile} />
            <InfoRow icon={Landmark} label="座机" value={contact.phone || '-'} />
            <InfoRow icon={Mail} label="邮箱" value={contact.email} />
            <InfoRow icon={User} label="微信" value={contact.wechat || '-'} />
            <InfoRow icon={User} label="QQ" value={contact.qq || '-'} />
            <InfoRow
              icon={User}
              label="性别"
              value={contact.gender === 'male' ? '男' : '女'}
            />
          </CardContent>
        </Card>

        <Card className="border border-border/40">
          <CardHeader>
            <CardTitle className="text-base font-semibold">所属客户</CardTitle>
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
                <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1">
                    <Phone className="size-3" /> {customer.phone}
                  </span>
                  <span className="flex items-center gap-1">
                    <Mail className="size-3" /> {customer.email}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border border-border/40">
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            跟进记录 ({followups.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {followups.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              暂无跟进记录
            </div>
          ) : (
            <div className="relative pl-6">
              <div className="absolute left-2.5 top-1 bottom-1 w-px bg-border" />
              {followups.map((f) => (
                <div key={f.id} className="relative pb-6 last:pb-0">
                  <div className="absolute -left-[13px] top-1.5 size-3 rounded-full bg-primary border-2 border-background" />
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary" className="text-xs">
                      {typeLabels[f.type]}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{f.createdAt}</span>
                  </div>
                  <p className="text-sm font-medium">{f.content}</p>
                  <p className="text-sm text-muted-foreground mt-1">{f.result}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 编辑Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑联系人</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  姓名 <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="请输入姓名"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={errors.name ? 'border-destructive' : ''}
                />
                {errors.name && (
                  <p className="text-xs text-destructive">{errors.name}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  职务 <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="请输入职务"
                  value={form.position}
                  onChange={(e) => setForm({ ...form, position: e.target.value })}
                  className={errors.position ? 'border-destructive' : ''}
                />
                {errors.position && (
                  <p className="text-xs text-destructive">{errors.position}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  手机号 <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="请输入手机号"
                  value={form.mobile}
                  onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                  className={errors.mobile ? 'border-destructive' : ''}
                />
                {errors.mobile && (
                  <p className="text-xs text-destructive">{errors.mobile}</p>
                )}
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
                  className={errors.email ? 'border-destructive' : ''}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">座机</label>
                <Input
                  placeholder="请输入座机号码"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">性别</label>
                <select
                  value={form.gender}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      gender: e.target.value as 'male' | 'female',
                    })
                  }
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="male">男</option>
                  <option value="female">女</option>
                </select>
              </div>
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
            <div className="space-y-1.5">
              <label className="text-sm font-medium">备注</label>
              <textarea
                placeholder="请输入备注信息"
                value={form.remark}
                onChange={(e) => setForm({ ...form, remark: e.target.value })}
                rows={3}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit-isPrimary"
                checked={form.isPrimary}
                onChange={(e) =>
                  setForm({ ...form, isPrimary: e.target.checked })
                }
                className="size-4 rounded border-border text-primary focus:ring-primary"
              />
              <label
                htmlFor="edit-isPrimary"
                className="text-sm text-muted-foreground"
              >
                设为主要联系人
              </label>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">取消</Button>
            </DialogClose>
            <Button onClick={handleSave}>保存修改</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Phone;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="size-8 rounded-md bg-muted flex items-center justify-center shrink-0">
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm mt-0.5 truncate">{value}</p>
      </div>
    </div>
  );
}

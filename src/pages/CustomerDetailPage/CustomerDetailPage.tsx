import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import {
  Phone,
  Mail,
  MapPin,
  Globe,
  Building2,
  Calendar,
  User,
  FileText,
  MessageSquare,
  ArrowLeft,
  Edit2,
  Plus,
  X,
  Star,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import AttachmentList from '@/components/FileUpload/AttachmentList';
import { type IContact } from '@/data/contacts';
import { MOCK_USERS } from '@/data/users';
import { useCustomers, useContacts, useOpportunities, useFollowups, useContracts, contactMutations } from '@/hooks/use-crm-store';

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

const typeLabels: Record<string, string> = {
  visit: '拜访',
  call: '电话',
  email: '邮件',
  meeting: '会议',
};

const contractStatusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  pending: { label: '待生效', variant: 'secondary' },
  active: { label: '执行中', variant: 'default' },
  completed: { label: '已完成', variant: 'outline' },
  void: { label: '已作废', variant: 'destructive' },
};

interface ContactFormState {
  id: string;
  name: string;
  position: string;
  phone: string;
  mobile: string;
  email: string;
  qq: string;
  wechat: string;
  gender: 'male' | 'female';
  isPrimary: boolean;
  remark: string;
}

const emptyContactForm = (customerId: string): ContactFormState => ({
  id: '',
  name: '',
  position: '',
  phone: '',
  mobile: '',
  email: '',
  qq: '',
  wechat: '',
  gender: 'male',
  isPrimary: false,
  remark: '',
});

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [customers] = useCustomers();
  const [contactsAll] = useContacts();
  const [oppsAll] = useOpportunities();
  const [followupsAll] = useFollowups();
  const [contractsAll] = useContracts();

  const customer = useMemo(
    () => customers.find((c) => c.id === id),
    [customers, id],
  );

  const contacts = useMemo(
    () => contactsAll.filter((c) => c.customerId === id),
    [contactsAll, id],
  );

  const opportunities = useMemo(
    () => oppsAll.filter((o) => o.customerId === id),
    [oppsAll, id],
  );

  const followups = useMemo(
    () =>
      followupsAll.filter((f) => f.customerId === id).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [id],
  );

  const contracts = useMemo(
    () => contractsAll.filter((c) => c.customerId === id),
    [contractsAll, id],
  );

  const owner = useMemo(
    () =>
      customer
        ? MOCK_USERS.find(
            (u) => u.id === customer.owner || u.username === customer.owner,
          )
        : null,
    [customer],
  );

  // 联系人Dialog状态
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<IContact | null>(null);
  const [contactForm, setContactForm] = useState<ContactFormState>(
    emptyContactForm(id || ''),
  );
  const [contactErrors, setContactErrors] = useState<
    Partial<Record<keyof ContactFormState, string>>
  >({});
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('basic');
  const [contactSaving, setContactSaving] = useState(false);
  const [contactDeleting, setContactDeleting] = useState(false);

  const openContactDialog = (contact?: IContact) => {
    if (contact) {
      setEditingContact(contact);
      setContactForm({
        id: contact.id,
        name: contact.name,
        position: contact.position,
        phone: contact.phone,
        mobile: contact.mobile,
        email: contact.email,
        qq: contact.qq || '',
        wechat: contact.wechat || '',
        gender: contact.gender,
        isPrimary: contact.isPrimary,
        remark: contact.remark,
      });
    } else {
      setEditingContact(null);
      setContactForm(emptyContactForm(id || ''));
    }
    setContactErrors({});
    setContactDialogOpen(true);
  };

  const validateContact = (): boolean => {
    const errors: Partial<Record<keyof ContactFormState, string>> = {};
    if (!contactForm.name.trim()) errors.name = '姓名不能为空';
    if (!contactForm.position.trim()) errors.position = '职务不能为空';
    if (!contactForm.mobile.trim()) errors.mobile = '手机号不能为空';
    if (!contactForm.email.trim()) {
      errors.email = '邮箱不能为空';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactForm.email)) {
      errors.email = '请输入有效的邮箱地址';
    }
    setContactErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveContact = async () => {
    if (!validateContact()) return;

    setContactSaving(true);
    try {
      if (editingContact) {
        await contactMutations.update(editingContact.id, {
          name: contactForm.name,
          position: contactForm.position,
          phone: contactForm.phone,
          mobile: contactForm.mobile,
          email: contactForm.email,
          qq: contactForm.qq || undefined,
          wechat: contactForm.wechat || undefined,
          gender: contactForm.gender,
          isPrimary: contactForm.isPrimary,
          remark: contactForm.remark,
        });
        toast.success('联系人信息已更新');
      } else {
        await contactMutations.create({
          customerId: id || '',
          name: contactForm.name,
          position: contactForm.position,
          phone: contactForm.phone,
          mobile: contactForm.mobile,
          email: contactForm.email,
          qq: contactForm.qq || undefined,
          wechat: contactForm.wechat || undefined,
          gender: contactForm.gender,
          isPrimary: contactForm.isPrimary,
          remark: contactForm.remark,
        });
        toast.success('联系人添加成功');
      }
      setContactDialogOpen(false);
    } catch (err) {
      toast.error('保存失败，请重试');
    } finally {
      setContactSaving(false);
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    setContactDeleting(true);
    try {
      await contactMutations.remove(contactId);
      setDeleteTargetId(null);
      toast.success('联系人已删除');
    } catch (err) {
      toast.error('删除失败，请重试');
    } finally {
      setContactDeleting(false);
    }
  };

  const handleSetPrimary = async (contactId: string) => {
    try {
      await contactMutations.update(contactId, { isPrimary: true });
      toast.success('已设为主要联系人');
    } catch (err) {
      toast.error('操作失败，请重试');
    }
  };

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground">客户不存在</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/customers')}>
          返回列表
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/customers')}>
          <ArrowLeft className="size-4 mr-1.5" />
          返回客户列表
        </Button>
      </div>

      <Card className="border border-border/40">
        <CardContent className="p-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-start gap-4">
              <div className="size-16 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Building2 className="size-8 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-xl font-bold">{customer.name}</h1>
                  <Badge variant={levelBadgeVariant[customer.level]}>
                    {customer.level}级客户
                  </Badge>
                  <Badge variant={statusLabels[customer.status].variant}>
                    {statusLabels[customer.status].label}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1.5">
                    <Building2 className="size-3.5" />
                    {customer.industry}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <User className="size-3.5" />
                    负责人: {owner?.name || customer.owner}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="size-3.5" />
                    创建于 {customer.createdAt}
                  </span>
                </div>
                {customer.tags.length > 0 && (
                  <div className="flex gap-1.5 mt-3 flex-wrap">
                    {customer.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs font-normal">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">
                <Plus className="size-4 mr-1.5" />
                新增跟进
              </Button>
              <Button onClick={() => navigate(`/customers/edit/${customer.id}`)}>
                <Edit2 className="size-4 mr-1.5" />
                编辑客户
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border/40">
        <CardContent className="p-0">
          <Tabs
            defaultValue="basic"
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <div className="border-b border-border/30 px-6">
              <TabsList className="h-auto bg-transparent p-0 gap-6">
                <TabsTrigger
                  value="basic"
                  className="data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-3"
                >
                  基本信息
                </TabsTrigger>
                <TabsTrigger
                  value="contacts"
                  className="data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-3"
                >
                  联系人 ({contacts.length})
                </TabsTrigger>
                <TabsTrigger
                  value="followups"
                  className="data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-3"
                >
                  跟进记录 ({followups.length})
                </TabsTrigger>
                <TabsTrigger
                  value="opportunities"
                  className="data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-3"
                >
                  商机 ({opportunities.length})
                </TabsTrigger>
                <TabsTrigger
                  value="contracts"
                  className="data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-3"
                >
                  合同 ({contracts.length})
                </TabsTrigger>
                <TabsTrigger
                  value="attachments"
                  className="data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-3"
                >
                  附件
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="basic" className="p-6 m-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground">基础信息</h3>
                  <InfoRow icon={Building2} label="行业" value={customer.industry} />
                  <InfoRow icon={User} label="客户来源" value={customer.source} />
                  <InfoRow
                    icon={Calendar}
                    label="创建时间"
                    value={customer.createdAt}
                  />
                  <InfoRow
                    icon={FileText}
                    label="客户描述"
                    value={customer.description}
                  />
                </div>
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground">联系方式</h3>
                  <InfoRow icon={Phone} label="联系电话" value={customer.phone} />
                  <InfoRow icon={Mail} label="电子邮箱" value={customer.email} />
                  <InfoRow icon={Globe} label="官方网站" value={customer.website} />
                  <InfoRow icon={MapPin} label="公司地址" value={customer.address} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="contacts" className="p-6 m-0">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-foreground">
                  关联联系人
                </h3>
                <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" onClick={() => openContactDialog()}>
                      <Plus className="size-3.5 mr-1" />
                      新增联系人
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col p-0">
                    <div className="px-6 pt-6">
                      <DialogHeader>
                        <DialogTitle>
                          {editingContact ? '编辑联系人' : '新增联系人'}
                        </DialogTitle>
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
                            value={contactForm.name}
                            onChange={(e) =>
                              setContactForm({
                                ...contactForm,
                                name: e.target.value,
                              })
                            }
                            className={contactErrors.name ? 'border-destructive' : ''}
                          />
                          {contactErrors.name && (
                            <p className="text-xs text-destructive">
                              {contactErrors.name}
                            </p>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium">
                            职务 <span className="text-destructive">*</span>
                          </label>
                          <Input
                            placeholder="请输入职务"
                            value={contactForm.position}
                            onChange={(e) =>
                              setContactForm({
                                ...contactForm,
                                position: e.target.value,
                              })
                            }
                            className={
                              contactErrors.position ? 'border-destructive' : ''
                            }
                          />
                          {contactErrors.position && (
                            <p className="text-xs text-destructive">
                              {contactErrors.position}
                            </p>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium">
                            手机号 <span className="text-destructive">*</span>
                          </label>
                          <Input
                            placeholder="请输入手机号"
                            value={contactForm.mobile}
                            onChange={(e) =>
                              setContactForm({
                                ...contactForm,
                                mobile: e.target.value,
                              })
                            }
                            className={
                              contactErrors.mobile ? 'border-destructive' : ''
                            }
                          />
                          {contactErrors.mobile && (
                            <p className="text-xs text-destructive">
                              {contactErrors.mobile}
                            </p>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium">
                            邮箱 <span className="text-destructive">*</span>
                          </label>
                          <Input
                            type="email"
                            placeholder="请输入邮箱"
                            value={contactForm.email}
                            onChange={(e) =>
                              setContactForm({
                                ...contactForm,
                                email: e.target.value,
                              })
                            }
                            className={
                              contactErrors.email ? 'border-destructive' : ''
                            }
                          />
                          {contactErrors.email && (
                            <p className="text-xs text-destructive">
                              {contactErrors.email}
                            </p>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium">座机</label>
                          <Input
                            placeholder="请输入座机号码"
                            value={contactForm.phone}
                            onChange={(e) =>
                              setContactForm({
                                ...contactForm,
                                phone: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium">性别</label>
                          <select
                            value={contactForm.gender}
                            onChange={(e) =>
                              setContactForm({
                                ...contactForm,
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
                            value={contactForm.wechat}
                            onChange={(e) =>
                              setContactForm({
                                ...contactForm,
                                wechat: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium">QQ</label>
                          <Input
                            placeholder="请输入QQ号"
                            value={contactForm.qq}
                            onChange={(e) =>
                              setContactForm({
                                ...contactForm,
                                qq: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">备注</label>
                        <textarea
                          placeholder="请输入备注信息"
                          value={contactForm.remark}
                          onChange={(e) =>
                            setContactForm({
                              ...contactForm,
                              remark: e.target.value,
                            })
                          }
                          rows={3}
                          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="isPrimary"
                          checked={contactForm.isPrimary}
                          onChange={(e) =>
                            setContactForm({
                              ...contactForm,
                              isPrimary: e.target.checked,
                            })
                          }
                          className="size-4 rounded border-border text-primary focus:ring-primary"
                        />
                        <label
                          htmlFor="isPrimary"
                          className="text-sm text-muted-foreground"
                        >
                          设为主要联系人
                        </label>
                      </div>
                    </div>
                    <div className="px-6 py-4 border-t border-border/40 shrink-0">
                      <DialogFooter>
                        <DialogClose asChild>
                          <Button variant="outline">取消</Button>
                        </DialogClose>
                        <Button onClick={handleSaveContact} disabled={contactSaving}>
                          {contactSaving ? '保存中...' : editingContact ? '保存修改' : '添加联系人'}
                        </Button>
                      </DialogFooter>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {contacts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm border border-dashed border-border/40 rounded-lg">
                  暂无联系人，点击右上角"新增联系人"按钮添加
                </div>
              ) : (
                <div className="space-y-3">
                  {contacts.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center gap-4 p-4 rounded-lg border border-border/40 hover:bg-muted/20"
                    >
                      <div
                        className="size-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 cursor-pointer hover:bg-primary/20"
                        onClick={() => navigate(`/contacts/${c.id}`)}
                      >
                        <span className="text-primary font-medium text-sm">
                          {c.name.slice(0, 1)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="font-medium cursor-pointer hover:text-primary"
                            onClick={() => navigate(`/contacts/${c.id}`)}
                          >
                            {c.name}
                          </span>
                          {c.isPrimary && (
                            <Badge variant="default" className="text-xs">
                              主要联系人
                            </Badge>
                          )}
                          <span className="text-muted-foreground text-sm">
                            {c.position}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <Phone className="size-3" /> {c.mobile}
                          </span>
                          <span className="flex items-center gap-1">
                            <Mail className="size-3" /> {c.email}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {!c.isPrimary && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                            onClick={() => handleSetPrimary(c.id)}
                            title="设为主要联系人"
                          >
                            <Star className="size-3.5 text-muted-foreground" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2"
                          onClick={() => openContactDialog(c)}
                        >
                          <Edit2 className="size-3.5" />
                        </Button>
                        <AlertDialog
                          open={deleteTargetId === c.id}
                          onOpenChange={(open) => !open && setDeleteTargetId(null)}
                        >
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-destructive hover:text-destructive"
                              onClick={() => setDeleteTargetId(c.id)}
                            >
                              <X className="size-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogTitle>确认删除</AlertDialogTitle>
                            <AlertDialogDescription>
                              确定要删除联系人「{c.name}」吗？此操作不可撤销。
                            </AlertDialogDescription>
                            <AlertDialogFooter>
                              <AlertDialogCancel>取消</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteContact(c.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                确认删除
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="followups" className="p-6 m-0">
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
                        <span className="text-xs text-muted-foreground">
                          {f.createdAt}
                        </span>
                      </div>
                      <p className="text-sm font-medium">{f.content}</p>
                      <p className="text-sm text-muted-foreground mt-1">{f.result}</p>
                      {f.nextFollowUpDate && (
                        <p className="text-xs text-primary mt-2 flex items-center gap-1">
                          <Calendar className="size-3" />
                          下次跟进: {f.nextFollowUpDate}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="opportunities" className="p-6 m-0">
              {opportunities.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  暂无商机
                </div>
              ) : (
                <div className="w-full overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50">
                        <th className="text-left font-medium text-muted-foreground px-3 py-2.5 whitespace-nowrap">
                          商机名称
                        </th>
                        <th className="text-left font-medium text-muted-foreground px-3 py-2.5 whitespace-nowrap">
                          阶段
                        </th>
                        <th className="text-right font-medium text-muted-foreground px-3 py-2.5 whitespace-nowrap">
                          金额
                        </th>
                        <th className="text-left font-medium text-muted-foreground px-3 py-2.5 whitespace-nowrap">
                          赢单率
                        </th>
                        <th className="text-left font-medium text-muted-foreground px-3 py-2.5 whitespace-nowrap">
                          预计成交
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {opportunities.map((o) => (
                        <tr
                          key={o.id}
                          className="border-b border-border/30 last:border-0 hover:bg-muted/30 cursor-pointer"
                          onClick={() => navigate(`/opportunities/${o.id}`)}
                        >
                          <td className="px-3 py-2.5 font-medium">
                            <span className="block truncate max-w-[200px] text-primary">
                              {o.name}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <Badge variant="secondary" className="text-xs">
                              {getStageLabel(o.stage)}
                            </Badge>
                          </td>
                          <td className="px-3 py-2.5 text-right font-medium tabular-nums">
                            ¥{o.amount.toLocaleString()}
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="text-xs text-muted-foreground">
                              {o.winRate}%
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">
                            {o.expectedStartDate}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="contracts" className="p-6 m-0">
              {contracts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  暂无合同
                </div>
              ) : (
                <div className="w-full overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50">
                        <th className="text-left font-medium text-muted-foreground px-3 py-2.5 whitespace-nowrap">
                          合同编号
                        </th>
                        <th className="text-right font-medium text-muted-foreground px-3 py-2.5 whitespace-nowrap">
                          金额
                        </th>
                        <th className="text-left font-medium text-muted-foreground px-3 py-2.5 whitespace-nowrap">
                          签约时间
                        </th>
                        <th className="text-left font-medium text-muted-foreground px-3 py-2.5 whitespace-nowrap">
                          状态
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {contracts.map((c) => (
                        <tr
                          key={c.id}
                          className="border-b border-border/30 last:border-0 hover:bg-muted/30 cursor-pointer"
                          onClick={() => navigate(`/contracts/${c.id}`)}
                        >
                          <td className="px-3 py-2.5 font-medium text-primary">
                            {c.contractNo}
                          </td>
                          <td className="px-3 py-2.5 text-right font-medium tabular-nums">
                            ¥{c.amount.toLocaleString()}
                          </td>
                          <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">
                            {c.signDate}
                          </td>
                          <td className="px-3 py-2.5">
                            <Badge
                              variant={contractStatusLabels[c.status].variant}
                              className="text-xs"
                            >
                              {contractStatusLabels[c.status].label}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="attachments" className="p-6 m-0">
              <AttachmentList attachments={customer.attachments || []} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
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
    <div className="flex items-start gap-3">
      <Icon className="size-4 text-muted-foreground mt-0.5 shrink-0" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function getStageLabel(stage: string): string {
  const map: Record<string, string> = {
    lead: '线索',
    contact: '接触',
    requirement: '需求确认',
    proposal: '方案报价',
    negotiation: '商务谈判',
    lost: '输单',
  };
  return map[stage] || stage;
}

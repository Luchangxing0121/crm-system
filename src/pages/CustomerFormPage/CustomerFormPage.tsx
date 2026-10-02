import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
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
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ArrowLeft, Save, Plus, X, Star, StarOff } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import FileUploader from '@/components/FileUpload/FileUploader';
import type { UploadedFile } from '@/components/FileUpload/FileUploader';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { type ICustomer, type IAttachment } from '@/data/customers';
import { type IContact } from '@/data/contacts';
import { useCustomers, useContacts, customerMutations, contactMutations } from '@/hooks/use-crm-store';
import { customerApi } from '@/services/api';

const contactSchema = z.object({
  name: z.string().min(1, '姓名不能为空'),
  position: z.string().min(1, '职务不能为空'),
  mobile: z.string().min(1, '手机号不能为空'),
  email: z.string().email('请输入有效的邮箱地址'),
  isPrimary: z.boolean(),
});

const customerSchema = z.object({
  name: z.string().min(1, '客户名称不能为空'),
  industry: z.string().min(1, '请选择行业'),
  level: z.enum(['A', 'B', 'C']),
  status: z.enum(['active', 'inactive', 'potential']),
  source: z.string().min(1, '请选择客户来源'),
  phone: z.string().min(1, '联系电话不能为空'),
  email: z.string().email('请输入有效的邮箱地址'),
  website: z.string().optional(),
  address: z.string().optional(),
  description: z.string().optional(),
  tags: z.string().optional(),
});

type CustomerFormData = z.infer<typeof customerSchema>;
type ContactFormRow = z.infer<typeof contactSchema> & {
  _id: string;
  _existing?: boolean; // 标记是否为已存在的联系人
};

const INDUSTRY_OPTIONS = [
  '互联网',
  '金融',
  '制造',
  '教育',
  '医疗',
  '零售',
  '其他',
];

const SOURCE_OPTIONS = [
  '官网咨询',
  '老客户推荐',
  '展会获客',
  '线上营销',
  '合作伙伴',
  '电话销售',
  '招投标',
];

const emptyContact = (): ContactFormRow => ({
  _id: `new_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  name: '',
  position: '',
  mobile: '',
  email: '',
  isPrimary: false,
});

interface CustomerFormInnerProps {
  routeId?: string;
  isEdit: boolean;
  customer: ICustomer | null;
  contactsAll: IContact[];
}

// 外层：负责数据加载，数据就绪后才挂载表单（避免表单以空数据初始化导致回填失败）
export default function CustomerFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id && id !== 'new';
  const [customersAll] = useCustomers();
  const [contactsAll] = useContacts();

  const customer = useMemo(
    () => (isEdit ? customersAll.find((c) => c.id === id) ?? null : null),
    [isEdit, id, customersAll],
  );

  if (isEdit && !customer) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        {customersAll.length > 0 ? (
          <>
            <p className="text-muted-foreground">客户不存在</p>
            <Button variant="outline" className="mt-4" onClick={() => window.history.back()}>
              返回
            </Button>
          </>
        ) : (
          <p className="text-muted-foreground">客户数据加载中...</p>
        )}
      </div>
    );
  }

  return (
    <CustomerFormInner
      key={id || 'new'}
      routeId={id}
      isEdit={isEdit}
      customer={customer}
      contactsAll={contactsAll}
    />
  );
}

function CustomerFormInner({ routeId: id, isEdit, customer, contactsAll }: CustomerFormInnerProps) {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const existingContacts = useMemo(
    () => (isEdit ? contactsAll.filter((c) => c.customerId === id) : []),
    [isEdit, id, contactsAll],
  );

  const [contacts, setContacts] = useState<ContactFormRow[]>(() => {
    if (isEdit && existingContacts.length > 0) {
      return existingContacts.map((c) => ({
        _id: c.id,
        _existing: true,
        name: c.name,
        position: c.position,
        mobile: c.mobile,
        email: c.email,
        isPrimary: c.isPrimary,
      }));
    }
    return [emptyContact()];
  });

  const [contactErrors, setContactErrors] = useState<
    Record<string, Partial<Record<keyof ContactFormRow, string>>>
  >({});
  const [attachments, setAttachments] = useState<UploadedFile[]>([]);

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: customer
      ? {
          name: customer.name,
          industry: customer.industry,
          level: customer.level,
          status: customer.status,
          source: customer.source,
          phone: customer.phone,
          email: customer.email,
          website: customer.website,
          address: customer.address,
          description: customer.description,
          tags: customer.tags.join('、'),
        }
      : {
          name: '',
          industry: '',
          level: 'B',
          status: 'potential',
          source: '',
          phone: '',
          email: '',
          website: '',
          address: '',
          description: '',
          tags: '',
        },
  });

  const addContact = () => {
    setContacts((prev) => [...prev, emptyContact()]);
  };

  const removeContact = (rowId: string) => {
    setContacts((prev) => prev.filter((c) => c._id !== rowId));
    setContactErrors((prev) => {
      const next = { ...prev };
      delete next[rowId];
      return next;
    });
  };

  const updateContact = (rowId: string, field: keyof ContactFormRow, value: string | boolean) => {
    setContacts((prev) =>
      prev.map((c) => (c._id === rowId ? { ...c, [field]: value } : c)),
    );
    setContactErrors((prev) => {
      if (!prev[rowId]) return prev;
      const next = { ...prev };
      next[rowId] = { ...next[rowId], [field]: undefined };
      return next;
    });
  };

  const setPrimaryContact = (rowId: string) => {
    setContacts((prev) =>
      prev.map((c) => ({
        ...c,
        isPrimary: c._id === rowId,
      })),
    );
  };

  const validateContacts = (): boolean => {
    const errors: Record<string, Partial<Record<keyof ContactFormRow, string>>> = {};
    let valid = true;

    contacts.forEach((c) => {
      const rowErrors: Partial<Record<keyof ContactFormRow, string>> = {};

      if (!c.name.trim()) {
        rowErrors.name = '姓名不能为空';
        valid = false;
      }
      if (!c.position.trim()) {
        rowErrors.position = '职务不能为空';
        valid = false;
      }
      if (!c.mobile.trim()) {
        rowErrors.mobile = '手机号不能为空';
        valid = false;
      }
      if (!c.email.trim()) {
        rowErrors.email = '邮箱不能为空';
        valid = false;
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)) {
        rowErrors.email = '请输入有效的邮箱地址';
        valid = false;
      }

      if (Object.keys(rowErrors).length > 0) {
        errors[c._id] = rowErrors;
      }
    });

    setContactErrors(errors);

    if (valid && contacts.length > 0 && !contacts.some((c) => c.isPrimary)) {
      toast.warning('请至少设置一个主要联系人');
      return false;
    }

    return valid;
  };

  const onSubmit = async (values: CustomerFormData) => {
    if (!validateContacts()) {
      toast.error('请检查联系人信息');
      return;
    }

    setSubmitting(true);
    try {
      // 附件转为元数据存入客户档案（详情页附件区可见）
      const attachmentMeta: IAttachment[] = attachments.map((f) => ({
        id: f.id,
        name: f.name,
        size: f.size,
        type: f.type,
        uploader: 'user001',
        uploadedAt: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
        url: f.url,
      }));
      const customerData = {
        name: values.name.trim(),
        industry: values.industry,
        level: values.level,
        status: values.status,
        source: values.source,
        phone: values.phone,
        email: values.email,
        website: values.website || '',
        address: values.address || '',
        description: values.description || '',
        tags: values.tags ? values.tags.split(/[、,，]/).map((t) => t.trim()).filter(Boolean) : [],
        ...(isEdit ? {} : { attachments: attachmentMeta }),
      };

      if (isEdit && id) {
        // 编辑：更新客户（有新附件时先取原档案合并，避免覆盖已有附件）
        let mergedAttachments: IAttachment[] | undefined;
        if (attachmentMeta.length > 0) {
          try {
            const existing = await customerApi.detail(id);
            const prevAtts = Array.isArray((existing as { attachments?: unknown[] })?.attachments)
              ? ((existing as { attachments: unknown[] }).attachments as IAttachment[])
              : [];
            mergedAttachments = [...prevAtts, ...attachmentMeta];
          } catch {
            mergedAttachments = attachmentMeta;
          }
        }
        await customerMutations.update(id, {
          ...customerData,
          ...(mergedAttachments ? { attachments: mergedAttachments } : {}),
        });
        // 联系人简化处理：新增新联系人（已有联系人保持不变）
        const newContacts = contacts.filter((c) => !c._existing && c.name.trim());
        for (const c of newContacts) {
          await contactMutations.create({
            customerId: id,
            name: c.name.trim(),
            position: c.position.trim(),
            mobile: c.mobile,
            email: c.email,
            isPrimary: c.isPrimary,
          });
        }
        toast.success('客户信息已更新');
        navigate(`/customers/${id}`);
      } else {
        // 新增：创建客户 + 联系人
        const newCustomer = await customerMutations.create(customerData);
        // 批量创建联系人
        const validContacts = contacts.filter((c) => c.name.trim());
        for (const c of validContacts) {
          await contactMutations.create({
            customerId: newCustomer.id,
            name: c.name.trim(),
            position: c.position.trim(),
            mobile: c.mobile,
            email: c.email,
            isPrimary: c.isPrimary,
          });
        }
        toast.success(`客户创建成功，已同步添加 ${validContacts.length} 位联系人`);
        navigate('/customers');
      }
      setAttachments([]);
    } catch (err) {
      toast.error('保存失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  if (isEdit && !customer) {
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
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="size-4 mr-1.5" />
          返回
        </Button>
      </div>

      <Card className="border border-border/40">
        <CardHeader>
          <CardTitle className="text-lg">{isEdit ? '编辑客户' : '新增客户'}</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-6"
              noValidate
            >
              {/* 基本信息 */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-4 pb-2 border-b border-border/30">
                  基本信息
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          客户名称 <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="请输入客户名称" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="industry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          所属行业 <span className="text-destructive">*</span>
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="请选择行业" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {INDUSTRY_OPTIONS.map((opt) => (
                              <SelectItem key={opt} value={opt}>
                                {opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="level"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          客户分级 <span className="text-destructive">*</span>
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="请选择分级" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="A">A级 - 重点客户</SelectItem>
                            <SelectItem value="B">B级 - 普通客户</SelectItem>
                            <SelectItem value="C">C级 - 小客户</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          客户状态 <span className="text-destructive">*</span>
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="请选择状态" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="active">活跃</SelectItem>
                            <SelectItem value="potential">潜在</SelectItem>
                            <SelectItem value="inactive">不活跃</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="source"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          客户来源 <span className="text-destructive">*</span>
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="请选择来源" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {SOURCE_OPTIONS.map((opt) => (
                              <SelectItem key={opt} value={opt}>
                                {opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          联系电话 <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="请输入联系电话" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          电子邮箱 <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="请输入电子邮箱"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>官方网站</FormLabel>
                        <FormControl>
                          <Input placeholder="请输入官方网站" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="tags"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>客户标签</FormLabel>
                        <FormControl>
                          <Input placeholder="多个标签用顿号分隔" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="mt-5 space-y-5">
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>公司地址</FormLabel>
                        <FormControl>
                          <Input placeholder="请输入公司地址" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>客户描述</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="请输入客户描述信息"
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* 联系人信息 */}
              <div>
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-border/30">
                  <h3 className="text-sm font-semibold text-foreground">
                    联系人信息
                  </h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addContact}
                  >
                    <Plus className="size-3.5 mr-1" />
                    添加联系人
                  </Button>
                </div>

                <div className="space-y-3">
                  {contacts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm border border-dashed border-border/50 rounded-lg">
                      暂无联系人，点击上方"添加联系人"按钮添加
                    </div>
                  ) : (
                    contacts.map((contact, index) => (
                      <ContactRow
                        key={contact._id}
                        index={index}
                        contact={contact}
                        errors={contactErrors[contact._id] || {}}
                        onChange={(field, value) =>
                          updateContact(contact._id, field, value)
                        }
                        onSetPrimary={() => setPrimaryContact(contact._id)}
                        onRemove={() => removeContact(contact._id)}
                        canRemove={contacts.length > 1 || contact.isPrimary === false}
                        isExisting={!!contact._existing}
                      />
                    ))
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  提示：一个客户可以关联多位联系人，请至少设置一位主要联系人
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold">附件</h3>
                <FileUploader files={attachments} onChange={setAttachments} />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(-1)}
                >
                  取消
                </Button>
                 <Button type="submit" disabled={submitting}>
                   <Save className="size-4 mr-1.5" />
                   {submitting ? '保存中...' : isEdit ? '保存修改' : '创建客户'}
                 </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

function ContactRow({
  index,
  contact,
  errors,
  onChange,
  onSetPrimary,
  onRemove,
  canRemove,
  isExisting,
}: {
  index: number;
  contact: ContactFormRow;
  errors: Partial<Record<keyof ContactFormRow, string>>;
  onChange: (field: keyof ContactFormRow, value: string | boolean) => void;
  onSetPrimary: () => void;
  onRemove: () => void;
  canRemove: boolean;
  isExisting: boolean;
}) {
  return (
    <div className="p-4 rounded-lg border border-border/40 bg-card/50">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">联系人 {index + 1}</span>
          {isExisting && (
            <Badge variant="outline" className="text-xs font-normal">
              已有
            </Badge>
          )}
          {contact.isPrimary && (
            <Badge variant="default" className="text-xs">
              主要联系人
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!contact.isPrimary && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={onSetPrimary}
            >
              <Star className="size-3.5 mr-1 text-muted-foreground" />
              设为主要
            </Button>
          )}
          {canRemove && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                >
                  <X className="size-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogTitle>确认删除</AlertDialogTitle>
                <AlertDialogDescription>
                  确定要删除联系人「{contact.name || '未命名'}」吗？
                </AlertDialogDescription>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction onClick={onRemove}>
                    确认删除
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium">
            姓名 <span className="text-destructive">*</span>
          </label>
          <Input
            placeholder="姓名"
            value={contact.name}
            onChange={(e) => onChange('name', e.target.value)}
            className={errors.name ? 'border-destructive' : ''}
          />
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name}</p>
          )}
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">
            职务 <span className="text-destructive">*</span>
          </label>
          <Input
            placeholder="职务"
            value={contact.position}
            onChange={(e) => onChange('position', e.target.value)}
            className={errors.position ? 'border-destructive' : ''}
          />
          {errors.position && (
            <p className="text-xs text-destructive">{errors.position}</p>
          )}
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">
            手机号 <span className="text-destructive">*</span>
          </label>
          <Input
            placeholder="手机号码"
            value={contact.mobile}
            onChange={(e) => onChange('mobile', e.target.value)}
            className={errors.mobile ? 'border-destructive' : ''}
          />
          {errors.mobile && (
            <p className="text-xs text-destructive">{errors.mobile}</p>
          )}
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">
            邮箱 <span className="text-destructive">*</span>
          </label>
          <Input
            type="email"
            placeholder="邮箱地址"
            value={contact.email}
            onChange={(e) => onChange('email', e.target.value)}
            className={errors.email ? 'border-destructive' : ''}
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email}</p>
          )}
        </div>
      </div>
    </div>
  );
}

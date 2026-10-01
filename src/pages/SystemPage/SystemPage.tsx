import { useState } from 'react';
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
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  Search,
  Shield,
  UserCog,
  Settings,
  User,
  Mail,
  Building,
  Plus,
  Edit,
  KeyRound,
  Phone,
  LogIn,
  Lock,
  Bell,
  Trash2,
  Smartphone,
  Download,
  Upload,
  RotateCcw,
  Database,
} from 'lucide-react';
import { MOCK_CURRENT_USER, type ISystemUser } from '@/data/users';
import { useAuth } from '@/contexts/AuthContext';
import { useUsers, userMutations } from '@/hooks/use-crm-store';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import { exportAllMockData, importMockData, resetAllMockData } from '@/services/mockFallback';

const ROLE_LABELS: Record<string, string> = {
  admin: '系统管理员',
  manager: '销售经理',
  sales: '销售代表',
};

const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ['全部权限', '用户管理', '角色管理', '系统设置', '数据看板', '客户管理', '商机管理', '合同管理', '报表查看'],
  manager: ['数据看板', '客户管理', '商机管理', '合同管理', '报表查看', '团队管理'],
  sales: ['数据看板', '客户管理', '商机管理', '跟进记录', '合同查看'],
};

const DEPARTMENTS = ['销售部', '市场部', '技术部', '运营部', '人事部'];

interface UserFormState {
  username: string;
  name: string;
  email: string;
  phone: string;
  role: ISystemUser['role'];
  department: string;
  status: ISystemUser['status'];
}

const emptyUserForm: UserFormState = {
  username: '',
  name: '',
  email: '',
  phone: '',
  role: 'sales',
  department: '销售部',
  status: 'active',
};

const LOGIN_RECORDS = [
  { time: '2024-03-20 09:15:32', ip: '192.168.1.100', device: 'Chrome / Windows', location: '上海', status: 'success' },
  { time: '2024-03-19 18:42:08', ip: '192.168.1.100', device: 'Chrome / Windows', location: '上海', status: 'success' },
  { time: '2024-03-19 09:08:21', ip: '192.168.1.100', device: 'Chrome / Windows', location: '上海', status: 'success' },
  { time: '2024-03-18 22:15:44', ip: '10.0.0.25', device: 'Safari / iPhone', location: '北京', status: 'success' },
  { time: '2024-03-18 08:55:10', ip: '192.168.1.100', device: 'Chrome / Windows', location: '上海', status: 'success' },
];

export default function SystemPage() {
  const [tab, setTab] = useState('users');
  const [users] = useUsers();
  const [userSaving, setUserSaving] = useState(false);
  const [userDeleting, setUserDeleting] = useState(false);
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null);
  const [keyword, setKeyword] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // 用户Dialog
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ISystemUser | null>(null);
  const [userForm, setUserForm] = useState<UserFormState>(emptyUserForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // 重置密码Dialog
  const [resetPwdOpen, setResetPwdOpen] = useState(false);
  const [resetPwdUser, setResetPwdUser] = useState<ISystemUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // 删除用户确认
  const [deleteUser, setDeleteUser] = useState<ISystemUser | null>(null);

  const handleDeleteUser = async () => {
    if (!deleteUser) return;
    setUserDeleting(true);
    try {
      await userMutations.remove(deleteUser.id);
      toast.success(`用户「${deleteUser.name}」已删除`);
      setDeleteUser(null);
    } catch (err) {
      toast.error('删除失败，请重试');
    } finally {
      setUserDeleting(false);
    }
  };

  // 个人设置
  const { user: currentUser, refreshUser } = useAuth();
  const [profile, setProfile] = useState({
    name: currentUser?.name || MOCK_CURRENT_USER.name,
    email: currentUser?.email || MOCK_CURRENT_USER.email,
    phone: currentUser?.phone || MOCK_CURRENT_USER.phone,
    department: currentUser?.department || MOCK_CURRENT_USER.department,
  });

  // 修改密码
  const [pwdForm, setPwdForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // 通知开关
  const [notifications, setNotifications] = useState(true);
  const [twoFactor, setTwoFactor] = useState(false);

  const filtered = users.filter((u) => {
    if (keyword && !u.name.toLowerCase().includes(keyword.toLowerCase())) return false;
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    return true;
  });

  const openAddUser = () => {
    setEditingUser(null);
    setUserForm(emptyUserForm);
    setFormErrors({});
    setUserDialogOpen(true);
  };

  const openEditUser = (user: ISystemUser) => {
    setEditingUser(user);
    setUserForm({
      username: user.username,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      department: user.department,
      status: user.status,
    });
    setFormErrors({});
    setUserDialogOpen(true);
  };

  const validateUserForm = () => {
    const errs: Record<string, string> = {};
    if (!userForm.username.trim()) errs.username = '请输入用户名';
    if (!userForm.name.trim()) errs.name = '请输入姓名';
    if (!userForm.email.trim()) errs.email = '请输入邮箱';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveUser = async () => {
    if (!validateUserForm()) return;
    setUserSaving(true);
    try {
      if (editingUser) {
        await userMutations.update(editingUser.id, userForm);
        toast.success(`用户「${userForm.name}」信息已更新`);
      } else {
        await userMutations.create({ ...userForm, password: '123456' });
        toast.success(`用户「${userForm.name}」已创建，初始密码：123456`);
      }
      setUserDialogOpen(false);
    } catch (err) {
      toast.error('保存失败，请重试');
    } finally {
      setUserSaving(false);
    }
  };

  const handleToggleStatus = async (user: ISystemUser) => {
    setTogglingUserId(user.id);
    try {
      await userMutations.toggleStatus(user.id);
      const newStatus = user.status === 'active' ? 'disabled' : 'active';
      toast.success(`用户「${user.name}」已${newStatus === 'active' ? '启用' : '禁用'}`);
    } catch (err) {
      toast.error('操作失败，请重试');
    } finally {
      setTogglingUserId(null);
    }
  };

  const openResetPassword = (user: ISystemUser) => {
    setResetPwdUser(user);
    setNewPassword('');
    setConfirmPassword('');
    setResetPwdOpen(true);
  };

  const handleResetPassword = () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error('密码长度至少6位');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('两次输入的密码不一致');
      return;
    }
    toast.success(`「${resetPwdUser?.name}」的密码已重置`);
    setResetPwdOpen(false);
  };

  const handleSaveProfile = () => {
    if (!profile.name.trim()) {
      toast.error('姓名不能为空');
      return;
    }
    toast.success('个人信息已保存');
  };

  const handleChangePassword = async () => {
    if (!pwdForm.oldPassword || !pwdForm.newPassword) {
      toast.error('请填写完整信息');
      return;
    }
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      toast.error('两次输入的新密码不一致');
      return;
    }
    if (pwdForm.newPassword.length < 6) {
      toast.error('新密码长度至少6位');
      return;
    }
    try {
      await userMutations.changePassword(pwdForm.oldPassword, pwdForm.newPassword);
      toast.success('密码修改成功');
      setPwdForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error('密码修改失败，请检查原密码是否正确');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">系统管理</h1>
        <p className="text-sm text-muted-foreground mt-1">
          用户、角色权限和系统设置管理
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="users" className="flex items-center gap-1.5">
            <UserCog className="size-4" />
            用户列表
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center gap-1.5">
            <Shield className="size-4" />
            角色权限
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-1.5">
            <Settings className="size-4" />
            个人设置
          </TabsTrigger>
          <TabsTrigger value="data" className="flex items-center gap-1.5">
            <Database className="size-4" />
            数据管理
          </TabsTrigger>
        </TabsList>

        {/* 用户列表 */}
        <TabsContent value="users" className="mt-4">
          <Card className="border border-border/40">
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative w-64 max-w-full">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="search"
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                      placeholder="搜索用户姓名"
                      className="bg-background pl-9"
                    />
                  </div>
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="角色" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部角色</SelectItem>
                      <SelectItem value="admin">系统管理员</SelectItem>
                      <SelectItem value="manager">销售经理</SelectItem>
                      <SelectItem value="sales">销售代表</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={openAddUser}>
                  <Plus className="size-4 mr-1.5" />
                  新增用户
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="w-full overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 bg-muted/20">
                      <th className="text-left font-medium text-muted-foreground px-5 py-3 whitespace-nowrap">
                        用户
                      </th>
                      <th className="text-left font-medium text-muted-foreground px-5 py-3 whitespace-nowrap">
                        邮箱
                      </th>
                      <th className="text-left font-medium text-muted-foreground px-5 py-3 whitespace-nowrap">
                        部门
                      </th>
                      <th className="text-left font-medium text-muted-foreground px-5 py-3 whitespace-nowrap">
                        角色
                      </th>
                      <th className="text-left font-medium text-muted-foreground px-5 py-3 whitespace-nowrap">
                        状态
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
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-12 text-center text-muted-foreground">
                          暂无匹配的用户
                        </td>
                      </tr>
                    ) : (
                      filtered.map((u) => (
                        <tr
                          key={u.id}
                          className="border-b border-border/30 last:border-0 hover:bg-muted/30"
                        >
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <span className="text-primary text-sm font-medium">
                                  {u.name.slice(0, 1)}
                                </span>
                              </div>
                              <div>
                                <div className="font-medium">{u.name}</div>
                                <div className="text-xs text-muted-foreground">{u.username}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <Mail className="size-3.5" />
                              {u.email}
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Building className="size-3.5" />
                              {u.department}
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            <Badge
                              variant={u.role === 'admin' ? 'default' : 'outline'}
                              className="text-xs"
                            >
                              {ROLE_LABELS[u.role] || u.role}
                            </Badge>
                          </td>
                          <td className="px-5 py-3">
                            <Badge
                              variant={u.status === 'active' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {u.status === 'active' ? '在职' : '禁用'}
                            </Badge>
                          </td>
                          <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">
                            {u.createdAt}
                          </td>
                          <td className="px-5 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs"
                                onClick={() => openEditUser(u)}
                              >
                                <Edit className="size-3.5 mr-1" />
                                编辑
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs"
                                onClick={() => openResetPassword(u)}
                              >
                                <KeyRound className="size-3.5 mr-1" />
                                重置密码
                              </Button>
                               <Button
                                 variant="ghost"
                                 size="sm"
                                 className={`h-8 text-xs ${u.status === 'active' ? 'text-destructive' : 'text-emerald-600'}`}
                                 onClick={() => handleToggleStatus(u)}
                               >
                                 {u.status === 'active' ? '禁用' : '启用'}
                               </Button>
                               <Button
                                 variant="ghost"
                                 size="sm"
                                 className="h-8 text-xs text-destructive"
                                 onClick={() => setDeleteUser(u)}
                               >
                                 <Trash2 className="size-3.5 mr-1" />
                                 删除
                               </Button>
                             </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 角色权限 */}
        <TabsContent value="roles" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.entries(ROLE_PERMISSIONS).map(([role, perms]) => (
              <Card key={role} className="border border-border/40">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Shield className="size-4 text-primary" />
                      {ROLE_LABELS[role] || role}
                    </h3>
                    <Badge variant="outline" className="text-xs">
                      {perms.length} 项权限
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {perms.map((p) => (
                      <div
                        key={p}
                        className="flex items-center gap-2 text-sm py-1.5 px-3 rounded-md bg-muted/30"
                      >
                        <div className="size-1.5 rounded-full bg-primary shrink-0" />
                        <span>{p}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-4">
                    角色权限由系统预设，暂不支持自定义修改
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* 个人设置 */}
        <TabsContent value="settings" className="mt-4 space-y-6">
          <Card className="border border-border/40">
            <CardHeader>
              <h3 className="font-semibold flex items-center gap-2">
                <Settings className="size-4 text-primary" />
                个人信息
              </h3>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center gap-4 pb-5 border-b border-border/40">
                <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary text-xl font-bold">
                    {profile.name.slice(0, 1)}
                  </span>
                </div>
                <div>
                  <div className="font-semibold text-lg">{profile.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {ROLE_LABELS[(currentUser?.role as keyof typeof ROLE_LABELS) || MOCK_CURRENT_USER.role]}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">姓名</label>
                  <Input
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">邮箱</label>
                  <Input
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">手机号</label>
                  <Input
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">部门</label>
                  <Input value={profile.department} readOnly />
                </div>
              </div>
              <div className="pt-3">
                <Button onClick={handleSaveProfile}>保存设置</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/40">
            <CardHeader>
              <h3 className="font-semibold">安全设置</h3>
            </CardHeader>
            <CardContent className="space-y-0">
              {/* 修改密码 */}
              <div className="py-4 border-b border-border/30">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-md bg-muted/40 flex items-center justify-center">
                      <Lock className="size-4 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="font-medium">登录密码</div>
                      <div className="text-sm text-muted-foreground">上次修改：30天前</div>
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        修改密码
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="sm:max-w-md">
                      <AlertDialogHeader>
                        <AlertDialogTitle>修改密码</AlertDialogTitle>
                        <AlertDialogDescription>
                          为了账户安全，请定期修改密码
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <div className="space-y-3 py-2">
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium">当前密码</label>
                          <Input
                            type="password"
                            value={pwdForm.oldPassword}
                            onChange={(e) =>
                              setPwdForm({ ...pwdForm, oldPassword: e.target.value })
                            }
                            placeholder="请输入当前密码"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium">新密码</label>
                          <Input
                            type="password"
                            value={pwdForm.newPassword}
                            onChange={(e) =>
                              setPwdForm({ ...pwdForm, newPassword: e.target.value })
                            }
                            placeholder="至少6位字符"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium">确认新密码</label>
                          <Input
                            type="password"
                            value={pwdForm.confirmPassword}
                            onChange={(e) =>
                              setPwdForm({ ...pwdForm, confirmPassword: e.target.value })
                            }
                            placeholder="请再次输入新密码"
                          />
                        </div>
                      </div>
                      <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction onClick={handleChangePassword}>
                          确认修改
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              {/* 双因素认证 */}
              <div className="flex items-center justify-between py-4 border-b border-border/30">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-md bg-muted/40 flex items-center justify-center">
                    <Smartphone className="size-4 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="font-medium">双因素认证</div>
                    <div className="text-sm text-muted-foreground">增加账户安全性</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={twoFactor ? 'default' : 'outline'} className="text-xs mr-2">
                    {twoFactor ? '已开启' : '未开启'}
                  </Badge>
                  <Switch
                    checked={twoFactor}
                    onCheckedChange={(v) => {
                      setTwoFactor(v);
                      toast.info(v ? '双因素认证已开启' : '双因素认证已关闭');
                    }}
                  />
                </div>
              </div>

              {/* 消息通知 */}
              <div className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-md bg-muted/40 flex items-center justify-center">
                    <Bell className="size-4 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="font-medium">消息通知</div>
                    <div className="text-sm text-muted-foreground">接收系统通知和提醒</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={notifications ? 'default' : 'outline'} className="text-xs mr-2">
                    {notifications ? '已开启' : '已关闭'}
                  </Badge>
                  <Switch
                    checked={notifications}
                    onCheckedChange={(v) => {
                      setNotifications(v);
                      toast.success(v ? '消息通知已开启' : '消息通知已关闭');
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 登录记录 */}
          <Card className="border border-border/40">
            <CardHeader>
              <h3 className="font-semibold flex items-center gap-2">
                <LogIn className="size-4 text-primary" />
                最近登录记录
              </h3>
            </CardHeader>
            <CardContent className="p-0">
              <div className="w-full overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 bg-muted/20">
                      <th className="text-left font-medium text-muted-foreground px-5 py-3 whitespace-nowrap">
                        登录时间
                      </th>
                      <th className="text-left font-medium text-muted-foreground px-5 py-3 whitespace-nowrap">
                        IP 地址
                      </th>
                      <th className="text-left font-medium text-muted-foreground px-5 py-3 whitespace-nowrap">
                        设备
                      </th>
                      <th className="text-left font-medium text-muted-foreground px-5 py-3 whitespace-nowrap">
                        地点
                      </th>
                      <th className="text-left font-medium text-muted-foreground px-5 py-3 whitespace-nowrap">
                        状态
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {LOGIN_RECORDS.map((record, idx) => (
                      <tr
                        key={idx}
                        className="border-b border-border/30 last:border-0 hover:bg-muted/30"
                      >
                        <td className="px-5 py-3 font-mono text-xs">{record.time}</td>
                        <td className="px-5 py-3 text-muted-foreground font-mono text-xs">
                          {record.ip}
                        </td>
                        <td className="px-5 py-3 text-muted-foreground">{record.device}</td>
                        <td className="px-5 py-3 text-muted-foreground">{record.location}</td>
                        <td className="px-5 py-3">
                          <Badge variant="default" className="text-xs">
                            成功
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 数据管理 */}
        <TabsContent value="data" className="mt-4 space-y-4">
          <Card className="border border-border/40">
            <CardHeader>
              <div className="text-base font-semibold">数据导出</div>
              <p className="text-xs text-muted-foreground">
                将所有业务数据导出为 JSON 文件，包括客户、联系人、商机、项目、报价、合同、商品、用户和跟进记录。
              </p>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => {
                  try {
                    const data = exportAllMockData();
                    const json = JSON.stringify(data, null, 2);
                    const blob = new Blob([json], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    const date = new Date();
                    const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
                    a.download = `crm-data-export-${dateStr}.json`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    toast.success('数据导出成功');
                  } catch (err) {
                    toast.error('导出失败：' + String(err));
                  }
                }}
              >
                <Download className="size-4" />
                导出全部数据 (JSON)
              </Button>
            </CardContent>
          </Card>

          <Card className="border border-border/40">
            <CardHeader>
              <div className="text-base font-semibold">数据导入</div>
              <p className="text-xs text-muted-foreground">
                从 JSON 文件恢复数据，将覆盖当前所有数据。请谨慎操作，建议先导出备份。
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept=".json,application/json"
                  id="import-file"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      try {
                        const data = JSON.parse(String(reader.result));
                        importMockData(data);
                        toast.success('数据导入成功，页面即将刷新');
                        setTimeout(() => window.location.reload(), 800);
                      } catch (err) {
                        toast.error('导入失败：文件格式不正确');
                      }
                    };
                    reader.readAsText(file);
                    e.target.value = '';
                  }}
                />
                <Button variant="outline" className="gap-2" onClick={() => document.getElementById('import-file')?.click()}>
                  <Upload className="size-4" />
                  选择 JSON 文件导入
                </Button>
                <span className="text-xs text-muted-foreground">导入后将全量覆盖现有数据</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/40">
            <CardHeader>
              <div className="text-base font-semibold text-destructive">恢复初始数据</div>
              <p className="text-xs text-muted-foreground">
                将所有数据恢复到系统初始状态，所有新增和修改的数据都会被清除。此操作不可撤销。
              </p>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="gap-2">
                    <RotateCcw className="size-4" />
                    恢复初始数据
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>确认恢复初始数据？</AlertDialogTitle>
                    <AlertDialogDescription>
                      此操作将清除所有业务数据并恢复到系统初始状态，包括客户、商机、项目、报价、合同、跟进记录等。操作不可撤销，确定继续吗？
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive hover:bg-destructive/90"
                      onClick={() => {
                        try {
                          resetAllMockData();
                          toast.success('已恢复初始数据，页面即将刷新');
                          setTimeout(() => window.location.reload(), 800);
                        } catch (err) {
                          toast.error('恢复失败：' + String(err));
                        }
                      }}
                    >
                      确认恢复
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 新增/编辑用户Dialog */}
      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col p-0">
          <div className="px-6 pt-6">
            <DialogHeader>
              <DialogTitle>{editingUser ? '编辑用户' : '新增用户'}</DialogTitle>
            </DialogHeader>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  用户名 <span className="text-destructive">*</span>
                </label>
                <Input
                  value={userForm.username}
                  onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                  placeholder="登录用户名"
                />
                {formErrors.username && (
                  <p className="text-xs text-destructive">{formErrors.username}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  姓名 <span className="text-destructive">*</span>
                </label>
                <Input
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  placeholder="真实姓名"
                />
                {formErrors.name && (
                  <p className="text-xs text-destructive">{formErrors.name}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  邮箱 <span className="text-destructive">*</span>
                </label>
                <Input
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  placeholder="email@company.com"
                />
                {formErrors.email && (
                  <p className="text-xs text-destructive">{formErrors.email}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">手机号</label>
                <Input
                  value={userForm.phone}
                  onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                  placeholder="手机号码"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">角色</label>
                <Select
                  value={userForm.role}
                  onValueChange={(v) =>
                    setUserForm({ ...userForm, role: v as ISystemUser['role'] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">系统管理员</SelectItem>
                    <SelectItem value="manager">销售经理</SelectItem>
                    <SelectItem value="sales">销售代表</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">部门</label>
                <Select
                  value={userForm.department}
                  onValueChange={(v) => setUserForm({ ...userForm, department: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">状态</label>
              <Select
                value={userForm.status}
                onValueChange={(v) =>
                  setUserForm({ ...userForm, status: v as ISystemUser['status'] })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">在职</SelectItem>
                  <SelectItem value="disabled">禁用</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {!editingUser && (
              <p className="text-xs text-muted-foreground bg-muted/40 p-2 rounded">
                初始密码将自动生成为 123456，请提醒用户首次登录后修改密码
              </p>
            )}
          </div>
          <div className="px-6 py-4 border-t border-border/40 shrink-0">
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">取消</Button>
              </DialogClose>
              <Button onClick={handleSaveUser}>{editingUser ? '保存修改' : '创建用户'}</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* 重置密码Dialog */}
      <Dialog open={resetPwdOpen} onOpenChange={setResetPwdOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>重置密码</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              为用户 <span className="font-medium text-foreground">{resetPwdUser?.name}</span> 重置密码
            </p>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                新密码 <span className="text-destructive">*</span>
              </label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="至少6位字符"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                确认新密码 <span className="text-destructive">*</span>
              </label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="请再次输入新密码"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">取消</Button>
            </DialogClose>
            <Button onClick={handleResetPassword}>确认重置</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除用户确认 */}
      <AlertDialog open={!!deleteUser} onOpenChange={(open) => !open && setDeleteUser(null)}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除用户</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除用户「<span className="font-medium text-foreground">{deleteUser?.name}</span>」吗？删除后将无法恢复，该用户的相关数据也会受到影响。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={handleDeleteUser}
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

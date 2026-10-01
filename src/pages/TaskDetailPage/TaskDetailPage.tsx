import { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  ArrowLeft,
  Pencil,
  Trash2,
  Play,
  CheckCircle,
  XCircle,
  RotateCcw,
  Calendar,
  User,
  Users,
  Clock,
  Paperclip,
  Plus,
  Check,
  X,
  MessageSquare,
  FileText,
  Phone,
  Mail,
  Video,
  MessageCircle,
  Download,
  UserPlus,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTasks, taskMutations } from '@/hooks/use-tasks';
import {
  TASK_STATUS_LABELS,
  TASK_PRIORITY_LABELS,
  TASK_TYPE_OPTIONS,
  type ITask,
  type ITaskSubItem,
  type TaskStatus,
  type TaskType,
  type TaskPriority,
} from '@/data/tasks';
import { useUsers, useCustomers } from '@/hooks/use-crm-store';
import type { ISystemUser } from '@/data/users';
import type { IAttachment } from '@/data/customers';
import FileUploader from '@/components/FileUpload/FileUploader';
import type { UploadedFile } from '@/components/FileUpload/FileUploader';
import { UniversalLink } from '@lark-apaas/client-toolkit-lite';

const statusColorMap: Record<TaskStatus, string> = {
  todo: 'bg-slate-100 text-slate-700 border-slate-300',
  in_progress: 'bg-blue-100 text-blue-700 border-blue-300',
  completed: 'bg-green-100 text-green-700 border-green-300',
  cancelled: 'bg-rose-100 text-rose-700 border-rose-300',
};

const priorityColorMap: Record<TaskPriority, string> = {
  high: 'bg-rose-100 text-rose-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-slate-100 text-slate-600',
};

const priorityLabelColor: Record<TaskPriority, string> = {
  high: 'text-rose-600',
  medium: 'text-amber-600',
  low: 'text-slate-500',
};

const typeColorMap: Record<TaskType, string> = {
  report: 'bg-indigo-100 text-indigo-700',
  demo: 'bg-purple-100 text-purple-700',
  roadshow: 'bg-pink-100 text-pink-700',
  bid_support: 'bg-orange-100 text-orange-700',
  reception: 'bg-teal-100 text-teal-700',
  meeting: 'bg-cyan-100 text-cyan-700',
  other: 'bg-slate-100 text-slate-600',
};

type FollowUpType = 'call' | 'meeting' | 'email' | 'wechat' | 'other' | (string & {});

interface TaskFollowUp {
  id: string;
  taskId: string;
  type: FollowUpType;
  content: string;
  result: string;
  nextFollowUpDate?: string;
  creator: string;
  createdAt: string;
  attachments: IAttachment[];
}

const FOLLOWUP_TYPE_LABELS: Record<FollowUpType, string> = {
  call: '电话',
  meeting: '会议',
  email: '邮件',
  wechat: '微信',
  other: '其他',
};

const FOLLOWUP_TYPE_ICONS: Record<FollowUpType, typeof Phone> = {
  call: Phone,
  meeting: Video,
  email: Mail,
  wechat: MessageCircle,
  other: MessageSquare,
};

function buildUserMap(users: ISystemUser[]): Record<string, ISystemUser> {
  const map: Record<string, ISystemUser> = {};
  users.forEach((u) => {
    map[u.id] = u;
  });
  return map;
}

function isOverdue(dueDate?: string, status?: TaskStatus): boolean {
  if (!dueDate) return false;
  if (status === 'completed' || status === 'cancelled') return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  return due.getTime() < today.getTime();
}

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tasks] = useTasks();
  const [users] = useUsers();
  const [customersAll] = useCustomers();
  const userMap = useMemo(() => buildUserMap(users), [users]);
  const activeUsers = useMemo(() => users.filter((u) => u.status === 'active'), [users]);

  const task = tasks.find((t) => t.id === id);

  const [activeTab, setActiveTab] = useState('basic');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [statusDialog, setStatusDialog] = useState<{ to: TaskStatus; open: boolean }>({ to: 'todo', open: false });
  const [statusRemark, setStatusRemark] = useState('');

  // 编辑表单
  const [editForm, setEditForm] = useState({
    title: '',
    type: 'other' as TaskType,
    priority: 'medium' as TaskPriority,
    description: '',
    owner: '',
    collaborators: [] as string[],
    startDate: '',
    dueDate: '',
  });
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  // 子任务
  const [subDialogOpen, setSubDialogOpen] = useState(false);
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [subForm, setSubForm] = useState({ title: '', assignee: '', dueDate: '' });
  const [subErrors, setSubErrors] = useState<Record<string, string>>({});

  // 跟进记录 - 持久化到 task.followUps（随事务一起存 localStorage，刷新不丢）
  // useTasks 为异步加载：首次渲染时 task 尚未就绪，故在数据到达后由 effect 装载已持久化的跟进记录
  const [followups, setFollowups] = useState<TaskFollowUp[]>([]);
  const followupsLoadedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!task || followupsLoadedFor.current === task.id) return;
    followupsLoadedFor.current = task.id;
    const persisted = (task as unknown as { followUps?: TaskFollowUp[] }).followUps;
    if (Array.isArray(persisted)) setFollowups(persisted);
  }, [task]);
  const [followupDialogOpen, setFollowupDialogOpen] = useState(false);
  const [editingFollowupId, setEditingFollowupId] = useState<string | null>(null);
  const [followupForm, setFollowupForm] = useState({
    type: 'call' as FollowUpType,
    customType: '',
    content: '',
    result: '',
    nextFollowUpDate: '',
  });
  const [followupFiles, setFollowupFiles] = useState<UploadedFile[]>([]);

  // 附件 Dialog
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<UploadedFile[]>([]);

  // 外部协作人录入
  const [newExternalCollaborator, setNewExternalCollaborator] = useState('');

  if (!task) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate('/tasks')}>
          <ArrowLeft className="size-4 mr-2" /> 返回事务列表
        </Button>
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            事务不存在或已被删除
          </CardContent>
        </Card>
      </div>
    );
  }

  const owner = userMap[task.owner];
  const collaboratorUsers = task.collaborators.map((cid) => userMap[cid]).filter(Boolean);
  const customer = task.relatedCustomerId ? customersAll.find((c) => c.id === task.relatedCustomerId) : null;
  const typeLabel = TASK_TYPE_OPTIONS.find((t) => t.value === task.type)?.label || task.type;
  const overdue = isOverdue(task.dueDate, task.status);
  const doneCount = task.subItems.filter((s) => s.status === 'done').length;
  const subProgress = task.subItems.length > 0 ? Math.round((doneCount / task.subItems.length) * 100) : 0;

  function openEditDialog() {
    setEditForm({
      title: task.title,
      type: task.type,
      priority: task.priority,
      description: task.description,
      owner: task.owner,
      collaborators: [...task.collaborators],
      startDate: task.startDate || '',
      dueDate: task.dueDate || '',
    });
    setEditErrors({});
    setEditDialogOpen(true);
  }

  function validateEdit() {
    const errs: Record<string, string> = {};
    if (!editForm.title.trim()) errs.title = '请输入事务标题';
    if (!editForm.owner) errs.owner = '请选择负责人';
    setEditErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleEditSubmit() {
    if (!validateEdit()) return;
    taskMutations.update(task.id, editForm);
    toast.success('事务信息已更新');
    setEditDialogOpen(false);
  }

  function handleDelete() {
    taskMutations.remove(task.id);
    toast.success('事务已删除');
    navigate('/tasks');
  }

  function openStatusDialog(to: TaskStatus) {
    setStatusDialog({ to, open: true });
    setStatusRemark('');
  }

  function handleStatusChange() {
    const result = taskMutations.changeStatus(task.id, statusDialog.to, statusRemark || '状态变更', 'user001');
    if (result) {
      toast.success(`已${TASK_STATUS_LABELS[statusDialog.to]}`);
    }
    setStatusDialog({ to: 'todo', open: false });
  }

  // 子任务操作
  function openSubDialog(sub?: ITaskSubItem) {
    if (sub) {
      setEditingSubId(sub.id);
      setSubForm({ title: sub.title, assignee: sub.assignee, dueDate: sub.dueDate || '' });
    } else {
      setEditingSubId(null);
      setSubForm({ title: '', assignee: task.owner, dueDate: '' });
    }
    setSubErrors({});
    setSubDialogOpen(true);
  }

  function validateSub() {
    const errs: Record<string, string> = {};
    if (!subForm.title.trim()) errs.title = '请输入子任务标题';
    setSubErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubSubmit() {
    if (!validateSub()) return;
    if (editingSubId) {
      taskMutations.updateSubItem(task.id, editingSubId, {
        title: subForm.title,
        assignee: subForm.assignee,
        dueDate: subForm.dueDate || undefined,
      });
      toast.success('子任务已更新');
    } else {
      taskMutations.addSubItem(task.id, {
        title: subForm.title,
        assignee: subForm.assignee,
        dueDate: subForm.dueDate || undefined,
      });
      toast.success('子任务已添加');
    }
    setSubDialogOpen(false);
  }

  function handleSubToggle(subId: string) {
    taskMutations.toggleSubItem(task.id, subId);
  }

  function handleSubDelete(subId: string) {
    taskMutations.removeSubItem(task.id, subId);
    toast.success('子任务已删除');
  }

  // 跟进记录
  function openFollowupDialog() {
    setEditingFollowupId(null);
    setFollowupForm({ type: 'call', customType: '', content: '', result: '', nextFollowUpDate: '' });
    setFollowupFiles([]);
    setFollowupDialogOpen(true);
  }

  function addExternalCollaborator() {
    const name = newExternalCollaborator.trim();
    if (!name) return;
    // 外部协作人用 ext- 前缀 + 名字作为唯一标识
    const id = `ext-${name}-${Date.now()}`;
    if (editForm.collaborators.includes(id)) {
      toast.info('该协作人已添加');
      return;
    }
    setEditForm({ ...editForm, collaborators: [...editForm.collaborators, id] });
    setNewExternalCollaborator('');
  }

  function handleFollowupSubmit() {
    if (!followupForm.content.trim()) {
      toast.error('请输入跟进内容');
      return;
    }
    const finalType =
      followupForm.type === 'other'
        ? followupForm.customType.trim() || '其他'
        : followupForm.type;
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    if (editingFollowupId) {
      // 编辑模式：保留原创建人和创建时间，更新内容和附件（并持久化）
      const updatedList = followups.map((fu) => {
        if (fu.id !== editingFollowupId) return fu;
        // 合并附件：保留已有附件 + 新增上传的
        const existingAtts = fu.attachments || [];
        const newAtts = followupFiles
          .filter((f) => !existingAtts.some((a) => a.id === f.id))
          .map((f) => ({
            id: f.id,
            name: f.name,
            size: f.size,
            type: f.type,
            uploader: 'user001',
            uploadedAt: now,
            url: f.url,
          }));
        return {
          ...fu,
          type: finalType,
          content: followupForm.content,
          result: followupForm.result,
          nextFollowUpDate: followupForm.nextFollowUpDate || undefined,
          attachments: [...existingAtts, ...newAtts],
          updatedAt: now,
        };
      });
      setFollowups(updatedList);
      taskMutations.update(task.id, { followUps: updatedList } as unknown as Partial<ITask>);
      toast.success('跟进记录已更新');
    } else {
      const newFu: TaskFollowUp = {
        id: `fu-${task.id}-${Date.now()}`,
        taskId: task.id,
        type: finalType,
        content: followupForm.content,
        result: followupForm.result,
        nextFollowUpDate: followupForm.nextFollowUpDate || undefined,
        creator: 'user001',
        createdAt: now,
        attachments: followupFiles.map((f) => ({
          id: f.id,
          name: f.name,
          size: f.size,
          type: f.type,
          uploader: 'user001',
          uploadedAt: now,
          url: f.url,
        })),
      };
      const nextList = [newFu, ...followups];
      setFollowups(nextList);
      taskMutations.update(task.id, { followUps: nextList } as unknown as Partial<ITask>);
      toast.success('跟进记录已保存');
    }
    setFollowupDialogOpen(false);
    setEditingFollowupId(null);
  }

  function openEditFollowup(fu: TaskFollowUp) {
    setEditingFollowupId(fu.id);
    setFollowupForm({
      type: (FOLLOWUP_TYPE_LABELS[fu.type] ? fu.type : 'other') as FollowUpType,
      customType: FOLLOWUP_TYPE_LABELS[fu.type] ? '' : fu.type,
      content: fu.content,
      result: fu.result || '',
      nextFollowUpDate: fu.nextFollowUpDate || '',
    });
    // 已有附件转为 UploadedFile 形式供编辑时展示和删除
    setFollowupFiles(
      (fu.attachments || []).map((a) => ({
        id: a.id,
        name: a.name,
        size: a.size,
        type: a.type,
        status: 'done' as const,
        progress: 100,
        url: a.url,
      })),
    );
    setFollowupDialogOpen(true);
  }

  function handleDeleteFollowup(fuId: string) {
    const nextList = followups.filter((f) => f.id !== fuId);
    setFollowups(nextList);
    taskMutations.update(task.id, { followUps: nextList } as unknown as Partial<ITask>);
    toast.success('跟进记录已删除');
  }

  // 附件上传
  function openUploadDialog() {
    setUploadFiles([]);
    setUploadDialogOpen(true);
  }

  function handleUploadSubmit() {
    if (uploadFiles.length === 0) {
      toast.error('请选择要上传的文件');
      return;
    }
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const newAttachments: IAttachment[] = uploadFiles.map((f) => ({
      id: f.id,
      name: f.name,
      size: f.size,
      type: f.type,
      uploader: 'user001',
      uploadedAt: now,
      url: f.url,
    }));
    taskMutations.update(task.id, {
      attachments: [...task.attachments, ...newAttachments],
    });
    toast.success(`已上传 ${uploadFiles.length} 个文件`);
    setUploadDialogOpen(false);
  }

  function handleDeleteAttachment(attId: string) {
    taskMutations.update(task.id, {
      attachments: task.attachments.filter((a) => a.id !== attId),
    });
    toast.success('附件已删除');
  }

  // 状态操作按钮配置
  const statusActions: { to: TaskStatus; label: string; icon: typeof Play; variant: 'default' | 'outline' | 'secondary' | 'destructive' }[] = [];
  if (task.status === 'todo') {
    statusActions.push({ to: 'in_progress', label: '开始', icon: Play, variant: 'default' });
  }
  if (task.status === 'in_progress') {
    statusActions.push({ to: 'completed', label: '完成', icon: CheckCircle, variant: 'default' });
    statusActions.push({ to: 'cancelled', label: '取消', icon: XCircle, variant: 'destructive' });
  }
  if (task.status === 'completed' || task.status === 'cancelled') {
    statusActions.push({ to: 'in_progress', label: '重新打开', icon: RotateCcw, variant: 'outline' });
  }

  return (
    <div className="space-y-6">
      {/* 返回 + 标题行 */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/tasks')}>
          <ArrowLeft className="size-4 mr-1" /> 返回事务列表
        </Button>
      </div>

      {/* 顶部信息卡 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={statusColorMap[task.status]}>
                  {TASK_STATUS_LABELS[task.status]}
                </Badge>
                <span className={`text-xs px-2 py-0.5 rounded ${priorityColorMap[task.priority]} ${priorityLabelColor[task.priority]}`}>
                  {TASK_PRIORITY_LABELS[task.priority]}优先级
                </span>
                <span className={`text-xs px-2 py-0.5 rounded ${typeColorMap[task.type]}`}>
                  {typeLabel}
                </span>
                {overdue && (
                  <span className="text-xs px-2 py-0.5 rounded bg-rose-100 text-rose-700 font-medium">
                    已逾期
                  </span>
                )}
              </div>
              <CardTitle className="text-2xl font-bold">{task.title}</CardTitle>
              <CardDescription className="text-sm">{task.description}</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {statusActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Button
                    key={action.to}
                    variant={action.variant}
                    onClick={() => openStatusDialog(action.to)}
                  >
                    <Icon className="size-4 mr-1" /> {action.label}
                  </Button>
                );
              })}
              <Button variant="outline" onClick={openEditDialog}>
                <Pencil className="size-4 mr-1" /> 编辑
              </Button>
              <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="text-rose-600 border-rose-200 hover:bg-rose-50">
                    <Trash2 className="size-4 mr-1" /> 删除
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>确认删除</AlertDialogTitle>
                    <AlertDialogDescription>
                      删除后事务数据（包含子任务、附件、跟进记录）将无法恢复，确定要删除吗？
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-rose-600 hover:bg-rose-700">
                      确认删除
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">负责人</div>
              <div className="flex items-center gap-2">
                <div className="size-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-medium">
                  {owner?.name?.slice(0, 1) || '?'}
                </div>
                <span className="font-medium">{owner?.name || '-'}</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">协作人</div>
              <div className="flex -space-x-1">
                {collaboratorUsers.length > 0 ? (
                  collaboratorUsers.slice(0, 4).map((u) => (
                    <div
                      key={u.id}
                      className="size-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-medium border-2 border-card"
                      title={u.name}
                    >
                      {u.name.slice(0, 1)}
                    </div>
                  ))
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
                {collaboratorUsers.length > 4 && (
                  <div className="size-6 rounded-full bg-muted flex items-center justify-center text-[10px] text-muted-foreground border-2 border-card">
                    +{collaboratorUsers.length - 4}
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">开始时间</div>
              <div className="flex items-center gap-1.5 font-medium">
                <Calendar className="size-3.5 text-muted-foreground" />
                <span>{task.startDate || '-'}</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">截止时间</div>
              <div className={`flex items-center gap-1.5 font-medium ${overdue ? 'text-rose-600' : ''}`}>
                <Clock className="size-3.5" />
                <span>{task.dueDate || '-'}</span>
              </div>
            </div>
          </div>
          {customer && (
            <div className="mt-4 pt-4 border-t border-border/40">
              <div className="text-xs text-muted-foreground mb-1.5">关联客户</div>
              <button
                onClick={() => navigate(`/customers/${customer.id}`)}
                className="text-sm font-medium text-primary hover:underline"
              >
                {customer.name}
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tab 区 */}
      <Card className="border border-border/40">
        <CardContent className="p-0">
          <Tabs
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
                  value="subitems"
                  className="data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-3"
                >
                  子任务 ({task.subItems.length})
                </TabsTrigger>
                <TabsTrigger
                  value="attachments"
                  className="data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-3"
                >
                  附件 ({task.attachments.length})
                </TabsTrigger>
                <TabsTrigger
                  value="followups"
                  className="data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-3"
                >
                  跟进记录 ({followups.length})
                </TabsTrigger>
                <TabsTrigger
                  value="history"
                  className="data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-3"
                >
                  状态历史 ({task.statusHistory.length})
                </TabsTrigger>
              </TabsList>
            </div>

            {/* 基本信息 Tab */}
            <TabsContent value="basic" className="p-6 m-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground">基础信息</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">事务类型</span>
                      <span className="font-medium">{typeLabel}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">优先级</span>
                      <span className={`font-medium ${priorityLabelColor[task.priority]}`}>
                        {TASK_PRIORITY_LABELS[task.priority]}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">当前状态</span>
                      <Badge variant="outline" className={statusColorMap[task.status]}>
                        {TASK_STATUS_LABELS[task.status]}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">创建人</span>
                      <span className="font-medium">{userMap[task.creator]?.name || '-'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">创建时间</span>
                      <span className="font-medium">{task.createdAt}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">更新时间</span>
                      <span className="font-medium">{task.updatedAt}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground">详细描述</h3>
                  <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed bg-muted/30 p-4 rounded-md min-h-[120px]">
                    {task.description || '暂无描述'}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* 子任务 Tab */}
            <TabsContent value="subitems" className="p-6 m-0">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-semibold text-foreground">子任务列表</h3>
                  {task.subItems.length > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${subProgress}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {doneCount}/{task.subItems.length} 已完成
                      </span>
                    </div>
                  )}
                </div>
                <Button size="sm" onClick={() => openSubDialog()}>
                  <Plus className="size-3.5 mr-1" /> 新增子任务
                </Button>
              </div>
              <div className="space-y-2">
                {task.subItems.map((sub) => {
                  const subOwner = userMap[sub.assignee];
                  const subOverdue = isOverdue(sub.dueDate) && sub.status !== 'done';
                  return (
                    <div
                      key={sub.id}
                      className={`flex items-center gap-3 p-3 border border-border/40 rounded-md hover:bg-muted/20 ${
                        sub.status === 'done' ? 'bg-muted/20 opacity-70' : ''
                      }`}
                    >
                      <button
                        onClick={() => handleSubToggle(sub.id)}
                        className={`size-5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                          sub.status === 'done'
                            ? 'bg-primary border-primary text-primary-foreground'
                            : 'border-border hover:border-primary'
                        }`}
                      >
                        {sub.status === 'done' && <Check className="size-3" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-medium truncate ${sub.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>
                          {sub.title}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                        <div className="size-5 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-medium">
                          {subOwner?.name?.slice(0, 1) || '?'}
                        </div>
                        <span>{subOwner?.name || '-'}</span>
                      </div>
                      {sub.dueDate && (
                        <div className={`text-xs shrink-0 ${subOverdue ? 'text-rose-600 font-medium' : 'text-muted-foreground'}`}>
                          {sub.dueDate}
                        </div>
                      )}
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openSubDialog(sub)}>
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-500" onClick={() => handleSubDelete(sub.id)}>
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {task.subItems.length === 0 && (
                  <div className="text-center py-10 text-sm text-muted-foreground border border-dashed border-border/60 rounded-md">
                    暂无子任务，点击「新增子任务」添加
                  </div>
                )}
              </div>
            </TabsContent>

            {/* 附件 Tab */}
            <TabsContent value="attachments" className="p-6 m-0">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-foreground">附件列表</h3>
                <Button size="sm" onClick={openUploadDialog}>
                  <Plus className="size-3.5 mr-1" /> 上传附件
                </Button>
              </div>
              <div className="space-y-2">
                {task.attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center gap-3 p-3 border border-border/40 rounded-md hover:bg-muted/20"
                  >
                    <div className="size-9 rounded-md bg-muted flex items-center justify-center shrink-0">
                      <FileText className="size-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{att.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {(att.size / 1024).toFixed(1)} KB · 上传于 {att.uploadedAt}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="sm">下载</Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500" onClick={() => handleDeleteAttachment(att.id)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {task.attachments.length === 0 && (
                  <div className="text-center py-10 text-sm text-muted-foreground border border-dashed border-border/60 rounded-md">
                    暂无附件，点击「上传附件」添加
                  </div>
                )}
              </div>
            </TabsContent>

            {/* 跟进记录 Tab */}
            <TabsContent value="followups" className="p-6 m-0">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-foreground">跟进记录</h3>
                <Button size="sm" onClick={openFollowupDialog}>
                  <Plus className="size-3.5 mr-1" /> 新增跟进
                </Button>
              </div>
              <div className="space-y-4">
                {followups.map((fu) => {
                  const creator = userMap[fu.creator];
                  const TypeIcon = FOLLOWUP_TYPE_ICONS[fu.type] ?? MessageSquare;
                  return (
                    <div key={fu.id} className="flex gap-3">
                      <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <TypeIcon className="size-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{creator?.name || '-'}</span>
                            <Badge variant="outline" className="text-xs">
                              {FOLLOWUP_TYPE_LABELS[fu.type] ?? fu.type}
                            </Badge>
                          </div>
                           <div className="flex items-center gap-1">
                             {fu.attachments && fu.attachments.length > 0 && (
                               <span
                                 className="inline-flex items-center gap-1 text-xs text-muted-foreground mr-2"
                                 title={`${fu.attachments.length} 个附件`}
                               >
                                 <Paperclip className="size-3.5" />
                                 {fu.attachments.length}
                               </span>
                             )}
                             <span className="text-xs text-muted-foreground">{fu.createdAt}</span>
                             <Button
                               variant="ghost"
                               size="icon"
                               className="h-7 w-7 text-muted-foreground hover:text-foreground"
                               onClick={() => openEditFollowup(fu)}
                               title="编辑"
                             >
                               <Pencil className="size-3.5" />
                             </Button>
                             <AlertDialog>
                               <AlertDialogTrigger asChild>
                                 <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-500">
                                   <Trash2 className="size-3.5" />
                                 </Button>
                               </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>确认删除</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    删除后跟进记录将无法恢复，确定要删除吗？
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>取消</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteFollowup(fu.id)} className="bg-rose-600 hover:bg-rose-700">
                                    确认删除
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                        <div className="mt-1.5 text-sm text-foreground whitespace-pre-wrap">{fu.content}</div>
                        {fu.result && (
                          <div className="mt-2 text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                            <span className="font-medium">跟进结果：</span>{fu.result}
                          </div>
                        )}
                        {fu.nextFollowUpDate && (
                          <div className="mt-1.5 text-xs text-amber-700 flex items-center gap-1">
                            <Clock className="size-3" /> 下次跟进：{fu.nextFollowUpDate}
                          </div>
                        )}
                        {fu.attachments && fu.attachments.length > 0 && (
                          <div className="mt-2 space-y-1.5">
                            {fu.attachments.map((att) => (
                              <div
                                key={att.id}
                                className="flex items-center gap-2 px-2.5 py-2 text-xs bg-muted/40 border border-border/40 rounded-md group hover:bg-muted/70 transition-colors"
                              >
                                <FileText className="size-4 text-muted-foreground shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <div className="truncate font-medium text-foreground">{att.name}</div>
                                  <div className="text-[10px] text-muted-foreground">
                                    {(att.size / 1024).toFixed(1)} KB · {att.uploadedAt || '附件'}
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-primary shrink-0 opacity-60 group-hover:opacity-100"
                                  onClick={() => {
                                    if (att.url && att.url.startsWith('blob:')) {
                                      const a = document.createElement('a');
                                      a.href = att.url;
                                      a.download = att.name;
                                      a.click();
                                    } else {
                                      window.open(att.url || '#', '_blank');
                                    }
                                  }}
                                >
                                  <Download className="size-3.5 mr-1" />
                                  下载
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {followups.length === 0 && (
                  <div className="text-center py-10 text-sm text-muted-foreground border border-dashed border-border/60 rounded-md">
                    暂无跟进记录，点击「新增跟进」添加
                  </div>
                )}
              </div>
            </TabsContent>

            {/* 状态历史 Tab */}
            <TabsContent value="history" className="p-6 m-0">
              <h3 className="text-sm font-semibold text-foreground mb-4">状态流转历史</h3>
              <div className="space-y-4">
                {[...task.statusHistory].reverse().map((h, idx) => {
                  const operator = userMap[h.operator];
                  const isLast = idx === 0;
                  return (
                    <div key={h.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`size-2.5 rounded-full ${isLast ? 'bg-primary' : 'bg-border'}`} />
                        {idx < task.statusHistory.length - 1 && (
                          <div className="w-px flex-1 bg-border mt-1" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={statusColorMap[h.toStatus]}>
                            {TASK_STATUS_LABELS[h.toStatus]}
                          </Badge>
                          {h.fromStatus && (
                            <span className="text-xs text-muted-foreground">
                              ← {TASK_STATUS_LABELS[h.fromStatus as TaskStatus]}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-sm text-foreground">{h.remark}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {operator?.name || '-'} · {h.operatedAt}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* 编辑 Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0">
          <div className="px-6 pt-6">
            <DialogHeader>
              <DialogTitle>编辑事务</DialogTitle>
            </DialogHeader>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">
                标题 <span className="text-rose-500">*</span>
              </label>
              <Input
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                className="mt-1.5"
              />
              {editErrors.title && <p className="text-xs text-rose-500 mt-1">{editErrors.title}</p>}
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground">类型</label>
                <SelectSimple
                  value={editForm.type}
                  onChange={(v) => setEditForm({ ...editForm, type: v as TaskType })}
                  options={TASK_TYPE_OPTIONS.map((t) => ({ value: t.value, label: t.label }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">优先级</label>
                <SelectSimple
                  value={editForm.priority}
                  onChange={(v) => setEditForm({ ...editForm, priority: v as TaskPriority })}
                  options={[
                    { value: 'high', label: '高' },
                    { value: 'medium', label: '中' },
                    { value: 'low', label: '低' },
                  ]}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">
                  负责人 <span className="text-rose-500">*</span>
                </label>
                <SelectSimple
                  value={editForm.owner}
                  onChange={(v) => setEditForm({ ...editForm, owner: v })}
                  options={activeUsers.map((u) => ({ value: u.id, label: u.name }))}
                  placeholder="选择负责人"
                />
                {editErrors.owner && <p className="text-xs text-rose-500 mt-1">{editErrors.owner}</p>}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">协作人</label>
              <div className="mt-1.5 space-y-2">
                {/* 已选协作人标签 */}
                <div className="flex flex-wrap gap-2 min-h-[32px]">
                  {editForm.collaborators.length === 0 && (
                    <span className="text-xs text-muted-foreground">暂未添加协作人</span>
                  )}
                  {editForm.collaborators.map((cid) => {
                    const user = activeUsers.find((u) => u.id === cid);
                    const label = user ? user.name : cid;
                    const isExternal = !user;
                    return (
                      <span
                        key={cid}
                        className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded border ${
                          isExternal
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-primary/10 text-primary border-primary/20'
                        }`}
                      >
                        {isExternal && <span className="text-[10px]">外部</span>}
                        {label}
                        <button
                          type="button"
                          onClick={() =>
                            setEditForm({
                              ...editForm,
                              collaborators: editForm.collaborators.filter((id) => id !== cid),
                            })
                          }
                          className="ml-0.5 hover:opacity-70"
                        >
                          <X className="size-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
                {/* 从系统用户选择 */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground shrink-0">选择：</span>
                  <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
                    {activeUsers
                      .filter((u) => !editForm.collaborators.includes(u.id))
                      .map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() =>
                            setEditForm({
                              ...editForm,
                              collaborators: [...editForm.collaborators, u.id],
                            })
                          }
                          className="px-2 py-0.5 text-xs rounded border border-border bg-background hover:bg-accent text-foreground transition-colors"
                        >
                          + {u.name}
                        </button>
                      ))}
                  </div>
                </div>
                {/* 手动录入外部协作人 */}
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    placeholder="输入外部协作人姓名，回车添加"
                    value={newExternalCollaborator}
                    onChange={(e) => setNewExternalCollaborator(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addExternalCollaborator();
                      }
                    }}
                    className="flex-1 h-8 text-xs"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={addExternalCollaborator}
                    className="h-8"
                  >
                    <UserPlus className="size-3.5 mr-1" /> 添加
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  支持从系统用户中选择，也可手动录入第三方外部人员姓名
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground">开始时间</label>
                <Input
                  type="date"
                  value={editForm.startDate}
                  onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                  className="mt-1.5"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">截止时间</label>
                <Input
                  type="date"
                  value={editForm.dueDate}
                  onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
                  className="mt-1.5"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">描述</label>
              <textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                rows={4}
                className="w-full mt-1.5 px-3 py-2 border border-border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
          </div>
          <div className="px-6 py-4 border-t border-border/40 shrink-0">
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>取消</Button>
              <Button onClick={handleEditSubmit}>保存修改</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* 状态变更 Dialog */}
      <Dialog open={statusDialog.open} onOpenChange={(open) => !open && setStatusDialog({ to: 'todo', open: false })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {statusDialog.to === 'in_progress' && '开始事务'}
              {statusDialog.to === 'completed' && '标记完成'}
              {statusDialog.to === 'cancelled' && '取消事务'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              将事务状态变更为「{TASK_STATUS_LABELS[statusDialog.to]}」
            </p>
            <div>
              <label className="text-sm font-medium text-foreground">
                {statusDialog.to === 'completed' ? '完成说明' : statusDialog.to === 'cancelled' ? '取消原因' : '备注'}
              </label>
              <textarea
                value={statusRemark}
                onChange={(e) => setStatusRemark(e.target.value)}
                rows={3}
                placeholder={statusDialog.to === 'cancelled' ? '请说明取消原因...' : '请填写备注（可选）'}
                className="w-full mt-1.5 px-3 py-2 border border-border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialog({ to: 'todo', open: false })}>取消</Button>
            <Button onClick={handleStatusChange}>确认</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 子任务 Dialog */}
      <Dialog open={subDialogOpen} onOpenChange={setSubDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSubId ? '编辑子任务' : '新增子任务'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-foreground">
                标题 <span className="text-rose-500">*</span>
              </label>
              <Input
                value={subForm.title}
                onChange={(e) => setSubForm({ ...subForm, title: e.target.value })}
                className="mt-1.5"
              />
              {subErrors.title && <p className="text-xs text-rose-500 mt-1">{subErrors.title}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">负责人</label>
              <SelectSimple
                value={subForm.assignee}
                onChange={(v) => setSubForm({ ...subForm, assignee: v })}
                options={activeUsers.map((u) => ({ value: u.id, label: u.name }))}
                  placeholder="选择负责人"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">截止时间</label>
              <Input
                type="date"
                value={subForm.dueDate}
                onChange={(e) => setSubForm({ ...subForm, dueDate: e.target.value })}
                className="mt-1.5"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubDialogOpen(false)}>取消</Button>
            <Button onClick={handleSubSubmit}>{editingSubId ? '保存' : '添加'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 跟进记录 Dialog */}
      <Dialog open={followupDialogOpen} onOpenChange={setFollowupDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col p-0">
          <div className="px-6 pt-6">
            <DialogHeader>
              <DialogTitle>{editingFollowupId ? '编辑跟进记录' : '新增跟进记录'}</DialogTitle>
            </DialogHeader>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">跟进类型</label>
              <SelectSimple
                value={followupForm.type}
                onChange={(v) => setFollowupForm({ ...followupForm, type: v as FollowUpType })}
                options={Object.entries(FOLLOWUP_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
              />
              {followupForm.type === 'other' && (
                <Input
                  className="mt-1.5"
                  value={followupForm.customType}
                  onChange={(e) => setFollowupForm({ ...followupForm, customType: e.target.value })}
                  placeholder="请输入跟进类型"
                />
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">跟进内容</label>
              <textarea
                value={followupForm.content}
                onChange={(e) => setFollowupForm({ ...followupForm, content: e.target.value })}
                rows={4}
                placeholder="请输入跟进内容..."
                className="w-full mt-1.5 px-3 py-2 border border-border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">跟进结果</label>
              <textarea
                value={followupForm.result}
                onChange={(e) => setFollowupForm({ ...followupForm, result: e.target.value })}
                rows={2}
                placeholder="请输入跟进结果（可选）"
                className="w-full mt-1.5 px-3 py-2 border border-border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">下次跟进时间</label>
              <Input
                type="date"
                value={followupForm.nextFollowUpDate}
                onChange={(e) => setFollowupForm({ ...followupForm, nextFollowUpDate: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">附件</label>
              <div className="mt-1.5">
                <FileUploader
                  files={followupFiles}
                  onChange={setFollowupFiles}
                  maxSize={100 * 1024 * 1024}
                  hint="单文件最大 100MB"
                />
              </div>
            </div>
          </div>
          <div className="px-6 py-4 border-t border-border/40 shrink-0">
            <DialogFooter>
              <Button variant="outline" onClick={() => setFollowupDialogOpen(false)}>取消</Button>
              <Button onClick={handleFollowupSubmit}>保存</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* 附件上传 Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>上传附件</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <FileUploader
              files={uploadFiles}
              onChange={setUploadFiles}
              maxSize={100 * 1024 * 1024}
              hint="支持图片、文档、表格、PPT、压缩包等，单文件最大 100MB"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>取消</Button>
            <Button onClick={handleUploadSubmit}>上传</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// 简单 Select 组件封装（避免重复 import）
function SelectSimple({
  value,
  onChange,
  options,
  placeholder = '请选择',
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger className="mt-1.5">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

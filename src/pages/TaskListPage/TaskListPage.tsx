import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search,
  Plus,
  LayoutGrid,
  List,
  ClipboardList,
  Clock,
  Users,
  Paperclip,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTasks, taskMutations } from '@/hooks/use-tasks';
import {
  TASK_STATUS_LABELS,
  TASK_STATUS_ORDER,
  TASK_PRIORITY_LABELS,
  TASK_TYPE_OPTIONS,
  type ITask,
  type TaskStatus,
  type TaskPriority,
  type TaskType,
} from '@/data/tasks';
import { useUsers } from '@/hooks/use-crm-store';
import type { ISystemUser } from '@/data/users';

const statusColorMap: Record<TaskStatus, string> = {
  todo: 'bg-slate-100 text-slate-600 border-slate-200',
  in_progress: 'bg-blue-100 text-blue-700 border-blue-200',
  completed: 'bg-green-100 text-green-700 border-green-200',
  cancelled: 'bg-rose-100 text-rose-700 border-rose-200',
};

const priorityBorderMap: Record<TaskPriority, string> = {
  high: 'border-l-4 border-l-rose-500',
  medium: 'border-l-4 border-l-amber-500',
  low: 'border-l-4 border-l-slate-300',
};

const priorityColorMap: Record<TaskPriority, string> = {
  high: 'bg-rose-100 text-rose-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-slate-100 text-slate-600',
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

function getUserMap(users: ISystemUser[]): Record<string, ISystemUser> {
  const map: Record<string, ISystemUser> = {};
  users.forEach((u) => {
    map[u.id] = u;
  });
  return map;
}

function isOverdue(dueDate?: string): boolean {
  if (!dueDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  return due.getTime() < today.getTime();
}

export default function TaskListPage() {
  const navigate = useNavigate();
  const [tasks] = useTasks();
  const [users] = useUsers();
  const userMap = useMemo(() => getUserMap(users), [users]);

  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('all');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ITask | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: '',
    type: 'other' as TaskType,
    priority: 'medium' as TaskPriority,
    description: '',
    owner: '',
    collaborators: [] as string[],
    startDate: '',
    dueDate: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
      if (ownerFilter !== 'all' && t.owner !== ownerFilter) return false;

      if (keyword) {
        const kw = keyword.toLowerCase();
        if (
          !t.title.toLowerCase().includes(kw) &&
          !t.description.toLowerCase().includes(kw)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [tasks, statusFilter, typeFilter, priorityFilter, ownerFilter, keyword]);

  const kanbanData = useMemo(() => {
    const data: Record<TaskStatus, ITask[]> = {
      todo: [],
      in_progress: [],
      completed: [],
      cancelled: [],
    };
    filtered.forEach((t) => {
      data[t.status].push(t);
    });
    return data;
  }, [filtered]);

  function validate() {
    const errs: Record<string, string> = {};
    if (!form.title.trim()) errs.title = '请输入事务标题';
    if (!form.owner) errs.owner = '请选择负责人';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function openDialog(task?: ITask) {
    if (task) {
      setEditingTask(task);
      setForm({
        title: task.title,
        type: task.type,
        priority: task.priority,
        description: task.description,
        owner: task.owner,
        collaborators: [...task.collaborators],
        startDate: task.startDate || '',
        dueDate: task.dueDate || '',
      });
    } else {
      setEditingTask(null);
      setForm({
        title: '',
        type: 'other',
        priority: 'medium',
        description: '',
        owner: '',
        collaborators: [],
        startDate: '',
        dueDate: '',
      });
    }
    setErrors({});
    setDialogOpen(true);
  }

  function handleSubmit() {
    if (!validate()) return;
    if (editingTask) {
      taskMutations.update(editingTask.id, form);
      toast.success('事务已更新');
    } else {
      taskMutations.create({
        ...form,
        status: 'todo',
        creator: 'user001',
      });
      toast.success('事务创建成功');
    }
    setDialogOpen(false);
  }

  function handleDelete() {
    if (deleteId) {
      taskMutations.remove(deleteId);
      toast.success('事务已删除');
      setDeleteId(null);
    }
  }

  function handleStatusChange(taskId: string, newStatus: TaskStatus) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;
    const remarkMap: Record<string, string> = {
      'todo-in_progress': '开始推进',
      'in_progress-completed': '已完成',
      'in_progress-cancelled': '已取消',
      'completed-in_progress': '重新打开',
      'cancelled-in_progress': '重新打开',
      'todo-completed': '标记完成',
      'todo-cancelled': '取消',
    };
    const key = `${task.status}-${newStatus}`;
    taskMutations.changeStatus(taskId, newStatus, remarkMap[key] || '状态变更', 'user001');
    toast.success(`已${TASK_STATUS_LABELS[newStatus]}`);
  }

  return (
    <div className="space-y-6">
      {/* 顶部工具栏 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ClipboardList className="size-5 text-primary" />
              <CardTitle className="text-xl">事务管理</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => openDialog()}>
                <Plus className="size-4 mr-1" /> 新增事务
              </Button>
              <div className="flex rounded-md border border-border overflow-hidden">
                <button
                  onClick={() => setView('kanban')}
                  className={`px-3 py-1.5 text-sm flex items-center gap-1.5 ${
                    view === 'kanban'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background hover:bg-accent text-muted-foreground'
                  }`}
                >
                  <LayoutGrid className="size-4" /> 看板
                </button>
                <button
                  onClick={() => setView('list')}
                  className={`px-3 py-1.5 text-sm flex items-center gap-1.5 ${
                    view === 'list'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background hover:bg-accent text-muted-foreground'
                  }`}
                >
                  <List className="size-4" /> 列表
                </button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="搜索事务标题、描述..."
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                {TASK_STATUS_ORDER.map((s) => (
                  <SelectItem key={s} value={s}>
                    {TASK_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
                {TASK_TYPE_OPTIONS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="优先级" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部优先级</SelectItem>
                <SelectItem value="high">高</SelectItem>
                <SelectItem value="medium">中</SelectItem>
                <SelectItem value="low">低</SelectItem>
              </SelectContent>
            </Select>
            <Select value={ownerFilter} onValueChange={setOwnerFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="负责人" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部负责人</SelectItem>
                {users.filter((u) => u.status === 'active').map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 看板视图 */}
      {view === 'kanban' && (
        <div className="w-full overflow-x-auto">
          <div className="flex gap-4 min-w-[900px]">
            {TASK_STATUS_ORDER.map((status) => (
              <div key={status} className="flex-1 min-w-[220px]">
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={statusColorMap[status]}>
                      {TASK_STATUS_LABELS[status]}
                    </Badge>
                    <span className="text-xs text-muted-foreground font-medium">
                      {kanbanData[status].length}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  {kanbanData[status].map((task) => {
                    const owner = getUserMap(users)[task.owner];
                    const overdue = isOverdue(task.dueDate) && task.status !== 'completed' && task.status !== 'cancelled';
                    const typeLabel = TASK_TYPE_OPTIONS.find((t) => t.value === task.type)?.label || task.type;
                    return (
                      <div
                        key={task.id}
                        onClick={() => navigate(`/tasks/${task.id}`)}
                        className={`bg-card rounded-md border border-border/60 p-3 cursor-pointer hover:shadow-sm hover:border-border transition-all ${priorityBorderMap[task.priority]}`}
                      >
                        <div className="font-medium text-sm text-foreground mb-2 line-clamp-2">
                          {task.title}
                        </div>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${typeColorMap[task.type]}`}>
                            {typeLabel}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${priorityColorMap[task.priority]}`}>
                            {TASK_PRIORITY_LABELS[task.priority]}优先级
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <div className="size-5 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-medium">
                              {owner?.name?.slice(0, 1) || '?'}
                            </div>
                            <span className="truncate max-w-[60px]">{owner?.name || '-'}</span>
                          </div>
                          {task.collaborators.length > 0 && (
                            <div className="flex items-center gap-1">
                              <Users className="size-3" />
                              <span>{task.collaborators.length}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/30">
                          <div className={`flex items-center gap-1 text-xs ${overdue ? 'text-rose-600 font-medium' : 'text-muted-foreground'}`}>
                            <Clock className="size-3" />
                            <span>{task.dueDate || '无截止'}</span>
                          </div>
                          {task.attachments.length > 0 && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Paperclip className="size-3" />
                              <span>{task.attachments.length}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {kanbanData[status].length === 0 && (
                    <div className="text-center py-8 text-xs text-muted-foreground border border-dashed border-border/60 rounded-md">
                      暂无事务
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 列表视图 */}
      {view === 'list' && (
        <Card>
          <CardContent className="p-0">
            <div className="w-full overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">标题</th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">类型</th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">优先级</th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">负责人</th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">协作人</th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">截止时间</th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">状态</th>
                    <th className="text-right font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((task) => {
                    const owner = userMap[task.owner];
                    const overdue = isOverdue(task.dueDate) && task.status !== 'completed' && task.status !== 'cancelled';
                    const typeLabel = TASK_TYPE_OPTIONS.find((t) => t.value === task.type)?.label || task.type;
                    return (
                      <tr key={task.id} className="border-b border-border/40 hover:bg-muted/20">
                        <td className="px-4 py-3">
                          <div className="font-medium max-w-[260px] truncate">{task.title}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded ${typeColorMap[task.type]}`}>
                            {typeLabel}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded ${priorityColorMap[task.priority]}`}>
                            {TASK_PRIORITY_LABELS[task.priority]}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="size-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-medium">
                              {owner?.name?.slice(0, 1) || '?'}
                            </div>
                            <span className="text-sm">{owner?.name || '-'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex -space-x-1">
                            {task.collaborators.slice(0, 3).map((cid) => {
                              const u = userMap[cid];
                              return (
                                <div
                                  key={cid}
                                  className="size-5 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] font-medium border-2 border-card"
                                  title={u?.name}
                                >
                                  {u?.name?.slice(0, 1) || '?'}
                                </div>
                              );
                            })}
                            {task.collaborators.length > 3 && (
                              <div className="size-5 rounded-full bg-muted flex items-center justify-center text-[10px] text-muted-foreground border-2 border-card">
                                +{task.collaborators.length - 3}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className={`px-4 py-3 whitespace-nowrap ${overdue ? 'text-rose-600 font-medium' : ''}`}>
                          {task.dueDate || '-'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={statusColorMap[task.status]}>
                            {TASK_STATUS_LABELS[task.status]}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/tasks/${task.id}`)}>
                                <Eye className="size-4 mr-2" /> 查看详情
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openDialog(task)}>
                                <Pencil className="size-4 mr-2" /> 编辑
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setDeleteId(task.id)}
                                className="text-rose-600"
                              >
                                <Trash2 className="size-4 mr-2" /> 删除
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                        暂无事务数据
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 新增/编辑 Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTask ? '编辑事务' : '新增事务'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-foreground">
                标题 <span className="text-rose-500">*</span>
              </label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="请输入事务标题"
                className="mt-1.5"
              />
              {errors.title && <p className="text-xs text-rose-500 mt-1">{errors.title}</p>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground">
                  类型 <span className="text-rose-500">*</span>
                </label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm({ ...form, type: v as TaskType })}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_TYPE_OPTIONS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">优先级</label>
                <Select
                  value={form.priority}
                  onValueChange={(v) => setForm({ ...form, priority: v as TaskPriority })}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">高</SelectItem>
                    <SelectItem value="medium">中</SelectItem>
                    <SelectItem value="low">低</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">
                  负责人 <span className="text-rose-500">*</span>
                </label>
                <Select
                  value={form.owner}
                  onValueChange={(v) => setForm({ ...form, owner: v })}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="选择负责人" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.filter((u) => u.status === 'active').map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.owner && <p className="text-xs text-rose-500 mt-1">{errors.owner}</p>}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">协作人</label>
              <div className="mt-1.5 flex flex-wrap gap-2 p-2 border border-border rounded-md min-h-[38px]">
                {users.filter((u) => u.status === 'active').map((u) => {
                  const selected = form.collaborators.includes(u.id);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => {
                        if (selected) {
                          setForm({ ...form, collaborators: form.collaborators.filter((id) => id !== u.id) });
                        } else {
                          setForm({ ...form, collaborators: [...form.collaborators, u.id] });
                        }
                      }}
                      className={`px-2 py-1 text-xs rounded flex items-center gap-1.5 border transition-colors ${
                        selected
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background hover:bg-accent border-border text-foreground'
                      }`}
                    >
                      {u.name}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">点击选择或取消协作人</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground">开始时间</label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  className="mt-1.5"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">截止时间</label>
                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                  className="mt-1.5"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">描述</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="请输入事务描述..."
                rows={4}
                className="w-full mt-1.5 px-3 py-2 border border-border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSubmit}>
              {editingTask ? '保存修改' : '创建事务'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认 */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              删除后事务数据将无法恢复，确定要删除吗？
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
  );
}

import { useState } from 'react';
import type { ReactNode } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useEquipmentStore } from '@/hooks/use-equipment';
import { PLAN_QUARTERS, type IServicePlan } from '@/data/equipment';

const empty: Omit<IServicePlan, 'id'> = {
  quarter: PLAN_QUARTERS[3], title: '', equipmentId: '', equipmentName: '', content: '', owner: '', planDate: '', status: '未开始', remark: '',
};

const statusColor: Record<string, string> = {
  '未开始': 'bg-slate-100 text-slate-600 border-slate-200',
  '进行中': 'bg-blue-50 text-blue-700 border-blue-200',
  '已完成': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  '延期': 'bg-rose-50 text-rose-700 border-rose-200',
};

export function PlanTab() {
  const { plans, equipment } = useEquipmentStore();
  const [quarterFilter, setQuarterFilter] = useState('all');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<IServicePlan | null>(null);
  const [form, setForm] = useState(empty);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const list = plans.list.filter((x) => quarterFilter === 'all' || x.quarter === quarterFilter);

  const openAdd = () => { setEditing(null); setForm({ ...empty, quarter: quarterFilter !== 'all' ? quarterFilter : empty.quarter }); setOpen(true); };
  const openEdit = (x: IServicePlan) => { setEditing(x); setForm({ ...x }); setOpen(true); };
  const save = () => {
    if (!form.title.trim()) { toast.error('请填写计划名称'); return; }
    if (editing) { plans.update(editing.id, form); toast.success('计划已更新'); }
    else { plans.add({ id: `plan-${Date.now()}`, ...form } as IServicePlan); toast.success('计划已添加'); }
    setOpen(false);
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base">运维服务计划（按季度）（{list.length}）</CardTitle>
        <div className="flex items-center gap-2">
          <Select value={quarterFilter} onValueChange={setQuarterFilter}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">全部季度</SelectItem>{PLAN_QUARTERS.map((q) => <SelectItem key={q} value={q}>{q}</SelectItem>)}</SelectContent>
          </Select>
          <Button size="sm" onClick={openAdd}><Plus className="size-4 mr-1" />新增计划</Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground text-left">
                <th className="py-2 px-2">季度</th><th className="px-2">计划名称</th><th className="px-2">设备</th>
                <th className="px-2">服务内容</th><th className="px-2">负责人</th><th className="px-2">计划日期</th>
                <th className="px-2">状态</th><th className="px-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {list.map((x) => (
                <tr key={x.id} className="border-t border-border/40">
                  <td className="py-2 px-2"><Badge variant="outline">{x.quarter}</Badge></td>
                  <td className="px-2 font-medium">{x.title}</td>
                  <td className="px-2">{x.equipmentName || '-'}</td>
                  <td className="px-2 max-w-[220px] truncate">{x.content || '-'}</td>
                  <td className="px-2">{x.owner || '-'}</td>
                  <td className="px-2">{x.planDate || '-'}</td>
                  <td className="px-2"><Badge className={statusColor[x.status] || ''}>{x.status}</Badge></td>
                  <td className="px-2">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(x)}><Edit /></Button>
                      <AlertDialog open={deleteId === x.id} onOpenChange={(o) => setDeleteId(o ? x.id : null)}>
                        <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive"><Trash2 /></Button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogTitle>确认删除</AlertDialogTitle>
                          <AlertDialogDescription>删除服务计划「{x.title}」？</AlertDialogDescription>
                          <AlertDialogFooter>
                            <AlertDialogCancel>取消</AlertDialogCancel>
                            <AlertDialogAction className="bg-rose-600" onClick={() => { plans.remove(x.id); setDeleteId(null); toast.success('已删除'); }}>删除</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              ))}
              {list.length === 0 && <tr><td colSpan={8} className="text-center text-muted-foreground py-8">暂无服务计划</td></tr>}
            </tbody>
          </table>
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editing ? '编辑服务计划' : '新增服务计划'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="季度*">
                <Select value={form.quarter} onValueChange={(v) => setForm({ ...form, quarter: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PLAN_QUARTERS.map((q) => <SelectItem key={q} value={q}>{q}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="计划名称*"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="关联设备">
                <Select value={form.equipmentId} onValueChange={(v) => {
                  const e = equipment.list.find((x) => x.id === v);
                  setForm({ ...form, equipmentId: v, equipmentName: e ? e.name : '' });
                }}>
                  <SelectTrigger><SelectValue placeholder="选择设备" /></SelectTrigger>
                  <SelectContent>{equipment.list.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="负责人"><Input value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="计划日期"><Input type="date" value={form.planDate} onChange={(e) => setForm({ ...form, planDate: e.target.value })} /></Field>
              <Field label="状态">
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as IServicePlan['status'] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="未开始">未开始</SelectItem><SelectItem value="进行中">进行中</SelectItem>
                    <SelectItem value="已完成">已完成</SelectItem><SelectItem value="延期">延期</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field label="服务内容"><Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={2} /></Field>
            <Field label="备注"><Textarea value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} rows={2} /></Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>取消</Button>
            <Button onClick={save}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="space-y-1"><label className="text-sm font-medium text-muted-foreground">{label}</label>{children}</div>;
}
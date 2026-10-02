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
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useEquipmentStore } from '@/hooks/use-equipment';
import type { IStaff } from '@/data/equipment';

const empty: Omit<IStaff, 'id'> = {
  name: '', position: '', phone: '', idCard: '', department: '', status: '在职', remark: '',
};

export function StaffTab() {
  const { staff } = useEquipmentStore();
  const [keyword, setKeyword] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<IStaff | null>(null);
  const [form, setForm] = useState(empty);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const list = staff.list.filter((x) => !keyword || x.name.includes(keyword) || x.position.includes(keyword) || x.department.includes(keyword));

  const openAdd = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (x: IStaff) => { setEditing(x); setForm({ name: x.name, position: x.position, phone: x.phone, idCard: x.idCard, department: x.department, status: x.status, remark: x.remark }); setOpen(true); };
  const save = () => {
    if (!form.name.trim()) { toast.error('请填写姓名'); return; }
    if (editing) { staff.update(editing.id, form); toast.success('人员已更新'); }
    else { staff.add({ id: `st-${Date.now()}`, ...form } as IStaff); toast.success('人员已添加'); }
    setOpen(false);
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base">人员管理（{staff.list.length}）</CardTitle>
        <Button size="sm" onClick={openAdd}><Plus className="size-4 mr-1" />新增人员</Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="搜索姓名/岗位/部门" className="pl-9" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground text-left">
                <th className="py-2 px-2">姓名</th><th className="px-2">岗位</th><th className="px-2">电话</th>
                <th className="px-2">所属部门/项目</th><th className="px-2">身份证号</th><th className="px-2">状态</th><th className="px-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {list.map((x) => (
                <tr key={x.id} className="border-t border-border/40">
                  <td className="py-2 px-2 font-medium">{x.name}</td>
                  <td className="px-2">{x.position || '-'}</td>
                  <td className="px-2">{x.phone || '-'}</td>
                  <td className="px-2">{x.department || '-'}</td>
                  <td className="px-2 text-muted-foreground">{x.idCard || '-'}</td>
                  <td className="px-2"><Badge variant="outline">{x.status}</Badge></td>
                  <td className="px-2">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(x)}><Edit /></Button>
                      <AlertDialog open={deleteId === x.id} onOpenChange={(o) => setDeleteId(o ? x.id : null)}>
                        <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive"><Trash2 /></Button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogTitle>确认删除</AlertDialogTitle>
                          <AlertDialogDescription>删除人员「{x.name}」？</AlertDialogDescription>
                          <AlertDialogFooter>
                            <AlertDialogCancel>取消</AlertDialogCancel>
                            <AlertDialogAction className="bg-rose-600" onClick={() => { staff.remove(x.id); setDeleteId(null); toast.success('已删除'); }}>删除</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              ))}
              {list.length === 0 && <tr><td colSpan={7} className="text-center text-muted-foreground py-8">暂无人员</td></tr>}
            </tbody>
          </table>
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editing ? '编辑人员' : '新增人员'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="姓名*"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
              <Field label="岗位"><Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="电话"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
              <Field label="身份证号"><Input value={form.idCard} onChange={(e) => setForm({ ...form, idCard: e.target.value })} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="所属部门/项目"><Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></Field>
              <Field label="状态">
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as IStaff['status'] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="在职">在职</SelectItem><SelectItem value="离职">离职</SelectItem></SelectContent>
                </Select>
              </Field>
            </div>
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
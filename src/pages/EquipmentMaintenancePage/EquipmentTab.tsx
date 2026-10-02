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
import { EQUIPMENT_TYPES, type IEquipment } from '@/data/equipment';

const statusColor: Record<string, string> = {
  '在用': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  '停用': 'bg-slate-100 text-slate-600 border-slate-200',
  '维修中': 'bg-amber-50 text-amber-700 border-amber-200',
};

const empty: Omit<IEquipment, 'id' | 'createdAt'> = {
  name: '', model: '', serialNo: '', type: '无人机', location: '', owner: '', purchaseDate: '', status: '在用', remark: '',
};

export function EquipmentTab() {
  const { equipment } = useEquipmentStore();
  const [keyword, setKeyword] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<IEquipment | null>(null);
  const [form, setForm] = useState(empty);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [fieldErr, setFieldErr] = useState('');

  const list = equipment.list.filter((x) =>
    !keyword || x.name.includes(keyword) || x.model.includes(keyword) || x.location.includes(keyword),
  );

  const openAdd = () => { setEditing(null); setForm(empty); setFieldErr(''); setOpen(true); };
  const openEdit = (x: IEquipment) => {
    setEditing(x);
    setFieldErr('');
    setForm({ name: x.name, model: x.model, serialNo: x.serialNo, type: x.type, location: x.location, owner: x.owner, purchaseDate: x.purchaseDate, status: x.status, remark: x.remark });
    setOpen(true);
  };
  const save = () => {
    if (!form.name.trim()) { setFieldErr('请填写设备名称'); return; }
    if (!form.serialNo.trim()) { setFieldErr('请填写设备序列号'); return; }
    if (editing) { equipment.update(editing.id, form); toast.success('设备已更新'); }
    else { equipment.add({ id: `eq-${Date.now()}`, createdAt: new Date().toISOString(), ...form } as IEquipment); toast.success('设备已添加'); }
    setOpen(false);
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base">设备台账（{equipment.list.length}）</CardTitle>
        <Button size="sm" onClick={openAdd}><Plus className="size-4 mr-1" />新增设备</Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="搜索设备名称/型号/区域" className="pl-9" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground text-left">
                <th className="py-2 px-2">设备名称</th><th className="px-2">型号</th><th className="px-2">序列号</th><th className="px-2">类型</th>
                <th className="px-2">所在区域</th><th className="px-2">负责人</th><th className="px-2">购入日期</th>
                <th className="px-2">状态</th><th className="px-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {list.map((x) => (
                <tr key={x.id} className="border-t border-border/40">
                  <td className="py-2 px-2 font-medium">{x.name}</td>
                  <td className="px-2">{x.model || '-'}</td>
                  <td className="px-2 font-mono text-xs">{x.serialNo || '-'}</td>
                  <td className="px-2"><Badge variant="outline">{x.type}</Badge></td>
                  <td className="px-2">{x.location || '-'}</td>
                  <td className="px-2">{x.owner || '-'}</td>
                  <td className="px-2">{x.purchaseDate || '-'}</td>
                  <td className="px-2"><Badge className={statusColor[x.status] || ''}>{x.status}</Badge></td>
                  <td className="px-2">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(x)}><Edit /></Button>
                      <AlertDialog open={deleteId === x.id} onOpenChange={(o) => setDeleteId(o ? x.id : null)}>
                        <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive"><Trash2 /></Button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogTitle>确认删除设备</AlertDialogTitle>
                          <AlertDialogDescription>删除「{x.name}」后不可恢复，确定删除？</AlertDialogDescription>
                          <AlertDialogFooter>
                            <AlertDialogCancel>取消</AlertDialogCancel>
                            <AlertDialogAction className="bg-rose-600" onClick={() => { equipment.remove(x.id); setDeleteId(null); toast.success('设备已删除'); }}>删除</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              ))}
              {list.length === 0 && <tr><td colSpan={9} className="text-center text-muted-foreground py-8">暂无设备，点击「新增设备」录入</td></tr>}
            </tbody>
          </table>
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editing ? '编辑设备' : '新增设备'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="设备名称*"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="如 经纬 M350" /></Field>
              <Field label="序列号*">
                <Input value={form.serialNo} onChange={(e) => setForm({ ...form, serialNo: e.target.value })} placeholder="如 SN-2024-0001" />
                {fieldErr && <p className="text-xs text-destructive mt-1">{fieldErr}</p>}
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="型号/规格"><Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="如 M350 RTK" /></Field>
              <Field label="设备类型">
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{EQUIPMENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="状态">
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as IEquipment['status'] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="在用">在用</SelectItem><SelectItem value="停用">停用</SelectItem><SelectItem value="维修中">维修中</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="所在区域"><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="如：邵伯镇" /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="负责人"><Input value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} placeholder="联系人" /></Field>
              <Field label="购入日期"><Input type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} /></Field>
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
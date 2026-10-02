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
import { Plus, Edit, Trash2, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { useEquipmentStore } from '@/hooks/use-equipment';
import { INSURANCE_TYPES, type IInsurance } from '@/data/equipment';
import { dateWarn, warnBadgeClass, warnText, warnWeight } from './warn';

const empty: Omit<IInsurance, 'id'> = {
  equipmentId: '', equipmentName: '', type: '责任险', company: '', policyNo: '',
  amount: '', startDate: '', endDate: '', remark: '',
};

export function InsuranceTab() {
  const { insurance, equipment } = useEquipmentStore();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<IInsurance | null>(null);
  const [form, setForm] = useState(empty);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const list = [...insurance.list].sort((a, b) => warnWeight(dateWarn(a.endDate)) - warnWeight(dateWarn(b.endDate)));

  const openAdd = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (x: IInsurance) => { setEditing(x); setForm({ equipmentId: x.equipmentId, equipmentName: x.equipmentName, type: x.type, company: x.company, policyNo: x.policyNo, amount: x.amount, startDate: x.startDate, endDate: x.endDate, remark: x.remark }); setOpen(true); };
  const save = () => {
    if (!form.equipmentName.trim() || !form.endDate) { toast.error('请选择设备并填写到期日期'); return; }
    if (editing) { insurance.update(editing.id, form); toast.success('保险已更新'); }
    else { insurance.add({ id: `ins-${Date.now()}`, ...form } as IInsurance); toast.success('保险已添加'); }
    setOpen(false);
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base">设备保险（{insurance.list.length}）</CardTitle>
        <Button size="sm" onClick={openAdd}><Plus className="size-4 mr-1" />新增保险</Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground text-left">
                <th className="py-2 px-2">设备</th><th className="px-2">险种</th><th className="px-2">保险公司</th>
                <th className="px-2">保单号</th><th className="px-2">保额</th><th className="px-2">起保</th>
                <th className="px-2">到期</th><th className="px-2">状态</th><th className="px-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {list.map((x) => {
                const st = dateWarn(x.endDate);
                return (
                  <tr key={x.id} className="border-t border-border/40">
                    <td className="py-2 px-2 font-medium">{x.equipmentName || '-'}</td>
                    <td className="px-2">{x.type}</td>
                    <td className="px-2">{x.company || '-'}</td>
                    <td className="px-2">{x.policyNo || '-'}</td>
                    <td className="px-2">{x.amount || '-'}</td>
                    <td className="px-2">{x.startDate || '-'}</td>
                    <td className="px-2">{x.endDate}</td>
                    <td className="px-2">
                      {st !== 'normal' && st !== 'none' ? (
                        <Badge className={warnBadgeClass(st)}><TriangleAlert className="size-3 mr-1" />{warnText(st)}</Badge>
                      ) : (<span className="text-muted-foreground">在保</span>)}
                    </td>
                    <td className="px-2">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(x)}><Edit /></Button>
                        <AlertDialog open={deleteId === x.id} onOpenChange={(o) => setDeleteId(o ? x.id : null)}>
                          <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive"><Trash2 /></Button></AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogTitle>确认删除</AlertDialogTitle>
                            <AlertDialogDescription>删除「{x.equipmentName}」的保险记录？</AlertDialogDescription>
                            <AlertDialogFooter>
                              <AlertDialogCancel>取消</AlertDialogCancel>
                              <AlertDialogAction className="bg-rose-600" onClick={() => { insurance.remove(x.id); setDeleteId(null); toast.success('已删除'); }}>删除</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {list.length === 0 && <tr><td colSpan={9} className="text-center text-muted-foreground py-8">暂无保险记录</td></tr>}
            </tbody>
          </table>
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editing ? '编辑保险' : '新增设备保险'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Field label="关联设备*">
              <Select value={form.equipmentId} onValueChange={(v) => {
                const e = equipment.list.find((x) => x.id === v);
                setForm({ ...form, equipmentId: v, equipmentName: e ? e.name : '' });
              }}>
                <SelectTrigger><SelectValue placeholder="选择设备" /></SelectTrigger>
                <SelectContent>{equipment.list.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="险种">
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{INSURANCE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="保险公司"><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="保单号"><Input value={form.policyNo} onChange={(e) => setForm({ ...form, policyNo: e.target.value })} /></Field>
              <Field label="保额"><Input value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="如 2000000" /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="起保日期"><Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></Field>
              <Field label="到期日期*"><Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></Field>
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
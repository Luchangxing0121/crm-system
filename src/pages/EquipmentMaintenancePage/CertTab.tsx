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
import type { IStaffCert } from '@/data/equipment';
import { dateWarn, warnBadgeClass, warnText, warnWeight } from './warn';

const empty: Omit<IStaffCert, 'id'> = {
  staffId: '', staffName: '', certName: '', certNo: '', issuer: '', issueDate: '',
  expireDate: '', insType: '', insCompany: '', insAmount: '', insExpireDate: '', remark: '',
};

function certWarn(c: IStaffCert) {
  const a = dateWarn(c.expireDate);
  const b = dateWarn(c.insExpireDate);
  if (a === 'expired' || b === 'expired') return 'expired' as const;
  if (a === 'soon' || b === 'soon') return 'soon' as const;
  return 'normal' as const;
}

export function CertTab() {
  const { certs, staff } = useEquipmentStore();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<IStaffCert | null>(null);
  const [form, setForm] = useState(empty);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const list = [...certs.list].sort((a, b) => warnWeight(certWarn(a)) - warnWeight(certWarn(b)));

  const openAdd = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (x: IStaffCert) => { setEditing(x); setForm({ ...x }); setOpen(true); };
  const save = () => {
    if (!form.staffName.trim() || !form.certName.trim()) { toast.error('请选择人员并填写证书名称'); return; }
    if (editing) { certs.update(editing.id, form); toast.success('已更新'); }
    else { certs.add({ id: `cert-${Date.now()}`, ...form } as IStaffCert); toast.success('已添加'); }
    setOpen(false);
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base">人员证书及行业保险（{certs.list.length}）</CardTitle>
        <Button size="sm" onClick={openAdd}><Plus className="size-4 mr-1" />新增</Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground text-left">
                <th className="py-2 px-2">人员</th><th className="px-2">证书名称</th><th className="px-2">证书编号</th>
                <th className="px-2">发证机构</th><th className="px-2">证书有效期</th><th className="px-2">行业保险</th>
                <th className="px-2">保险到期</th><th className="px-2">预警</th><th className="px-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {list.map((x) => {
                const st = certWarn(x);
                return (
                  <tr key={x.id} className="border-t border-border/40">
                    <td className="py-2 px-2 font-medium">{x.staffName || '-'}</td>
                    <td className="px-2">{x.certName || '-'}</td>
                    <td className="px-2 text-muted-foreground">{x.certNo || '-'}</td>
                    <td className="px-2">{x.issuer || '-'}</td>
                    <td className="px-2">{x.expireDate || '-'}</td>
                    <td className="px-2">{x.insType ? `${x.insType}·${x.insCompany || ''}` : '-'}</td>
                    <td className="px-2">{x.insExpireDate || '-'}</td>
                    <td className="px-2">
                      {st !== 'normal' ? (
                        <Badge className={warnBadgeClass(st)}><TriangleAlert className="size-3 mr-1" />{warnText(st)}</Badge>
                      ) : (<span className="text-muted-foreground">正常</span>)}
                    </td>
                    <td className="px-2">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(x)}><Edit /></Button>
                        <AlertDialog open={deleteId === x.id} onOpenChange={(o) => setDeleteId(o ? x.id : null)}>
                          <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive"><Trash2 /></Button></AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogTitle>确认删除</AlertDialogTitle>
                            <AlertDialogDescription>删除「{x.staffName}」的证书记录？</AlertDialogDescription>
                            <AlertDialogFooter>
                              <AlertDialogCancel>取消</AlertDialogCancel>
                              <AlertDialogAction className="bg-rose-600" onClick={() => { certs.remove(x.id); setDeleteId(null); toast.success('已删除'); }}>删除</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {list.length === 0 && <tr><td colSpan={9} className="text-center text-muted-foreground py-8">暂无记录</td></tr>}
            </tbody>
          </table>
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader><DialogTitle>{editing ? '编辑证书及保险' : '新增证书及保险'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="人员*">
                <Select value={form.staffId} onValueChange={(v) => {
                  const s = staff.list.find((x) => x.id === v);
                  setForm({ ...form, staffId: v, staffName: s ? s.name : '' });
                }}>
                  <SelectTrigger><SelectValue placeholder="选择人员" /></SelectTrigger>
                  <SelectContent>{staff.list.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="证书名称*"><Input value={form.certName} onChange={(e) => setForm({ ...form, certName: e.target.value })} placeholder="如 登高作业证" /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="证书编号"><Input value={form.certNo} onChange={(e) => setForm({ ...form, certNo: e.target.value })} /></Field>
              <Field label="发证机构"><Input value={form.issuer} onChange={(e) => setForm({ ...form, issuer: e.target.value })} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="发证日期"><Input type="date" value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} /></Field>
              <Field label="证书有效期至"><Input type="date" value={form.expireDate} onChange={(e) => setForm({ ...form, expireDate: e.target.value })} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="行业保险"><Input value={form.insType} onChange={(e) => setForm({ ...form, insType: e.target.value })} placeholder="如 登高作业险" /></Field>
              <Field label="保险公司"><Input value={form.insCompany} onChange={(e) => setForm({ ...form, insCompany: e.target.value })} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="保额"><Input value={form.insAmount} onChange={(e) => setForm({ ...form, insAmount: e.target.value })} /></Field>
              <Field label="保险到期"><Input type="date" value={form.insExpireDate} onChange={(e) => setForm({ ...form, insExpireDate: e.target.value })} /></Field>
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
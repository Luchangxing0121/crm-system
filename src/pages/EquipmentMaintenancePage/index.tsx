import { useState } from 'react';
import { Card } from '@/components/ui/card';
import {
  Box,
  ShieldCheck,
  Users,
  BadgeCheck,
  CalendarClock,
  TriangleAlert,
} from 'lucide-react';
import { EquipmentTab } from './EquipmentTab';
import { InsuranceTab } from './InsuranceTab';
import { StaffTab } from './StaffTab';
import { CertTab } from './CertTab';
import { PlanTab } from './PlanTab';
import { dateWarn, warnWeight } from './warn';
import { useEquipmentStore } from '@/hooks/use-equipment';

type TabKey = 'equipment' | 'insurance' | 'staff' | 'cert' | 'plan';

const tabs: { key: TabKey; label: string; icon: typeof Box }[] = [
  { key: 'equipment', label: '设备', icon: Box },
  { key: 'insurance', label: '设备保险', icon: ShieldCheck },
  { key: 'staff', label: '人员', icon: Users },
  { key: 'cert', label: '人员证书及保险', icon: BadgeCheck },
  { key: 'plan', label: '服务计划', icon: CalendarClock },
];

export default function EquipmentMaintenancePage() {
  const [active, setActive] = useState<TabKey>('equipment');
  const { insurance, certs, plans } = useEquipmentStore();
  const warnCounts: Record<TabKey, number> = {
    equipment: 0,
    insurance: insurance.list.filter((x) => dateWarn(x.endDate) !== 'normal' && dateWarn(x.endDate) !== 'none').length,
    staff: 0,
    cert: certs.list.filter((c) => {
      const a = dateWarn(c.expireDate);
      const b = dateWarn(c.insExpireDate);
      return a === 'expired' || a === 'soon' || b === 'expired' || b === 'soon';
    }).length,
    plan: plans.list.filter((p) => p.status === '延期' || p.status === '进行中').length,
  };
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">设备运维</h1>
          <p className="text-sm text-muted-foreground mt-1">
            设备台账、保险、人员、证书资质及按季度运维服务计划管理
          </p>
        </div>
      </div>

      {/* Tab 切换 */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-px">
        {tabs.map((t) => {
          const Icon = t.icon;
          const warnCount = warnCounts[t.key];
          return (
            <button
              key={t.key}
              onClick={() => setActive(t.key)}
              className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                active === t.key
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="size-4" />
              {t.label}
              {warnCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.5 text-[10px] font-semibold">
                  <TriangleAlert className="size-3" />
                  {warnCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        {active === 'equipment' && <EquipmentTab />}
        {active === 'insurance' && <InsuranceTab />}
        {active === 'staff' && <StaffTab />}
        {active === 'cert' && <CertTab />}
        {active === 'plan' && <PlanTab />}
      </div>
    </div>
  );
}
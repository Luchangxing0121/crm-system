// 设备运维模块 - 本地持久化 store
import { useState, useEffect, useCallback } from 'react';
import { scopedStorage } from '@lark-apaas/client-toolkit-lite';
import {
  MOCK_EQUIPMENT,
  MOCK_INSURANCE,
  MOCK_STAFF,
  MOCK_STAFF_CERTS,
  MOCK_SERVICE_PLANS,
  type IEquipment,
  type IInsurance,
  type IStaff,
  type IStaffCert,
  type IServicePlan,
} from '@/data/equipment';

function useList<T>(key: string, initial: T[]) {
  const [list, setList] = useState<T[]>(initial);
  const loadedRef = { current: false };

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    try {
      const raw = scopedStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setList(parsed as T[]);
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const persist = (next: T[]) => {
    setList(next);
    try {
      scopedStorage.setItem(key, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const add = (item: T) => persist([item, ...list]);
  const update = (id: string, patch: Partial<T>) =>
    persist(list.map((i) => ((i as { id: string }).id === id ? { ...i, ...patch } : i)));
  const remove = (id: string) => persist(list.filter((i) => (i as { id: string }).id !== id));

  return { list, setList: persist, add, update, remove };
}

export function useEquipmentStore() {
  const equipment = useList<IEquipment>('equipment_list', MOCK_EQUIPMENT);
  const insurance = useList<IInsurance>('equipment_insurance_list', MOCK_INSURANCE);
  const staff = useList<IStaff>('staff_list', MOCK_STAFF);
  const certs = useList<IStaffCert>('staff_cert_list', MOCK_STAFF_CERTS);
  const plans = useList<IServicePlan>('service_plan_list', MOCK_SERVICE_PLANS);

  return { equipment, insurance, staff, certs, plans };
}
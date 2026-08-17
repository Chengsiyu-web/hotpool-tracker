import { useState, useEffect, useCallback } from 'react';
import { fetchHotPool } from '@/lib/hotpool';
import { mockPoolItems } from '@/lib/mock-data';

// 演示模式：无需后端即可体验完整 UI
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

export interface HotPoolItem {
  id: number;
  title: string;
  peak_heat: string;
  peak_heat_numeric: number;
  days_active: number;
  appearances: number;
  resonance: boolean;
  status: string;
  platforms: string[];
  event_core?: string;
}

export interface HotPoolData {
  activePool: HotPoolItem[];
  coolingPool: HotPoolItem[];
  isLoading: boolean;
  refreshPool: () => Promise<void>;
}

export function useHotPool(): HotPoolData {
  const [activePool, setActivePool] = useState<HotPoolItem[]>([]);
  const [coolingPool, setCoolingPool] = useState<HotPoolItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadPool = useCallback(async () => {
    setIsLoading(true);
    try {
      // 演示模式：使用 mock 数据
      if (DEMO_MODE) {
        const items = mockPoolItems as HotPoolItem[];
        setActivePool(items.filter((i) => i.status === 'active'));
        setCoolingPool(items.filter((i) => i.status === 'cooling'));
        return;
      }

      const items = (await fetchHotPool()) as HotPoolItem[];
      setActivePool(items.filter((i) => i.status === 'active'));
      setCoolingPool(items.filter((i) => i.status === 'cooling'));
    } catch (err) {
      console.error('[useHotPool] 加载失败:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadPool(); }, [loadPool]);

  return { activePool, coolingPool, isLoading, refreshPool: loadPool };
}

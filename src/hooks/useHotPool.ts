import { useState, useEffect, useCallback } from 'react';
import { fetchHotPool } from '@/lib/hotpool';

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

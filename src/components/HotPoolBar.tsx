import type { HotPoolItem } from '@/hooks/useHotPool';

/** 追踪池热点卡片：只展示标题 + 峰值热度 + 简介 */
const HotspotCard = ({ item }: { item: HotPoolItem }) => (
  <div className="flex flex-col p-2.5 rounded-2xl shadow-sm bg-white/70 text-left">
    <div className="flex items-start justify-between gap-1.5 mb-1">
      <span className="text-sm font-medium text-gray-800 line-clamp-2">{item.title}</span>
      <span className="text-[10px] text-slate-500 flex-shrink-0 whitespace-nowrap">
        🔥{(item.peak_heat_numeric / 10000).toFixed(0)}万
      </span>
    </div>
    {item.event_core && (
      <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">{item.event_core}</p>
    )}
  </div>
);

interface HotPoolBarProps {
  activePool: HotPoolItem[];
  coolingPool: HotPoolItem[];
  isLoading: boolean;
  refreshPool: () => Promise<void>;
}

/** 追踪池顶部横条：展示 active/cooling 热点 */
export default function HotPoolBar({ activePool, coolingPool, isLoading, refreshPool }: HotPoolBarProps) {
  if (isLoading) {
    return (
      <div className="p-3 text-xs text-gray-400 opacity-70 transition-opacity">追踪池加载中…</div>
    );
  }

  const isEmpty = activePool.length === 0 && coolingPool.length === 0;

  return (
    <div className="shadow-md rounded-2xl bg-white/90 backdrop-blur-sm overflow-hidden transition-opacity">
      <div className="flex items-center justify-between px-3 pt-2">
        <span className="text-xs font-medium text-gray-500">热点追踪池</span>
        <button onClick={() => refreshPool()} className="text-[10px] text-gray-400 hover:text-gray-600">刷新</button>
      </div>

      {isEmpty ? (
        <div className="p-3 text-xs text-gray-400 opacity-70">暂无追踪中的热点</div>
      ) : (
        <div className="p-2 space-y-2">
          {activePool.length > 0 && (
            <div className="rounded-2xl bg-gray-50/50 p-2 flex gap-2 overflow-x-auto">
              {activePool.map((item) => (
                <div key={item.id} className="w-40 flex-shrink-0">
                  <HotspotCard item={item} />
                </div>
              ))}
            </div>
          )}
          {coolingPool.length > 0 && (
            <div className="rounded-2xl bg-gray-50/50 p-2 flex gap-2 overflow-x-auto">
              {coolingPool.map((item) => (
                <div key={item.id} className="w-40 flex-shrink-0 opacity-70">
                  <HotspotCard item={item} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

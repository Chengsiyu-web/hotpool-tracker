-- ═══════════════════════════════════════════════════════════════════
-- Hotpool Tracker — 数据库初始化脚本
-- ═══════════════════════════════════════════════════════════════════
-- 使用方法：在 Supabase Dashboard → SQL Editor 中粘贴并运行此脚本
-- ═══════════════════════════════════════════════════════════════════

-- 热点扫榜结果快照表
CREATE TABLE IF NOT EXISTS hotspot_results (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  source TEXT DEFAULT 'manual',
  scan_date TEXT NOT NULL,
  status TEXT DEFAULT 'success',
  hotspots JSONB DEFAULT '[]',
  raw_response TEXT
);

-- 热点追踪池
CREATE TABLE IF NOT EXISTS hotspot_pool (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  title TEXT NOT NULL,
  canonical_key TEXT UNIQUE NOT NULL,
  first_seen_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ,
  peak_heat TEXT DEFAULT '',
  peak_heat_numeric BIGINT DEFAULT 0,
  platforms TEXT[] DEFAULT '{}',
  days_active INT DEFAULT 0,
  appearances INT DEFAULT 0,
  resonance BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'cooling',
  event_core TEXT DEFAULT '',
  fingerprint TEXT[] DEFAULT '{}',
  total_directions INT DEFAULT 0,
  last_direction_at TIMESTAMPTZ
);

-- 追踪池快照（幂等，同一 pool_id + snapshot_date 只保留一条）
CREATE TABLE IF NOT EXISTS hotspot_pool_snapshots (
  id BIGSERIAL PRIMARY KEY,
  pool_id BIGINT REFERENCES hotspot_pool(id) ON DELETE CASCADE,
  snapshot_date TEXT NOT NULL,
  heat TEXT DEFAULT '',
  heat_numeric BIGINT DEFAULT 0,
  rank INT DEFAULT 0,
  platforms TEXT[] DEFAULT '{}',
  UNIQUE(pool_id, snapshot_date)
);

-- 创作方向历史
CREATE TABLE IF NOT EXISTS hotspot_pool_directions (
  id BIGSERIAL PRIMARY KEY,
  pool_id BIGINT REFERENCES hotspot_pool(id) ON DELETE CASCADE,
  direction_json JSONB DEFAULT '{}',
  tone TEXT DEFAULT '',
  narrative_arc TEXT DEFAULT '',
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 基调/叙事弧映射词表
CREATE TABLE IF NOT EXISTS kb_tone_skeleton_mapping (
  id BIGSERIAL PRIMARY KEY,
  tone TEXT NOT NULL,
  skeleton TEXT NOT NULL,
  strength TEXT DEFAULT 'normal',
  shared_books_count INT DEFAULT 0
);

-- 写作会话
CREATE TABLE IF NOT EXISTS writing_sessions (
  id BIGSERIAL PRIMARY KEY,
  session_id UUID UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  hotspot_ref JSONB DEFAULT '{}'
);

-- ═══════════════════════════════════════════════════════════════════
-- RLS（Row Level Security）配置
-- ═══════════════════════════════════════════════════════════════════
-- ⚠️ 以下为开发环境配置，允许匿名读写。
-- 生产环境请务必收紧权限，仅允许认证用户访问。

ALTER TABLE hotspot_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotspot_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotspot_pool_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotspot_pool_directions ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_tone_skeleton_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE writing_sessions ENABLE ROW LEVEL SECURITY;

-- 开发用：允许匿名读写
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'hotspot_results' AND policyname = 'anon_all') THEN
    CREATE POLICY "anon_all" ON hotspot_results FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'hotspot_pool' AND policyname = 'anon_all') THEN
    CREATE POLICY "anon_all" ON hotspot_pool FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'hotspot_pool_snapshots' AND policyname = 'anon_all') THEN
    CREATE POLICY "anon_all" ON hotspot_pool_snapshots FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'hotspot_pool_directions' AND policyname = 'anon_all') THEN
    CREATE POLICY "anon_all" ON hotspot_pool_directions FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'kb_tone_skeleton_mapping' AND policyname = 'anon_all') THEN
    CREATE POLICY "anon_all" ON kb_tone_skeleton_mapping FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'writing_sessions' AND policyname = 'anon_all') THEN
    CREATE POLICY "anon_all" ON writing_sessions FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 为常用查询字段创建索引（提升性能）
CREATE INDEX IF NOT EXISTS idx_hotspot_pool_status ON hotspot_pool(status);
CREATE INDEX IF NOT EXISTS idx_hotspot_pool_canonical_key ON hotspot_pool(canonical_key);
CREATE INDEX IF NOT EXISTS idx_hotspot_pool_snapshots_pool_id ON hotspot_pool_snapshots(pool_id);
CREATE INDEX IF NOT EXISTS idx_hotspot_pool_directions_pool_id ON hotspot_pool_directions(pool_id);
CREATE INDEX IF NOT EXISTS idx_hotspot_results_scan_date ON hotspot_results(scan_date);
CREATE INDEX IF NOT EXISTS idx_hotspot_results_status ON hotspot_results(status);

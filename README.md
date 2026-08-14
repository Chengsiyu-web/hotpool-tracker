# 🔥 热点追踪池 (Hotpool Tracker)

> 现象级热点档案系统 — 抓取四大平台热榜，AI 生成创作方向，追踪高价值选题。

## 项目简介

热点追踪池是一个面向网文创作者、内容策划的热点分析工具。系统每天自动扫描微博、知乎、头条、抖音的热榜数据，通过 AI Agent 筛选适合改编为小说的热点事件，并自动生成多个创作方向（含基调、叙事弧、一句话钩子、故事梗概）。

核心能力：

- **热榜扫描**：AI 自动联网抓取四大平台热榜，筛选高潜力选题
- **创作方向生成**：每个热点自动生成 4 个差异化创作方向（基调 + 叙事弧 + 钩子 + 梗概）
- **热点追踪池**：有价值的热点进入追踪档案，跨天累积峰值热度、上榜天数、多平台共振等统计，自动降级/归档
- **情绪拆解**：每个热点分析情绪入口、关系张力、情绪钉子、争议裂缝
- **词表白名单校验**：创作方向的基调/叙事弧命名必须匹配知识库词表，防止 AI 幻觉

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React 18 + TypeScript + Tailwind CSS + Vite |
| 路由 | React Router v7 |
| 数据库 | Supabase (PostgreSQL) |
| AI 服务 | 可插拔适配器（CatX / OpenAI 兼容 / 自定义） |
| 图标 | Lucide React |

## 快速开始

### 1. 克隆并安装依赖

```bash
git clone https://github.com/your-username/hotpool-tracker.git
cd hotpool-tracker
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env`，填入 Supabase 和 AI 服务的配置信息。

### 3. 初始化数据库

项目依赖以下 Supabase 表（需在 Supabase SQL Editor 中执行建表语句）：

```sql
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

-- 开启 RLS 并设置公共读写（开发环境）
ALTER TABLE hotspot_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotspot_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotspot_pool_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotspot_pool_directions ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_tone_skeleton_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE writing_sessions ENABLE ROW LEVEL SECURITY;

-- 开发用：允许匿名读写（生产环境请收紧权限）
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
```

### 4. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:8080

## 配置说明

### AI 服务配置

项目支持三种 AI 后端，通过 `VITE_AI_PROVIDER` 切换：

| Provider | 说明 | 适用场景 |
|---|---|---|
| `catx` | 美团内部 CatX Agent | 美团内网用户（原始版本） |
| `openai` | OpenAI 兼容 API | 使用 GPT-4o / DeepSeek / 通义千问等 |
| `custom` | 自定义适配器 | 接入任意 AI 服务 |

切换示例：

```env
# 使用 OpenAI
VITE_AI_PROVIDER=openai
VITE_OPENAI_BASE_URL=https://api.openai.com/v1
VITE_OPENAI_API_KEY=sk-xxx
VITE_OPENAI_MODEL=gpt-4o
```

### 自定义 AI 服务实现

实现 `AIService` 接口即可接入任意后端：

```typescript
import { AIService, setAIService } from '@/lib/ai-service';

const myService: AIService = {
  async scanHotspots(vocab, options) { /* ... */ },
  async generateDirections(hotspot, vocab) { /* ... */ },
  async sendMessage(prompt) { /* ... */ },
};

setAIService(myService);
```

## 项目结构

```
hotpool-tracker/
├── src/
│   ├── components/         # React 组件
│   │   └── HotPoolBar.tsx  # 追踪池展示横条
│   ├── hooks/
│   │   └── useHotPool.ts   # 追踪池数据 hook
│   ├── integrations/
│   │   └── supabase/
│   │       └── client.js   # Supabase 客户端
│   ├── lib/
│   │   ├── ai-service.ts        # AI 服务抽象层
│   │   ├── hotpool.js           # 追踪池核心逻辑
│   │   ├── hotspot-prompt.js    # AI 提示词
│   │   ├── hotspot-store.js     # 数据库读写封装
│   │   └── tone-arc-vocab.js    # 基调/叙事弧词表
│   ├── pages/
│   │   └── HotspotScanPage.tsx  # 扫榜主页面
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── .env.example            # 环境变量模板
├── package.json
├── tailwind.config.js
├── vite.config.js
└── tsconfig.json
```

## 依赖的外部服务

| 服务 | 用途 | 是否必需 |
|---|---|---|
| Supabase | 数据存储（热点、追踪池、词表） | ✅ 必需 |
| AI Agent API | 热榜扫描 + 创作方向生成 | ✅ 必需 |
| hotflashnews.com | 热榜数据抓取源（prompt 中引用） | ⚠️ 可替换 |

## 原始项目信息

本项目脱胎于美团内部 NoCode 平台项目（内容创意生产平台），已移除所有 NoCode 专属依赖并抽象为可独立部署的开源版本。

原始项目使用的内部组件库（@roo/roo、NoCode 插件等）已完全移除，UI 改用 Tailwind CSS + Lucide React 图标重写。

## License

MIT

# 🔥 Hotpool Tracker — 热点追踪池

> 现象级热点档案系统 — 抓取四大平台热榜，AI 生成创作方向，追踪高价值选题。

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?logo=supabase&logoColor=white)](https://supabase.com)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 📖 项目简介

热点追踪池是一个面向网文创作者、内容策划的热点分析工具。系统每天自动扫描微博、知乎、头条、抖音的热榜数据，通过 AI Agent 筛选适合改编为小说的热点事件，并自动生成多个创作方向（含基调、叙事弧、一句话钩子、故事梗概）。

**核心能力：**

- **热榜扫描** — AI 自动联网抓取四大平台热榜，筛选高潜力选题
- **创作方向生成** — 每个热点自动生成 4 个差异化创作方向（基调 + 叙事弧 + 钩子 + 梗概）
- **热点追踪池** — 有价值的热点进入追踪档案，跨天累积峰值热度、上榜天数、多平台共振等统计，自动降级/归档
- **情绪拆解** — 每个热点分析情绪入口、关系张力、情绪钉子、争议裂缝
- **词表白名单校验** — 创作方向的基调/叙事弧命名必须匹配知识库词表，防止 AI 幻觉

## 🛠️ 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React 18 + TypeScript + Tailwind CSS + Vite |
| 路由 | React Router v7 |
| 数据库 | Supabase (PostgreSQL) |
| AI 服务 | 可插拔适配器（CatX / OpenAI 兼容 / 自定义） |
| 图标 | Lucide React |

## 🚀 快速开始

### 在线 Demo

无需任何配置，直接访问演示站点体验完整功能：

**[🔥 点击体验 Demo →](你的demo地址)** （演示版使用模拟数据）

> 💡 提示：此处应替换为你的 Vercel/Netlify 部署地址。部署方法见下方「部署前端」章节。

### 本地快速体验（无需后端）

想本地运行一个无需任何后端配置的演示版本：

```bash
git clone https://github.com/Chengsiyu-web/hotpool-tracker.git
cd hotpool-tracker
npm install
echo "VITE_DEMO_MODE=true" > .env
npm run dev
```

打开 http://localhost:8080 即可看到带 mock 数据的完整界面。

### 完整部署（接入真实后端）

#### 前置要求

- Node.js >= 18.0
- npm >= 9.0（或 pnpm / yarn）
- 一个 [Supabase](https://supabase.com) 账号（免费计划即可）
- 一个 AI 服务 API Key（OpenAI / DeepSeek / 通义千问 等 OpenAI 兼容服务）

#### 1. 克隆并安装依赖

```bash
git clone https://github.com/Chengsiyu-web/hotpool-tracker.git
cd hotpool-tracker
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env`，填入你的配置信息：

```env
# ── Supabase（必需）───────────────────────────────────────
# 从 Supabase Dashboard → Settings > API 获取
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# ── AI 服务（必需）─────────────────────────────────────────
# 选择使用 OpenAI 兼容 API（推荐）
VITE_AI_PROVIDER=openai
VITE_OPENAI_BASE_URL=https://api.openai.com/v1
VITE_OPENAI_API_KEY=sk-your-openai-key
VITE_OPENAI_MODEL=gpt-4o

# ── 可选配置 ───────────────────────────────────────────────
# 扫榜热点数量（默认 15）
VITE_SCAN_TOP_N=15
# 每个热点生成创作方向数量（默认 4）
VITE_DIRECTIONS_PER_HOTSPOT=4
```

### 3. 初始化数据库

1. 打开 [Supabase Dashboard](https://supabase.com/dashboard)
2. 进入你的项目 → **SQL Editor**
3. 点击 **New query**
4. 复制 [`scripts/setup-db.sql`](./scripts/setup-db.sql) 的全部内容，粘贴并运行
5. 再新建一个 query，复制 [`scripts/seed-vocab.sql`](./scripts/seed-vocab.sql) 的全部内容并运行

> 💡 **说明**：`setup-db.sql` 会创建所有需要的表和索引，`seed-vocab.sql` 会插入初始的基调/叙事弧词表数据。没有词表数据，AI 生成的创作方向将无法通过白名单校验。

### 4. 启动开发服务器

```bash
npm run dev
```

打开浏览器访问 http://localhost:8080 即可看到前端界面。

## 🌐 部署前端

本项目的前端可以零成本部署到 Vercel 或 Netlify：

### Vercel（推荐）

1. 在 [Vercel](https://vercel.com) 导入你的 GitHub 仓库
2. 框架预设选择 **Vite**
3. 在 Environment Variables 中添加 `.env` 中的所有变量
4. 点击 Deploy

### Netlify

1. 在 [Netlify](https://netlify.com) → Add new site → Import from GitHub
2. Build command: `npm run build`
3. Publish directory: `dist`
4. 在 Environment Variables 中添加 `.env` 中的所有变量
5. Deploy site

## ⚙️ 配置说明

### AI 服务配置

项目支持三种 AI 后端，通过 `VITE_AI_PROVIDER` 切换：

| Provider | 说明 | 适用场景 |
|---|---|---|
| `catx` | 美团内部 CatX Agent | 美团内网用户（原始版本） |
| `openai` | OpenAI 兼容 API | 使用 GPT-4o / DeepSeek / 通义千问等 |
| `custom` | 自定义适配器 | 接入任意 AI 服务 |

#### 使用 DeepSeek 示例

```env
VITE_AI_PROVIDER=openai
VITE_OPENAI_BASE_URL=https://api.deepseek.com/v1
VITE_OPENAI_API_KEY=sk-your-deepseek-key
VITE_OPENAI_MODEL=deepseek-chat
```

#### 使用通义千问示例

```env
VITE_AI_PROVIDER=openai
VITE_OPENAI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
VITE_OPENAI_API_KEY=sk-your-dashscope-key
VITE_OPENAI_MODEL=qwen-plus
```

### 自定义 AI 服务实现

如果以上预设不满足你的需求，可以实现 `AIService` 接口接入任意后端：

```typescript
import { AIService, setAIService } from '@/lib/ai-service';

const myService: AIService = {
  async scanHotspots(vocab, options) {
    // 实现热榜扫描逻辑
    return { response: '...', hotspots: [...] };
  },
  async generateDirections(hotspot, vocab) {
    // 实现创作方向生成逻辑
    return [...];
  },
  async sendMessage(prompt) {
    // 实现通用消息发送
    return 'response text';
  },
};

setAIService(myService);
```

## 📁 项目结构

```
hotpool-tracker/
├── scripts/
│   ├── setup-db.sql           # 数据库建表脚本（含 RLS 配置和索引）
│   └── seed-vocab.sql         # 基调/叙事弧词表种子数据
├── src/
│   ├── components/
│   │   └── HotPoolBar.tsx     # 追踪池展示横条组件
│   ├── hooks/
│   │   └── useHotPool.ts      # 追踪池数据管理 hook
│   ├── integrations/
│   │   └── supabase/
│   │       └── client.js      # Supabase 客户端（读取 env 配置）
│   ├── lib/
│   │   ├── ai-service.ts      # AI 服务抽象层（可插拔适配器）
│   │   ├── catx-client.js     # CatX Agent 客户端（参考实现）
│   │   ├── hotpool.js         # 追踪池核心逻辑（阈值/降级/容量收敛）
│   │   ├── hotspot-prompt.js  # AI 提示词模板
│   │   ├── hotspot-store.js   # 数据库读写封装
│   │   └── tone-arc-vocab.js  # 基调/叙事弧词表管理
│   ├── pages/
│   │   └── HotspotScanPage.tsx # 扫榜主页面
│   ├── App.tsx                # 应用根组件
│   ├── main.tsx               # 入口文件
│   ├── index.css              # 全局样式（Tailwind）
│   └── vite-env.d.ts          # Vite 环境变量类型声明
├── .env.example               # 环境变量模板
├── .gitignore                 # Git 忽略规则
├── index.html                 # HTML 模板
├── LICENSE                    # MIT 许可证
├── package.json               # 依赖配置
├── postcss.config.js          # PostCSS 配置
├── tailwind.config.js         # Tailwind CSS 配置
├── tsconfig.json              # TypeScript 配置
├── tsconfig.node.json         # TypeScript Node 配置
└── vite.config.js             # Vite 构建配置
```

## 🔗 依赖的外部服务

| 服务 | 用途 | 是否必需 | 费用 |
|---|---|---|---|
| [Supabase](https://supabase.com) | 数据存储（热点、追踪池、词表） | ✅ 必需 | 免费计划可用 |
| AI API（OpenAI / DeepSeek 等） | 热榜扫描 + 创作方向生成 | ✅ 必需 | 按 token 计费 |
| 热榜数据源 | 微博/知乎/头条/抖音热榜抓取 | ⚠️ 由 AI Agent 自动处理 | — |

## ❓ 常见问题

**Q: 运行 `npm run dev` 后页面空白或报错？**
A: 检查 `.env` 中 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY` 是否正确填写，以及数据库表是否已创建。

**Q: 扫描后显示"词表为空"错误？**
A: 需要先运行 `scripts/seed-vocab.sql` 插入词表数据。

**Q: 可以不用 Supabase 吗？**
A: 当前版本强依赖 Supabase。如果你希望使用其他数据库，需要修改 `src/integrations/supabase/client.js` 和 `src/lib/hotspot-store.js` 中的数据库操作。

**Q: 如何修改 AI 提示词？**
A: 编辑 `src/lib/hotspot-prompt.js` 中的 prompt 模板即可。

## 🔒 安全说明

本项目所有密钥均通过环境变量读取，不会硬编码在代码中。请确保：

- ✅ 将 `.env` 加入 `.gitignore`（已配置）
- ✅ 不要将 `.env` 文件提交到公开仓库
- ✅ 在生产环境中配置严格的 RLS 策略（限制匿名访问）

## 📜 License

[MIT](./LICENSE)

---

> 本项目脱胎于美团内部 NoCode 平台项目，已移除所有内部依赖并抽象为可独立部署的开源版本。

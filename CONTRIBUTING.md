# 贡献指南

感谢你对本项目的兴趣！以下是参与贡献的指南。

## 开发环境设置

1. Fork 本仓库
2. Clone 你的 fork：`git clone https://github.com/YOUR_USERNAME/hotpool-tracker.git`
3. 安装依赖：`npm install`
4. 复制环境变量：`cp .env.example .env` 并填写你的配置
5. 启动开发服务器：`npm run dev`

## 提交 Pull Request

1. 创建新的分支：`git checkout -b feat/your-feature-name`
2. 编写代码并确保通过 `npm run build`
3. 提交前确保没有硬编码的密钥或个人信息
4. 推送到你的 fork：`git push origin feat/your-feature-name`
5. 在 GitHub 上创建 Pull Request，描述清楚改动内容

## 代码规范

- 使用 TypeScript 编写所有新代码
- 遵循项目现有的代码风格（Tailwind CSS 类名排序、函数式组件等）
- 不要提交 `.env` 文件
- 不要硬编码任何 API Key 或密钥

## Bug 报告

如果你发现了 bug，请在 Issues 中报告，包含：
- 问题的详细描述
- 复现步骤
- 环境信息（Node 版本、浏览器等）
- 期望行为 vs 实际行为

## 功能建议

欢迎提出新功能建议！请在 Issue 中详细描述你的想法和使用场景。

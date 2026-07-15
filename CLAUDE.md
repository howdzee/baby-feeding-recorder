# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 这是什么

一个用于记录新生儿吃奶（母乳/瓶喂/奶粉）和排便事件的 PWA。数据存储在通过 REST API 访问的服务端 SQLite 数据库中；所有数据仅存于用户自己的部署环境，不会上传到任何外部服务器。移动优先，采用"液态设计"布局理念（clamp() 流体尺寸 + CSS 容器查询）。

## 常用命令

```bash
npm run dev           # 启动 Express API 服务器（./data/data.db）+ Vite 开发服务器（/api 代理到后端）
npm run dev:client    # 仅 Vite（代理仍指向 localhost:3000）
npm run dev:server    # 仅 Express 服务器
npm run build         # TypeScript 类型检查 + Vite 构建 → dist/ 目录
npm run preview       # 通过 Express 运行 dist/（同时启动 API，模拟生产环境）
npm test              # 运行 Vitest（无头模式，jsdom + fake-indexeddb）
npm run test:watch    # Vitest 监听模式
npm test -- path/to/test.ts    # 运行单个测试文件
```

Vitest 配置位于 `vitest.config.ts`。测试中导入 `resetDB` 时使用 `../db`（即 `src/db/index.ts` 的 barrel 导出）。`data/data.db` 已被 gitignore；部署时通过命名 volume 挂载。

## 架构

### 全栈、服务端 SQLite

应用运行一个 Express 服务器（`server.js`），同时提供静态 SPA 资源和基于 `better-sqlite3` 的 JSON API。前端从不直接操作 IndexedDB —— 所有增删改查均通过 `/api/*` 端点完成。`docker-compose.yml` 和 `Dockerfile` 负责部署；数据库通过命名 volume 持久化。

```
Browser → /api/* (Express + better-sqlite3) → data/data.db
开发：Vite proxy → localhost:3000（可用 VITE_API_BASE 环境变量覆盖）
生产：同源（Express 同时服务 dist/ + API）
```

### 数据流

页面 → Zustand store（`src/store/useRecords.ts`） → `src/db/remoteApi.ts` → `fetch('/api/...')` → Express → SQLite

- **Zustand store** 是一个极薄的透传层：将 `remoteApi.ts` 的函数包装为 Promise，自身不持有任何客户端状态。
- **`remoteApi.ts`** 构造 fetch 请求：日期序列化为数字时间戳，返回的 JSON 通过 `toFeeding` / `toDiaper` 映射函数回填为类型化的 `Feeding` / `Diaper` 对象。
- **`store/index.ts`**（即 `config/routes.ts`）也承载了 Express API 端点的主体逻辑，是查阅 SQL 查询、INSERT … ON CONFLICT  upsert 和 WAL 模式配置的参考位置。

### 类型定义（`src/types.ts`）

- `FeedingType`：`'breast_left' | 'breast_right' | 'breast_both' | 'breast_bottle' | 'formula'`
- `DiaperType`：`'pee' | 'poop' | 'both'`
- `Feeding` 中 `amount` 在母乳类型时为 `null`；`durationSec` 在配方奶粉时为 `null`。
- `Diaper` 包含可选的 `color`、`consistency` 和 `hadRash`。

### 路由（`src/App.tsx`）

五个路由：`/`（首页）、`/add`（新增记录，读取 query 参数 `?type=feeding|diaper`）、`/history`、`/stats`、`/settings`。

### 设计系统

- **液态设计令牌**（`src/index.css`）：使用 `clamp()` 和 `cqi`（容器内联尺寸单位）的 CSS 自定义属性。填充/尺寸令牌以 Tailwind 风格的 utility class 暴露（`.p-fluid-c`、`.text-fluid-xs` 等）。
- **Tailwind 配置**（`tailwind.config.ts`）扩展了调色板：`coral`（主色/喂养操作）、`mint`（辅助色/排便操作）、`warm-*` 背景色、`ink-900`/`ink-600` 文字色、`warn` 用于危险操作（删除等）。
- **容器查询**：组件使用 `container-type: inline-size` 实现响应式布局，无需媒体查询。

### 重要细节

- ID 为 `crypto.randomUUID()`，在服务端创建时生成。
- 日期以 `Date.now()` 风格的数字时间戳存储；所有日期边界查询均将日期归一化为目标日的午夜零点。
- `Stats.test.tsx` 对应用 `Stats.test.ts`。测试使用 `jsdom` + `fake-indexeddb`；`db/index.ts` 中的 `resetDB` 是一个空操作桩函数，用于单元测试中 API 的 teardown。
- `Settings` 页面使用 `localStorage` 存储偏好设置（键名 `baby-recorder-settings`）——这是数据库之外唯一的客户端持久化状态。
- `server.js` 的数据目录路径默认为项目根目录下的 `./data/`，可通过环境变量 `DB_PATH` 覆盖。
- `docs/superpowers/specs/` 中的设计文档引用了 Dexie 和早期规划，均早于当前服务端 SQLite 的实现，不应视为权威参考。

# AGENTS.md

## 项目概述

宝宝记录 (Baby Feeding Recorder) — 记录新生儿吃奶（母乳/瓶喂/奶粉）和排便事件的 PWA。
数据存储在服务端 SQLite 中，全部自托管，不上传任何外部服务。

## 架构

```
Browser → Go net/http (/api/*) → modernc.org/sqlite → data/data.db
```

- **后端** `backend/`：Go 1.23，纯标准库 `net/http` + `modernc.org/sqlite`（WAL 模式），无第三方框架。
- **前端** `frontend/`：React 18 + TypeScript + Vite 5 + Tailwind CSS 3。
- **生产部署**：Go 二进制通过 `embed.FS` 嵌入前端 `dist/` 产物，单文件运行。
- **开发模式**：Vite 开发服务器代理 `/api` 到 Go 后端 (`localhost:3000`)。

> ⚠️ 仓库中 `CLAUDE.md` 是**过期文档**，描述的是已废弃的 Express + better-sqlite3 架构。不要参照它。

## 常用命令

```bash
# 前端（在 frontend/ 目录下）
npm run build          # tsc 类型检查 + vite build + PWA 图标生成
npm test               # vitest run（jsdom + fake-indexeddb）
npm run dev            # Vite 开发服务器（/api 代理到 :3000）

# 后端（在 backend/ 目录下）
go build -o server ./cmd/server    # 编译
PORT=3000 DB_PATH=./data/data.db ./server   # 运行

# Docker（项目根目录）
docker compose up -d   # 一键构建并启动
```

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/feedings?start=&end=` | 查询喂养记录（毫秒时间戳） |
| POST | `/api/feedings` | 创建喂养记录 |
| DELETE | `/api/feedings/{id}` | 删除喂养记录 |
| GET | `/api/diapers?start=&end=` | 查询排便记录 |
| POST | `/api/diapers` | 创建排便记录 |
| DELETE | `/api/diapers/{id}` | 删除排便记录 |
| POST | `/api/sync/push` | 多设备同步（上传） |
| GET | `/api/sync/pull?since=` | 多设备同步（拉取，按 updatedAt） |
| GET | `/api/export` | 导出 JSON 备份 |
| POST | `/api/import` | 导入 JSON 备份 |
| `/` | 其他路径 | 返回前端 SPA（回退到 index.html） |

## 数据模型

**feeding 表**：
- `id` TEXT PK — `uuid.New().String()`（服务端生成）
- `type` TEXT — `breast_left | breast_right | breast_both | breast_bottle | formula`
- `amount` INTEGER — 瓶喂／奶粉毫升数（母乳为 NULL）
- `durationSec` INTEGER — 母乳喂养秒数（奶粉为 NULL）
- `startedAt`, `endedAt`, `createdAt`, `updatedAt` — 毫秒级 Unix 时间戳
- `note` TEXT

**diaper 表**：
- `id` TEXT PK
- `type` TEXT — `pee | poop | both`
- `color`, `consistency` TEXT（可选）
- `hadRash` INTEGER — 0 或 1
- `recordedAt`, `createdAt`, `updatedAt` — 毫秒级 Unix 时间戳

## 关键约定

- **ID 生成**：服务端使用 `github.com/google/uuid`，不在前端生成。
- **时间格式**：所有时间戳为毫秒级 Unix 时间戳 (`Date.now()` / `time.Now().UnixMilli()`)。
- **前端类型映射**：`src/db/remoteApi.ts` 中 `toFeeding` / `toDiaper` 将服务端 JSON（数字时间戳）转换为前端 `Date` 对象。
- **前端状态**：Zustand (`src/store/useRecords.ts`) 是薄透传层，直接调用 `remoteApi.ts` 的函数。
- **液态设计**：`src/index.css` 使用 `clamp()` + `cqi` 容器查询，Tailwind 扩展了 `coral` / `mint` / `warm-*` / `ink-*` / `warn` 调色板。
- **Settings** 页偏好设置存在 `localStorage` (key `baby-recorder-settings`)，这是前端唯一不经过 API 的持久化。
- **Go 后端结构**：`cmd/server/main.go` → `internal/routes/` (路由注册) → `internal/queries/` (SQL) → `internal/db/` (初始化 + schema) → `internal/models/` (类型 + Scan 函数)。
- **前端 dist 嵌入**：Go 编译时通过 `//go:embed dist/*` 嵌入 `frontend/dist/`。构建顺序：先 `npm run build` 产出 `dist/`，再 `go build`。

## 前端路由

五个页面（`src/App.tsx`，react-router-dom v6）：
- `/` — 首页（今日概览）
- `/add?type=feeding|diaper` — 新增记录
- `/history` — 历史记录
- `/stats` — 统计图表（Recharts）
- `/settings` — 设置（导出 Excel、导入导出备份、同步）

## 测试

- `frontend/src/__tests__/` 下有 5 个测试文件，使用 Vitest + jsdom + `@testing-library/react`。
- `fake-indexeddb` 在 `dependencies` 中（不是 devDependencies），用于模拟 IndexedDB（历史遗留，当前不使用）。
- 运行单个测试：`npm test -- path/to/test.ts`

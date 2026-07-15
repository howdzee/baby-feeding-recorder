# 宝宝记录 (Baby Eating Recorder)

一个用于记录**新生儿吃奶（母乳/瓶喂/奶粉）和排便事件**的 PWA 应用。

数据存储在服务端 SQLite 数据库中，所有数据仅存于用户自己的部署环境，不会上传到任何外部服务器。支持移动端安装为 App，可离线使用。

![React](https://img.shields.io/badge/React-18-61dafb)
![Express](https://img.shields.io/badge/Express-4-000000)
![SQLite](https://img.shields.io/badge/SQLite-better--sqlite3-003b57)
![Docker](https://img.shields.io/badge/Docker-2478ff)
![PWA](https://img.shields.io/badge/PWA-可离线使用-green)
![Mobile First](https://img.shields.io/badge/Mobile-First-orange)

---

## 功能

- 记录五种喂养类型：左乳、右乳、双侧、母乳瓶喂、配方奶粉
- 记录三种排便类型：尿、便、混合
- 记录便便颜色、质地、是否红屁屁等细节
- 在移动端以 PWA 形式使用，可添加到主屏幕，支持离线
- 图表统计：日均/周均喂养次数、日均总量曲线
- 导出 Excel（`.xlsx`）
- 同步功能：支持多设备数据同步（push/pull API）
- 液态设计：`clamp()` + 容器查询，适配各种屏幕尺寸

## 一键部署

### 前提条件

- 一台有公网 IP 的服务器或 VPS（性能要求极低，Raspberry Pi 即可）
- 已安装 [Docker](https://www.docker.com/) 和 [Docker Compose](https://docs.docker.com/compose/)

### 操作步骤

1. 将本项目克隆到服务器上（或导航到项目目录）：

```bash
git clone https://github.com/<你的用户名>/baby-eating-recorder.git
cd baby-eating-recorder
```

2. **一行命令启动**：

```bash
docker compose up -d
```

3. 打开浏览器访问 `http://<服务器IP>:3000`，即可使用。

> 首次访问可能需要等待几秒钟——Docker 正在构建镜像并自动初始化 SQLite 数据库。

### 停止与卸载

```bash
# 停止服务（数据保留在 Docker volume 中）
docker compose down

# 如果需要彻底删除数据（包括所有记录）：
docker compose down -v
```

---

## 自定义配置

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `PORT` | HTTP 服务端口 | `3000` |
| `DB_PATH` | 数据库文件路径（容器内） | `/app/data/data.db` |

通过环境变量修改，编辑 `docker-compose.yml`：

```yaml
services:
  app:
    build: .
    ports:
      - "8080:8080"          # 映射端口
    environment:
      - PORT=8080            # 容器内监听端口
      - DB_PATH=/app/data/data.db
    volumes:
      - db-data:/app/data
    restart: unless-stopped

volumes:
  db-data:
```

### 使用反向代理（推荐生产部署）

在生产环境中，建议在 Docker 容器前加一层 Nginx/Caddy 反向代理，启用 HTTPS：

```yaml
# docker-compose.yml 示例（Caddy）
services:
  caddy:
    image: caddy:latest
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy-data:/data
    restart: unless-stopped
    depends_on:
      - app

  app:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - db-data:/app/data
    restart: unless-stopped

volumes:
  db-data:
  caddy-data:
```

```caddyfile
# Caddyfile
https://baby.你的域名.com {
  reverse_proxy app:3000
}
```

---

## 自助搭建（不使用 Docker）

适合熟悉 Node.js 环境的用户，或在没有 Docker 的环境中运行：

```bash
# 1. 安装依赖
npm install

# 2. 构建前端
npm run build

# 3. 启动服务
npm run preview
# 或：PORT=8080 node server.js
```

### 开发模式

```bash
# 同时启动后端 API 和 Vite 开发服务器（带热重载）
npm run dev
```

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动 Express + Vite（开发模式） |
| `npm run dev:server` | 仅 Express 服务器 |
| `npm run dev:client` | 仅 Vite 客户端（代理指向 localhost:3000） |
| `npm run build` | TypeScript 类型检查 + Vite 构建 |
| `npm test` | 运行 Vitest |
| `npm run preview` | 通过 Express 运行构建产物 |

---

## 技术栈

| 层次 | 技术 |
|------|------|
| 前端框架 | React 18 + TypeScript |
| 构建工具 | Vite 5 |
| 样式 | Tailwind CSS 3 + 液态设计（`clamp()` + 容器查询） |
| 状态管理 | Zustand（薄透传层） |
| 图标 | lucide-react |
| 图表 | Recharts |
| 导出 | xlsx（SheetJS） |
| 后端 | Express 4 |
| 数据库 | better-sqlite3（WAL 模式） |
| PWA | vite-plugin-pwa（Workbox） |
| 部署 | Docker + Docker Compose |

## 数据架构

```
Browser → Express（/api/*）→ better-sqlite3 → data/data.db
```

- 所有数据通过 REST API 读写，前端不直接操作数据库
- 数据库文件通过 Docker Named Volume 持久化，容器重建/升级数据不丢失
- 支持时间范围查询、upsert 更新、删除

### 数据表

**feeding**（喂养记录）

| 字段 | 说明 |
|------|------|
| `type` | `breast_left` / `breast_right` / `breast_both` / `breast_bottle` / `formula` |
| `amount` | 瓶喂/奶粉的毫升数（母乳为 null） |
| `durationSec` | 母乳喂养时长秒数（奶粉为 null） |
| `startedAt` / `endedAt` | 时间戳 |

**diaper**（排便记录）

| 字段 | 说明 |
|------|------|
| `type` | `pee` / `poop` / `both` |
| `color` | 便便颜色（可选） |
| `consistency` | 质地（可选） |
| `hadRash` | 是否有红屁屁 |
| `recordedAt` | 时间戳 |

## 数据隐私

本应用是**完全离线/自主部署**的——所有数据仅存储在你自己的服务器上，不会发送到任何第三方服务。前端直接调用同源的 `/api/*` 端点，不包含任何远程 SDK。

## 常见问题

**Q: 部署后打不开页面？**

检查服务器防火墙是否放行了 3000 端口（或你配置的自定义端口）：

```bash
sudo ufw allow 3000/tcp
```

**Q: 数据会丢失吗？**

Docker volume 持久化存储在 Docker 引擎管理的目录中，即使删除容器/镜像，数据也不会丢失。执行 `docker compose down -v` 才会删除 volume。

**Q: 手机能打开吗？**

可以。手机浏览器访问 `http://<服务器IP>:3000`，浏览器会提示"添加到主屏幕"。添加到主屏幕后以 PWA 形式运行，图标、全屏体验、离线访问一应俱全。

---

## License

MIT

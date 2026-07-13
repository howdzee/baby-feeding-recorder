# 新生儿吃奶 & 排便记录应用设计文档

> 2026-07-13 | 状态: 已确认

---

## 1. 目标与范围

构建一个以 **PWA** 为核心的新生儿作息记录工具，记录吃奶（母乳 / 奶粉）和大小便情况。

- **核心用户**：新生儿父母，手机端高频使用
- **数据存储**：全部本地 IndexedDB（Dexie），无需后端 / 账户体系
- **跨端**：一套代码覆盖 Web、移动端（PWA 安装）、桌面端
- **设计语言**：Liquid Design（流体布局 + CSS Container Queries）

---

## 2. 技术选型

| 层级 | 技术 | 理由 |
|------|------|------|
| 框架 | **Vite + React 18 + TypeScript** | 成熟生态，PWA 支持完善 |
| 样式 | **Tailwind CSS v3** + `@container` 查询 | 流体尺寸 + Container Queries 组合实现 Liquid Design |
| 状态 | **Zustand** | 轻量，避免 Context 重渲染 |
| 数据 | **Dexie.js 5.x** | IndexedDB 最佳封装，支持事务 & 索引 |
| PWA | **vite-plugin-pwa** (Workbox) | 零配置离线缓存 + 安装提示 |
| 图标 | **Lucide React** | 轻量，新生儿 icon 友好 |

---

## 3. 数据模型

### 3.1 表设计

```ts
// feeding
{
  id: string;          // crypto.randomUUID()
  type: 'breast_left' | 'breast_right' | 'breast_both' | 'formula';
  amount: number | null;     // 毫升，仅奶粉填写
  durationSec: number | null; // 秒，仅母乳填写
  startedAt: Date;     // 开始时间
  endedAt: Date | null; // 结束时间（进行中可为 null）
  note: string;        // 备注，留空字符串
  createdAt: Date;
}

// diaper
{
  id: string;
  type: 'pee' | 'poop' | 'both';
  color: string | null;    // 排便颜色描述（自由文本）
  consistency: string | null; // 性状描述
  hadRash: boolean;
  recordedAt: Date;
  note: string;
  createdAt: Date;
}
```

### 3.2 索引

- `feeding.startedAt` (降序) — 列表查询主排序
- `diaper.recordedAt` (降序) — 同上
- 无跨表 join 需求，保持简单

---

## 4. 页面 / 路由结构

```
/                  📊 首页（今日概览 + 快速记录按钮）
/add               ➕ 添加记录页（/add?type=feeding|diaper）
/history           📋 历史记录页（日期筛选 + 列表）
/stats             📈 统计页（按日/周汇总图表）
/settings          ⚙️ 设置页（婴儿信息，预留）
```

> 路由使用 **React Router v6** 的 file-based-like 约定，实际单文件分割。

---

## 5. 核心功能详述

### 5.1 快速记录（首页核心交互）

- 两个大型触控友好按钮：**🍼 吃奶** / **🩲 尿布**
- 点击跳转 `/add?type=feeding` 或 `/add?type=diaper`
-  breastfeeding 支持**定时器模式**：开始记录 → 自动计时 → 手动结束
- 奶粉模式：数字选择器，步进 10ml，范围 10–250ml

### 5.2 添加记录页（/add）

**喂奶表单：**
- 类型切换：左乳 / 右乳 / 双侧 / 奶粉（Tab 控件）
- 母乳：开始按钮 → 计时器显示 → 结束按钮
- 奶粉：ml 数字键盘输入
- 时间：默认当前时间，可修改

**尿布表单：**
- 类型单选：尿尿 / 便便 / 两者
- 颜色自由文本（输入框 + 常用色块快速点选预设）
- 性状自由文本
- 红臀 checkbox

### 5.3 历史记录页（/history）

- 日期横向滚动选择器（当前日期高亮，最多回退 30 天）
- 按时间倒序列出当日记录
- 每条记录可展开详情 / 点击删除
- 空状态：友好插图 + 引导添加

### 5.4 统计页（/stats）

- 今日 / 7 日 / 30 日 Tab
- 喂奶柱状图：每日总时长（母乳）或总毫升（奶粉）
- 喂奶频次折线图：每小时 / 每天的次数分布
- 大小便次数统计卡片
- 使用 **Recharts** 绘制，体积小

---

## 6. Liquid Design 实现方案

### 6.1 流体尺寸（Fluid Sizing）

CSS 自定义属性统一管理，通过 `clamp()` 实现断点无关的流体缩放：

```css
:root {
  --fs-sm: clamp(0.75rem, 1.2vw, 0.875rem);
  --fs-base: clamp(0.9rem, 1.5vw, 1rem);
  --fs-lg: clamp(1.1rem, 2vw, 1.5rem);
  --fs-xl: clamp(1.5rem, 3vw, 2.5rem);
  --fs-2xl: clamp(2rem, 4vw, 3.5rem);

  --btn-min: clamp(80px, 15cqi, 140px);   /* 快速记录按钮直径 */
  --btn-h: clamp(48px, 6cqi, 64px);       /* 表单按钮高度 */
  --card-p: clamp(12px, 2cqi, 24px);      /* 卡片内边距 */
}
```

### 6.2 Container Queries

组件用 `container-type: inline-size`，内部布局随容器宽度变化：

```css
/* 快速记录按钮组件 */
.quick-actions {
  container-type: inline-size;
  display: flex;
  justify-content: center;
  gap: 1.5rem;
}

@container (max-width: 300px) {
  .quick-actions { flex-direction: column; align-items: center; }
}
@container (min-width: 301px) and (max-width: 600px) {
  .quick-actions { flex-direction: row; }
}
@container (min-width: 601px) {
  .quick-actions { gap: 3rem; }
}
```

### 6.3 网格弹性布局

历史列表和统计卡片使用 `auto-fit` + `minmax`，无需媒体查询：

```css
.stat-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr));
  gap: clamp(8px, 1.5cqi, 16px);
}
```

---

## 7. PWA 配置

```
manifest.json
  - name: 宝宝记录
  - short_name: BabyRec
  - display: standalone
  - orientation: portrait-primary     // 主屏竖屏，桌面忽略
  - theme_color: #FFF5F5
  - start_url: /

vite-plugin-pwa
  - registerRoute: StaticAssets  → CacheFirst
  - registerRoute: ^/            → NetworkFirst, fallback /index.html
  - 无外部 CDN 依赖，全部 bundle 内
```

---

## 8. 配色与视觉规范

| 用途 | 主色 | 色值 |
|------|------|------|
| 品牌主色（吃奶） | 珊瑚粉 | `#FF8FA3` |
| 副色（尿布） | 薄荷蓝 | `#7DD3C0` |
| 背景 | 温暖白 | `#FFF8F0` |
| 卡片 | 纯白 | `#FFFFFF` |
| 正文 | 深灰 | `#2D2D2D` |
| 辅助文字 | 中灰 | `#888888` |
| 错误/警告 | 柔和橙 | `#FFB74D` |

> 全半色彩度控制在 40 以下，暗色模式暂不上线，保持视觉温暖简洁。

---

## 9. 骨架与初始文件结构

```
baby-eating-recorder/
├── index.html
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── vite.config.ts
├── public/
│   ├── manifest.json
│   └── icon-192.png  / icon-512.png   [预留]
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css                          ← Liquid Design 自定义属性集中地
│   ├── db/
│   │   └── index.ts                       ← Dexie 初始化 + 类型定义
│   ├── store/
│   │   └── useRecords.ts                 ← Zustand store（CRUD 原子操作）
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── AddRecord.tsx
│   │   ├── History.tsx
│   │   ├── Stats.tsx
│   │   └── Settings.tsx
│   ├── components/
│   │   ├── QuickActionButtons.tsx         ← Liquid 容器内 flex 自适应
│   │   ├── RecordCard.tsx                 ← 单条历史卡片
│   │   ├── DateSelector.tsx              ← 横向滚动日期选择器
│   │   ├── FeedingForm.tsx
│   │   ├── DiaperForm.tsx
│   │   ├── StatCard.tsx                  ← auto-fit grid 卡片
│   │   └── Timer.tsx                     ← 母乳计时器 hook 封装
│   └── hooks/
│       └── useTimer.ts                   ←  breastfeeding 计时 hook
└── docs/superpowers/specs/
    └── 2026-07-13-baby-feeding-recorder-design.md  ← 本文件
```

---

## 10. 非功能要求

- **离线可用**：所有路由静态资源预缓存，数据存本地 IndexedDB，断网完全可用
- **性能**：首次加载 < 2s（3G），Lighthouse PWA Score ≥ 90
- **隐私**：零数据上传，可默认开启浏览器 Storage Access 提示用户清除缓存
- **安装**：桌面 PWA 安装按钮（vite-plugin-pwa 自动生成），移动端 browser 原生"添加到主屏幕"提示

---

## 11. 后续扩展预留

- 睡眠记录（夜间模式深色主题蹭用）
- 成长记录（身高 / 体重 / 头围）
- 母乳 vs 奶粉占比分析
- 多胎支持（切换宝宝）
- iCloud / Google Drive 同步（可选后盾方案，v2 考虑）

---

## 12. 实施优先级（建议）

**Phase 1 — MVP（一轮即上线使用）**

- DB + 快速记录 + 历史列表 + 基础统计

**Phase 2 — 体验优化**

- Liquid Design 容器查询全量铺开
- 统计图表
- 主题定制（婴儿头像 / 自定义主色）

**Phase 3 — 增值**

- 提醒 / 推送通知（喂奶间隔提醒）
- 多人协作（配偶同步）

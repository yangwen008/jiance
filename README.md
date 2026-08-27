# 农业虫情监测平台

基于 GitHub + Cloudflare + Gemini 的智慧农业监测平台。

## 技术栈

| 层级 | 技术 |
|---|---|
| 后端 API | Cloudflare Workers + Hono + Drizzle ORM |
| 数据库 | Cloudflare D1 (SQLite) |
| 文件存储 | Cloudflare R2 |
| AI 服务 | Gemini API + Vectorize |
| 前端 (Web) | Vue 3 + TypeScript + Vite |
| 前端 (小程序) | uni-app (Vue 3) |
| 地图 | 高德地图 JS API 2.0 |

## 项目结构

```
jiance/
├── api/                  # Cloudflare Workers 后端 API
│   ├── src/
│   │   ├── index.ts      # 入口文件
│   │   ├── routes/       # 路由模块
│   │   ├── middleware/    # 中间件
│   │   ├── services/     # 业务服务
│   │   ├── models/       # 数据模型
│   │   ├── utils/        # 工具函数
│   │   └── types/        # TypeScript 类型
│   ├── migrations/       # D1 数据库迁移
│   └── wrangler.toml     # Cloudflare Workers 配置
├── web/                  # Vue 3 管理后台 (待创建)
└── mini/                 # 微信小程序 (待创建)
```

## 快速开始

### 1. 安装依赖

```bash
cd api
npm install
```

### 2. 配置 Cloudflare

```bash
# 登录 Cloudflare
npx wrangler login

# 创建 D1 数据库
npx wrangler d1 create agri-db

# 将返回的 database_id 填入 wrangler.toml
```

### 3. 初始化数据库

```bash
# 本地开发
npm run db:migrate:local

# 生产环境
npm run db:migrate
```

### 4. 本地开发

```bash
npm run dev
# 访问 http://localhost:8787
```

### 5. 部署

```bash
npx wrangler deploy
```

## API 接口

### 认证
- `POST /api/auth/register` - 注册
- `POST /api/auth/login` - 登录
- `GET /api/auth/me` - 当前用户信息

### 设备管理
- `GET /api/devices` - 设备列表
- `POST /api/devices` - 添加设备
- `PUT /api/devices/:id` - 更新设备
- `POST /api/devices/:id/data` - 设备上报数据

### 气象监测
- `GET /api/weather/latest?deviceId=xxx` - 最新数据
- `GET /api/weather/history` - 历史数据
- `GET /api/weather/stats` - 统计数据
- `GET /api/weather/accumulation` - 积温积光
- `GET /api/weather/soil` - 墒情分析

### 虫情监测
- `GET /api/pest/latest` - 最新虫情
- `GET /api/pest/history` - 虫情历史
- `GET /api/pest/trend` - 虫量趋势
- `GET /api/pest/annual` - 年度汇总
- `PUT /api/pest/:id/verify` - 人工复核

### 预警管理
- `GET /api/alerts/rules` - 预警规则
- `POST /api/alerts/rules` - 创建规则
- `GET /api/alerts/logs` - 预警记录
- `GET /api/alerts/unread-count` - 未读数量

### 服务商
- `GET /api/providers` - 服务商列表
- `POST /api/providers` - 注册服务商
- `PUT /api/providers/:id/audit` - 审核服务商

### 农机
- `GET /api/machines` - 农机列表
- `POST /api/machines` - 添加农机

### 烘干站
- `GET /api/dryers` - 烘干站列表
- `POST /api/dryers` - 添加烘干站

### 订单
- `GET /api/orders` - 订单列表
- `POST /api/orders` - 创建订单
- `PUT /api/orders/:id/confirm` - 确认订单
- `PUT /api/orders/:id/complete` - 完成订单
- `PUT /api/orders/:id/cancel` - 取消订单

### AI 服务
- `POST /api/ai/identify-pest` - 虫害图像识别
- `POST /api/ai/chat` - 智能问答
- `POST /api/ai/report` - 智能分析报告

### 数据导出
- `GET /api/export/weather` - 导出气象数据 (CSV)
- `GET /api/export/pest` - 导出虫情数据 (CSV)
- `GET /api/export/orders` - 导出订单数据 (CSV)

## 环境变量

在 `wrangler.toml` 中配置，敏感变量使用 `wrangler secret` 设置：

```bash
npx wrangler secret put JWT_SECRET
npx wrangler secret put GEMINI_API_KEY
```

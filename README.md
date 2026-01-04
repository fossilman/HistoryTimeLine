# History Timezone

历史时间轴可视化应用 - 无极缩放时间轴系统

## 项目结构

```
HistoryTimeLine/
├── backend/          # 后端服务 (Node.js + Express + Sequelize)
├── frontend/        # 前端应用 (React + Vite + TypeScript)
└── sdp/            # 产品需求文档和开发文档
```

## 技术栈

### 后端
- Node.js 20.x
- Express.js 4.x
- Sequelize 6.x (ORM)
- MySQL 8.0+

### 前端
- React 18.x
- TypeScript 5.x
- Redux Toolkit
- Vite 5.x
- Tailwind CSS 3.x
- Canvas API

## 快速开始

### 1. 环境要求

- Node.js >= 20.x
- MySQL >= 8.0
- npm 或 yarn

### 2. 数据库设置

创建 MySQL 数据库：

```sql
CREATE DATABASE history_timezone CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3. 后端设置

```bash
cd backend
npm install

# .env 文件已自动创建，请编辑并修改数据库密码
# 打开 backend/.env 文件，将 DB_PASSWORD 修改为你的 MySQL 密码

# 运行数据库迁移
npm run db:migrate

# 插入种子数据（可选）
npm run db:seed

# 启动开发服务器
npm run dev
```

**重要**：请编辑 `backend/.env` 文件，将 `DB_PASSWORD=password` 修改为你的实际 MySQL 密码。

后端服务将在 `http://localhost:3000` 启动

### 4. 前端设置

```bash
cd frontend
npm install

# .env 文件已自动创建，API 地址已配置为 http://localhost:3000/api/v1
# 如需修改，请编辑 frontend/.env 文件

# 启动开发服务器
npm run dev
```

前端应用将在 `http://localhost:5173` 启动

## 功能特性

- ✅ 无极缩放时间轴（滚轮控制）
- ✅ 动态比例尺显示
- ✅ 文明、政权、人物、事件的分层展示
- ✅ 基于视窗跨度的智能内容过滤
- ✅ 智能轨道分配算法（避免元素重叠）
- ✅ 点击查看详情
- ✅ 拖动平移时间轴

## API 接口

### 获取时间轴数据

```
GET /api/v1/timeline/data?startYear={start}&endYear={end}&viewportSpan={span}
```

**查询参数：**
- `startYear`: 视窗起始年份（必填）
- `endYear`: 视窗结束年份（必填）
- `viewportSpan`: 视窗时间跨度（年，必填）
- `civilizationIds`: 筛选文明ID数组（可选）

**响应示例：**
```json
{
  "success": true,
  "data": {
    "civilizations": [...],
    "polities": [...],
    "persons": [...],
    "events": [...],
    "metadata": {
      "viewportSpan": 500,
      "densityLevel": "medium"
    }
  }
}
```

## 开发说明

### 后端开发

- 模型定义：`backend/src/models/`
- 控制器：`backend/src/controllers/`
- 路由：`backend/src/routes/`
- 数据库配置：`backend/src/config/database.js`

### 前端开发

- 组件：`frontend/src/components/`
- 状态管理：`frontend/src/store/`
- API 调用：`frontend/src/api/`
- 工具函数：`frontend/src/utils/`

## 数据模型

### Civilization (文明)
- 时间跨度最长（数千年）
- 作为背景层

### Polity (政权)
- 文明下的具体政治实体
- 有明确起止时间

### Person (人物)
- 以时间区间呈现（出生年-逝世年）
- 归属于特定政权/文明

### Event (事件)
- 瞬时事件：单一年份发生
- 持续事件：有起止时间

## 性能优化

- 虚拟化渲染：仅渲染当前视窗内的元素
- 动态 LOD：根据视窗跨度实时计算并显示对应密度的数据
- Canvas 渲染：使用 Canvas 而非 DOM 元素提升性能
- 数据缓存：Redux 状态管理缓存数据

## 许可证

MIT

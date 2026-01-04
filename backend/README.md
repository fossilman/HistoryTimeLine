# History Timezone Backend

后端 API 服务

## 安装依赖

```bash
npm install
```

## 配置环境变量

复制 `.env.example` 为 `.env` 并配置：

```bash
DB_HOST=localhost
DB_PORT=3306
DB_NAME=history_timezone
DB_USER=root
DB_PASSWORD=your_password
PORT=3000
NODE_ENV=development
```

## 运行

### 开发模式

```bash
npm run dev
```

### 生产模式

```bash
npm start
```

## 数据库迁移

```bash
npm run db:migrate
```

## 插入种子数据

```bash
npm run db:seed
```

这将插入以下示例数据：
- 1 个文明（华夏文明）
- 9 个政权（秦、汉、晋、隋、唐、宋、元、明、清）
- 10 个历史人物（秦始皇、刘邦、刘彻、曹操、李世民、武则天、赵匡胤、忽必烈、朱元璋、朱棣）
- 11 个历史事件（包括瞬时事件和持续事件）

**注意**：在开发环境中，seed 脚本会先清空现有数据再插入新数据。

## API 端点

- `GET /health` - 健康检查
- `GET /api/v1/timeline/data` - 获取时间轴数据


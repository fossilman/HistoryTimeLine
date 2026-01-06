import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import sequelize from './config/database.js';
import routes from './routes/index.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 路由
app.use('/api/v1', routes);

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: err.message || '服务器内部错误'
    },
    timestamp: Date.now()
  });
});

// 启动服务器
const startServer = async () => {
  try {
    // 测试数据库连接
    await sequelize.authenticate();
    console.log('✅ 数据库连接成功');

    // 同步数据库模型（开发环境）
    // 注意：使用 alter: true 可能会导致索引数量超限错误
    // 建议使用手动迁移脚本管理表结构
    if (process.env.NODE_ENV === 'development' && process.env.SYNC_DB === 'true') {
      // 只同步，不修改表结构（避免索引超限）
      await sequelize.sync({ alter: false });
      console.log('✅ 数据库模型已同步（仅检查，不修改表结构）');
      console.log('💡 提示：如需修改表结构，请使用迁移脚本');
    } else {
      console.log('💡 数据库同步已禁用，使用迁移脚本管理表结构');
    }

    app.listen(PORT, () => {
      console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
      console.log(`📡 API 端点: http://localhost:${PORT}/api/v1`);
    });
  } catch (error) {
    console.error('❌ 启动失败:', error);
    process.exit(1);
  }
};

startServer();


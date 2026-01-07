import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

// 自定义 SQL 日志函数，记录执行时间
const sqlLogger = (msg, timing) => {
  // msg 是 SQL 查询字符串，timing 是执行时间（毫秒）
  const executionTime = timing !== undefined ? `${timing}ms` : 'N/A';
  const timestamp = new Date().toISOString();
  console.log(`[SQL ${timestamp}] [${executionTime}] ${msg}`);
};

const sequelize = new Sequelize(
  process.env.DB_NAME || 'history_timezone',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || 'password',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? sqlLogger : false,
    benchmark: true, // 启用基准测试，记录执行时间
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    define: {
      timestamps: true,
      underscored: false,
      freezeTableName: true
    }
  }
);

export default sequelize;


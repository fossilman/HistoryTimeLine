import sequelize from '../config/database.js';
import { Civilization, Dynasty, BiogMainCore } from '../models/index.js';

const migrate = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ 数据库连接成功');

    // 同步所有模型
    await sequelize.sync({ force: false, alter: true });
    console.log('✅ 数据库迁移完成');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 迁移失败:', error);
    process.exit(1);
  }
};

migrate();


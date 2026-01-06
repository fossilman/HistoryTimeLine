import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../config/database.js';
import { Civilization, Dynasty, BiogMainCore } from '../models/index.js';

dotenv.config();

const seed = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ 数据库连接成功');

    // 清空现有数据（可选，开发环境）
    if (process.env.NODE_ENV === 'development') {
      console.log('🗑️  清空现有数据...');
      await BiogMainCore.destroy({ where: {}, force: true });
      await Dynasty.destroy({ where: {}, force: true });
      await Civilization.destroy({ where: {}, force: true });
    }

    console.log('🌱 开始插入种子数据...');

    // 1. 创建文明
    const siniticCiv = await Civilization.create({
      id: 'sinitic',
      name: '华夏文明',
      startYear: -2000,
      endYear: null,
      description: '中华文明，起源于黄河流域，延续至今'
    });
    console.log('✅ 创建文明: 华夏文明');

    // 2. 创建政权
    const politiesData = [
      { id: 'qin', name: '秦', startYear: -221, endYear: -206, color: '#8B4513', importance: 'high' },
      { id: 'han', name: '汉', startYear: -202, endYear: 220, color: '#DC143C', importance: 'high' },
      { id: 'jin', name: '晋', startYear: 265, endYear: 420, color: '#8A2BE2', importance: 'medium' },
      { id: 'sui', name: '隋', startYear: 581, endYear: 618, color: '#FF6347', importance: 'medium' },
      { id: 'tang', name: '唐', startYear: 618, endYear: 907, color: '#FF8C00', importance: 'high' },
      { id: 'song', name: '宋', startYear: 960, endYear: 1279, color: '#4682B4', importance: 'high' },
      { id: 'yuan', name: '元', startYear: 1271, endYear: 1368, color: '#20B2AA', importance: 'high' },
      { id: 'ming', name: '明', startYear: 1368, endYear: 1644, color: '#CD5C5C', importance: 'high' },
      { id: 'qing', name: '清', startYear: 1644, endYear: 1911, color: '#FFD700', importance: 'high' }
    ];

    const createdPolities = {};
    for (const polityData of politiesData) {
      const polity = await Dynasty.create({
        ...polityData,
        civilizationId: siniticCiv.id
      });
      createdPolities[polityData.id] = polity;
      console.log(`✅ 创建政权: ${polityData.name}`);
    }

    // 3. 创建人物
    const personsData = [
      { id: 'qsh', name: '秦始皇(嬴政)', birthYear: -259, deathYear: -210, polityId: 'qin', importance: 'high', title: '皇帝' },
      { id: 'lb', name: '刘邦', birthYear: -256, deathYear: -195, polityId: 'han', importance: 'high', title: '皇帝' },
      { id: 'lc', name: '刘彻', birthYear: -156, deathYear: -87, polityId: 'han', importance: 'high', title: '皇帝' },
      { id: 'cao', name: '曹操', birthYear: 155, deathYear: 220, polityId: 'han', importance: 'high', title: '政治家、军事家' },
      { id: 'lsm', name: '李世民', birthYear: 598, deathYear: 649, polityId: 'tang', importance: 'high', title: '皇帝' },
      { id: 'wz', name: '武则天', birthYear: 624, deathYear: 705, polityId: 'tang', importance: 'high', title: '皇帝' },
      { id: 'zy', name: '赵匡胤', birthYear: 927, deathYear: 976, polityId: 'song', importance: 'high', title: '皇帝' },
      { id: 'khk', name: '忽必烈', birthYear: 1215, deathYear: 1294, polityId: 'yuan', importance: 'high', title: '皇帝' },
      { id: 'zyz', name: '朱元璋', birthYear: 1328, deathYear: 1398, polityId: 'ming', importance: 'high', title: '皇帝' },
      { id: 'zd', name: '朱棣', birthYear: 1360, deathYear: 1424, polityId: 'ming', importance: 'high', title: '皇帝' }
    ];

    for (const personData of personsData) {
      await BiogMainCore.create({
        ...personData,
        civilizationId: siniticCiv.id,
        briefIntro: `${personData.name}，${personData.title}`
      });
      console.log(`✅ 创建人物: ${personData.name}`);
    }

    console.log('\n🎉 种子数据插入完成！');
    console.log(`📊 统计:`);
    console.log(`   - 文明: 1`);
    console.log(`   - 政权: ${politiesData.length}`);
    console.log(`   - 人物: ${personsData.length}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ 种子数据插入失败:', error);
    process.exit(1);
  }
};

seed();


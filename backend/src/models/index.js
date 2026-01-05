import Civilization from './Civilization.js';
import Dynasty from './Dynasty.js';
import BiogMainCore from './BiogMainCore.js';
import Event from './Event.js';

// 定义关联关系
// BiogMainCore 通过 c_dy 关联到 Dynasty (DYNASTIES)
BiogMainCore.belongsTo(Dynasty, {
  foreignKey: 'dynastyId',
  targetKey: 'id',
  as: 'dynasty'
});

Dynasty.hasMany(BiogMainCore, {
  foreignKey: 'dynastyId',
  sourceKey: 'id',
  as: 'persons'
});

// Dynasty 关联到 Civilization
// 禁用外键约束，因为数据库表已存在且列类型可能不完全匹配
Dynasty.belongsTo(Civilization, {
  foreignKey: 'civilizationId',
  targetKey: 'id',
  as: 'civilization',
  constraints: false // 禁用外键约束
});

Civilization.hasMany(Dynasty, {
  foreignKey: 'civilizationId',
  sourceKey: 'id',
  as: 'dynasties',
  constraints: false // 禁用外键约束
});

export {
  Civilization,
  Dynasty,
  BiogMainCore,
  Event
};


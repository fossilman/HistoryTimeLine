import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Civilization = sequelize.define('Civilization', {
  id: {
    type: DataTypes.STRING(36),
    primaryKey: true,
    comment: '主键UUID'
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    comment: '文明名称'
  },
  startYear: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'start_year',
    comment: '起始年份（负数表示公元前）'
  },
  endYear: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'end_year',
    comment: '结束年份（NULL表示持续至今）'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '文明描述'
  }
}, {
  tableName: 'CIVILIZATIONS',
  timestamps: true,
  indexes: [
    {
      name: 'idx_year_range',
      fields: ['start_year', 'end_year']
    }
  ]
});

export default Civilization;


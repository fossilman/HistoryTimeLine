import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Polity = sequelize.define('Polity', {
  id: {
    type: DataTypes.STRING(36),
    primaryKey: true,
    comment: '主键UUID'
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '政权名称'
  },
  civilizationId: {
    type: DataTypes.STRING(36),
    allowNull: false,
    field: 'civilization_id',
    comment: '所属文明ID'
  },
  startYear: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'start_year',
    comment: '起始年份'
  },
  endYear: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'end_year',
    comment: '结束年份'
  },
  color: {
    type: DataTypes.STRING(7),
    allowNull: false,
    comment: 'HEX颜色值'
  },
  importance: {
    type: DataTypes.ENUM('high', 'medium', 'low'),
    allowNull: false,
    defaultValue: 'medium',
    comment: '重要程度'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '政权描述'
  }
}, {
  tableName: 'polities',
  timestamps: true,
  indexes: [
    {
      name: 'idx_civilization',
      fields: ['civilization_id']
    },
    {
      name: 'idx_year_range',
      fields: ['start_year', 'end_year']
    },
    {
      name: 'idx_importance_duration',
      fields: ['importance']
    }
  ]
});

export default Polity;


import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Dynasty = sequelize.define('Dynasty', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    field: 'c_dy',
    comment: '朝代ID'
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'c_dynasty',
    comment: '朝代名称（英文）'
  },
  nameChn: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'c_dynasty_chn',
    comment: '朝代名称（中文）'
  },
  startYear: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'c_start',
    comment: '起始年份'
  },
  endYear: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'c_end',
    comment: '结束年份'
  },
  sort: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'c_sort',
    comment: '排序'
  },
  civilizationId: {
    type: DataTypes.STRING(36),
    allowNull: true,
    field: 'civilization_id',
    defaultValue: 'sinitic',
    comment: '所属文明ID'
  }
}, {
  tableName: 'DYNASTIES',
  timestamps: false,
  indexes: [
    {
      name: 'idx_year_range',
      fields: ['c_start', 'c_end']
    },
    {
      name: 'idx_sort',
      fields: ['c_sort']
    },
    {
      name: 'idx_civilization_id',
      fields: ['civilization_id']
    }
  ]
});

export default Dynasty;


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
  },
  status: {
    type: DataTypes.TINYINT,
    allowNull: false,
    defaultValue: 1,
    field: 'status',
    comment: '显示状态：0=不显示，1=显示'
  },
  cLevel: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
    field: 'c_level',
    comment: '层级：数字小的排在上方'
  },
  parentId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'c_parent_id',
    comment: '父朝代ID，NULL表示Level0层级，非NULL表示Level1层级'
  },
  hasChild: {
    type: DataTypes.TINYINT,
    allowNull: false,
    defaultValue: 0,
    field: 'c_has_child',
    comment: '是否有子集：0=没有，1=有，控制是否有展开按钮'
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
      name: 'idx_civilization_id',
      fields: ['civilization_id']
    },
    // 合并常用查询的复合索引，减少索引数量
    {
      name: 'idx_status_level_parent',
      fields: ['status', 'c_level', 'c_parent_id']
    },
    {
      name: 'idx_status_level_has_child',
      fields: ['status', 'c_level', 'c_has_child']
    },
    {
      name: 'idx_sort',
      fields: ['c_sort']
    }
  ]
});

export default Dynasty;


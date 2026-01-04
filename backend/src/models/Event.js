import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Event = sequelize.define('Event', {
  id: {
    type: DataTypes.STRING(36),
    primaryKey: true,
    comment: '主键UUID'
  },
  name: {
    type: DataTypes.STRING(200),
    allowNull: false,
    comment: '事件名称'
  },
  type: {
    type: DataTypes.ENUM('point', 'duration'),
    allowNull: false,
    comment: '事件类型：瞬时/持续'
  },
  year: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '事件年份（瞬时事件）'
  },
  startYear: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'start_year',
    comment: '起始年份（持续事件）'
  },
  endYear: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'end_year',
    comment: '结束年份（持续事件）'
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
    comment: '事件描述'
  },
  relatedPolities: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'related_polities',
    comment: '相关政权ID数组'
  },
  relatedPersons: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'related_persons',
    comment: '相关人物ID数组'
  }
}, {
  tableName: 'events',
  timestamps: true,
  indexes: [
    {
      name: 'idx_type',
      fields: ['type']
    },
    {
      name: 'idx_year',
      fields: ['year']
    },
    {
      name: 'idx_year_range',
      fields: ['start_year', 'end_year']
    },
    {
      name: 'idx_importance',
      fields: ['importance']
    }
  ]
});

export default Event;


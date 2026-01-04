import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Person = sequelize.define('Person', {
  id: {
    type: DataTypes.STRING(36),
    primaryKey: true,
    comment: '主键UUID'
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '人物姓名'
  },
  birthYear: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'birth_year',
    comment: '出生年份'
  },
  deathYear: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'death_year',
    comment: '逝世年份'
  },
  polityId: {
    type: DataTypes.STRING(36),
    allowNull: false,
    field: 'polity_id',
    comment: '所属政权ID'
  },
  civilizationId: {
    type: DataTypes.STRING(36),
    allowNull: false,
    field: 'civilization_id',
    comment: '所属文明ID'
  },
  importance: {
    type: DataTypes.ENUM('high', 'medium', 'low'),
    allowNull: false,
    defaultValue: 'medium',
    comment: '重要程度'
  },
  title: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '主要头衔/身份'
  },
  briefIntro: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'brief_intro',
    comment: '简要介绍'
  }
}, {
  tableName: 'persons',
  timestamps: true,
  indexes: [
    {
      name: 'idx_polity',
      fields: ['polity_id']
    },
    {
      name: 'idx_civilization',
      fields: ['civilization_id']
    },
    {
      name: 'idx_year_range',
      fields: ['birth_year', 'death_year']
    },
    {
      name: 'idx_importance',
      fields: ['importance']
    }
  ]
});

export default Person;


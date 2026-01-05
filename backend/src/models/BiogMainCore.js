import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const BiogMainCore = sequelize.define('BiogMainCore', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    field: 'c_personid',
    comment: '人物ID'
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'c_name',
    comment: '人物姓名（英文）'
  },
  nameChn: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'c_name_chn',
    comment: '人物姓名（中文）'
  },
  indexYear: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'c_index_year',
    comment: '索引年份'
  },
  birthYear: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'c_birthyear',
    comment: '出生年份'
  },
  deathYear: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'c_deathyear',
    comment: '逝世年份'
  },
  dynastyId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'c_dy',
    comment: '所属朝代ID'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'c_notes',
    comment: '备注'
  }
}, {
  tableName: 'BIOG_MAIN_CORE',
  timestamps: false,
  indexes: [
    {
      name: 'idx_dynasty',
      fields: ['c_dy']
    },
    {
      name: 'idx_year_range',
      fields: ['c_birthyear', 'c_deathyear']
    },
    {
      name: 'idx_index_year',
      fields: ['c_index_year']
    },
    {
      name: 'idx_name_chn',
      fields: ['c_name_chn']
    }
  ]
});

export default BiogMainCore;


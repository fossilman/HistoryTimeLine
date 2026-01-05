import { Op } from 'sequelize';
import sequelize from '../config/database.js';
import { Civilization, Dynasty, BiogMainCore, Event } from '../models/index.js';

/**
 * 根据视窗时间范围和缩放级别，智能返回对应密度的历史数据
 */
export const getTimelineData = async (req, res) => {
  try {
    const { startYear, endYear, viewportSpan, civilizationIds } = req.query;

    // 参数验证
    if (!startYear || !endYear || !viewportSpan) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PARAMS',
          message: '缺少必需参数：startYear, endYear, viewportSpan'
        },
        timestamp: Date.now()
      });
    }

    const start = parseInt(startYear);
    const end = parseInt(endYear);
    const span = parseInt(viewportSpan);

    // 查询文明（所有缩放级别都显示）
    const civilizationsWhere = {
      [Op.or]: [
        { endYear: null },
        { endYear: { [Op.gte]: start } }
      ],
      startYear: { [Op.lte]: end }
    };

    if (civilizationIds && Array.isArray(civilizationIds)) {
      civilizationsWhere.id = { [Op.in]: civilizationIds };
    }

    const civilizations = await Civilization.findAll({
      where: civilizationsWhere,
      raw: true
    });

    // 根据视窗跨度决定返回的数据密度
    // 政权层永久显示（不受视窗跨度限制，但受时间范围限制）
    // 查询与时间窗口有重叠的朝代：startYear <= end 且 endYear >= start
    let polities = await Dynasty.findAll({
      where: {
        [Op.and]: [
          {
            [Op.or]: [
              { startYear: { [Op.lte]: end } },
              { startYear: null }
            ]
          },
          {
            [Op.or]: [
              { endYear: { [Op.gte]: start } },
              { endYear: null }
            ]
          }
        ]
      },
      raw: true
    });

    let persons = [];
    let events = [];

    // 视窗 <= 300年时，显示人物
    // 查询与时间窗口有重叠的人物：birthYear <= end 且 deathYear >= start
    // 限制最多返回100个人物
    if (span <= 300) {
      persons = await BiogMainCore.findAll({
        where: {
          [Op.and]: [
            {
              [Op.or]: [
                { birthYear: { [Op.lte]: end } },
                { birthYear: null }
              ]
            },
            {
              [Op.or]: [
                { deathYear: { [Op.gte]: start } },
                { deathYear: null }
              ]
            }
          ]
        },
        limit: 100,
        order: [['c_index_year', 'ASC']], // 按索引年份排序，优先显示有索引年份的人物
        raw: true
      });
    }

    // 视窗 <= 100年时，显示事件（包括持续型和瞬时型）
    if (span <= 100) {
      events = await Event.findAll({
        where: {
          [Op.or]: [
            {
              type: 'point',
              year: { [Op.between]: [start, end] }
            },
            {
              type: 'duration',
              startYear: { [Op.lte]: end },
              endYear: { [Op.gte]: start }
            }
          ]
        },
        raw: true
      });
    }

    // 格式化响应数据
    const response = {
      civilizations: civilizations.map(c => ({
        id: c.id,
        name: c.name,
        startYear: c.startYear,
        endYear: c.endYear,
        color: c.color
      })),
      polities: polities.map(p => ({
        id: p.id,
        name: p.nameChn || p.name || '', // 优先使用中文名
        startYear: p.startYear,
        endYear: p.endYear,
        color: '#808080', // 默认颜色，因为新表中没有color字段
        importance: 'medium' // 默认重要程度
      })),
      persons: persons.map(p => ({
        id: p.id,
        name: p.nameChn || p.name || '', // 优先使用中文名
        birthYear: p.birthYear,
        deathYear: p.deathYear,
        polityId: p.dynastyId,
        importance: 'medium', // 默认重要程度
        title: null // 新表中没有title字段
      })),
      events: events.map(e => ({
        id: e.id,
        name: e.name,
        type: e.type,
        year: e.year,
        startYear: e.startYear,
        endYear: e.endYear,
        importance: e.importance,
        relatedPolities: e.relatedPolities,
        relatedPersons: e.relatedPersons
      })),
      metadata: {
        viewportSpan: span,
        densityLevel: span > 2000 ? 'minimal' : 
                     span > 500 ? 'simple' : 
                     span > 100 ? 'medium' : 
                     span > 30 ? 'rich' : 'detailed'
      }
    };

    res.json({
      success: true,
      data: response,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error fetching timeline data:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '服务器内部错误',
        details: error.message
      },
      timestamp: Date.now()
    });
  }
};


import { Op } from 'sequelize';
import sequelize from '../config/database.js';
import { Civilization, Dynasty, BiogMainCore } from '../models/index.js';

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
    // 只显示status=1的朝代，按c_level排序（数字小的在上方），c_level相同时随机排列
    let polities = await Dynasty.findAll({
      where: {
        [Op.and]: [
          {
            status: 1 // 只显示status=1的朝代
          },
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
      order: [
        ['c_level', 'ASC'], // 按c_level升序排序（数字小的在上方）
        [sequelize.literal('RAND()')] // c_level相同时随机排列
      ],
      raw: true
    });

    // 默认不查询人物数据，仅在搜索时查询
    // 这样可以减少数据库查询，提高性能
    let persons = [];

    // 格式化响应数据
    const response = {
      civilizations: civilizations.map(c => ({
        id: c.id,
        name: c.name,
        startYear: c.startYear,
        endYear: c.endYear
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

/**
 * 搜索人物
 */
export const searchPerson = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || !query.trim()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PARAMS',
          message: '缺少搜索关键词'
        },
        timestamp: Date.now()
      });
    }

    // 提取中文字符，只保留中文字符
    const searchTerm = query.trim().replace(/[^\u4e00-\u9fa5]/g, '');

    // 如果提取后没有中文字符，返回空结果
    if (!searchTerm) {
      return res.json({
        success: true,
        data: [],
        timestamp: Date.now()
      });
    }

    // 搜索人物（仅匹配中文名）
    const persons = await BiogMainCore.findAll({
      where: {
        nameChn: { [Op.like]: `%${searchTerm}%` }
      },
      limit: 10, // 限制返回10个结果
      order: [['c_index_year', 'ASC']],
      raw: true
    });

    // 格式化响应数据
    const results = persons.map(p => ({
      id: p.id,
      name: p.nameChn || p.name || '',
      birthYear: p.birthYear,
      deathYear: p.deathYear,
      polityId: p.dynastyId,
      importance: 'medium',
      title: null
    }));

    res.json({
      success: true,
      data: results,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error searching person:', error);
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


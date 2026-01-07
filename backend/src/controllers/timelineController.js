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
      order: [['sort', 'ASC']], // 按sort正序排列
      raw: true
    });

    // 根据视窗跨度决定返回的数据密度
    // 政权层永久显示（不受视窗跨度限制，但受时间范围限制）
    // 查询与时间窗口有重叠的朝代：startYear <= end 且 endYear >= start
    // 只显示status=1的Level0层级朝代（c_level = 0 且 c_parent_id IS NULL）
    // 0层级的朝代之间可以相互覆盖
    let polities = await Dynasty.findAll({
      where: {
        [Op.and]: [
          {
            status: 1 // 只显示status=1的朝代
          },
          {
            cLevel: 0 // 只显示Level0层级
          },
          {
            parentId: null // 只显示没有父朝代的朝代（Level0）
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
        endYear: c.endYear,
        sort: c.sort || null // 包含sort字段
      })),
      polities: polities.map(p => ({
        id: String(p.id), // 转换为字符串以匹配前端类型
        name: p.nameChn || p.name || '', // 优先使用中文名
        startYear: p.startYear,
        endYear: p.endYear,
        color: '#808080', // 默认颜色，因为新表中没有color字段
        importance: 'medium', // 默认重要程度
        cLevel: p.cLevel || 0, // 层级
        parentId: p.parentId || null, // 父朝代ID
        civilizationId: p.civilizationId || 'sinitic', // 所属文明ID
        hasChild: p.hasChild || 0 // 是否有子集
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

    // 使用一句 SQL 关联查询，直接查询人物和朝代信息
    // BIOG_MAIN_CORE.c_dy = DYNASTIES.c_dy
    const results = await sequelize.query(`
      SELECT 
        b.c_personid AS id,
        b.c_name,
        b.c_name_chn,
        b.c_birthyear AS birthYear,
        b.c_deathyear AS deathYear,
        b.c_dy AS polityId,
        d.c_dynasty_chn AS polityName,
        d.c_dynasty AS polityNameEn
      FROM BIOG_MAIN_CORE b
      LEFT JOIN DYNASTIES d ON b.c_dy = d.c_dy
      WHERE b.c_name_chn = :searchTerm
      ORDER BY b.c_index_year ASC
      LIMIT 10
    `, {
      replacements: { searchTerm },
      type: sequelize.QueryTypes.SELECT
    });

    // 格式化响应数据（确保 results 是数组）
    const formattedResults = (results || []).map(p => {
      // 处理朝代名称：优先使用中文名 c_dynasty_chn，其次英文名 c_dynasty
      // Sequelize 使用 QueryTypes.SELECT 时会保留 SQL 别名
      let polityName = null;
      
      // 直接使用 SQL 别名（Sequelize 会保留别名）
      if (p.polityName) {
        polityName = String(p.polityName).trim();
      } else if (p.polityNameEn) {
        polityName = String(p.polityNameEn).trim();
      }
      
      // 如果别名不存在，检查原始字段名（以防万一）
      if (!polityName) {
        if (p.c_dynasty_chn) {
          polityName = String(p.c_dynasty_chn).trim();
        } else if (p.c_dynasty) {
          polityName = String(p.c_dynasty).trim();
        }
      }
      
      // 如果为空字符串，转换为 null
      if (polityName === '') {
        polityName = null;
      }
      
      return {
        id: String(p.id),
        name: p.c_name_chn || p.c_name || '',
        birthYear: p.birthYear,
        deathYear: p.deathYear,
        polityId: p.polityId ? String(p.polityId) : '',
        polityName: polityName, // 可能为 null（当朝代不存在或名称为空时）
        importance: 'medium',
        title: null
      };
    });

    res.json({
      success: true,
      data: formattedResults,
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

/**
 * 获取指定父朝代的子朝代列表（Level1层级）
 */
export const getChildDynasties = async (req, res) => {
  try {
    const { parentId } = req.params;

    // 参数验证
    if (!parentId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PARAMS',
          message: '缺少必需参数：parentId'
        },
        timestamp: Date.now()
      });
    }

    const parentIdInt = parseInt(parentId);

    // 查询指定父朝代的所有子朝代（Level1层级）
    // 按照 sort 排序，列表页展现
    const childDynasties = await Dynasty.findAll({
      where: {
        [Op.and]: [
          {
            status: 1 // 只显示status=1的朝代
          },
          {
            parentId: parentIdInt // 父朝代ID
          },
          {
            cLevel: 1 // Level1层级
          }
        ]
      },
      order: [
        ['c_sort', 'ASC'], // 按 sort 排序
        ['c_start', 'ASC'], // sort 相同时按起始年份排序
        ['c_end', 'ASC'] // 起始年份相同时按结束年份排序
      ],
      raw: true
    });

    // 格式化响应数据
    const response = childDynasties.map(p => ({
      id: String(p.id),
      name: p.nameChn || p.name || '',
      startYear: p.startYear,
      endYear: p.endYear,
      color: '#808080',
      importance: 'medium',
      cLevel: p.cLevel || 1,
      parentId: p.parentId,
      civilizationId: p.civilizationId || 'sinitic',
      sort: p.sort || 0
    }));

    res.json({
      success: true,
      data: response,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error fetching child dynasties:', error);
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
 * 获取指定文明的所有Level0朝代（用于比例尺快速定位）
 */
export const getLevel0DynastiesByCivilization = async (req, res) => {
  try {
    const { civilizationId } = req.query;

    // 参数验证
    if (!civilizationId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PARAMS',
          message: '缺少必需参数：civilizationId'
        },
        timestamp: Date.now()
      });
    }

    // 查询指定文明的所有Level0朝代
    const level0Dynasties = await Dynasty.findAll({
      where: {
        [Op.and]: [
          {
            status: 1 // 只显示status=1的朝代
          },
          {
            cLevel: 0 // Level0层级
          },
          {
            parentId: null // 没有父朝代
          },
          {
            civilizationId: civilizationId // 指定文明
          }
        ]
      },
      order: [
        ['c_start', 'ASC'], // 按起始年份排序
        ['c_end', 'ASC'] // 起始年份相同时按结束年份排序
      ],
      raw: true
    });

    // 格式化响应数据
    const response = level0Dynasties.map(p => ({
      id: String(p.id),
      name: p.nameChn || p.name || '',
      startYear: p.startYear,
      endYear: p.endYear,
      color: '#808080',
      importance: 'medium',
      cLevel: p.cLevel || 0,
      parentId: p.parentId || null,
      civilizationId: p.civilizationId || 'sinitic'
    }));

    res.json({
      success: true,
      data: response,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error fetching Level0 dynasties by civilization:', error);
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
 * 获取所有文明（全量，不受时间范围限制，用于快速定位栏）
 */
export const getAllCivilizations = async (req, res) => {
  try {
    const civilizations = await Civilization.findAll({
      order: [['sort', 'ASC']], // 按sort正序排列
      raw: true
    });

    // 格式化响应数据
    const response = civilizations.map(c => ({
      id: c.id,
      name: c.name,
      startYear: c.startYear,
      endYear: c.endYear,
      sort: c.sort || null
    }));

    res.json({
      success: true,
      data: response,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error fetching all civilizations:', error);
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
 * 获取所有Level0政权（全量，不受时间范围限制，用于快速定位栏）
 */
export const getAllLevel0Dynasties = async (req, res) => {
  try {
    // 查询所有Level0朝代（不受时间范围限制）
    const level0Dynasties = await Dynasty.findAll({
      where: {
        [Op.and]: [
          {
            status: 1 // 只显示status=1的朝代
          },
          {
            cLevel: 0 // Level0层级
          },
          {
            parentId: null // 没有父朝代
          }
        ]
      },
      order: [
        ['c_start', 'ASC'], // 按起始年份排序
        ['c_end', 'ASC'] // 起始年份相同时按结束年份排序
      ],
      raw: true
    });

    // 格式化响应数据
    const response = level0Dynasties.map(p => ({
      id: String(p.id),
      name: p.nameChn || p.name || '',
      startYear: p.startYear,
      endYear: p.endYear,
      color: '#808080',
      importance: 'medium',
      cLevel: p.cLevel || 0,
      parentId: p.parentId || null,
      civilizationId: p.civilizationId || 'sinitic',
      sort: p.sort || 0
    }));

    res.json({
      success: true,
      data: response,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error fetching all Level0 dynasties:', error);
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

